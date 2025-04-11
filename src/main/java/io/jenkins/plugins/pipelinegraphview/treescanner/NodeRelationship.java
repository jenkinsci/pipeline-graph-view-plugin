package io.jenkins.plugins.pipelinegraphview.treescanner;

import edu.umd.cs.findbugs.annotations.CheckForNull;
import edu.umd.cs.findbugs.annotations.NonNull;
import io.jenkins.plugins.pipelinegraphview.utils.BlueRun;
import io.jenkins.plugins.pipelinegraphview.utils.NodeRunStatus;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineNodeUtil;
import org.jenkinsci.plugins.workflow.actions.WarningAction;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.pipelinegraphanalysis.GenericStatus;
import org.jenkinsci.plugins.workflow.pipelinegraphanalysis.StatusAndTiming;
import org.jenkinsci.plugins.workflow.pipelinegraphanalysis.TimingInfo;
import org.jenkinsci.plugins.workflow.support.actions.PauseAction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class NodeRelationship {
    private boolean isDebugEnabled = logger.isDebugEnabled();
    private static final Logger logger = LoggerFactory.getLogger(NodeRelationship.class);

    @NonNull
    protected FlowNode start;

    @NonNull
    protected FlowNode end;

    @CheckForNull
    protected FlowNode before;

    @CheckForNull
    protected FlowNode after;

    public NodeRelationship(@NonNull FlowNode start, @NonNull FlowNode end, @CheckForNull FlowNode after) {
        assert start != null;
        assert end != null;
        this.after = after;
        this.start = start;
        this.end = end;
    }

    /*
     * Returns the recorded node that was run before this node
     * Returns null if unset (e.g.)
     */
    @CheckForNull
    public FlowNode getBefore() {
        return this.before;
    }

    /*
     * Sets the node that appears before this node in the graph.
     */
    public void setBefore(@CheckForNull FlowNode before) {
        this.before = before;
    }

    /*
     * Returns the recorded node that was run before this node
     * Returns null if unset (i.e this is the last node).
     */
    @CheckForNull
    public FlowNode getAfter() {
        return this.after;
    }

    /*
     * Sets matching start node for this end node.
     * Will return null if this is not an end node.
     */
    @NonNull
    public FlowNode getStart() {
        return this.start;
    }

    /*
     * Sets matching end node for this start node.
     * Will return null if this is not a start node.
     */
    @NonNull
    public FlowNode getEnd() {
        return this.end;
    }

    /*
     * Gets TimingInfo for relationship.
     */
    public @NonNull TimingInfo getTimingInfo(@NonNull WorkflowRun run) {
        long pause = PauseAction.getPauseDuration(this.start);
        if (isDebugEnabled) {
            logger.debug(
                    "Calculating Chunk Timing info start: {}, end: {} after: {}",
                    this.start.getId(),
                    this.end.getId(),
                    (this.after != null) ? this.after.getId() : "null");
        }
        TimingInfo timing = StatusAndTiming.computeChunkTiming(run, pause, this.start, this.end, this.after);
        if (timing != null) {
            return timing;
        }
        return new TimingInfo(0, 0, 0);
    }

    /*
     * Gets Status for relationship.
     */
    public @NonNull NodeRunStatus getStatus(WorkflowRun run) {
        boolean skippedStage = PipelineNodeUtil.isSkippedStage(start);
        if (skippedStage) {
            return new NodeRunStatus(BlueRun.BlueRunResult.NOT_BUILT, BlueRun.BlueRunState.SKIPPED);
        } else if (PipelineNodeUtil.isPaused(this.end)) {
            return new NodeRunStatus(BlueRun.BlueRunResult.UNKNOWN, BlueRun.BlueRunState.PAUSED);
        } else if (PipelineNodeUtil.isStage(start)) {
            WarningAction warningAction = start.getPersistentAction(WarningAction.class);
            if (warningAction != null) {
                return new NodeRunStatus(GenericStatus.fromResult(warningAction.getResult()));
            }
        }
        if (isDebugEnabled) {
            logger.debug(
                    "Calculating Chunk Status start: {}, end: {} after: {}",
                    this.start.getId(),
                    this.end.getId(),
                    (this.after != null) ? this.after.getId() : "null");
        }

        // If start and end are equal this is a StepNode
        if (this.start.getId().equals(this.end.getId())) {
            return new NodeRunStatus(this.start);
        }

        // Catch-all if none of the above are applicable.
        return new NodeRunStatus(
                StatusAndTiming.computeChunkStatus2(run, this.before, this.start, this.end, this.after));
    }
}
