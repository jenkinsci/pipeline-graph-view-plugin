package io.jenkins.plugins.pipelinegraphview.livestate;

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
 * <p>This is a Phase 1 state: it records the raw node list plus the subset that carry a
 * {@link WorkspaceAction}. Snapshotting returns immutable copies of these so the downstream
 * relationship-finder / graph-builder path runs without the monitor.
 */
final class LiveGraphState {

    private final String runId;
    private final List<FlowNode> nodes = new ArrayList<>();
    private final Set<String> seenIds = new HashSet<>();
    private final List<FlowNode> workspaceNodes = new ArrayList<>();
    private volatile boolean poisoned = false;

    LiveGraphState(String runId) {
        this.runId = runId;
    }

    String getRunId() {
        return runId;
    }

    synchronized void addNode(FlowNode node) {
        if (!seenIds.add(node.getId())) {
            return;
        }
        nodes.add(node);
        if (node.getAction(WorkspaceAction.class) != null) {
            workspaceNodes.add(node);
        }
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
        return new LiveGraphSnapshot(List.copyOf(nodes), List.copyOf(workspaceNodes));
    }

    void poison() {
        poisoned = true;
    }

    boolean isPoisoned() {
        return poisoned;
    }
}
