package io.jenkins.plugins.pipelinegraphview.utils;

import io.jenkins.plugins.pipelinegraphview.treescanner.PipelineNodeGraphAdapter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
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

                    return new PipelineStep(
                            flowNodeWrapper.getId(),
                            displayName,
                            PipelineState.of(flowNodeWrapper.getStatus()),
                            flowNodeWrapper.getType().name(),
                            title,
                            stageId,
                            flowNodeWrapper.getTiming());
                })
                .collect(Collectors.toList());
    }

    static String cleanTextContent(String text) {
        // strips off all ANSI color codes
        text = text.replaceAll("\\e\\[(\\d+[;:]?)+m", "");
        return text.trim();
    }

    private PipelineStepList getSteps(String stageId, PipelineStepBuilderApi builder) {
        List<FlowNodeWrapper> stepNodes = builder.getStageSteps(stageId);
        PipelineStepList steps = new PipelineStepList(parseSteps(stepNodes, stageId));
        steps.sort();
        return steps;
    }

    /* Returns a PipelineStepList, sorted by stageId and Id. */
    private PipelineStepList getAllSteps(PipelineStepBuilderApi builder) {
        Map<String, List<FlowNodeWrapper>> stepNodes = builder.getAllSteps();
        PipelineStepList allSteps = new PipelineStepList();
        for (Map.Entry<String, List<FlowNodeWrapper>> entry : stepNodes.entrySet()) {
            allSteps.addAll(parseSteps(entry.getValue(), entry.getKey()));
        }
        allSteps.sort();
        return allSteps;
    }

    public PipelineStepList getSteps(String stageId) {
        return getSteps(stageId, new PipelineNodeGraphAdapter(run));
    }

    /* Returns a PipelineStepList, sorted by stageId and Id. */
    public PipelineStepList getAllSteps() {
        return getAllSteps(new PipelineNodeGraphAdapter(run));
    }
}
