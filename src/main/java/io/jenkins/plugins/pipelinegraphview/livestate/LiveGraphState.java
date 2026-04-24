package io.jenkins.plugins.pipelinegraphview.livestate;

import io.jenkins.plugins.pipelinegraphview.steps.HideFromViewStep;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineGraph;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineStepList;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.jenkinsci.plugins.workflow.actions.WorkspaceAction;
import org.jenkinsci.plugins.workflow.cps.nodes.StepStartNode;
import org.jenkinsci.plugins.workflow.flow.FlowExecution;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.steps.StepDescriptor;

/**
 * Per-run mutable state built up by {@link LiveGraphPopulator} as {@code GraphListener}
 * events arrive. Writes run on the CPS VM thread and must not block, so the instance monitor
 * is only held around the append to the nodes list + version bump; the ancestry map and
 * hideFromView set are {@link ConcurrentHashMap}-backed so readers can publish them without
 * copying.
 */
final class LiveGraphState {

    private final List<FlowNode> nodes = new ArrayList<>();
    private final Set<String> seenIds = new HashSet<>();
    // Node ID → its enclosing-block IDs (innermost first). Populated at add time on the CPS
    // VM thread so HTTP graph builds don't contend with the storage write lock to resolve
    // ancestry. ConcurrentHashMap so {@link #snapshot} can publish the live map (wrapped
    // unmodifiable) without copying — readers iterate weakly-consistent views.
    private final Map<String, List<String>> enclosingIdsByNodeId = new ConcurrentHashMap<>();
    // IDs of BlockStartNodes that wrap a {@code hideFromView} step. Lets HTTP readers decide
    // whether a step is hidden by intersecting with the step's enclosing IDs, avoiding a
    // per-step {@code iterateEnclosingBlocks} walk through storage.
    private final Set<String> hideFromViewBlockStartIds = ConcurrentHashMap.newKeySet();

    // StepStartNodes observed so far — the only flow-node kind that can carry a
    // WorkspaceAction. Scanning {@code nodes} for WorkspaceAction at snapshot time was
    // O(N) with ~300k nodes even though only a handful are actual {@code node{}} blocks;
    // keeping this narrower list means snapshot scans O(candidates) instead.
    private final List<FlowNode> workspaceCandidates = new ArrayList<>();
    private long version = 0;
    private volatile boolean poisoned = false;

    // Starts unready; {@link LiveGraphLifecycle} flips it on after any catch-up. Readers
    // treat a null {@link #snapshot} as "fall back to the scanner", so a state that hasn't
    // been marked ready stays invisible.
    private boolean ready = false;

    private VersionedCache<PipelineGraph> cachedGraph;
    private VersionedCache<PipelineStepList> cachedAllSteps;

    private final WarningActionCache warningActionCache = new WarningActionCache();
    private final BlockResolutionCache blockResolutionCache = new BlockResolutionCache();
    private final SkippedStageCache skippedStageCache = new SkippedStageCache();

    // Serialise concurrent rebuilds so N HTTP readers don't each do the same O(nodes) work.
    // Separate locks for tree vs steps — a slow tree rebuild must not starve steps.
    private final Object graphComputeLock = new Object();
    private final Object allStepsComputeLock = new Object();

    synchronized void addNode(FlowNode node) {
        if (!seenIds.add(node.getId())) {
            return;
        }
        nodes.add(node);
        // Capture ancestry once, at add time. The enclosing chain never changes after
        // creation, so HTTP readers can resolve parentage from this map instead of going
        // back to storage.
        try {
            enclosingIdsByNodeId.put(node.getId(), List.copyOf(node.getAllEnclosingIds()));
        } catch (Throwable ignored) {
            enclosingIdsByNodeId.put(node.getId(), List.of());
        }
        if (node instanceof StepStartNode stepStartNode) {
            // See the hideFromViewBlockStartIds field comment for why this is captured here.
            try {
                StepDescriptor descriptor = stepStartNode.getDescriptor();
                if (descriptor != null && HideFromViewStep.class.getName().equals(descriptor.getId())) {
                    hideFromViewBlockStartIds.add(node.getId());
                }
            } catch (Throwable ignored) {
                // Descriptor lookup is best-effort; fall back to "not hidden".
            }
            // WorkspaceAction can only attach to a StepStartNode; track all of them so
            // snapshot can check this narrower list instead of every FlowNode.
            workspaceCandidates.add(node);
        }
        version++;
    }

    synchronized boolean hasSeen(String nodeId) {
        return seenIds.contains(nodeId);
    }

    synchronized int size() {
        return nodes.size();
    }

