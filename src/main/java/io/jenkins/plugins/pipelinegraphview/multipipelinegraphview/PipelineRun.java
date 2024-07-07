package io.jenkins.plugins.pipelinegraphview.multipipelinegraphview;

import hudson.Util;
import hudson.model.Result;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

public class PipelineRun {

    private final String id;
    private final String displayName;
    private final String duration;
    private final String result;
    private final Long startTime;

    public PipelineRun(WorkflowRun run) {
        this.id = run.getId();
        this.displayName = run.getDisplayName();
        this.duration = Util.getTimeSpanString(run.getDuration());

        Result buildResult = run.getResult();
        this.result = (buildResult != null) ? buildResult.toString() : "IN_PROGRESS";

        this.startTime = run.getStartTimeInMillis();
    }

    public String getId() {
        return id;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getDuration() {
        return duration;
    }

    public String getResult() {
        return result;
    }

    public Long getStartTime() {
        return startTime;
    }
}
