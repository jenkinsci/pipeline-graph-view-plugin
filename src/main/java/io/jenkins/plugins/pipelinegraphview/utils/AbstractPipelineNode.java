package io.jenkins.plugins.pipelinegraphview.utils;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.jenkins.plugins.pipelinegraphview.analysis.TimingInfo;

public class AbstractPipelineNode {
    final String name;
    final PipelineState state;
    final String type; // TODO enum
    final String title;
    public final String id;
    private final long pauseDurationMillis;

    // Cached value; the serialised view is the null-aware getTotalDurationMillis() below.
    @JsonIgnore
    private final long cachedTotalDurationMillis;

    @JsonIgnore
    final TimingInfo timingInfo;

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
        this.cachedTotalDurationMillis = timingInfo.getTotalDurationMillis();
    }

    public long getStartTimeMillis() {
        return timingInfo.getStartTimeMillis();
    }

    public Long getTotalDurationMillis() {
        return state.isInProgress() ? null : cachedTotalDurationMillis;
    }
}