    /**
     * Cheap version read for cache-hit short-circuits — same readiness/poison semantics as
     * {@link #snapshot()}, but skips the O(N) copy.
     */
    synchronized Long currentVersion() {
        if (poisoned || !ready) {
            return null;
        }
        return version;
    }

    LiveGraphSnapshot snapshot(FlowExecution execution) {
        // Only the node lists need to be copied — enclosingIds and hideFromView are on
        // concurrent structures we can publish by reference. Keeping the monitor-held
        // section down to a couple of array copies means addNode (on the CPS VM thread)
        // almost never blocks on a snapshot.
        List<FlowNode> nodesCopy;
        List<FlowNode> candidatesCopy;
        long v;
        synchronized (this) {
            if (poisoned || !ready) {
                return null;
            }
            nodesCopy = new ArrayList<>(nodes);
            candidatesCopy = new ArrayList<>(workspaceCandidates);
            v = version;
        }
        // Scan for WorkspaceAction outside the monitor: each getAction call walks the node's
        // action list, and a node can gain WorkspaceAction after onNewHead fires (when the
        // workspace is allocated), so resolving here observes the latest state. Newest-first
        // order matches DepthFirstScanner so PipelineGraphApi#getStageNode picks the
        // innermost workspace for nested agents.
        List<FlowNode> workspaceNodes = new ArrayList<>();
        for (int i = candidatesCopy.size() - 1; i >= 0; i--) {
            FlowNode n = candidatesCopy.get(i);
            if (n.getAction(WorkspaceAction.class) != null) {
                workspaceNodes.add(n);
            }
        }
        // Concurrent maps/sets are published by reference — consumers must treat them as
        // read-only (see {@link LiveGraphSnapshot}).
        Set<String> activeNodeIds = computeActiveNodeIds(execution);
        return new LiveGraphSnapshot(
                nodesCopy, workspaceNodes, enclosingIdsByNodeId, hideFromViewBlockStartIds, activeNodeIds, v);
    }

    /**
     * Resolves the "active" node set for this snapshot: all current heads plus every
     * enclosing block start. Prefers the already-captured {@link #enclosingIdsByNodeId} over
     * a fresh storage walk when looking up a head's enclosing chain.
     */
    private Set<String> computeActiveNodeIds(FlowExecution execution) {
        if (execution == null || execution.isComplete()) {
            return Set.of();
        }
        Set<String> active = new HashSet<>();
        try {
            for (FlowNode head : execution.getCurrentHeads()) {
                active.add(head.getId());
                List<String> enclosing = enclosingIdsByNodeId.get(head.getId());
                if (enclosing != null) {
                    active.addAll(enclosing);
                } else {
                    try {
                        active.addAll(head.getAllEnclosingIds());
                    } catch (Throwable ignored) {
                        // Best-effort: a missing enclosing chain just means a few block
                        // starts won't be flagged active, which degrades gracefully.
                    }
                }
            }
        } catch (Throwable ignored) {
            // Execution may become invalid; callers fall back to FlowNode#isActive().
            return Set.of();
        }
        return Set.copyOf(active);
    }

    /**
     * Returns the cached graph if it was computed at or after {@code minVersion}. Returning
     * a newer cache than requested is intentional — the caller's snapshot can only become
     * staler, so a newer output is strictly more accurate.
     */
    synchronized PipelineGraph cachedGraph(long minVersion) {
        return (cachedGraph != null && cachedGraph.version >= minVersion) ? cachedGraph.value : null;
    }

    synchronized void cacheGraph(long version, PipelineGraph graph) {
        if (cachedGraph == null || cachedGraph.version < version) {
            cachedGraph = new VersionedCache<>(version, graph);
        }
    }

    synchronized PipelineStepList cachedAllSteps(long minVersion) {
        return (cachedAllSteps != null && cachedAllSteps.version >= minVersion) ? cachedAllSteps.value : null;
    }

    synchronized void cacheAllSteps(long version, PipelineStepList steps) {
        if (cachedAllSteps == null || cachedAllSteps.version < version) {
            cachedAllSteps = new VersionedCache<>(version, steps);
        }
    }

    void poison() {
        poisoned = true;
    }

    synchronized void markReady() {
        ready = true;
    }

    Object graphComputeLock() {
        return graphComputeLock;
    }

    Object allStepsComputeLock() {
        return allStepsComputeLock;
    }

    WarningActionCache warningActionCache() {
        return warningActionCache;
    }

    BlockResolutionCache blockResolutionCache() {
        return blockResolutionCache;
    }

    SkippedStageCache skippedStageCache() {
        return skippedStageCache;
    }

    private record VersionedCache<T>(long version, T value) {}
}
