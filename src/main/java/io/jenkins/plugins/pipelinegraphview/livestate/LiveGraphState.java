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
        long v;
        synchronized (this) {
            if (poisoned || !ready) {
                return null;
            }
            nodesCopy = List.copyOf(nodes);
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
        return new LiveGraphSnapshot(nodesCopy, List.copyOf(workspaceNodes), v);
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
