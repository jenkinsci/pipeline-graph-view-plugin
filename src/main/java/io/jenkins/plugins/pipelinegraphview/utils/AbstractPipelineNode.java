package io.jenkins.plugins.pipelinegraphview.utils;

import io.jenkins.plugins.pipelinegraphview.analysis.TimingInfo;

public class AbstractPipelineNode {
    private String name;
    private PipelineState state;
    private String type; // TODO enum
    private String title;
    private String id;
    private long pauseDurationMillis;
    private long totalDurationMillis;
    private TimingInfo timingInfo;

    public AbstractPipelineNode(
            String id, String name, PipelineState state, String type, String title, TimingInfo timingInfo) {
        this.id = id;
        this.name = name;
        this.state = state;
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

    public Long getTotalDurationMillis() {
        return state.isInProgress() ? null : totalDurationMillis;
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public PipelineState getState() {
        return state;
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
