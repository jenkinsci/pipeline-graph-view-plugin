package io.jenkins.plugins.pipelinegraphview.multipipelinegraphview;

import edu.umd.cs.findbugs.annotations.NonNull;
import hudson.Extension;
import hudson.model.Action;
import java.util.Collection;
import java.util.Collections;
import jenkins.model.TransientActionFactory;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;

@Extension
public class MultiPipelineGraphViewActionFactory extends TransientActionFactory<WorkflowJob> {

    @Override
    public Class<WorkflowJob> type() {
        return WorkflowJob.class;
    }

    @NonNull
    @Override
    public Collection<? extends Action> createFor(@NonNull WorkflowJob target) {
        MultiPipelineGraphViewAction a = new MultiPipelineGraphViewAction(target);
        return Collections.singleton(a);
    }
}
