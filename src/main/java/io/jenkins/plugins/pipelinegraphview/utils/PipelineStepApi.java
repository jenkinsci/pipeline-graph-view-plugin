package io.jenkins.plugins.pipelinegraphview.utils;

import io.jenkins.plugins.pipelinegraphview.livestate.LiveGraphRegistry;
import io.jenkins.plugins.pipelinegraphview.livestate.LiveGraphSnapshot;
import io.jenkins.plugins.pipelinegraphview.treescanner.PipelineNodeGraphAdapter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.support.steps.input.InputStep;
import org.kohsuke.accmod.Restricted;
import org.kohsuke.accmod.restrictions.NoExternalUse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class PipelineStepApi {
    private static final Logger logger = LoggerFactory.getLogger(PipelineStepApi.class);
    private final transient WorkflowRun run;

    public PipelineStepApi(WorkflowRun run) {
        this.run = run;
    }

    private List<PipelineStep> parseSteps(List<FlowNodeWrapper> stepNodes, String stageId) {
        if (logger.isDebugEnabled()) {
            logger.debug("PipelineStepApi steps: '{}'.", stepNodes);
        }
        return stepNodes.stream()
                .map(flowNodeWrapper -> {
                    String displayName = flowNodeWrapper.getDisplayName();
                    String title = "";
                    if (flowNodeWrapper.getType() == FlowNodeWrapper.NodeType.UNHANDLED_EXCEPTION) {
                        displayName = "Pipeline error";
                    } else {
                        String stepArguments = flowNodeWrapper.getArgumentsAsString();
                        if (stepArguments != null && !stepArguments.isEmpty()) {
                            displayName = stepArguments;
                            title = flowNodeWrapper.getDisplayName();
                        }
                        // Use the step label as the displayName if set
                        String labelDisplayName = flowNodeWrapper.getLabelDisplayName();
                        if (labelDisplayName != null && !labelDisplayName.isEmpty()) {
                            displayName = labelDisplayName;
                            title = "";
                        }
                    }
                    // Remove non-printable chars (e.g. ANSI color codes).
                    logger.debug("DisplayName Before: '{}'.", displayName);
                    displayName = cleanTextContent(displayName);
                    logger.debug("DisplayName After: '{}'.", displayName);

                    // Ignore certain titles
                    if (!displayName.isBlank()) {
                        if (title.equals("Shell Script") || title.equals("Print Message")) {
                            title = "";
                        }
                    }

                    // Extract feature flags from parent nodes
                    Map<String, Object> flags = flowNodeWrapper.getFeatureFlags();

                    return new PipelineStep(
                            flowNodeWrapper.getId(),
                            displayName,
                            PipelineState.of(flowNodeWrapper.getStatus()),
                            flowNodeWrapper.getType().name(),
                            title,
                            stageId,
                            mapInputStep(flowNodeWrapper.getInputStep()),
                            flowNodeWrapper.getTiming(),
                            flags);
                })
                .collect(Collectors.toList());
    }

    private PipelineInputStep mapInputStep(InputStep inputStep) {
        if (inputStep == null) {
            return null;
        }
        return new PipelineInputStep(
                inputStep.getMessage(),
                inputStep.getCancel(),
                inputStep.getId(),
                inputStep.getOk(),
                !inputStep.getParameters().isEmpty());
    }

    static String cleanTextContent(String text) {
        // strips off all ANSI color codes
        text = text.replaceAll("\\e\\[(\\d+[;:]?)+m", "");
        return text.trim();
    }

    private PipelineStepList getSteps(String stageId, PipelineStepBuilderApi builder, boolean runIsComplete) {
        List<FlowNodeWrapper> stepNodes = builder.getStageSteps(stageId);
        PipelineStepList steps = new PipelineStepList(parseSteps(stepNodes, stageId), runIsComplete);
        steps.sort();
        return steps;
    }

    /* Returns a PipelineStepList, sorted by stageId and Id. */
    private PipelineStepList getAllSteps(PipelineStepBuilderApi builder, boolean runIsComplete) {
        Map<String, List<FlowNodeWrapper>> stepNodes = builder.getAllSteps();
        PipelineStepList allSteps = new PipelineStepList(runIsComplete);
        for (Map.Entry<String, List<FlowNodeWrapper>> entry : stepNodes.entrySet()) {
            allSteps.addAll(parseSteps(entry.getValue(), entry.getKey()));
        }
        allSteps.sort();
        return allSteps;
    }

    public PipelineStepList getSteps(String stageId) {
        PipelineStepList all = getAllSteps();
        List<PipelineStep> filtered =
                all.steps.stream().filter(s -> stageId.equals(s.stageId)).collect(Collectors.toList());
        PipelineStepList result = new PipelineStepList(filtered, all.runIsComplete);
        result.sort();
        return result;
    }

    /* Returns a PipelineStepList, sorted by stageId and Id. */
    public PipelineStepList getAllSteps() {
        return PipelineGraphViewCache.get().getAllSteps(run, this::computeAllSteps);
    }

    /** Uncached compute path; callers are responsible for any caching. */
    @Restricted(NoExternalUse.class)
    public PipelineStepList computeAllSteps() {
        boolean runIsComplete = !run.isBuilding();
        // Check the cache first using the cheap version read — if we already have steps
        // for the current state, we can skip the O(N) snapshot copy entirely.
        Long currentVersion = LiveGraphRegistry.get().currentVersion(run);
        if (currentVersion != null) {
            PipelineStepList cached = LiveGraphRegistry.get().cachedAllSteps(run, currentVersion);
            if (cached != null) {
                return cached;
            }
            LiveGraphSnapshot snapshot = LiveGraphRegistry.get().snapshot(run);
            if (snapshot != null) {
                PipelineStepList computed = getAllSteps(
                        new PipelineNodeGraphAdapter(run, snapshot.nodes(), snapshot.enclosingIdsByNodeId()),
                        runIsComplete);
                LiveGraphRegistry.get().cacheAllSteps(run, snapshot.version(), computed);
                return computed;
            }
        }
        return getAllSteps(CachedPipelineNodeGraphAdaptor.instance.getFor(run), runIsComplete);
    }

    /**
     * Builds a {@link PipelineStepList} from a caller-supplied adapter. Doesn't touch the
     * live-state DTO cache — caller owns caching.
     */
    @Restricted(NoExternalUse.class)
    public PipelineStepList getAllStepsFrom(PipelineStepBuilderApi builder, boolean runIsComplete) {
        return getAllSteps(builder, runIsComplete);
    }
}
