package io.jenkins.plugins.pipelinegraphview.utils;

import edu.umd.cs.findbugs.annotations.CheckForNull;
import hudson.model.Action;
import hudson.model.Result;
import io.jenkins.plugins.pipelinegraphview.livestate.LiveGraphRegistry;
import io.jenkins.plugins.pipelinegraphview.livestate.LiveGraphSnapshot;
import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import jenkins.model.CauseOfInterruption;
import org.jenkinsci.plugins.workflow.actions.WorkspaceAction;
import org.jenkinsci.plugins.workflow.cps.nodes.StepStartNode;
import org.jenkinsci.plugins.workflow.flow.FlowExecution;
import org.jenkinsci.plugins.workflow.flow.FlowExecutionOwner;
import org.jenkinsci.plugins.workflow.flow.GraphListener;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.steps.StepExecution;
import org.jenkinsci.plugins.workflow.support.storage.SimpleXStreamFlowNodeStorage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Recovers the flow graph of a run whose {@link WorkflowRun#getExecution()} is {@code null},
 * which Jenkins does for force-killed builds (the Terminate → Kill escalation drops the
 * execution by design).
 *
 * <p>The per-node XML files written by {@link SimpleXStreamFlowNodeStorage} remain in
 * {@code <build>/workflow/} after the execution is dropped. They are loaded here through that
 * storage class so their actions (timings, labels, queue/pause state) come along, and a
 * stand-in {@link FlowExecution} supplies the parent/enclosing lookups the graph code needs.
 *
 * <p>Only the {@link SimpleXStreamFlowNodeStorage} layout ({@code <id>.xml}) is handled. A
 * build persisted with the bulk storage ({@code flowNodeStore.xml}) is only written when it
 * is flushed, which a hard kill skips, so such files generally do not exist.
 */
final class RecoveredFlowExecution extends FlowExecution {
    private static final Logger logger = LoggerFactory.getLogger(RecoveredFlowExecution.class);

    private final SimpleXStreamFlowNodeStorage storage;
    private final Set<String> headIds = new HashSet<>();

    private RecoveredFlowExecution(File dir) {
        this.storage = new SimpleXStreamFlowNodeStorage(this, dir);
    }

    /** Inputs for building a graph from recovered nodes. */
    record RecoveredInput(
            List<FlowNode> nodes, List<FlowNode> workspaceNodes, Map<String, List<String>> enclosingIdsByNodeId) {}

    /**
     * Returns what is needed to build the graph of a finished run whose execution is gone, or
     * {@code null} if there is nothing to recover. Prefers the live state, which still holds
     * the nodes when the kill happened in this Jenkins session, and otherwise reads the
     * per-node XML files left in the build directory.
     */
    static @CheckForNull RecoveredInput forRun(WorkflowRun run) {
        if (run.getExecution() != null || run.isBuilding()) {
            return null;
        }
        LiveGraphSnapshot live = LiveGraphRegistry.get().snapshotForRecovery(run);
        if (live != null && !live.nodes().isEmpty()) {
            return new RecoveredInput(live.nodes(), live.workspaceNodes(), live.enclosingIdsByNodeId());
        }
        return load(run);
    }

    /**
     * Loads the nodes of {@code run} from its {@code workflow/*.xml} files, or returns
     * {@code null} when there is nothing to recover.
     */
    static @CheckForNull RecoveredInput load(WorkflowRun run) {
        File dir = new File(run.getRootDir(), "workflow");
        File[] files = dir.listFiles((d, name) -> name.endsWith(".xml"));
        if (files == null || files.length == 0) {
            return null;
        }
        RecoveredFlowExecution execution = new RecoveredFlowExecution(dir);
        List<FlowNode> nodes = new ArrayList<>(files.length);
        for (File file : files) {
            String name = file.getName();
            String id = name.substring(0, name.length() - ".xml".length());
            try {
                FlowNode node = execution.getNode(id);
                if (node != null) {
                    nodes.add(node);
                }
            } catch (Exception e) {
                logger.debug("Unable to load recovered flow node {} from {}", id, file, e);
            }
        }
        if (nodes.isEmpty()) {
            return null;
        }
        nodes.sort(Comparator.comparingInt(node -> idAsInt(node.getId())));

        // Heads are the nodes no other node lists as a parent. They are the work that was in
        // progress when the execution was dropped, so chunks ending at them are unfinished.
        Set<String> parentIds = new HashSet<>();
        for (FlowNode node : nodes) {
            for (FlowNode parent : parentsOf(node)) {
                parentIds.add(parent.getId());
            }
        }
        for (FlowNode node : nodes) {
            if (!parentIds.contains(node.getId())) {
                execution.headIds.add(node.getId());
            }
        }

        Map<String, List<String>> enclosingIdsByNodeId = new HashMap<>();
        for (FlowNode node : nodes) {
            try {
                enclosingIdsByNodeId.put(node.getId(), List.copyOf(node.getAllEnclosingIds()));
            } catch (RuntimeException e) {
                enclosingIdsByNodeId.put(node.getId(), List.of());
            }
        }

        // Newest first, matching DepthFirstScanner, so a nested stage resolves the innermost
        // workspace when several agents are in use.
        List<FlowNode> workspaceNodes = nodes.stream()
                .filter(node ->
                        node instanceof StepStartNode && node.getPersistentAction(WorkspaceAction.class) != null)
                .sorted(Comparator.comparingInt((FlowNode node) -> idAsInt(node.getId()))
                        .reversed())
                .toList();

        return new RecoveredInput(nodes, workspaceNodes, enclosingIdsByNodeId);
    }

    private static int idAsInt(String id) {
        try {
            return Integer.parseInt(id);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    /** Non-null parents of {@code node}, loaded through the recovered storage. */
    private static List<FlowNode> parentsOf(FlowNode node) {
        List<FlowNode> parents = new ArrayList<>();
        for (FlowNode parent : node.getParents()) {
            if (parent != null) {
                parents.add(parent);
            }
        }
        return parents;
    }

    @Override
    public @CheckForNull FlowNode getNode(String id) throws IOException {
        return storage.getNode(id);
    }

    @Override
    public FlowExecutionOwner getOwner() {
        return FlowExecutionOwner.dummyOwner();
    }

    @Override
    public List<FlowNode> getCurrentHeads() {
        List<FlowNode> heads = new ArrayList<>(headIds.size());
        for (String id : headIds) {
            try {
                FlowNode node = getNode(id);
                if (node != null) {
                    heads.add(node);
                }
            } catch (IOException e) {
                logger.debug("Unable to load recovered head {}", id, e);
            }
        }
        return heads;
    }

    @Override
    public boolean isCurrentHead(FlowNode node) {
        return node != null && headIds.contains(node.getId());
    }

    @Override
    public boolean isActive(FlowNode node) {
        // The run has finished; nothing in a recovered graph is still active.
        return false;
    }

    @Override
    public boolean isComplete() {
        return true;
    }

    @Override
    public void start() {
        throw new UnsupportedOperationException("recovered execution");
    }

    @Override
    public void interrupt(Result r, CauseOfInterruption... causes) {
        // Nothing is running.
    }

    @Override
    public void addListener(GraphListener listener) {
        // Nothing will ever notify it.
    }

    @Override
    public List<Action> loadActions(FlowNode node) {
        // Actions are loaded together with the node by SimpleXStreamFlowNodeStorage.
        return List.of();
    }

    @Override
    public void saveActions(FlowNode node, List<Action> actions) {
        // Recovered executions are read-only.
    }

    @Override
    public com.google.common.util.concurrent.ListenableFuture<List<StepExecution>> getCurrentExecutions(
            boolean innerMostOnly) {
        return com.google.common.util.concurrent.Futures.immediateFuture(List.of());
    }
}
