package io.jenkins.plugins.pipelinegraphview.utils;

import java.util.List;
import org.jenkinsci.plugins.workflow.pipelinegraphanalysis.TimingInfo;

public class PipelineStage extends AbstractPipelineNode {

    private List<PipelineStage> children;
    private String seqContainerName;
    private final PipelineStage nextSibling;
    private boolean sequential;
    private boolean synthetic;
    private String agent;
    private String url;

    public PipelineStage(
            String id,
            String name,
            List<PipelineStage> children,
            String state,
            String type,
            String title,
            String seqContainerName,
            PipelineStage nextSibling,
            boolean sequential,
            boolean synthetic,
            TimingInfo timingInfo,
            String agent,
            String runUrl) {
        super(id, name, state, type, title, timingInfo);
        this.children = children;
        this.seqContainerName = seqContainerName;
        this.nextSibling = nextSibling;
        this.sequential = sequential;
        this.synthetic = synthetic;
        this.agent = agent;
        this.url = "/" + runUrl + "pipeline-console?selected-node=" + id;
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

    public List<PipelineStage> getChildren() {
        return children;
    }

    public boolean isSynthetic() {
        return synthetic;
    }

    public String getAgent() {
        return agent;
    }

    public String getUrl() {
        return url;
    }
}
