package io.jenkins.plugins.pipelinegraphview.multipipelinegraphview;

import edu.umd.cs.findbugs.annotations.NonNull;
import hudson.Extension;
import hudson.model.Action;
import java.util.Collection;
import java.util.List;
import jenkins.model.TransientActionFactory;
import jenkins.model.experimentalflags.UserExperimentalFlag;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;

/**
 * Adds "Stage durations" to the new job page's overflow menu.
 */
@Extension
public class StageDurationsActionFactory extends TransientActionFactory<WorkflowJob> {

    @Override
    public Class<WorkflowJob> type() {
        return WorkflowJob.class;
    }

    @NonNull
    @Override
    public Collection<? extends Action> createFor(@NonNull WorkflowJob target) {
        // The classic job page would list it in the sidebar too
        if (!Boolean.TRUE.equals(
                UserExperimentalFlag.getFlagValueForCurrentUser(MultiPipelineGraphViewAction.NEW_JOB_PAGE_FLAG))) {
            return List.of();
        }
        return List.of(new StageDurationsAction());
    }
}
