package io.jenkins.plugins.pipelinegraphview.utils;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

import hudson.model.Result;
import hudson.model.queue.QueueTaskFuture;
import io.jenkins.plugins.pipelinegraphview.treescanner.NodeRelationshipFinder;
import io.jenkins.plugins.pipelinegraphview.treescanner.PipelineNodeGraphAdapter;
import io.jenkins.plugins.pipelinegraphview.treescanner.PipelineNodeTreeScanner;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.jvnet.hudson.test.Issue;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.LoggerRule;

public class PipelineGraphApiTest {

    @Rule
    public JenkinsRule j = new JenkinsRule();

    @Rule
    public LoggerRule l = new LoggerRule();

    @Before
    public void enabledDebugLogs() {
        l.record(PipelineGraphApi.class, Level.FINEST);
        l.record(PipelineNodeTreeScanner.class, Level.FINEST);
        l.record(PipelineNodeGraphAdapter.class, Level.FINEST);
        l.record(NodeRelationshipFinder.class, Level.FINEST);
    }

    private static final Logger LOGGER = Logger.getLogger(PipelineGraphApiTest.class.getName());

    @Test
    public void createTree_unstableSmokes() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(j, "unstableSmokes", "unstableSmokes.jenkinsfile", Result.FAILURE);
        PipelineGraphApi api = new PipelineGraphApi(run);
        PipelineGraph graph = api.createTree();

        List<PipelineStage> stages = graph.getStages();

