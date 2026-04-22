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
 *
 * <p>Two things live here:
 * <ul>
 *   <li>The raw {@link FlowNode} list that the downstream relationship-finder /
 *       graph-builder path consumes. The {@link WorkspaceAction}-carrying subset used by
 *       agent detection is derived at snapshot time by iterating this list, not at
 *       add-time — {@code WorkspaceAction} can be attached to a node after {@code onNewHead}
 *       fires.</li>
 *   <li>A small cache of the last-computed {@link PipelineGraph} / {@link PipelineStepList}
 *       keyed by a monotonic version counter that bumps on every {@link #addNode}. HTTP
 *       polls that hit between node arrivals return the cached DTO verbatim — no rebuild.</li>
 * </ul>
 */
final class LiveGraphState {

    private final List<FlowNode> nodes = new ArrayList<>();
    private final Set<String> seenIds = new HashSet<>();
    private long version = 0;
    private volatile boolean poisoned = false;

    // Output cache. Volatile reference to an immutable (version, value) tuple so readers
    // and writers never see a torn pair.
    private volatile VersionedCache<PipelineGraph> cachedGraph;
    private volatile VersionedCache<PipelineStepList> cachedAllSteps;

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
        if (poisoned) {
            return null;
        }
        // Filter for WorkspaceAction at snapshot time rather than at addNode time:
        // WorkspaceAction is attached to a block-start node when the workspace is allocated,
        // which can happen AFTER onNewHead has already fired for that node. A snapshot-time
        // scan always observes the latest action state on each captured FlowNode.
        List<FlowNode> workspaceNodes = new ArrayList<>();
        for (FlowNode n : nodes) {
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
    PipelineGraph cachedGraph(long minVersion) {
        VersionedCache<PipelineGraph> cached = cachedGraph;
        return (cached != null && cached.version >= minVersion) ? cached.value : null;
    }

    void cacheGraph(long version, PipelineGraph graph) {
        VersionedCache<PipelineGraph> current = cachedGraph;
        if (current == null || current.version < version) {
            cachedGraph = new VersionedCache<>(version, graph);
        }
    }

    PipelineStepList cachedAllSteps(long minVersion) {
        VersionedCache<PipelineStepList> cached = cachedAllSteps;
        return (cached != null && cached.version >= minVersion) ? cached.value : null;
    }

    void cacheAllSteps(long version, PipelineStepList steps) {
        VersionedCache<PipelineStepList> current = cachedAllSteps;
        if (current == null || current.version < version) {
            cachedAllSteps = new VersionedCache<>(version, steps);
        }
    }

    void poison() {
        poisoned = true;
    }

    private record VersionedCache<T>(long version, T value) {}
}
