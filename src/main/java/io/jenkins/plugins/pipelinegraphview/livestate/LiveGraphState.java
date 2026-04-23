package io.jenkins.plugins.pipelinegraphview.livestate;

import io.jenkins.plugins.pipelinegraphview.utils.PipelineGraph;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineStepList;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.jenkinsci.plugins.workflow.actions.WorkspaceAction;
import org.jenkinsci.plugins.workflow.graph.FlowNode;

/**
 * Per-run mutable state built up by {@link LiveGraphPopulator} as {@code GraphListener}
 * events arrive. Reads and writes are serialised on the instance monitor; holders should
 * snapshot and release quickly — the writer is the CPS VM thread and must not block.
 */
final class LiveGraphState {

    private final List<FlowNode> nodes = new ArrayList<>();
    private final Set<String> seenIds = new HashSet<>();
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

    synchronized void addNode(FlowNode node) {
        if (!seenIds.add(node.getId())) {
            return;
        }
        nodes.add(node);
        version++;
    }

    synchronized boolean hasSeen(String nodeId) {
        return seenIds.contains(nodeId);
    }

    synchronized int size() {
        return nodes.size();
    }

    synchronized LiveGraphSnapshot snapshot() {
        if (poisoned || !ready) {
            return null;
        }
        // Filter for WorkspaceAction at snapshot time rather than at addNode time:
        // WorkspaceAction is attached to a block-start node when the workspace is allocated,
        // which can happen AFTER onNewHead has already fired for that node. A snapshot-time
        // scan always observes the latest action state on each captured FlowNode.
        //
        // The list is built newest-first (reverse insertion order) to match the iteration
        // order of DepthFirstScanner (from current heads backward): PipelineGraphApi#getStageNode
        // returns on the first match, and for nested agents the innermost workspace is the
        // more-specific match — the one a later-created inner `node {}` block sits in.
        List<FlowNode> workspaceNodes = new ArrayList<>();
        for (int i = nodes.size() - 1; i >= 0; i--) {
            FlowNode n = nodes.get(i);
            if (n.getAction(WorkspaceAction.class) != null) {
                workspaceNodes.add(n);
            }
        }
        return new LiveGraphSnapshot(List.copyOf(nodes), List.copyOf(workspaceNodes), version);
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

    private record VersionedCache<T>(long version, T value) {}
}
