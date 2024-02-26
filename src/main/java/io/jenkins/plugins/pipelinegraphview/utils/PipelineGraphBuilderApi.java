package io.jenkins.plugins.pipelinegraphview.utils;

import java.util.List;

public interface PipelineGraphBuilderApi {

    public List<FlowNodeWrapper> getPipelineNodes();
}
