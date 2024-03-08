package io.jenkins.plugins.pipelinegraphview.utils;

import hudson.Util;
import java.util.Date;
import java.util.Locale;
import org.jenkinsci.plugins.workflow.pipelinegraphanalysis.TimingInfo;

public class AbstractPipelineNode {
    private String name;
    private String state; // TODO enum
    private int completePercent; // TODO int is fine?
    private String type; // TODO enum
    private String title;
    private String id;
    private String pauseDurationMillis;
    private String totalDurationMillis;
    private TimingInfo timingInfo;

    public AbstractPipelineNode(
            String id,
            String name,
            String state,
            int completePercent,
            String type,
            String title,
            TimingInfo timingInfo) {
        this.id = id;
        this.name = name;
        this.state = state.toLowerCase(Locale.ROOT);
        this.completePercent = completePercent;
        this.type = type;
        this.title = title;
        this.timingInfo = timingInfo;
        // These values won't change for a given TimingInfo.
        this.pauseDurationMillis = getUserFriendlyPauseDuration(timingInfo.getPauseDurationMillis());
        this.totalDurationMillis = getUserFriendlyDuration(timingInfo.getTotalDurationMillis());
    }

    protected static String getUserFriendlyPauseDuration(long pauseDurationMillis) {
        return "Queued " + Util.getTimeSpanString(pauseDurationMillis);
    }

    protected static String getUserFriendlyStartTime(long startTimeMillis) {
        return startTimeMillis == 0
                ? ""
                : "Started " + Util.getTimeSpanString(Math.abs(startTimeMillis - new Date().getTime())) + " ago";
    }

    protected static String getUserFriendlyDuration(long totalDurationMillis) {
        return "Took " + Util.getTimeSpanString(totalDurationMillis);
    }

    public String getPauseDurationMillis() {
        return pauseDurationMillis;
    }

    public String getStartTimeMillis() {
        // Dynamically generate as it depends of the current time.
        return getUserFriendlyStartTime(timingInfo.getStartTimeMillis());
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

    protected TimingInfo getTimingInfo() {
        return this.timingInfo;
    }
}
