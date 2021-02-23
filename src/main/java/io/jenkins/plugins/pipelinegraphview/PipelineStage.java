package io.jenkins.plugins.pipelinegraphview;

import java.util.List;

public class PipelineStage {

    private String name;
    private List<PipelineStage> children;
    private String state; // TODO enum
    private int completePercent; // TODO int is fine?
    private String type; // TODO enum
    private String title;
    private int id; // TODO what's this for?

    public PipelineStage(
            int id,
            String name,
            List<PipelineStage> children,
            String state,
            int completePercent,
            String type,
            String title
    ) {
        this.id = id;
        this.name = name;
        this.children = children;
        this.state = state;
        this.completePercent = completePercent;
        this.type = type;
        this.title = title;
    }

    public int getId() {
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
}
