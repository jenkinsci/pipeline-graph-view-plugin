package io.jenkins.plugins.pipelinegraphview.utils;

import io.jenkins.plugins.pipelinegraphview.analysis.TimingInfo;

public class PipelineStep extends AbstractPipelineNode {
    private final String stageId;
    private final PipelineInputStep inputStep;

    public PipelineStep(
            String id,
            String name,
            PipelineState state,
            String type,
            String title,
            String stageId,
            PipelineInputStep inputStep,
            TimingInfo timingInfo) {
        super(id, name, state, type, title, timingInfo);
        this.stageId = stageId;
        this.inputStep = inputStep;
    }

    public String getStageId() {
        return stageId;
    }

    public PipelineInputStep getInputStep() {
        return inputStep;
    }
}
