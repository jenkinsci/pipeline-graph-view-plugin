package io.jenkins.plugins.pipelinegraphview.utils;

import java.util.List;
import java.util.Map;

public interface PipelineStepBuilderApi {
    public Map<String, List<FlowNodeWrapper>> getAllSteps();

    public List<FlowNodeWrapper> getStageSteps(String startNodeId);
}
