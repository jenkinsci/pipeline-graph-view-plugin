package io.jenkins.plugins.pipelinegraphview;

import java.util.List;

public class PipelineGraph {

    private List<PipelineStage> stages;
    private boolean complete = false;

    public PipelineGraph(List<PipelineStage> stages, boolean isComplete) {
        this.stages = stages;
        this.complete = isComplete;
    }

    public boolean isComplete() { return complete; }
    public List<PipelineStage> getStages() {
        return stages;
    }
}
