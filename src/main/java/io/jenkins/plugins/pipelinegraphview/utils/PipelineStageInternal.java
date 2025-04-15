package io.jenkins.plugins.pipelinegraphview.utils;

import java.util.Collections;
import java.util.List;
import java.util.Locale;
import org.jenkinsci.plugins.workflow.pipelinegraphanalysis.TimingInfo;

class PipelineStageInternal {

    private String name;
    private List<String> parents;
    private PipelineStatus state; // TODO enum
    private int completePercent; // TODO int is fine?
    private String type; // TODO enum
    private String title;
    private String id;
    private String seqContainerName;
    private PipelineStageInternal nextSibling;
    private boolean sequential;
    private boolean synthetic;
    private TimingInfo timingInfo;
    private String agent;

    public PipelineStageInternal(
            String id,
            String name,
            List<String> parents,
            PipelineStatus state,
            int completePercent,
            String type,
            String title,
            boolean synthetic,
            TimingInfo times,
            String agent) {
        this.id = id;
        this.name = name;
        this.parents = parents;
        this.state = state;
        this.completePercent = completePercent;
        this.type = type;
        this.title = title;
        this.synthetic = synthetic;
        this.timingInfo = times;
        this.agent = agent;
    }

    public boolean isSequential() {
        return sequential;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setSequential(boolean sequential) {
        this.sequential = sequential;
    }

    public void setState(PipelineStatus state) {
        this.state = state;
    }

    public void setCompletePercent(int completePercent) {
        this.completePercent = completePercent;
    }

    public void setType(String type) {
        this.type = type;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public void setNextSibling(PipelineStageInternal nextSibling) {
        this.nextSibling = nextSibling;
    }

    public void setSeqContainerName(String seqContainerName) {
        this.seqContainerName = seqContainerName;
    }

    public void setName(String name) {
        this.name = name;
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

    public List<String> getParents() {
        return parents;
    }

    public PipelineStatus getState() {
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

    public void setSynthetic(boolean synthetic) {
        this.synthetic = synthetic;
    }

    public String getAgent() {
        return agent;
    }

    public void setAgent(String aAgent) {
        this.agent = aAgent;
    }

    public TimingInfo getTimingInfo() {
        return timingInfo;
    }

    public PipelineStage toPipelineStage(List<PipelineStage> children, String runUrl) {
        return new PipelineStage(
                id,
                name,
                children,
                state.toString(),
                completePercent,
                type,
                title,
                seqContainerName,
                nextSibling != null ? nextSibling.toPipelineStage(Collections.emptyList(), runUrl) : null,
                sequential,
                synthetic,
                timingInfo,
                agent,
                runUrl);
    }
}
