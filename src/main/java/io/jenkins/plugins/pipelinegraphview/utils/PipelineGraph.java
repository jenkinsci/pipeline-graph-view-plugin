package io.jenkins.plugins.pipelinegraphview.utils;

import java.util.List;

public class PipelineGraph {

    private List<PipelineStage> stages;
    private boolean complete = false;

    public PipelineGraph(List<PipelineStage> stages, boolean complete) {
        this.stages = stages;
        this.complete = complete;
    }

    public boolean isComplete() {
        return complete;
    }

    public List<PipelineStage> getStages() {
        return stages;
    }
}
