package io.jenkins.plugins.pipelinegraphview.utils;

import edu.umd.cs.findbugs.annotations.CheckForNull;
import io.jenkins.plugins.pipelinegraphview.Messages;
import io.jenkins.plugins.pipelinegraphview.analysis.TimingInfo;
import java.util.Collections;
import java.util.List;
import org.jenkinsci.plugins.workflow.support.steps.input.InputStep;

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
    private String causeOfBlockage;
    private PausedStep pausedStep;

    public PipelineStageInternal(
            String id,
            String name,
            List<String> parents,
            PipelineState state,
            FlowNodeWrapper.NodeType type,
            String title,
            boolean synthetic,
            TimingInfo times,
            String agent,
            String causeOfBlockage) {
        this.id = id;
        this.name = name;
        this.parents = parents;
        this.state = state;
        this.type = type;
        this.title = title;
        this.synthetic = synthetic;
        this.timingInfo = times;
        this.agent = agent;
        this.causeOfBlockage = causeOfBlockage;
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

    /**
     * A step of this stage that is paused.
     *
     * @param reason what the step is waiting for, or {@code null} when the step describes itself
     *     elsewhere (e.g. an {@code input} prompt)
     * @param inputStep the {@code input} the step is waiting on, so the graph can offer proceed /
     *     abort without opening the console
     */
    record PausedStep(
            @CheckForNull String reason, @CheckForNull InputStep inputStep) {}

    public void setPausedStep(@CheckForNull PausedStep pausedStep) {
        this.pausedStep = pausedStep;
    }

    /**
     * A stage is paused when one of its own steps, or one of its child stages, is paused, e.g. on
     * an {@code input} step or a {@code lock} waiting for a resource. Paused input in nested
     * stages is carried by those stages.
     */
    private boolean isPaused(List<PipelineStage> children) {
        return pausedStep != null || firstPausedChild(children) != null;
    }

    private static PipelineStage firstPausedChild(List<PipelineStage> children) {
        if (children != null) {
            for (PipelineStage child : children) {
                if (child.state == PipelineState.PAUSED) {
                    return child;
                }
            }
        }
        return null;
    }

    private String pausedCauseOfBlockage(List<PipelineStage> children) {
        if (pausedStep != null) {
            return pausedStep.reason();
        }
        PipelineStage child = firstPausedChild(children);
        return child != null ? child.getCauseOfBlockage() : null;
    }

    public PipelineStage toPipelineStage(List<PipelineStage> children, String runUrl) {
        PipelineState effectiveState;
        String effectiveCauseOfBlockage = causeOfBlockage;
        if (isPaused(children)) {
            effectiveState = PipelineState.PAUSED;
            if (effectiveCauseOfBlockage == null) {
                effectiveCauseOfBlockage = pausedCauseOfBlockage(children);
            }
        } else if (causeOfBlockage != null && state.isInProgress()) {
            // The chunked status compute can report IN_PROGRESS for a declarative parallel
            // branch whose agent allocation is actually queued; the presence of a cause of
            // blockage is the authoritative signal that the stage is waiting for an executor.
            effectiveState = PipelineState.QUEUED;
        } else {
            effectiveState = state;
        }

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
                runUrl,
                effectiveCauseOfBlockage,
                PipelineInputStep.of(pausedStep != null ? pausedStep.inputStep() : null));
    }
}
