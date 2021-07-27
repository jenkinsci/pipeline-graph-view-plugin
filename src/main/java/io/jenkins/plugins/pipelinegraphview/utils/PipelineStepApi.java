package io.jenkins.plugins.pipelinegraphview.utils;

import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class PipelineStepApi {
  private static final Logger logger = LoggerFactory.getLogger(PipelineStepApi.class);
  private final transient WorkflowRun run;

  private static final Object mutex = new Object();

  public PipelineStepApi(WorkflowRun run) {
    this.run = run;
  }

  private List<PipelineStep> parseSteps(List<FlowNodeWrapper> stepNodes) {
    if (logger.isDebugEnabled()) {
      logger.debug("PipelineStepApi steps: '" + stepNodes + "'.");
    }
    List<PipelineStep> steps =
        stepNodes.stream()
            .map(
                flowNodeWrapper -> {
                  String state = flowNodeWrapper.getStatus().getResult().name();
                  if (flowNodeWrapper.getStatus().getState() != BlueRun.BlueRunState.FINISHED) {
                    state = flowNodeWrapper.getStatus().getState().name().toLowerCase(Locale.ROOT);
                  }
                  String displayName = flowNodeWrapper.getDisplayName();
                  String stepArguments = flowNodeWrapper.getArgumentsAsString();
                  if (stepArguments != null && !stepArguments.isEmpty()) {
                    displayName = stepArguments + " - " + displayName;
                  }
                  return new PipelineStep(
                      Integer.parseInt(
                          flowNodeWrapper
                              .getId()), // TODO no need to parse it BO returns a string even though
                      // the datatype is number on the frontend
                      displayName,
                      state,
                      50, // TODO how ???
                      flowNodeWrapper.getType().name(),
                      flowNodeWrapper
                          .getDisplayName() // TODO blue ocean uses timing information: "Passed in
                      // 0s"
                      );
                })
            .collect(Collectors.toList());
    return steps;
  }

  public PipelineStepList getSteps(String stageId) {
    PipelineStepVisitor builder = new PipelineStepVisitor(run, null);
    List<FlowNodeWrapper> stepNodes = builder.getStageSteps(stageId);
    return new PipelineStepList(parseSteps(stepNodes));
  }
}
