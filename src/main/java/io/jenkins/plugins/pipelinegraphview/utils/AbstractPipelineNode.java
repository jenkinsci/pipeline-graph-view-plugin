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

    /**
     * Read-back constructor for the cached wire JSON. The wire shape splits {@code TimingInfo}
     * into three flat millis fields (and omits {@code totalDurationMillis} when in-progress);
     * we rebuild a {@link TimingInfo} so the rest of the object behaves identically to one
     * produced by the live compute path.
     */
    protected AbstractPipelineNode(
            String id,
            String name,
            PipelineState state,
            String type,
            String title,
            long pauseDurationMillis,
            Long totalDurationMillis,
            long startTimeMillis,
            String causeOfBlockage) {
        this(
                id,
                name,
                state,
                type,
                title,
                new TimingInfo(
                        totalDurationMillis != null ? totalDurationMillis : 0L, pauseDurationMillis, startTimeMillis),
                causeOfBlockage);
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
