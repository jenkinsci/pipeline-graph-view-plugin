package io.jenkins.plugins.pipelinegraphview.utils;

import java.util.Locale;
import org.jenkinsci.plugins.workflow.pipelinegraphanalysis.TimingInfo;

public class AbstractPipelineNode {
    private String name;
    private String state; // TODO enum
    private String type; // TODO enum
    private String title;
    private String id;
    private long pauseDurationMillis;
    private long totalDurationMillis;
    private TimingInfo timingInfo;

    public AbstractPipelineNode(
            String id, String name, String state, String type, String title, TimingInfo timingInfo) {
        this.id = id;
        this.name = name;
        this.state = state.toLowerCase(Locale.ROOT);
        this.type = type;
        this.title = title;
        this.timingInfo = timingInfo;
        // These values won't change for a given TimingInfo.
        this.pauseDurationMillis = timingInfo.getPauseDurationMillis();
        this.totalDurationMillis = timingInfo.getTotalDurationMillis();
    }

    public long getPauseDurationMillis() {
        return pauseDurationMillis;
    }

    public long getStartTimeMillis() {
        return timingInfo.getStartTimeMillis();
    }

    public long getTotalDurationMillis() {
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

    // TODO: 16/04/2025 Delete this
    public int getCompletePercent() {
        return 0;
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
