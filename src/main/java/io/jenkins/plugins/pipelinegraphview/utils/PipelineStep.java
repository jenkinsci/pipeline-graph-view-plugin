package io.jenkins.plugins.pipelinegraphview.utils;

import org.jenkinsci.plugins.workflow.pipelinegraphanalysis.TimingInfo;

public class PipelineStep extends AbstractPipelineNode {
    private String stageId;

    public PipelineStep(
            String id,
            String name,
            String state,
            int completePercent,
            String type,
            String title,
            String stageId,
            TimingInfo timingInfo) {
        super(id, name, state, completePercent, type, title, timingInfo);
        this.stageId = stageId;
    }

    PipelineStep(
            String id,
            String name,
            PipelineStatus state,
            int completePercent,
            String type,
            String title,
            String stageId,
            TimingInfo timingInfo) {
        super(id, name, state.toString(), completePercent, type, title, timingInfo);
        this.stageId = stageId;
    }

    public String getStageId() {
        return stageId;
    }
}
