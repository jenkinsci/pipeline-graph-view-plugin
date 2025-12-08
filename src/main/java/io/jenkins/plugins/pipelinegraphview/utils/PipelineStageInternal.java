package io.jenkins.plugins.pipelinegraphview.utils;

import io.jenkins.plugins.pipelinegraphview.Messages;
import io.jenkins.plugins.pipelinegraphview.analysis.TimingInfo;
import java.util.Collections;
import java.util.List;

class PipelineStageInternal {

    private String name;
    private List<String> parents;
    private PipelineState state;
    private FlowNodeWrapper.NodeType type;
    private String title;
    private String id;
    private String seqContainerName;
    private PipelineStageInternal nextSibling;
    private boolean sequential;
    private boolean synthetic;
    private TimingInfo timingInfo;
    private String agent;
    private PipelineStepBuilderApi builder;

    public PipelineStageInternal(
            String id,
            String name,
            List<String> parents,
            PipelineState state,
            FlowNodeWrapper.NodeType type,
            String title,
            boolean synthetic,
            TimingInfo times,
            String agent) {
        this.id = id;
        this.name = name;
        this.parents = parents;
        this.state = state;
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

    public void setState(PipelineState state) {
        this.state = state;
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

    public PipelineState getState() {
        return state;
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

    public void setBuilder(PipelineStepBuilderApi builder) {
        this.builder = builder;
    }

    /**
     * Checks if this stage or any of its children are waiting for input.
     * A stage is waiting for input if any of its steps have a non-null inputStep
     * and the step state is PAUSED.
     */
    private boolean isWaitingForInput(List<PipelineStage> children) {
        // Check if any child stages are waiting for input
        if (children != null && !children.isEmpty()) {
            for (PipelineStage child : children) {
                if (child.state == PipelineState.PAUSED) {
                    return true;
                }
            }
        }

        // Check steps for this stage
        if (builder != null && id != null) {
            List<FlowNodeWrapper> steps = builder.getStageSteps(id);
            if (steps != null) {
                for (FlowNodeWrapper step : steps) {
                    // Check if step has an input and is paused
                    if (step.getInputStep() != null && step.getStatus().state == BlueRun.BlueRunState.PAUSED) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    public PipelineStage toPipelineStage(List<PipelineStage> children, String runUrl) {
        boolean waitingForInput = isWaitingForInput(children);
        PipelineState effectiveState = waitingForInput ? PipelineState.PAUSED : state;
        
        return new PipelineStage(
                id,
                name,
                children,
                effectiveState,
                type.name(),
                title,
                seqContainerName,
                nextSibling != null ? nextSibling.toPipelineStage(Collections.emptyList(), runUrl) : null,
                sequential,
                synthetic,
                synthetic && name.equals(Messages.FlowNodeWrapper_noStage()),
                timingInfo,
                agent,
                runUrl);
    }
}
