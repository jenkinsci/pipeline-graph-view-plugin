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

    /* Sorts the list of PipelineSteps by stageId and Id. */
    public void sort() {
        this.steps.sort((lhs, rhs) -> {
            if (lhs.getStageId().equals(rhs.getStageId())) {
                return Integer.compare(Integer.parseInt(lhs.getStageId()), Integer.parseInt(rhs.getStageId()));
            } else {
                return Integer.compare(lhs.getId(), rhs.getId());
            }
        });
    }

    public void addAll(List<PipelineStep> steps) {
        this.steps.addAll(steps);
    }
}
