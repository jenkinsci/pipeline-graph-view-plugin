package io.jenkins.plugins.pipelinegraphview.multipipelinegraphview;

import io.jenkins.plugins.pipelinegraphview.Messages;
import jenkins.model.details.Detail;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;

/**
 * A button that opens a table of how long each stage took in recent builds.
 */
public class StageDurationsDetail extends Detail {

    public StageDurationsDetail(WorkflowJob job) {
        super(job);
    }

    @Override
    public String getIconClassName() {
        return "symbol-stopwatch-outline plugin-ionicons-api";
    }

    @Override
    public String getDisplayName() {
        return Messages.stageDurations();
    }

    @Override
    public String getLink() {
        return ((WorkflowJob) getObject()).getUrl() + "multi-pipeline-graph/durations";
    }
}
