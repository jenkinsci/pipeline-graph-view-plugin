package io.jenkins.plugins.pipelinegraphview.utils;

import static io.jenkins.plugins.pipelinegraphview.consoleview.PipelineConsoleViewAction.URL_NAME;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.jenkins.plugins.pipelinegraphview.analysis.TimingInfo;
import java.util.List;

public class PipelineStage extends AbstractPipelineNode {

    final List<PipelineStage> children;
    private final String seqContainerName;
    private final PipelineStage nextSibling;

    // The legacy wire format spells this {@code isSequential}, not {@code sequential}.
    @JsonProperty("isSequential")
    private final boolean sequential;

    final boolean synthetic;
    private final boolean placeholder;
    final String agent;
    private final String url;

    public PipelineStage(
            String id,
            String name,
            List<PipelineStage> children,
            PipelineState state,
            String type,
            String title,
            String seqContainerName,
            PipelineStage nextSibling,
            boolean sequential,
            boolean synthetic,
            boolean placeholder,
            TimingInfo timingInfo,
            String agent,
            String runUrl) {
        super(id, name, state, type, title, timingInfo);
        this.children = children;
        this.seqContainerName = seqContainerName;
        this.nextSibling = nextSibling;
        this.sequential = sequential;
        this.synthetic = synthetic;
        this.placeholder = placeholder;
        this.agent = agent;
        this.url = "/" + runUrl + URL_NAME + "/?selected-node=" + id;
    }

}
