package io.jenkins.plugins.pipelinegraphview.utils;

import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import hudson.model.Result;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition;
import org.jenkinsci.plugins.workflow.flow.FlowExecution;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.support.visualization.table.FlowGraphTable;
import org.jenkinsci.plugins.workflow.support.visualization.table.FlowGraphTable.Row;
import org.jvnet.hudson.test.JenkinsRule;

public class TestUtils {
  private static final Logger LOGGER = Logger.getLogger(TestUtils.class.getName());

  public static WorkflowRun createAndRunJob(
      JenkinsRule jenkins, String jobName, String jenkinsFileName, Result expectedResult)
      throws Exception {
    WorkflowJob job = TestUtils.createJob(jenkins, jobName, jenkinsFileName);
    jenkins.assertBuildStatus(expectedResult, job.scheduleBuild2(0));
    return job.getLastBuild();
  }

  public static WorkflowJob createJob(JenkinsRule jenkins, String jobName, String jenkinsFileName)
      throws java.io.IOException {
    WorkflowJob job = jenkins.createProject(WorkflowJob.class, jobName);

    URL resource = Resources.getResource(TestUtils.class, jenkinsFileName);
    String jenkinsFile = Resources.toString(resource, Charsets.UTF_8);
    job.setDefinition(new CpsFlowDefinition(jenkinsFile, true));
    return job;
  }

  public static List<FlowNode> getNodesByDisplayName(WorkflowRun run, String displayName)
      throws java.io.IOException {
    FlowExecution execution = run.getExecution();
    FlowGraphTable graphTable = new FlowGraphTable(execution);
    graphTable.build();
    List<FlowNode> matchingNodes = new ArrayList<>();
    for (Row row : graphTable.getRows()) {
      if (row.getDisplayName().contains(" (" + displayName + ")")) {
        FlowNode node = row.getNode();
        LOGGER.log(
            Level.INFO, "Found matching node: '" + displayName + "' with ID " + node.getId());
        matchingNodes.add(node);
      }
    }
    return matchingNodes;
  }

  public static String collectStagesAsString(
      List<PipelineStage> stages, Function<PipelineStage, String> converter) {
    return stages.stream()
        .map(
            (PipelineStage stage) ->
                stage.getChildren().isEmpty()
                    ? converter.apply(stage)
                    : String.format(
                        "%s[%s]",
                        converter.apply(stage),
                        collectStagesAsString(stage.getChildren(), converter)))
        .collect(Collectors.joining(","));
  }

  public static String collectStageStepsAsString(
      List<PipelineStep> steps, Function<PipelineStep, String> converter) {
    return steps.stream()
        .map((PipelineStep step) -> converter.apply(step))
        .collect(Collectors.joining(","));
  }
}
