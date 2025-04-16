package io.jenkins.plugins.pipelinegraphview.utils;

import org.jenkinsci.plugins.workflow.pipelinegraphanalysis.TimingInfo;

public class PipelineStep extends AbstractPipelineNode {
    private String stageId;

    PipelineStep(
            String id,
            String name,
            PipelineStatus state,
            String type,
            String title,
            String stageId,
            TimingInfo timingInfo) {
        super(id, name, state.toString(), type, title, timingInfo);
        this.stageId = stageId;
    }

    public String getStageId() {
        return stageId;
    }
}
