package io.jenkins.plugins.pipelinegraphview;

import java.util.List;

public class PipelineGraph {

    private List<PipelineStage> stages;

    public PipelineGraph(List<PipelineStage> stages) {
        this.stages = stages;
    }

    public List<PipelineStage> getStages() {
        return stages;
    }
}
