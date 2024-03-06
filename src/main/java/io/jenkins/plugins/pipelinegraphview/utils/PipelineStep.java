package io.jenkins.plugins.pipelinegraphview.utils;

import java.util.Locale;

public class PipelineStep {

    private String name;
    private String state; // TODO enum
    private int completePercent; // TODO int is fine?
    private String type; // TODO enum
    private String title;
    private int id;
    private String stageId;
    private String pauseDurationMillis;
    private String startTimeMillis;
    private String totalDurationMillis;

    public PipelineStep(
            int id,
            String name,
            String state,
            int completePercent,
            String type,
            String title,
            String stageId,
            String pauseDurationMillis,
            String startTimeMillis,
            String totalDurationMillis) {

        this.id = id;
        this.name = name;
        this.state = state.toLowerCase(Locale.ROOT);
        this.completePercent = completePercent;
        this.type = type;
        this.title = title;
        this.stageId = stageId;
        this.pauseDurationMillis = pauseDurationMillis;
        this.startTimeMillis = startTimeMillis;
        this.totalDurationMillis = totalDurationMillis;
    }

    public String getPauseDurationMillis() {
        return pauseDurationMillis;
    }

    public String getStartTimeMillis() {
        return startTimeMillis;
    }

    public String getTotalDurationMillis() {
        return totalDurationMillis;
    }

    public int getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getState() {
        return state;
    }

    public int getCompletePercent() {
        return completePercent;
    }

    public String getType() {
        return type;
    }

    public String getTitle() {
        return title;
    }

    public String getStageId() {
        return stageId;
    }
}
