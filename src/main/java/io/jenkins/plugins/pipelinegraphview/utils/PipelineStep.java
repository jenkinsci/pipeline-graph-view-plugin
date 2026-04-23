package io.jenkins.plugins.pipelinegraphview.utils;

import io.jenkins.plugins.pipelinegraphview.analysis.TimingInfo;
import java.util.Map;

public class PipelineStep extends AbstractPipelineNode {
    final String stageId;
    final PipelineInputStep inputStep;
    private final Map<String, Object> flags;

    public PipelineStep(
            String id,
            String name,
            PipelineState state,
            String type,
            String title,
            String stageId,
            PipelineInputStep inputStep,
            TimingInfo timingInfo,
            Map<String, Object> flags) {
        super(id, name, state, type, title, timingInfo);
        this.stageId = stageId;
        this.inputStep = inputStep;
        this.flags = flags;
    }

    public Map<String, Object> getFlags() {
        return flags;
    }
}
