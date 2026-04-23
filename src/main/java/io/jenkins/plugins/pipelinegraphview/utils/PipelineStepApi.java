package io.jenkins.plugins.pipelinegraphview.utils;

import edu.umd.cs.findbugs.annotations.CheckForNull;
import io.jenkins.plugins.pipelinegraphview.livestate.LiveGraphRegistry;
import io.jenkins.plugins.pipelinegraphview.livestate.LiveGraphSnapshot;
import io.jenkins.plugins.pipelinegraphview.treescanner.PipelineNodeGraphAdapter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
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

    private List<PipelineStep> parseSteps(
            List<FlowNodeWrapper> stepNodes,
            String stageId,
            @CheckForNull Set<String> hideFromViewBlockStartIds,
            @CheckForNull Map<String, List<String>> enclosingIdsByNodeId) {
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

                    Map<String, Object> flags =
                            resolveFlags(flowNodeWrapper, hideFromViewBlockStartIds, enclosingIdsByNodeId);

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

    /**
     * Derives per-step feature flags. Prefers the snapshot-provided sets over
     * {@link FlowNodeWrapper#getFeatureFlags()}, which would otherwise call
     * {@code FlowNode#iterateEnclosingBlocks()} once per step — O(depth) storage reads
     * per step, and the HTTP reader bottleneck on large in-progress graphs.
     */
    private static Map<String, Object> resolveFlags(
            FlowNodeWrapper wrapper,
            @CheckForNull Set<String> hideFromViewBlockStartIds,
            @CheckForNull Map<String, List<String>> enclosingIdsByNodeId) {
        if (hideFromViewBlockStartIds != null && enclosingIdsByNodeId != null) {
            Map<String, Object> flags = new HashMap<>();
            List<String> enclosing = enclosingIdsByNodeId.get(wrapper.getId());
            if (enclosing != null) {
                for (String id : enclosing) {
                    if (hideFromViewBlockStartIds.contains(id)) {
                        flags.put("hidden", Boolean.TRUE);
                        break;
                    }
                }
            }
            return flags;
        }
        return wrapper.getFeatureFlags();
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

    private PipelineStepList getAllSteps(
            PipelineStepBuilderApi builder,
            boolean runIsComplete,
            @CheckForNull Set<String> hideFromViewBlockStartIds,
            @CheckForNull Map<String, List<String>> enclosingIdsByNodeId) {
        Map<String, List<FlowNodeWrapper>> stepNodes = builder.getAllSteps();
        PipelineStepList allSteps = new PipelineStepList(runIsComplete);
        for (Map.Entry<String, List<FlowNodeWrapper>> entry : stepNodes.entrySet()) {
            allSteps.addAll(
                    parseSteps(entry.getValue(), entry.getKey(), hideFromViewBlockStartIds, enclosingIdsByNodeId));
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
        // Fast path: cache hit without locking.
        Long currentVersion = LiveGraphRegistry.get().currentVersion(run);
        if (currentVersion != null) {
            PipelineStepList cached = LiveGraphRegistry.get().cachedAllSteps(run, currentVersion);
            if (cached != null) {
                return cached;
            }
        }
        // Slow path: serialise concurrent rebuilds for this run — see computeTree for why.
        Object lock = LiveGraphRegistry.get().allStepsComputeLock(run);
        if (lock != null) {
            synchronized (lock) {
                Long retryVersion = LiveGraphRegistry.get().currentVersion(run);
                if (retryVersion != null) {
                    PipelineStepList cached = LiveGraphRegistry.get().cachedAllSteps(run, retryVersion);
                    if (cached != null) {
                        return cached;
                    }
                }
                LiveGraphSnapshot snapshot = LiveGraphRegistry.get().snapshot(run);
                if (snapshot != null) {
                    PipelineStepList computed = getAllSteps(
                            new PipelineNodeGraphAdapter(run, snapshot.nodes(), snapshot.enclosingIdsByNodeId()),
                            runIsComplete,
                            snapshot.hideFromViewBlockStartIds(),
                            snapshot.enclosingIdsByNodeId());
                    LiveGraphRegistry.get().cacheAllSteps(run, snapshot.version(), computed);
                    return computed;
                }
            }
        }
        return getAllSteps(CachedPipelineNodeGraphAdaptor.instance.getFor(run), runIsComplete, null, null);
    }

    /**
     * Builds a {@link PipelineStepList} from a caller-supplied adapter. Doesn't touch the
     * live-state DTO cache — caller owns caching.
     */
    @Restricted(NoExternalUse.class)
    public PipelineStepList getAllStepsFrom(PipelineStepBuilderApi builder, boolean runIsComplete) {
        return getAllStepsFrom(builder, runIsComplete, null, null);
    }

    /**
     * Same as {@link #getAllStepsFrom(PipelineStepBuilderApi, boolean)} but with pre-computed
     * snapshot data so feature-flag resolution doesn't need to walk enclosing blocks per step.
     */
    @Restricted(NoExternalUse.class)
    public PipelineStepList getAllStepsFrom(
            PipelineStepBuilderApi builder,
            boolean runIsComplete,
            @CheckForNull Set<String> hideFromViewBlockStartIds,
            @CheckForNull Map<String, List<String>> enclosingIdsByNodeId) {
        return getAllSteps(builder, runIsComplete, hideFromViewBlockStartIds, enclosingIdsByNodeId);
    }
}
