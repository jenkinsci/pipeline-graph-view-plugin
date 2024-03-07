package io.jenkins.plugins.pipelinegraphview.utils;

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
            long pauseDurationMillis,
            long startTimeMillis,
            long totalDurationMillis) {
        super(
                id,
                name,
                state,
                completePercent,
                type,
                title,
                getUserFriendlyPauseDuration(pauseDurationMillis),
                getUserFriendlyStartTime(startTimeMillis),
                getUserFriendlyDuration(totalDurationMillis));
        this.stageId = stageId;
    }

    public String getStageId() {
        return stageId;
    }
}
