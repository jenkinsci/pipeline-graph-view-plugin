package io.jenkins.plugins.pipelinegraphview.utils;

import edu.umd.cs.findbugs.annotations.CheckForNull;
import edu.umd.cs.findbugs.annotations.NonNull;
import edu.umd.cs.findbugs.annotations.Nullable;
import hudson.model.Action;
import hudson.model.Result;
import io.jenkins.plugins.pipelinegraphview.Messages;
import io.jenkins.plugins.pipelinegraphview.treescanner.PipelineNodeGraphAdapter;
import io.jenkins.plugins.pipelinegraphview.utils.BlueRun.BlueRunResult;
import io.jenkins.plugins.pipelinegraphview.utils.BlueRun.BlueRunState;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import org.jenkinsci.plugins.workflow.actions.ErrorAction;
import org.jenkinsci.plugins.workflow.actions.LabelAction;
import org.jenkinsci.plugins.workflow.cps.nodes.StepStartNode;
import org.jenkinsci.plugins.workflow.graph.BlockEndNode;
import org.jenkinsci.plugins.workflow.graph.BlockStartNode;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.graph.FlowStartNode;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.pipelinegraphanalysis.TimingInfo;
import org.jenkinsci.plugins.workflow.steps.FlowInterruptedException;
import org.jenkinsci.plugins.workflow.support.steps.input.InputStep;

/** @author Vivek Pandey */
public class FlowNodeWrapper {

    /**
     * Checks to see if `this` and `that` probably represent the same underlying
     * pipeline graph node
     * as far as the user is concerned. This is sloppier than an exact name and ID
     * match because
     * {@link PipelineNodeGraphAdapter} as of 2019-05-17 can return some nodes with
     * different IDs
     * during a build as opposed to once the build is complete. As such we check
     * name, type, and
     * firstParent. But we need to check firstParent the same way for the same
     * reason.
     *
     * @param that
     * @return
     */
    public boolean probablySameNode(@Nullable FlowNodeWrapper that) {

        if (that == null) {
            return false;
        }

        if (this.type != that.type) {
            return false;
        }

        if (!this.displayName.equals(that.displayName)) {
            return false;
        }

        final FlowNodeWrapper thisParent = this.getFirstParent();
        if (thisParent != null) {
            return thisParent.probablySameNode(that.getFirstParent());
        } else {
            return that.getFirstParent() == null;
        }
    }

    public enum NodeType {
        STAGE,
        PARALLEL,
        PARALLEL_BLOCK,
        STEP,
        STEPS_BLOCK,
        UNHANDLED_EXCEPTION,
        PIPELINE_START,
    }

    private final FlowNode node;
    private final NodeRunStatus status;
    private final TimingInfo timingInfo;
    public final List<FlowNodeWrapper> edges = new ArrayList<>();
    public final NodeType type;
    private final String displayName;
    private final InputStep inputStep;
    private final WorkflowRun run;
    private String causeOfFailure;

    private List<FlowNodeWrapper> parents = new ArrayList<>();

    private ErrorAction blockErrorAction;
    private Collection<Action> pipelineActions;

    public FlowNodeWrapper(
            @NonNull FlowNode node,
            @NonNull NodeRunStatus status,
            @NonNull TimingInfo timingInfo,
            @NonNull WorkflowRun run) {
        this(node, status, timingInfo, null, run, null);
    }

    public FlowNodeWrapper(
            @NonNull FlowNode node,
            @NonNull NodeRunStatus status,
            @NonNull TimingInfo timingInfo,
            @Nullable InputStep inputStep,
            @NonNull WorkflowRun run) {
        this(node, status, timingInfo, inputStep, run, null);
    }

    public FlowNodeWrapper(
            @NonNull FlowNode node,
            @NonNull NodeRunStatus status,
            @NonNull TimingInfo timingInfo,
            @Nullable InputStep inputStep,
            @NonNull WorkflowRun run,
            @Nullable NodeType type) {
        this.node = node;
        this.status = status;
        this.timingInfo = timingInfo;
        this.type = type == null ? getNodeType(node) : type;
        this.displayName = PipelineNodeUtil.getDisplayName(node);
        this.inputStep = inputStep;
        this.run = run;
    }

    public WorkflowRun getRun() {
        return run;
    }

