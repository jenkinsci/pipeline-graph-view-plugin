package io.jenkins.plugins.pipelinegraphview.utils;

import java.util.ArrayList;
import java.util.List;

public class PipelineStepList {

    public final List<PipelineStep> steps;
    public final boolean runIsComplete;

    public PipelineStepList(boolean runIsComplete) {
        this.steps = new ArrayList<>();
        this.runIsComplete = runIsComplete;
    }

    public PipelineStepList(List<PipelineStep> steps, boolean runIsComplete) {
        this.steps = steps;
        this.runIsComplete = runIsComplete;
    }

    /* Sorts the list of PipelineSteps by stageId and Id. */
    public void sort() {
        this.steps.sort((lhs, rhs) -> {
            if (!lhs.stageId.equals(rhs.stageId)) {
                return FlowNodeWrapper.compareIds(lhs.stageId, rhs.stageId);
            }
            return FlowNodeWrapper.compareIds(lhs.id, rhs.id);
        });
    }

    public void addAll(List<PipelineStep> steps) {
        this.steps.addAll(steps);
    }
}
