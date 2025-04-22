package io.jenkins.plugins.pipelinegraphview.multipipelinegraphview;

import io.jenkins.plugins.pipelinegraphview.utils.BlueRun;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

public class PipelineRun {

    private final String id;
    private final String displayName;
    private final long timestamp;
    private final long duration;
    private final BlueRun.BlueRunResult result;

    public PipelineRun(WorkflowRun run) {
        this.id = run.getId();
        this.displayName = run.getDisplayName();
        this.timestamp = run.getTimeInMillis();
        this.duration = run.getDuration();
        this.result = BlueRun.BlueRunResult.fromResult(run.getResult());
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

    public BlueRun.BlueRunResult getResult() {
        return result;
    }
}