    public @NonNull String getDisplayName() {
        return switch (type) {
            case PARALLEL_BLOCK -> Messages.FlowNodeWrapper_parallel();
            case PIPELINE_START -> Messages.FlowNodeWrapper_noStage();
            default -> displayName;
        };
    }

    public @CheckForNull String getLabelDisplayName() {
        LabelAction labelAction = node.getAction(LabelAction.class);
        if (labelAction != null) {
            return labelAction.getDisplayName();
        }
        return null;
    }

    private static NodeType getNodeType(FlowNode node) {
        if (PipelineNodeUtil.isStep(node)) {
            return NodeType.STEP;
        } else if (PipelineNodeUtil.isStage(node)) {
            return NodeType.STAGE;
        } else if (PipelineNodeUtil.isParallelBranch(node)) {
            return NodeType.PARALLEL;
        } else if (PipelineNodeUtil.isParallelBlock(node)) {
            return NodeType.PARALLEL_BLOCK;
        } else if (node instanceof StepStartNode) {
            return NodeType.STEPS_BLOCK;
        } else if (node instanceof FlowStartNode) {
            return NodeType.PIPELINE_START;
        } else if (PipelineNodeUtil.isUnhandledException(node)) {
            return NodeType.UNHANDLED_EXCEPTION;
        }

        throw new IllegalArgumentException(
                String.format("Unknown FlowNode %s, type: %s", node.getId(), node.getClass()));
    }

    public @NonNull NodeRunStatus getStatus() {
        if (hasBlockError()) {
            if (isBlockErrorInterruptedWithAbort()) {
                return new NodeRunStatus(BlueRunResult.ABORTED, BlueRunState.FINISHED);
            } else {
                return new NodeRunStatus(BlueRunResult.FAILURE, BlueRunState.FINISHED);
            }
        }
        return status;
    }

    public @NonNull TimingInfo getTiming() {
        return timingInfo;
    }

    public @NonNull TimingInfo setTiming() {
        return timingInfo;
    }

    public @NonNull String getId() {
        return node.getId();
    }

    public @NonNull FlowNode getNode() {
        return node;
    }

    public NodeType getType() {
        return type;
    }

    /*
     * Parallel block appear as StepStartNodes in the tree. We might know know if
     * it's a don't kno
     *
     */
    public NodeType setType() {
        return type;
    }

    public void addEdge(FlowNodeWrapper edge) {
        this.edges.add(edge);
    }

    public void removeEdge(FlowNodeWrapper edge) {
        this.edges.remove(edge);
    }

    public void addEdges(List<FlowNodeWrapper> edges) {
        this.edges.addAll(edges);
    }

    public void addParent(FlowNodeWrapper parent) {
        this.parents.add(parent);
    }

    public void addParents(Collection<FlowNodeWrapper> parents) {
        this.parents.addAll(parents);
    }

    public void removeParent(FlowNodeWrapper parent) {
        this.parents.remove(parent);
    }

    public @CheckForNull FlowNodeWrapper getFirstParent() {
        return !parents.isEmpty() ? parents.get(0) : null;
    }

    public @NonNull List<FlowNodeWrapper> getParents() {
        return parents;
    }

    public String getCauseOfFailure() {
        return causeOfFailure;
    }

    public void setCauseOfFailure(String causeOfFailure) {
        this.causeOfFailure = causeOfFailure;
    }

    @Override
    public boolean equals(Object obj) {
        if (!(obj instanceof FlowNodeWrapper)) {
            return false;
        }
        return node.equals(((FlowNodeWrapper) obj).node);
    }

    public @CheckForNull InputStep getInputStep() {
        return inputStep;
    }

    @Override
    public int hashCode() {
        return node.hashCode();
    }

    @Override
    public String toString() {
        return getClass().getName()
                + "[id="
                + node.getId()
                + ",displayName="
                + this.displayName
                + ",type="
                + this.type
                + "]";
    }

    boolean hasBlockError() {
        return blockErrorAction != null && blockErrorAction.getError() != null;
    }

    String blockError() {
        if (hasBlockError()) {
            return blockErrorAction.getError().getMessage();
        }
        return null;
    }

    @CheckForNull
    public String nodeError() {
        ErrorAction errorAction = node.getError();
        if (errorAction != null) {
            return errorAction.getError().getMessage();
        }
        return null;
    }

