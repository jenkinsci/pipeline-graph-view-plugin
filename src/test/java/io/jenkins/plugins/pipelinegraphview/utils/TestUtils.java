package io.jenkins.plugins.pipelinegraphview.utils;

import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import hudson.model.Result;
import hudson.model.queue.QueueTaskFuture;
import java.net.URL;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition;
import org.jenkinsci.plugins.workflow.flow.FlowExecution;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.support.visualization.table.FlowGraphTable;
import org.jenkinsci.plugins.workflow.support.visualization.table.FlowGraphTable.Row;
import org.jvnet.hudson.test.JenkinsRule;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class TestUtils {
    private static final Logger log = LoggerFactory.getLogger(TestUtils.class);

    public static WorkflowRun createAndRunJob(
            JenkinsRule jenkins, String jobName, String jenkinsFileName, Result expectedResult) throws Exception {
        return createAndRunJob(jenkins, jobName, jenkinsFileName, expectedResult, true);
    }

    public static WorkflowRun createAndRunJob(
            JenkinsRule jenkins, String jobName, String jenkinsFileName, Result expectedResult, boolean sandbox)
            throws Exception {
        log.info("Creating and running job ({})", jobName);
        WorkflowJob job = TestUtils.createJob(jenkins, jobName, jenkinsFileName, sandbox);
        log.info("Created job ({})", jobName);
        jenkins.assertBuildStatus(expectedResult, job.scheduleBuild2(0));
        log.info("Job ({}) finished running with expected result {} ", jobName, expectedResult);
        return job.getLastBuild();
    }

    public static QueueTaskFuture<WorkflowRun> createAndRunJobNoWait(
            JenkinsRule jenkins, String jobName, String jenkinsFileName) throws Exception {
        return createAndRunJobNoWait(jenkins, jobName, jenkinsFileName, true);
    }

    public static QueueTaskFuture<WorkflowRun> createAndRunJobNoWait(
            JenkinsRule jenkins, String jobName, String jenkinsFileName, boolean sandbox) throws Exception {
        WorkflowJob job = TestUtils.createJob(jenkins, jobName, jenkinsFileName, sandbox);
        return job.scheduleBuild2(0);
    }

    public static WorkflowJob createJob(JenkinsRule jenkins, String jobName, String jenkinsFileName) throws Exception {
        return createJob(jenkins, jobName, jenkinsFileName, true);
    }

    public static WorkflowJob createJob(JenkinsRule jenkins, String jobName, String jenkinsFileName, boolean sandbox)
            throws Exception {
        WorkflowJob job = jenkins.createProject(WorkflowJob.class, jobName);

        URL resource = Resources.getResource(TestUtils.class, jenkinsFileName);
        String jenkinsFile = Resources.toString(resource, Charsets.UTF_8);
        job.setDefinition(new CpsFlowDefinition(jenkinsFile, sandbox));
        return job;
    }

    public static List<FlowNode> getNodesByDisplayName(WorkflowRun run, String displayName) {
        FlowExecution execution = run.getExecution();
        FlowGraphTable graphTable = new FlowGraphTable(execution);
        graphTable.build();
        List<FlowNode> matchingNodes = new ArrayList<>();
        for (Row row : graphTable.getRows()) {
            if (row.getDisplayName().contains(" (" + displayName + ")")) {
                FlowNode node = row.getNode();
                log.info("Found matching node: '{}' with ID {}", displayName, node.getId());
                matchingNodes.add(node);
            }
        }
        return matchingNodes;
    }

    public static String collectStagesAsString(List<PipelineStage> stages, Function<PipelineStage, String> converter) {

        return stages.stream()
                .map(s -> s.children.isEmpty()
                        ? converter.apply(s)
                        : String.format("%s[%s]", converter.apply(s), collectStagesAsString(s.children, converter)))
                .collect(Collectors.joining(","));
    }

    public static String collectStepsAsString(List<PipelineStep> steps, Function<PipelineStep, String> converter) {
        return steps.stream().map(converter).collect(Collectors.joining(","));
    }

    public static String nodeNameAndStatus(AbstractPipelineNode node) {
        return String.format("%s{%s}", node.name, node.state);
    }

    /* Check if the TimingInfo of the given node is in the expected ranges.
     *  node: The Pipeline object to compare times of.
     * times: List of times in the order:
     *    [startMin, queuedMin, totalMin, startMax, queuedMax, totalMax]
     * I considered adding a 'assertTimesInRange(AbstractPipelineNode node, TimingInfo[] minMax)' method,
     * but this ended up taking more space - happy to add it if it's useful.
     * Throws AssertionError (with meaningful message) if issues are found.
     */
    public static void assertTimesInRange(AbstractPipelineNode node, TimeRange range) {
        List<String> errors = new ArrayList<>();
        long start = new Date().getTime() - node.timingInfo.getStartTimeMillis();
        long pause = node.timingInfo.getPauseDurationMillis();
        long total = node.timingInfo.getTotalDurationMillis();
        if (start < range.startMin) {
            errors.add(String.format("(Relative start time %s less than min value %s", start, range.startMin));
        }
        if (start > range.startMax) {
            errors.add(String.format("Relative start time %s greater than max value %s", start, range.startMax));
        }
        if (pause < range.pauseMin) {
            errors.add(String.format("Pause duration %s less than min value %s", pause, range.pauseMin));
        }
        if (pause > range.pauseMax) {
            errors.add(String.format("Pause duration %s greater than max value %s", pause, range.pauseMax));
        }
        if (total < range.totalMin) {
            errors.add(String.format("Total duration %s less than min value %s", total, range.totalMin));
        }
        if (total > range.totalMax) {
            errors.add(String.format("Total duration %s greater than max value %s", total, range.totalMax));
        }
        if (!errors.isEmpty()) {
            throw new AssertionError(String.format(
                    "Got errors when checking times for %s:%s", node.name, String.join("\\n\\t", errors)));
        }
    }

    public record TimeRange(long startMin, long pauseMin, long totalMin, long startMax, long pauseMax, long totalMax) {}
}
