package io.jenkins.plugins.pipelinegraphview;

import java.util.List;

public class PipelineStageInternal {

    private String name;
    private List<Integer> parents;
    private String state; // TODO enum
    private int completePercent; // TODO int is fine?
    private String type; // TODO enum
    private String title;
    private int id; // TODO what's this for?
    private String seqContainerName;
    private PipelineStageInternal nextSibling;
    private boolean sequential;

    public PipelineStageInternal(
            int id,
            String name,
            List<Integer> parents,
            String state,
            int completePercent,
            String type,
            String title
    ) {
        this.id = id;
        this.name = name;
        this.parents = parents;
        this.state = state;
        this.completePercent = completePercent;
        this.type = type;
        this.title = title;
    }

    public boolean isSequential() {
        return sequential;
    }

    public void setSequential(boolean sequential) {
        this.sequential = sequential;
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

    public int getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public List<Integer> getParents() {
        return parents;
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

    public PipelineStage toPipelineStage(List<PipelineStage> children) {
        return new PipelineStage(
                id,
                name,
                children,
                state,
                completePercent,
                type,
                title,
                seqContainerName,
                nextSibling,
                sequential
        );
    }
}
