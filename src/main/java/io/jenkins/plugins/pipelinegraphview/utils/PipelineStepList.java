package io.jenkins.plugins.pipelinegraphview.utils;

import java.util.List;

public class PipelineStepList {

    private List<PipelineStep> steps;

    public PipelineStepList(List<PipelineStep> steps) {
        this.steps = steps;
    }

    public List<PipelineStep> getSteps() {
        return steps;
    }
}
