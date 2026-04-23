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
            int cmp = Integer.compare(lhs.stageIdAsInt, rhs.stageIdAsInt);
            if (cmp != 0) {
                return cmp;
            }
            return Integer.compare(lhs.idAsInt, rhs.idAsInt);
        });
    }

    public void addAll(List<PipelineStep> steps) {
        this.steps.addAll(steps);
    }
}
