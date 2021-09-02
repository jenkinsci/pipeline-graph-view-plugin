package io.jenkins.plugins.pipelinegraphview.multipipelinegraphview;

import org.jenkinsci.plugins.workflow.job.WorkflowRun;

public class PipelineRun {

  private String id;
  private String displayName;

  public PipelineRun(WorkflowRun run) {
    this.id = run.getId();
    this.displayName = run.getDisplayName();
  }

  public String getId() {
    return id;
  }

  public String getDisplayName() {
    return displayName;
  }
}
