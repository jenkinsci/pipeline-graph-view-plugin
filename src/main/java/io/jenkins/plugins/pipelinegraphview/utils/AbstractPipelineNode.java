package io.jenkins.plugins.pipelinegraphview.utils;

import hudson.Util;
import java.util.Date;
import java.util.Locale;

public class AbstractPipelineNode {
    private String name;
    private String state; // TODO enum
    private int completePercent; // TODO int is fine?
    private String type; // TODO enum
    private String title;
    private String id;
    private String pauseDurationMillis;
    private String startTimeMillis;
    private String totalDurationMillis;

    public AbstractPipelineNode(
            String id,
            String name,
            String state,
            int completePercent,
            String type,
            String title,
            String pauseDurationMillis,
            String startTimeMillis,
            String totalDurationMillis) {
        this.id = id;
        this.name = name;
        this.state = state.toLowerCase(Locale.ROOT);
        this.completePercent = completePercent;
        this.type = type;
        this.title = title;
        this.pauseDurationMillis = pauseDurationMillis;
        this.startTimeMillis = startTimeMillis;
        this.totalDurationMillis = totalDurationMillis;
    }

    protected static String getUserFriendlyPauseDuration(Long pauseDurationMillis) {
        return "Queued " + Util.getTimeSpanString(pauseDurationMillis);
    }

    protected static String getUserFriendlyStartTime(Long startTimeMillis) {
        return startTimeMillis == 0
                ? ""
                : "Started " + Util.getTimeSpanString(Math.abs(startTimeMillis - new Date().getTime())) + " ago";
    }

    protected static String getUserFriendlyDuration(Long totalDurationMillis) {
        return "Took " + Util.getTimeSpanString(totalDurationMillis);
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

    public String getId() {
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
}
