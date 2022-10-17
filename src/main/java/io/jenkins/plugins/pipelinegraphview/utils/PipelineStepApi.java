package io.jenkins.plugins.pipelinegraphview.utils;

import hudson.Util;
import java.util.List;
import java.util.Locale;
import java.util.Map;
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

  private List<PipelineStep> parseSteps(List<FlowNodeWrapper> stepNodes, String stageId) {
    if (logger.isDebugEnabled()) {
      logger.debug("PipelineStepApi steps: '" + stepNodes + "'.");
    }
    List<PipelineStep> steps =
        stepNodes.stream()
            .map(
                flowNodeWrapper -> {
                  String state = flowNodeWrapper.getStatus().getResult().name();
                  // TODO: Why do we do this? Seems like it will return uppercase for some states
                  // and lowercase for others?
                  if (flowNodeWrapper.getStatus().getState() != BlueRun.BlueRunState.FINISHED) {
                    state = flowNodeWrapper.getStatus().getState().name().toLowerCase(Locale.ROOT);
                  }
                  String displayName = flowNodeWrapper.getDisplayName();
                  String stepArguments = flowNodeWrapper.getArgumentsAsString();
                  if (stepArguments != null && !stepArguments.isEmpty()) {
                    displayName = stepArguments + " - " + displayName;
                  }
                  // Remove non-printable chars (e.g. ANSI color codes).
                  logger.debug("DisplayName Before: '" + displayName + "'.");
                  displayName = cleanTextContent(displayName);
                  logger.debug("DisplayName After: '" + displayName + "'.");

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
                          .getDisplayName(), // TODO blue ocean uses timing information: "Passed in
                      // 0s"
                      stageId,
                      "Queued "
                          + Util.getTimeSpanString(
                              flowNodeWrapper.getTiming().getPauseDurationMillis()),
                      "Started "
                          + Util.getTimeSpanString(
                              System.currentTimeMillis()
                                  - flowNodeWrapper.getTiming().getStartTimeMillis())
                          + " ago",
                      "Took "
                          + Util.getTimeSpanString(
                              flowNodeWrapper.getTiming().getTotalDurationMillis()));
                })
            .collect(Collectors.toList());
    return steps;
  }

  private static String cleanTextContent(String text) {
    // strips off all ANSI color codes
    text = text.replaceAll("\\[\\d+m", "");
    return text.trim();
  }

  public PipelineStepList getSteps(String stageId) {
    PipelineStepVisitor builder = new PipelineStepVisitor(run, null);
    List<FlowNodeWrapper> stepNodes = builder.getStageSteps(stageId);
    return new PipelineStepList(parseSteps(stepNodes, stageId));
  }

  public PipelineStepList getAllSteps() {
    PipelineStepVisitor builder = new PipelineStepVisitor(run, null);
    Map<String, List<FlowNodeWrapper>> stepNodes = builder.getAllSteps();
    PipelineStepList allSteps = new PipelineStepList();
    for (Map.Entry<String, List<FlowNodeWrapper>> entry : stepNodes.entrySet()) {
      allSteps.addAll(parseSteps(entry.getValue(), entry.getKey()));
    }
    return allSteps;
  }
}
