package io.jenkins.plugins.pipelinegraphview.livestate;

import io.jenkins.plugins.pipelinegraphview.steps.HideFromViewStep;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineGraph;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineStepList;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.jenkinsci.plugins.workflow.actions.WorkspaceAction;
import org.jenkinsci.plugins.workflow.cps.nodes.StepStartNode;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.steps.StepDescriptor;

/**
 * Per-run mutable state built up by {@link LiveGraphPopulator} as {@code GraphListener}
 * events arrive. Reads and writes are serialised on the instance monitor; holders should
 * snapshot and release quickly — the writer is the CPS VM thread and must not block.
 */
final class LiveGraphState {

    private final List<FlowNode> nodes = new ArrayList<>();
    private final Set<String> seenIds = new HashSet<>();
    // Node ID → its enclosing-block IDs (innermost first). Populated at add time on the CPS
    // VM thread so HTTP graph builds don't contend with the storage write lock to resolve
    // ancestry.
    private final Map<String, List<String>> enclosingIdsByNodeId = new HashMap<>();
    // IDs of BlockStartNodes that wrap a {@code hideFromView} step. Lets HTTP readers decide
    // whether a step is hidden by intersecting with the step's enclosing IDs, avoiding a
    // per-step {@code iterateEnclosingBlocks} walk through storage.
    private final Set<String> hideFromViewBlockStartIds = new HashSet<>();
    private long version = 0;
    private volatile boolean poisoned = false;

    // Starts unready; {@link LiveGraphLifecycle} flips it on after any catch-up. Readers
    // treat a null {@link #snapshot} as "fall back to the scanner", so a state that hasn't
    // been marked ready stays invisible.
    private boolean ready = false;

    private VersionedCache<PipelineGraph> cachedGraph;
    private VersionedCache<PipelineStepList> cachedAllSteps;

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
        // See the hideFromViewBlockStartIds field comment for why this is captured here.
        if (node instanceof StepStartNode stepStartNode) {
            try {
                StepDescriptor descriptor = stepStartNode.getDescriptor();
                if (descriptor != null && HideFromViewStep.class.getName().equals(descriptor.getId())) {
                    hideFromViewBlockStartIds.add(node.getId());
                }
            } catch (Throwable ignored) {
                // Descriptor lookup is best-effort; fall back to "not hidden".
            }
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

    LiveGraphSnapshot snapshot() {
        List<FlowNode> nodesCopy;
        Map<String, List<String>> enclosingCopy;
        Set<String> hideFromViewCopy;
        long v;
        synchronized (this) {
            if (poisoned || !ready) {
                return null;
            }
            nodesCopy = List.copyOf(nodes);
            enclosingCopy = Map.copyOf(enclosingIdsByNodeId);
            hideFromViewCopy = Set.copyOf(hideFromViewBlockStartIds);
            v = version;
        }
        // Scan for WorkspaceAction outside the monitor: each getAction call walks the node's
        // action list, and a node can gain WorkspaceAction after onNewHead fires (when the
        // workspace is allocated), so resolving here observes the latest state. Newest-first
        // order matches DepthFirstScanner so PipelineGraphApi#getStageNode picks the
        // innermost workspace for nested agents.
        List<FlowNode> workspaceNodes = new ArrayList<>();
        for (int i = nodesCopy.size() - 1; i >= 0; i--) {
            FlowNode n = nodesCopy.get(i);
            if (n.getAction(WorkspaceAction.class) != null) {
                workspaceNodes.add(n);
            }
        }
        return new LiveGraphSnapshot(nodesCopy, List.copyOf(workspaceNodes), enclosingCopy, hideFromViewCopy, v);
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

    private record VersionedCache<T>(long version, T value) {}
}
