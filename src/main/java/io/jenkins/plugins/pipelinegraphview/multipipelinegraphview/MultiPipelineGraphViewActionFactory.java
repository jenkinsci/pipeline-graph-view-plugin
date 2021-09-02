package io.jenkins.plugins.pipelinegraphview.multipipelinegraphview;

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

  @Override
  public Collection<? extends Action> createFor(WorkflowJob target) {
    MultiPipelineGraphViewAction a = new MultiPipelineGraphViewAction(target);
    return Collections.singleton(a);
  }
}
