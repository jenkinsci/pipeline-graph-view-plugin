package io.jenkins.plugins.pipelinegraphview;

import io.jenkins.plugins.pipelinegraphview.utils.AbstractPipelineViewAction;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

public class PipelineGraphViewAction extends AbstractPipelineViewAction {
  public PipelineGraphViewAction(WorkflowRun target) {
    super(target);
  }

  @Override
  public String getDisplayName() {
    return "Pipeline Graph";
  }

  @Override
  public String getUrlName() {
    return "pipeline-graph";
  }
}
