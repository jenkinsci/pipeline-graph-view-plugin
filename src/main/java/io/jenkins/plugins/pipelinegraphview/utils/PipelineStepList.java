package io.jenkins.plugins.pipelinegraphview.utils;

import java.util.ArrayList;
import java.util.List;

public class PipelineStepList {

  private List<PipelineStep> steps;

  public PipelineStepList() {
    this.steps = new ArrayList<PipelineStep>();
  }

  public PipelineStepList(List<PipelineStep> steps) {
    this.steps = steps;
  }

  public List<PipelineStep> getSteps() {
    return steps;
  }

  public void addAll(List<PipelineStep> steps) {
    this.steps.addAll(steps);
  }
}
