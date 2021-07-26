package io.jenkins.plugins.pipelinegraphview;

import hudson.Extension;
import hudson.model.Action;
import java.util.Collection;
import java.util.Collections;
import jenkins.model.TransientActionFactory;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

@Extension
public class PipelineGraphViewActionFactory extends TransientActionFactory<WorkflowRun> {

  @Override
  public Class<WorkflowRun> type() {
    return WorkflowRun.class;
  }

  @Override
  public Collection<? extends Action> createFor(WorkflowRun target) {
    PipelineGraphViewAction a = new PipelineGraphViewAction(target);
    return Collections.singleton(a);
  }
}
