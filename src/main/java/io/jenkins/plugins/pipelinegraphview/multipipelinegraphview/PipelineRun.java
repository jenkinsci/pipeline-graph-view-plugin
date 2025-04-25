package io.jenkins.plugins.pipelinegraphview.multipipelinegraphview;

import io.jenkins.plugins.pipelinegraphview.utils.PipelineState;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

public class PipelineRun {

    private final String id;
    private final String displayName;
    private final long timestamp;
    private final long duration;
    private final PipelineState result;

    public PipelineRun(WorkflowRun run) {
        this.id = run.getId();
        this.displayName = run.getDisplayName();
        this.timestamp = run.getTimeInMillis();
        this.duration = run.getDuration();
        this.result = PipelineState.of(run);
    }

    public String getId() {
        return id;
    }

    public String getDisplayName() {
        return displayName;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public long getDuration() {
        return duration;
    }

    public PipelineState getResult() {
        return result;
    }
}
