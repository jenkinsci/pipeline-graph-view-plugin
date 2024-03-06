package io.jenkins.plugins.pipelinegraphview.utils;

import hudson.Util;
import java.util.Date;
import java.util.List;

public class PipelineStage {

    private String name;
    private List<PipelineStage> children;
    private String state; // TODO enum
    private int completePercent; // TODO int is fine?
    private String type; // TODO enum
    private String title;
    private String id; // TODO what's this for?
    private String seqContainerName;
    private final PipelineStage nextSibling;
    private boolean sequential;
    private boolean synthetic;
    private String pauseDurationMillis;
    private String startTimeMillis;
    private String totalDurationMillis;

    public PipelineStage(
            String id,
            String name,
            List<PipelineStage> children,
            String state,
            int completePercent,
            String type,
            String title,
            String seqContainerName,
            PipelineStage nextSibling,
            boolean sequential,
            boolean synthetic,
            Long pauseDurationMillis,
            Long startTimeMillis,
            Long totalDurationMillis) {
        this.id = id;
        this.name = name;
        this.children = children;
        this.state = state.toLowerCase();
        this.completePercent = completePercent;
        this.type = type;
        this.title = title;
        this.seqContainerName = seqContainerName;
        this.nextSibling = nextSibling;
        this.sequential = sequential;
        this.synthetic = synthetic;
        this.pauseDurationMillis = "Queued " + Util.getTimeSpanString(pauseDurationMillis);
        this.startTimeMillis = startTimeMillis == 0
                ? ""
                : "Started " + Util.getTimeSpanString(Math.abs(startTimeMillis - new Date().getTime())) + " ago";
        this.totalDurationMillis = "Took " + Util.getTimeSpanString(totalDurationMillis);
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

    public PipelineStage getNextSibling() {
        return nextSibling;
    }

    // TODO clean up naming
    // HACK: blue ocean has a broken name for this 'isSequential'
    public boolean getIsSequential() {
        return sequential;
    }

    public String getSeqContainerName() {
        return seqContainerName;
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public List<PipelineStage> getChildren() {
        return children;
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

    public boolean isSynthetic() {
        return synthetic;
    }
}
