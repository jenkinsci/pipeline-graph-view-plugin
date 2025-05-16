package io.jenkins.plugins.pipelinegraphview.treescanner;

import edu.umd.cs.findbugs.annotations.CheckForNull;
import edu.umd.cs.findbugs.annotations.NonNull;
import io.jenkins.plugins.pipelinegraphview.utils.NodeRunStatus;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineNodeUtil;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.jenkinsci.plugins.workflow.actions.ThreadNameAction;
import org.jenkinsci.plugins.workflow.actions.WarningAction;
import org.jenkinsci.plugins.workflow.graph.BlockStartNode;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.pipelinegraphanalysis.GenericStatus;
import org.jenkinsci.plugins.workflow.pipelinegraphanalysis.StatusAndTiming;
import org.jenkinsci.plugins.workflow.pipelinegraphanalysis.TimingInfo;
import org.jenkinsci.plugins.workflow.support.actions.PauseAction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class ParallelBlockRelationship extends NodeRelationship {
    private static final Logger logger = LoggerFactory.getLogger(ParallelBlockRelationship.class);
    private boolean isDebugEnabled = logger.isDebugEnabled();

    @NonNull
    protected List<BlockStartNode> branchStarts = new ArrayList<>();

    @NonNull
    protected List<FlowNode> branchEnds = new ArrayList<>();

    protected Map<String, GenericStatus> branchStatuses;
    protected Map<String, TimingInfo> branchTimings;
    protected GenericStatus overallStatus;
    protected TimingInfo overallTiming;

    public ParallelBlockRelationship(
            @NonNull FlowNode start,
            @NonNull FlowNode end,
            @NonNull FlowNode after,
            List<BlockStartNode> branchStarts,
            List<FlowNode> branchEnds) {
        super(start, end, after);
        this.branchStarts = branchStarts;
        this.branchEnds = branchEnds;
    }

    public ParallelBlockRelationship(
            @NonNull FlowNode start,
            @NonNull FlowNode end,
            @CheckForNull FlowNode after,
            ArrayDeque<NodeRelationship> branchRelationships) {
        super(start, end, after);
        this.branchStarts = new ArrayList<>();
        this.branchEnds = new ArrayList<>();

        for (NodeRelationship r : branchRelationships) {
            branchStarts.add((BlockStartNode) r.getStart());
            branchEnds.add(r.getEnd());
        }
    }

    /*
     * Sets matching start node for this end node.
     * Will return null if this is not an end node.
     */
    @NonNull
    public List<BlockStartNode> getBranchStarts() {
        return this.branchStarts;
    }

    /*
     * Gets child branch end nodes relationship.
     */
    @NonNull
    public List<FlowNode> getBranchEnds() {
        return this.branchEnds;
    }

    /*
     * Gets TimingInfo for relationship.
     */
    @Override
    public @NonNull TimingInfo getTimingInfo(WorkflowRun run) {
        if (this.overallTiming == null) {
            calculateTimings(run);
        }
        return this.overallTiming;
    }

    private String getBranchName(BlockStartNode start) {
        ThreadNameAction branchName = start.getAction(ThreadNameAction.class);
        assert branchName != null;
        return branchName.getThreadName();
    }

    /*
     * Gets TimingInfo for relationship.
     */
    public @NonNull TimingInfo getBranchTimingInfo(WorkflowRun run, BlockStartNode startNode) {
        if (this.branchTimings == null) {
            calculateTimings(run);
        }
        return this.branchTimings.get(getBranchName(startNode));
    }

    /*
     * Gets TimingInfo for relationship.
     */
    private void calculateTimings(WorkflowRun run) {
        long[] pauseDurations = this.branchStarts.stream()
                .mapToLong(s -> PauseAction.getPauseDuration(s))
                .toArray();
        // The parallel API expects parallel end to be null if this is still running -
        // so only pass it if it;s not the start node;
        FlowNode parallelEndNode = (this.start != this.end) ? this.end : null;
        for (int i = 0; i < this.branchStarts.size(); i++) {
            FlowNode branchStart = this.branchStarts.get(i);
            FlowNode branchEnd = this.branchEnds.get(i);
            if (isDebugEnabled) {
                logger.debug(
                        "Calculating parallel branch timings {}, {}",
                        branchStart.getId(),
                        (branchEnd != null) ? branchEnd.getId() : "null");
            }
        }
        this.branchTimings = StatusAndTiming.computeParallelBranchTimings(
                run, this.start, this.branchStarts, this.branchEnds, parallelEndNode, pauseDurations);
        if (isDebugEnabled) {
            logger.debug("Calculating parallel timings {}, {} (with above branches)", start.getId(), end.getId());
        }
        this.overallTiming =
                StatusAndTiming.computeOverallParallelTiming(run, this.branchTimings, this.start, parallelEndNode);
    }

    /*
     * Gets Status for relationship.
     */
    @Override
    public @NonNull NodeRunStatus getStatus(WorkflowRun run) {
        if (this.overallStatus == null) {
            calculateStatuses(run);
        }
        if (isDebugEnabled) {
            logger.debug("Overall status for '{}': '{}'", this.start, this.overallStatus);
        }
        return new NodeRunStatus(this.overallStatus);
    }

    /*
     * Gets Status for relationship.
     */
    public @NonNull NodeRunStatus getBranchStatus(WorkflowRun run, BlockStartNode branchStartNode) {
        if (this.branchStatuses == null) {
            calculateStatuses(run);
        }
        if (isDebugEnabled) {
            logger.debug(
                    "Branch status for {} ({}): '{}'",
                    branchStartNode.getId(),
                    getBranchName(branchStartNode),
                    this.branchStatuses.get(getBranchName(branchStartNode)));
        }
        boolean skippedStage = PipelineNodeUtil.isSkippedStage(branchStartNode);

        WarningAction warningAction = branchStartNode.getPersistentAction(WarningAction.class);
        if (warningAction != null) {
            return new NodeRunStatus(GenericStatus.fromResult(warningAction.getResult()), skippedStage);
        }

        return new NodeRunStatus(this.branchStatuses.get(getBranchName(branchStartNode)), skippedStage);
    }

    /*
     * Gets TimingInfo for relationship.
     */
    private void calculateStatuses(WorkflowRun run) {
        // The parallel API expects parallel end to be null if this is still running -
        // so only pass it if its not the start node;
        FlowNode parallelEndNode = (this.start != this.end) ? this.end : null;
        this.branchStatuses = StatusAndTiming.computeBranchStatuses2(
                run, this.start, this.branchStarts, this.branchEnds, parallelEndNode);
        for (int i = 0; i < this.branchStarts.size(); i++) {
            BlockStartNode branchStart = this.branchStarts.get(i);
            FlowNode branchEnd = this.branchEnds.get(i);
            if (isDebugEnabled) {
                logger.debug(
                        "Calculating parallel branch status {}, {}: {}",
                        branchStart.getId(),
                        (branchEnd != null) ? branchEnd.getId() : "null",
                        getBranchStatus(run, branchStart));
            }
        }

        if (isDebugEnabled) {
            logger.debug(
                    "Calculating parallel status {}, {} (with above branches)", this.start.getId(), this.end.getId());
        }
        this.overallStatus = StatusAndTiming.condenseStatus(this.branchStatuses.values());
    }
}
