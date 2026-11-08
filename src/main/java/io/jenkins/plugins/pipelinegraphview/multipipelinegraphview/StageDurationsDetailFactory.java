package io.jenkins.plugins.pipelinegraphview.multipipelinegraphview;

import edu.umd.cs.findbugs.annotations.NonNull;
import hudson.Extension;
import java.util.List;
import jenkins.model.details.Detail;
import jenkins.model.details.DetailFactory;
import jenkins.model.experimentalflags.UserExperimentalFlag;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;

/**
 * Adds a button to the new job page's builds list that opens the stage durations table.
 */
@Extension
public class StageDurationsDetailFactory extends DetailFactory<WorkflowJob> {

    @Override
    public Class<WorkflowJob> type() {
        return WorkflowJob.class;
    }

    @NonNull
    @Override
    public List<? extends Detail> createFor(@NonNull WorkflowJob target) {
        // The job's details are only shown above the builds list on the new job page
        if (!Boolean.TRUE.equals(
                UserExperimentalFlag.getFlagValueForCurrentUser(MultiPipelineGraphViewAction.NEW_JOB_PAGE_FLAG))) {
            return List.of();
        }
        return List.of(new StageDurationsDetail(target));
    }
}
