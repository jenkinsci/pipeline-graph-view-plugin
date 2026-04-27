package io.jenkins.plugins.pipelinegraphview.utils;

import com.fasterxml.jackson.annotation.JsonCreator;
import java.util.List;

public class PipelineGraph {

    final List<PipelineStage> stages;
    public final boolean complete;

    @JsonCreator
    public PipelineGraph(List<PipelineStage> stages, boolean complete) {
        this.stages = stages;
        this.complete = complete;
    }
}
