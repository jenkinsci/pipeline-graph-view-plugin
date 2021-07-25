package io.jenkins.plugins.pipelinegraphview.utils;

import org.jenkinsci.plugins.workflow.job.WorkflowRun;

import java.util.List;
import java.util.Locale;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;

public class PipelineStepApi {
    private static final Logger LOGGER = Logger.getLogger(PipelineStepApi.class.getName());
    private final transient WorkflowRun run;
    private final String nodeId;

    private static PipelineStepVisitor builder;
    private static final Object mutex = new Object();

    public PipelineStepApi(WorkflowRun run, String nodeId) {
        this.run = run;
        this.nodeId = nodeId;
    }

    private List<PipelineStep> parseSteps(List<FlowNodeWrapper> stepNodes) {
        LOGGER.log(Level.FINE, "PipelineStepApi steps: '" + stepNodes + "'.");
        List<PipelineStep> steps = stepNodes.stream()
            .map(flowNodeWrapper -> {
                String state = flowNodeWrapper.getStatus().getResult().name();
                if (flowNodeWrapper.getStatus().getState() != BlueRun.BlueRunState.FINISHED) {
                    state = flowNodeWrapper.getStatus().getState().name().toLowerCase(Locale.ROOT);
                }
                return new PipelineStep(
                    Integer.parseInt(flowNodeWrapper.getId()), // TODO no need to parse it BO returns a string even though the datatype is number on the frontend
                    flowNodeWrapper.getDisplayName(),
                    state,
                    50, // TODO how ???
                    flowNodeWrapper.getType().name(),
                    flowNodeWrapper.getDisplayName() // TODO blue ocean uses timing information: "Passed in 0s"
                );
            })
            .collect(Collectors.toList());
        return steps;
    }

    public PipelineStepList getSteps(String stageId) {
        // Create a shared PipelineStepVisitor (so we don't parse the graph for each call).
        synchronized (mutex) {
            if (builder == null) {
                builder = new PipelineStepVisitor(run, null);
            }
        }
        List<FlowNodeWrapper> stepNodes = builder.getStageSteps(stageId);
        return new PipelineStepList(parseSteps(stepNodes));
    }
}