    boolean isBlockErrorInterruptedWithAbort() {
        if (hasBlockError()) {
            Throwable error = blockErrorAction.getError();
            if (error instanceof FlowInterruptedException) {
                FlowInterruptedException interrupted = (FlowInterruptedException) error;
                return interrupted.getResult().equals(Result.ABORTED);
            }
        }
        return false;
    }

    boolean isLoggable() {
        return PipelineNodeUtil.isLoggable.apply(node);
    }

    public void setBlockErrorAction(ErrorAction blockErrorAction) {
        this.blockErrorAction = blockErrorAction;
    }

    public static boolean isStart(FlowNode node) {
        return node instanceof BlockStartNode;
    }

    public static boolean isEnd(FlowNode node) {
        return node instanceof BlockEndNode;
    }

    public boolean isStep() {
        return this.type == NodeType.STEP;
    }

    public boolean isStepsBlock() {
        return this.type == NodeType.STEPS_BLOCK;
    }

    /*
     * public boolean isExecuted() {
     * return NotExecutedNodeAction.isExecuted(node);
     * }
     */

    /**
     * Returns Action instances that were attached to the associated FlowNode, or to
     * any of its
     * children not represented in the graph. Filters by class to mimic
     * Item.getActions(class).
     */
    public <T extends Action> Collection<T> getPipelineActions(Class<T> clazz) {
        if (pipelineActions == null) {
            return Collections.emptyList();
        }
        ArrayList<T> filtered = new ArrayList<>();
        for (Action a : pipelineActions) {
            if (clazz.isInstance(a)) {
                filtered.add(clazz.cast(a));
            }
        }
        return filtered;
    }

    /**
     * Returns Action instances that were attached to the associated FlowNode, or to
     * any of its
     * children not represented in the graph.
     */
    public Collection<Action> getPipelineActions() {
        return Collections.unmodifiableCollection(this.pipelineActions);
    }

    public void setPipelineActions(Collection<Action> pipelineActions) {
        this.pipelineActions = pipelineActions;
    }

    public String getArgumentsAsString() {
        return PipelineNodeUtil.getArgumentsAsString(node);
    }

    public boolean isSynthetic() {
        return PipelineNodeUtil.isSyntheticStage(node) || getNodeType(node) == NodeType.PIPELINE_START;
    }

    public boolean isUnhandledException() {
        return PipelineNodeUtil.isUnhandledException(node);
    }

    public static class NodeComparator implements Comparator<FlowNodeWrapper>, Serializable {
        private static final long serialVersionUID = 1L;

        @Override
        public int compare(FlowNodeWrapper a, FlowNodeWrapper b) {
            return FlowNodeWrapper.compareIds(a.getId(), b.getId());
        }
    }

    public static class FlowNodeComparator implements Comparator<FlowNode>, Serializable {
        private static final long serialVersionUID = 1L;

        @Override
        public int compare(FlowNode a, FlowNode b) {
            return FlowNodeWrapper.compareIds(a.getId(), b.getId());
        }
    }

    public static class NodeIdComparator implements Comparator<String>, Serializable {
        private static final long serialVersionUID = 1L;

        @Override
        public int compare(String a, String b) {
            return FlowNodeWrapper.compareIds(a, b);
        }
    }

    public static int compareIds(String ida, String idb) {
        return Integer.compare(Integer.parseInt(ida), Integer.parseInt(idb));
    }

    // Useful for dumping node maps to console. These can then be viewed in dor or
    // online via:
    // https://dreampuf.github.io/GraphvizOnline
    public static String getNodeGraphviz(List<FlowNodeWrapper> nodes) {
        StringBuilder nodeMapStr = new StringBuilder("digraph G {").append(System.lineSeparator());
        for (FlowNodeWrapper node : nodes) {
            nodeMapStr.append(" ").append(node.getId());
            nodeMapStr.append(" [label=\"{id: ").append(node.getId());
            nodeMapStr.append(", name: ").append(node.getDisplayName());
            nodeMapStr.append(", type: ").append(node.getType());
            nodeMapStr.append(", state: ").append(node.getStatus().state);
            nodeMapStr.append(", result: ").append(node.getStatus().result);
            nodeMapStr.append("}\"]").append(System.lineSeparator());

            for (FlowNodeWrapper parent : node.getParents()) {
                nodeMapStr
                        .append("  ")
                        .append(node.getId())
                        .append(" -> ")
                        .append(parent.getId())
                        .append(System.lineSeparator());
            }
        }
        nodeMapStr.append("}");
        return nodeMapStr.toString();
    }
}