        String stagesString = TestUtils.collectStagesAsString(
                stages,
                (PipelineStage stage) -> String.format(
                        "{%s,%s,%s,%s}", stage.getName(), stage.getTitle(), stage.getType(), stage.getState()));
        assertThat(
                stagesString,
                equalTo(String.join(
                        "",
                        "{unstable-one,unstable-one,STAGE,unstable},",
                        "{success,success,STAGE,success},",
                        "{unstable-two,unstable-two,STAGE,unstable},",
                        "{failure,failure,STAGE,failure}")));
    }

    @Test
    public void createTree_complexSmokes() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(j, "complexSmokes", "complexSmokes.jenkinsfile", Result.SUCCESS);
        PipelineGraphApi api = new PipelineGraphApi(run);
        PipelineGraph graph = api.createTree();

        List<PipelineStage> stages = graph.getStages();

        String stagesString = TestUtils.collectStagesAsString(stages, PipelineStage::getName);
        assertThat(
                stagesString,
                equalTo(String.join(
                        "",
                        "Non-Parallel Stage,",
                        "Parallel Stage[Branch A,Branch B,Branch C[Nested 1,Nested 2]],",
                        "Skipped stage,",
                        "Parallel Stage 2[Branch A,Branch B,Branch C[Nested 1,Nested 2]]")));
    }

    @Test
    public void createTree_scriptedParallel() throws Exception {
        WorkflowRun run =
                TestUtils.createAndRunJob(j, "scriptedParallel", "scriptedParallel.jenkinsfile", Result.SUCCESS);
        PipelineGraphApi api = new PipelineGraphApi(run);
        PipelineGraph graph = api.createTree();

        List<PipelineStage> stages = graph.getStages();

        String stagesString = TestUtils.collectStagesAsString(stages, PipelineStage::getName);
        assertThat(stagesString, equalTo("A,Parallel[B[BA,BB],C[CA,CB]],D[E[EA,EB],F[FA,FB]],G"));
    }

    @Issue("GH#85")
    @Test
    public void createTree_syntheticStages() throws Exception {
        WorkflowRun run =
                TestUtils.createAndRunJob(j, "syntheticStages", "syntheticStages.jenkinsfile", Result.SUCCESS);
        PipelineGraphApi api = new PipelineGraphApi(run);
        PipelineGraph graph = api.createTree();

        List<PipelineStage> stages = graph.getStages();

        String stagesString = TestUtils.collectStagesAsString(
                stages,
                (PipelineStage stage) ->
                        String.format("{%s,%s}", stage.getName(), stage.isSynthetic() ? "true" : "false"));
        assertThat(
                stagesString,
                equalTo(String.join(
                        "", "{Checkout SCM,true},", "{Stage 1,false},", "{Stage 2,false},", "{Post Actions,true}")));
    }

    @Issue("GH#87")
    @Test
    public void createTree_skippedParallel() throws Exception {
        WorkflowRun run =
                TestUtils.createAndRunJob(j, "skippedParallel", "skippedParallel.jenkinsfile", Result.SUCCESS);
        PipelineGraphApi api = new PipelineGraphApi(run);
        PipelineGraph graph = api.createTree();

        List<PipelineStage> stages = graph.getStages();

        String stagesString = TestUtils.collectStagesAsString(
                stages, (PipelineStage stage) -> String.format("{%s,%s}", stage.getName(), stage.getState()));
        assertThat(stagesString, equalTo("{Stage 1,success},{Parallel stage,skipped},{Stage 2,success}"));
    }

    @Issue("GH#213")
    @Test
    public void createTree_nestedSciptedParallel() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "nestedSciptedParallel", "nestedSciptedParallel.jenkinsfile", Result.SUCCESS);
        PipelineGraphApi api = new PipelineGraphApi(run);
        PipelineGraph graph = api.createTree();

        List<PipelineStage> stages = graph.getStages();

        String stagesString = TestUtils.collectStagesAsString(stages, PipelineStage::getName);
        assertThat(stagesString, equalTo("Parallel[A[Build,Test[A1,A2]],B[Build,Parallel[B1,B2]]]"));
    }

    @Issue("GH#213")
    @Test
    public void createTree_nestedDeclarativeParallel() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "nestedDeclarativeParallel", "nestedDeclarativeParallel.jenkinsfile", Result.SUCCESS);
        PipelineGraphApi api = new PipelineGraphApi(run);
        PipelineGraph graph = api.createTree();

        List<PipelineStage> stages = graph.getStages();

        String stagesString = TestUtils.collectStagesAsString(stages, PipelineStage::getName);
        assertThat(stagesString, equalTo("A[Build,Test[A1,A2]],B[Build,Test[B1,B2]]"));
    }

    @Issue("GH#233")
    @Test
    public void graphApiReturnSameResultForRunningPipeline() throws Exception {
        QueueTaskFuture<WorkflowRun> futureRun =
                TestUtils.createAndRunJobNoWait(j, "githubIssue233", "githubIssue233.jenkinsfile");
        WorkflowRun run = futureRun.waitForStart();

        j.waitForMessage("Starting sleep...", run);
        List<PipelineStage> stages = new PipelineGraphApi(run).createTree().getStages();

        String stagesStringRunning = TestUtils.collectStagesAsString(stages, PipelineStage::getName);

        // Wait for Pipeline to end (terminating it means end nodes might not be
        // created).
        j.waitForCompletion(run);

        stages = new PipelineGraphApi(run).createTree().getStages();
        String stagesStringFinished = TestUtils.collectStagesAsString(stages, PipelineStage::getName);
        assertThat(stagesStringRunning, equalTo(stagesStringFinished));
    }

    @Issue("GH#233")
    @Test
    public void gh233_singleRunningParallelBranch() throws Exception {
        WorkflowJob job = TestUtils.createJob(
                j, "gh233_singleRunningParallelBranch", "gh233_singleRunningParallelBranch.jenkinsfile");
        QueueTaskFuture<WorkflowRun> futureRun = job.scheduleBuild2(0);
        WorkflowRun run = futureRun.waitForStart();

        j.waitForMessage("Starting sleep A...", run);
        List<PipelineStage> stages = new PipelineGraphApi(run).createTree().getStages();
        String stagesStringRunning = TestUtils.collectStagesAsString(stages, PipelineStage::getName);
        LOGGER.log(Level.INFO, stagesStringRunning);
        // Wait for Pipeline to end (terminating it means end nodes might not be
        // created).
        j.waitForCompletion(run);

        List<PipelineStage> finishedStages =
                new PipelineGraphApi(run).createTree().getStages();
        String stagesStringFinished = TestUtils.collectStagesAsString(finishedStages, PipelineStage::getName);
        LOGGER.log(Level.INFO, stagesStringFinished);

        assertThat(stagesStringRunning, equalTo("Hello[A]"));
        assertThat(stagesStringFinished, equalTo("Hello[A]"));
    }

    @Issue("GH#233")
    @Test
    public void gh233_singleRunningNestedParallelBranch() throws Exception {
        WorkflowJob job = TestUtils.createJob(
                j, "gh233_singleRunningNestedParallelBranch", "gh233_singleRunningNestedParallelBranch.jenkinsfile");
        QueueTaskFuture<WorkflowRun> futureRun = job.scheduleBuild2(0);
        WorkflowRun run = futureRun.waitForStart();

        j.waitForMessage("Starting sleep A1...", run);
        List<PipelineStage> stages = new PipelineGraphApi(run).createTree().getStages();
        String stagesStringRunning = TestUtils.collectStagesAsString(stages, PipelineStage::getName);

        LOGGER.log(Level.INFO, stagesStringRunning);
        // Wait for Pipeline to end (terminating it means end nodes might not be
        // created).
        j.waitForCompletion(run);

        List<PipelineStage> finishedStages =
                new PipelineGraphApi(run).createTree().getStages();
        String stagesStringFinished = TestUtils.collectStagesAsString(finishedStages, PipelineStage::getName);
        LOGGER.log(Level.INFO, stagesStringFinished);

        assertThat(stagesStringRunning, equalTo("Hello[A[Parallel[A1]]]"));
        assertThat(stagesStringFinished, equalTo("Hello[A[Parallel[A1]]]"));
    }

    @Issue("GH#233")
    @Test
    public void gh233_singleRunningMultipleNestedParallelBranch() throws Exception {
        WorkflowJob job = TestUtils.createJob(
                j,
                "gh233_singleRunningMultipleNestedParallelBranch",
                "gh233_singleRunningMultipleNestedParallelBranch.jenkinsfile");
        QueueTaskFuture<WorkflowRun> futureRun = job.scheduleBuild2(0);
        WorkflowRun run = futureRun.waitForStart();

        j.waitForMessage("Finished A1", run);
        j.waitForMessage("Starting sleep B1...", run);
        List<PipelineStage> stages = new PipelineGraphApi(run).createTree().getStages();
        String stagesStringRunning =
                TestUtils.collectStagesAsString(stages, (PipelineStage s) -> TestUtils.nodeNameAndStatus(s));

        LOGGER.log(Level.INFO, stagesStringRunning);
        // Wait for Pipeline to end (terminating it means end nodes might not be
        // created).
        j.waitForCompletion(run);

        List<PipelineStage> finishedStages =
                new PipelineGraphApi(run).createTree().getStages();
        String stagesStringFinished =
                TestUtils.collectStagesAsString(finishedStages, (PipelineStage s) -> TestUtils.nodeNameAndStatus(s));
        LOGGER.log(Level.INFO, stagesStringFinished);

        assertThat(
                stagesStringRunning,
                equalTo(String.join(
                        "",
                        "Hello{running}[",
                        "A{success}[Test A{success}[A1{success}]],",
                        "B{running}[Test B{running}[B1{running}]]",
                        "]")));
        assertThat(
                stagesStringFinished,
                equalTo(String.join(
                        "",
                        "Hello{success}[",
                        "A{success}[Test A{success}[A1{success}]],",
                        "B{success}[Test B{success}[B1{success}]]",
                        "]")));
    }

    @Issue("GH#233")
    @Test
    public void gh233_multipleRunningParallelBranches() throws Exception {
        WorkflowJob job = TestUtils.createJob(
                j, "gh233_multipleRunningParallelBranches", "gh233_multipleRunningParallelBranches.jenkinsfile");

        QueueTaskFuture<WorkflowRun> futureRun = job.scheduleBuild2(0);
        WorkflowRun run = futureRun.waitForStart();
        j.waitForMessage("Starting sleep A...", run);
        j.waitForMessage("Starting sleep B...", run);
        List<PipelineStage> stages = new PipelineGraphApi(run).createTree().getStages();
        String stagesStringRunning = TestUtils.collectStagesAsString(stages, PipelineStage::getName);

        LOGGER.log(Level.INFO, stagesStringRunning);
        // Wait for Pipeline to end (terminating it means end nodes might not be
        // created).
        j.waitForCompletion(run);

        List<PipelineStage> finishedStages =
                new PipelineGraphApi(run).createTree().getStages();
        String stagesStringFinished = TestUtils.collectStagesAsString(finishedStages, PipelineStage::getName);
        LOGGER.log(Level.INFO, stagesStringFinished);

        assertThat(stagesStringRunning, equalTo("Hello[A,B]"));
        assertThat(stagesStringFinished, equalTo("Hello[A,B]"));
    }

    @Issue("GH#233")
    @Test
    public void gh233_multipleRunningNestedParallelBranches() throws Exception {
        WorkflowJob job = TestUtils.createJob(
                j,
                "gh233_multipleRunningNestedParallelBranches",
                "gh233_multipleRunningNestedParallelBranches.jenkinsfile");
        QueueTaskFuture<WorkflowRun> futureRun = job.scheduleBuild2(0);
        WorkflowRun run = futureRun.waitForStart();

        j.waitForMessage("Starting sleep A1...", run);
        j.waitForMessage("Starting sleep A2...", run);
        List<PipelineStage> stages = new PipelineGraphApi(run).createTree().getStages();
        String stagesStringRunning =
                TestUtils.collectStagesAsString(stages, (PipelineStage s) -> TestUtils.nodeNameAndStatus(s));
        LOGGER.log(Level.INFO, stagesStringRunning);
        // Wait for Pipeline to end (terminating it means end nodes might not be
        // created).
        j.waitForCompletion(run);

        List<PipelineStage> finishedStages =
                new PipelineGraphApi(run).createTree().getStages();
        String stagesStringFinished =
                TestUtils.collectStagesAsString(finishedStages, (PipelineStage s) -> TestUtils.nodeNameAndStatus(s));
        LOGGER.log(Level.INFO, stagesStringFinished);

        assertThat(
                stagesStringRunning, equalTo("Hello{running}[A{running}[Parallel{running}[A1{running},A2{running}]]]"));
        assertThat(
                stagesStringFinished,
                equalTo("Hello{success}[A{success}[Parallel{success}[A1{success},A2{success}]]]"));
    }

    @Issue("GH#222")
    @Test
    public void gh222_statusPropagatesToParent() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "gh222_statusPropagatesToParent", "gh222_statusPropagatesToParent.jenkinsfile", Result.FAILURE);

        List<PipelineStage> stages = new PipelineGraphApi(run).createTree().getStages();
        String stagesString =
                TestUtils.collectStagesAsString(stages, (PipelineStage s) -> TestUtils.nodeNameAndStatus(s));

        assertThat(stagesString, equalTo("ParentStage{failure}[SubStageA{failure},SubStageB{skipped}]"));
    }

    @Test
    public void pipelineWithSyntaxError() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "pipelineWithSyntaxError", "pipelineWithSyntaxError.jenkinsfile", Result.FAILURE);

        List<PipelineStage> stages = new PipelineGraphApi(run).createTree().getStages();
        String stagesString =
                TestUtils.collectStagesAsString(stages, (PipelineStage s) -> TestUtils.nodeNameAndStatus(s));

        assertThat(stagesString, equalTo("Unhandled Exception{failure}"));
    }

    @Test
    public void stagesGetValidTimings() throws Exception {
        WorkflowRun run =
                TestUtils.createAndRunJob(j, "nestedStageSleep", "nestedStageSleep.jenkinsfile", Result.SUCCESS);

        List<PipelineStage> stages = new PipelineGraphApi(run).createTree().getStages();

        Map<String, List<Long>> checks = new LinkedHashMap<>();
        // Give large ranges - we are testing that the values are feasible, not that they are precise.
        checks.put("Parent", Arrays.asList(1000L, 0L, 1000L, 5000L, 500L, 5000L));
        checks.put("Child A", Arrays.asList(0L, 0L, 0L, 5000L, 500L, 500L));
        checks.put("Grandchild A", Arrays.asList(0L, 0L, 0L, 5000L, 500L, 500L));
        checks.put("Child B", Arrays.asList(1000L, 0L, 1000L, 5000L, 500L, 3000L));
        checks.put("Grandchild B", Arrays.asList(1000L, 0L, 1000L, 5000L, 500L, 3000L));
        for (AbstractPipelineNode n : stages) {
            assertThat(checks, hasEntry(is(n.getName()), notNullValue()));
            TestUtils.assertTimesInRange(n, checks.get(n.getName()));
        }
    }

    @Issue("https://github.com/jenkinsci/pipeline-graph-view-plugin/issues/358")
    @Test
    public void gh_358_parallelStagesMarkedAsSkipped() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(
                j,
                "gh_358_parallelStagesMarkedAsSkipped",
                "gh_358_parallelStagesMarkedAsSkipped.jenkinsfile",
                Result.FAILURE);

        List<PipelineStage> stages = new PipelineGraphApi(run).createTree().getStages();
        String stagesString =
                TestUtils.collectStagesAsString(stages, (PipelineStage s) -> TestUtils.nodeNameAndStatus(s));

        assertThat(
                stagesString,
                equalTo(
                        "foo{success},first-parallel{failure}[bar{skipped},baz{failure}],second-parallel{skipped},Post Actions{success}"));
    }
}
