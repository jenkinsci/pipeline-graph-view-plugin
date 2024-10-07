package io.jenkins.plugins.pipelinegraphview.utils;

import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import hudson.model.Result;
import hudson.model.queue.QueueTaskFuture;
import java.io.IOException;
import java.net.URL;
import java.util.ArrayList;
import java.util.Date;
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
            JenkinsRule jenkins, String jobName, String jenkinsFileName, Result expectedResult) throws Exception {
        WorkflowJob job = TestUtils.createJob(jenkins, jobName, jenkinsFileName);
        jenkins.assertBuildStatus(expectedResult, job.scheduleBuild2(0));
        return job.getLastBuild();
    }

    public static QueueTaskFuture<WorkflowRun> createAndRunJobNoWait(
            JenkinsRule jenkins, String jobName, String jenkinsFileName) throws Exception {
        WorkflowJob job = TestUtils.createJob(jenkins, jobName, jenkinsFileName);
        return job.scheduleBuild2(0);
    }

    public static WorkflowJob createJob(JenkinsRule jenkins, String jobName, String jenkinsFileName) throws Exception {
        WorkflowJob job = jenkins.createProject(WorkflowJob.class, jobName);

        URL resource = Resources.getResource(TestUtils.class, jenkinsFileName);
        String jenkinsFile = Resources.toString(resource, Charsets.UTF_8);
        job.setDefinition(new CpsFlowDefinition(jenkinsFile, true));
        return job;
    }

    public static List<FlowNode> getNodesByDisplayName(WorkflowRun run, String displayName) throws IOException {
        FlowExecution execution = run.getExecution();
        FlowGraphTable graphTable = new FlowGraphTable(execution);
        graphTable.build();
        List<FlowNode> matchingNodes = new ArrayList<>();
        for (Row row : graphTable.getRows()) {
            if (row.getDisplayName().contains(" (" + displayName + ")")) {
                FlowNode node = row.getNode();
                LOGGER.log(Level.INFO, "Found matching node: '" + displayName + "' with ID " + node.getId());
                matchingNodes.add(node);
            }
        }
        return matchingNodes;
    }

    public static String collectStagesAsString(List<PipelineStage> stages, Function<PipelineStage, String> converter) {

        return stages.stream()
                .map((PipelineStage stage) -> stage.getChildren().isEmpty()
                        ? converter.apply(stage)
                        : String.format(
                                "%s[%s]",
                                converter.apply(stage), collectStagesAsString(stage.getChildren(), converter)))
                .collect(Collectors.joining(","));
    }

    public static String collectStepsAsString(List<PipelineStep> steps, Function<PipelineStep, String> converter) {
        return steps.stream().map((PipelineStep step) -> converter.apply(step)).collect(Collectors.joining(","));
    }

    public static String getNodeTimingString(AbstractPipelineNode node) {
        return String.format(
                "%s{%s - %s - %s}",
                node.getName(),
                node.getStartTimeMillis(),
                node.getPauseDurationMillis(),
                node.getTotalDurationMillis());
    }

    // TODO: remove duplication.
    public static String nodeNameAndStatus(PipelineStage node) {
        return String.format("%s{%s}", node.getName(), node.getState());
    }

    public static String nodeNameAndTiming(PipelineStage node) {
        return getNodeTimingString(node);
    }

    public static String nodeNameAndStatus(PipelineStep node) {
        return String.format("%s{%s}", node.getName(), node.getState());
    }

    public static String nodeNameAndTiming(PipelineStep node) {
        return getNodeTimingString(node);
    }

    public static boolean compareTimeRange(long value, long min, long max) {
        return value > min && value < max;
    }

    /* Check if the TimingInfo of the given node is in the expected ranges.
     *  node: The Pipeline object to compare times of.
     * times: List of times in the order:
     *    [startMin, queuedMin, totalMin, startMax, queuedMax, totalMax]
     * I considered adding a 'assertTimesInRange(AbstractPipelineNode node, TimingInfo[] minMax)' method,
     * but this ended up taking up more space - happy to add it if it's useful.
     * Throws AssertionError (with meaningful message) if issues are found.
     */
    public static void assertTimesInRange(AbstractPipelineNode node, List<Long> times) {
        if (times.size() != 6) {
            throw new AssertionError(String.format("Expected 6 times, but got %s", times.size()));
        }
        List<String> errors = new ArrayList<>();
        Long start = new Date().getTime() - node.getTimingInfo().getStartTimeMillis();
        Long pause = node.getTimingInfo().getPauseDurationMillis();
        Long total = node.getTimingInfo().getTotalDurationMillis();
        Long startMin = times.get(0);
        Long pauseMin = times.get(1);
        Long totalMin = times.get(2);
        Long startMax = times.get(3);
        Long pauseMax = times.get(4);
        Long totalMax = times.get(5);
        if (start < startMin) {
            errors.add(String.format("(Relative start time %s less than min value %s", start, startMin));
        }
        if (start > startMax) {
            errors.add(String.format("Relative start time %s greater than max value %s", start, startMax));
        }
        if (pause < pauseMin) {
            errors.add(String.format("Pause duration %s less than min value %s", pause, pauseMin));
        }
        if (pause > pauseMax) {
            errors.add(String.format("Pause duration %s greater than max value %s", pause, pauseMax));
        }
        if (total < totalMin) {
            errors.add(String.format("Total duration %s less than min value %s", total, totalMin));
        }
        if (total > totalMax) {
            errors.add(String.format("Total duration %s greater than max value %s", total, totalMax));
        }
        if (!errors.isEmpty()) {
            throw new AssertionError(String.format(
                    "Got errors when checking times for %s:%s", node.getName(), String.join("\\n\\t", errors)));
        }
    }
}
