package io.jenkins.plugins.pipelinegraphview.multipipelinegraphview;

import hudson.Util;
import hudson.model.Result;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

public class PipelineRun {

    private String id;
    private String displayName;
    private String duration;
    private String result;
    private String startTime;

    public PipelineRun(WorkflowRun run) {
        this.id = run.getId();
        this.displayName = run.getDisplayName();
        this.duration = Util.getTimeSpanString(run.getDuration());

        Result buildResult = run.getResult();
        this.result = (buildResult != null) ? buildResult.toString() : "IN_PROGRESS";

        SimpleDateFormat sdf = new SimpleDateFormat("MMM dd, yyyy, hh:mm a", Locale.getDefault());
        sdf.setTimeZone(TimeZone.getDefault());
        this.startTime = sdf.format(new Date(run.getStartTimeInMillis()));
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

    public String getStartTime() {
        return startTime;
    }
}
