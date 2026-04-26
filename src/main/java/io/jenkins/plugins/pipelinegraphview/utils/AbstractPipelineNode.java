package io.jenkins.plugins.pipelinegraphview.utils;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import io.jenkins.plugins.pipelinegraphview.analysis.TimingInfo;

public class AbstractPipelineNode {
    final String name;
    final PipelineState state;
    final String type; // TODO enum
    final String title;
    public final String id;
    private final long pauseDurationMillis;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private final String causeOfBlockage;

    // Cached value; the serialised view is the null-aware getTotalDurationMillis() below.
    @JsonIgnore
    private final long cachedTotalDurationMillis;

    // Parsed form of {@link #id} for sort comparisons.
    @JsonIgnore
    final int idAsInt;

    @JsonIgnore
    final TimingInfo timingInfo;

    public AbstractPipelineNode(
            String id,
            String name,
            PipelineState state,
            String type,
            String title,
            TimingInfo timingInfo,
            String causeOfBlockage) {
        this.id = id;
        this.name = name;
        this.state = state;
        this.type = type;
        this.title = title;
        this.timingInfo = timingInfo;
        this.causeOfBlockage = causeOfBlockage;
        // These values won't change for a given TimingInfo.
        this.pauseDurationMillis = timingInfo.getPauseDurationMillis();
        this.cachedTotalDurationMillis = timingInfo.getTotalDurationMillis();
        this.idAsInt = Integer.parseInt(id);
    }

    public long getStartTimeMillis() {
        return timingInfo.getStartTimeMillis();
    }

    public Long getTotalDurationMillis() {
        return state.isInProgress() ? null : cachedTotalDurationMillis;
    }

    public String getCauseOfBlockage() {
        return causeOfBlockage;
    }
}
