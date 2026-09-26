package io.jenkins.plugins.pipelinegraphview.utils;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonIgnore;
import io.jenkins.plugins.pipelinegraphview.analysis.TimingInfo;
import java.util.Map;

public class PipelineStep extends AbstractPipelineNode {
    final String stageId;

    // Parsed form of {@link #stageId} for sort comparisons.
    @JsonIgnore
    final int stageIdAsInt;

    final PipelineInputStep inputStep;
    final PipelineBuildStep buildStep;
    private final Map<String, Object> flags;

    public PipelineStep(
            String id,
            String name,
            PipelineState state,
            String type,
            String title,
            String stageId,
            PipelineInputStep inputStep,
            PipelineBuildStep buildStep,
            TimingInfo timingInfo,
            Map<String, Object> flags) {
        super(id, name, state, type, title, timingInfo, null);
        this.stageId = stageId;
        this.stageIdAsInt = Integer.parseInt(stageId);
        this.inputStep = inputStep;
        this.buildStep = buildStep;
        this.flags = flags;
    }

    @JsonCreator
    PipelineStep(
            String id,
            String name,
            PipelineState state,
            String type,
            String title,
            long pauseDurationMillis,
            Long totalDurationMillis,
            long startTimeMillis,
            String stageId,
            PipelineInputStep inputStep,
            PipelineBuildStep buildStep,
            Map<String, Object> flags) {
        super(id, name, state, type, title, pauseDurationMillis, totalDurationMillis, startTimeMillis, null);
        this.stageId = stageId;
        this.stageIdAsInt = Integer.parseInt(stageId);
        this.inputStep = inputStep;
        this.buildStep = buildStep;
        this.flags = flags;
    }

    public Map<String, Object> getFlags() {
        return flags;
    }
}
