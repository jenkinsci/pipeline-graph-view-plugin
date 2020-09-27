package net.histos.jenkins.pipeline.graph;

import hudson.model.Action;

public class PipelineGraphViewAction implements Action {

    @Override
    public String getIconFileName() {
        return null;
    }

    @Override
    public String getDisplayName() {
        return "Pipeline Graph";
    }

    @Override
    public String getUrlName() {
        return "pipelineGraph";
    }
    
}
