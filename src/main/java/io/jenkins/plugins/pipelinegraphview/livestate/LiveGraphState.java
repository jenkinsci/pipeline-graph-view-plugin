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
    // Node ID → its enclosing-block IDs (innermost first). Populated at add time on the
    // CPS VM thread, so HTTP graph builds don't need to acquire the storage read lock to
    // resolve ancestry. Without this, each findParentNode call goes back to storage and
    // contends with the write lock the running build is holding.
    private final Map<String, List<String>> enclosingIdsByNodeId = new HashMap<>();
    // IDs of BlockStartNodes that wrap a {@code hideFromView} step. Lets HTTP readers check
    // whether a step is "hidden" by scanning this set against the step's enclosing IDs,
    // instead of calling FlowNode#iterateEnclosingBlocks which goes to storage per step.
    private final Set<String> hideFromViewBlockStartIds = new HashSet<>();
    private long version = 0;
    private volatile boolean poisoned = false;

    // Starts unready. Only the lifecycle ({@link LiveGraphLifecycle}) flips it on, after any
    // needed catch-up — callers of {@link #snapshot} treat a null return as "fall back to
    // the scanner", so a partial state that never gets the ready handshake stays invisible.
    private boolean ready = false;

    // Mutations synchronise on the instance monitor so concurrent writers cannot regress a
    // newer version with an older one (check-then-set on a volatile reference would be racy).
    private VersionedCache<PipelineGraph> cachedGraph;
    private VersionedCache<PipelineStepList> cachedAllSteps;

    // Per-compute dedup locks. N concurrent HTTP threads rebuilding the same graph
    // multiplies CPU cost by N (they each do the same O(nodes) work). With these, the
    // first thread computes and caches; the rest block here, then re-check cache and
    // usually find the fresh result. Separate locks for tree vs steps — they're independent
    // computations and a slow tree rebuild shouldn't starve steps (or vice versa).
    private final Object graphComputeLock = new Object();
    private final Object allStepsComputeLock = new Object();

    synchronized void addNode(FlowNode node) {
        if (!seenIds.add(node.getId())) {
            return;
        }
        nodes.add(node);
        // Capture ancestry now. On the CPS VM thread (the usual onNewHead caller) this is a
        // reentrant read against the already-held storage write lock — effectively free.
        // A node's enclosing chain never changes after creation, so we only pay this once.
        try {
            enclosingIdsByNodeId.put(node.getId(), List.copyOf(node.getAllEnclosingIds()));
        } catch (Throwable ignored) {
            enclosingIdsByNodeId.put(node.getId(), List.of());
        }
        // Record hideFromView block starts once, here, so readers never need to walk a
        // node's enclosing blocks through storage to tell whether the node is hidden.
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
     * {@link #snapshot()}, but skips the O(N) copy. Callers check this first and only take
     * a full snapshot on cache miss.
     */
    synchronized Long currentVersion() {
        if (poisoned || !ready) {
            return null;
        }
        return version;
    }

    LiveGraphSnapshot snapshot() {
        // Release the monitor before running the WorkspaceAction scan: each
        // getAction(WorkspaceAction.class) walks the FlowNode's action list, so doing N of
        // them under the lock the CPS VM also uses would block pipeline execution for O(N).
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
        // Filter for WorkspaceAction at snapshot time, not at addNode time: a node can have
        // WorkspaceAction attached after onNewHead fires (when the workspace is allocated),
        // so scanning here always observes the latest action state. Newest-first ordering
        // matches DepthFirstScanner (from current heads backward); PipelineGraphApi#getStageNode
        // returns on the first match, and for nested agents the innermost workspace — the
        // one a later-created inner `node {}` block sits in — is the more-specific match.
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
