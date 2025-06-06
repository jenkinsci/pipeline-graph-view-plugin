package io.jenkins.plugins.pipelinegraphview.utils;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

import hudson.model.Result;
import hudson.model.labels.LabelAtom;
import hudson.model.queue.QueueTaskFuture;
import hudson.slaves.DumbSlave;
import io.jenkins.plugins.pipelinegraphview.Messages;
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
import org.jenkinsci.plugins.workflow.test.steps.SemaphoreStep;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.Issue;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.LogRecorder;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

@WithJenkins
class PipelineGraphApiTest {

    private static final Logger LOGGER = Logger.getLogger(PipelineGraphApiTest.class.getName());

    private JenkinsRule j;

    private final LogRecorder l = new LogRecorder();

    @BeforeEach
    void enabledDebugLogs(JenkinsRule j) {
        this.j = j;
        l.record(PipelineGraphApi.class, Level.FINEST);
        l.record(PipelineNodeTreeScanner.class, Level.FINEST);
        l.record(PipelineNodeGraphAdapter.class, Level.FINEST);
        l.record(NodeRelationshipFinder.class, Level.FINEST);
    }

    @Test
    void createTree_unstableSmokes() throws Exception {
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
    void createTree_complexSmokes() throws Exception {
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
    void createTree_scriptedParallel() throws Exception {
        WorkflowRun run =
                TestUtils.createAndRunJob(j, "scriptedParallel", "scriptedParallel.jenkinsfile", Result.SUCCESS);
        PipelineGraphApi api = new PipelineGraphApi(run);
        PipelineGraph graph = api.createTree();

        List<PipelineStage> stages = graph.getStages();

        String stagesString = TestUtils.collectStagesAsString(stages, PipelineStage::getName);
        assertThat(stagesString, equalTo("A,Parallel[B[BA,BB],C[CA,CB]],D[E[EA,EB],F[FA,FB]],G"));
    }

    @Test
    @DisplayName("When no stage synthetic stage is used")
    void noStage() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(j, "noStage", "noStage.jenkinsfile", Result.SUCCESS);
        PipelineGraphApi api = new PipelineGraphApi(run);
        PipelineGraph graph = api.createTree();

        List<PipelineStage> stages = graph.getStages();

        String stagesString = TestUtils.collectStagesAsString(stages, PipelineStage::getName);
        assertThat(stagesString, equalTo(Messages.FlowNodeWrapper_noStage()));
    }

    @Issue("GH#85")
    @Test
    void createTree_syntheticStages() throws Exception {
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
    void createTree_skippedParallel() throws Exception {
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
    void createTree_nestedSciptedParallel() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "nestedSciptedParallel", "nestedScriptedParallel.jenkinsfile", Result.SUCCESS);
        PipelineGraphApi api = new PipelineGraphApi(run);
        PipelineGraph graph = api.createTree();

        List<PipelineStage> stages = graph.getStages();

        String stagesString = TestUtils.collectStagesAsString(stages, PipelineStage::getName);
        assertThat(stagesString, equalTo("Parallel[A[Build,Test[A1,A2]],B[Build,Parallel[B1,B2]]]"));
    }

    @Issue("GH#213")
    @Test
    void createTree_nestedDeclarativeParallel() throws Exception {
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
    void graphApiReturnSameResultForRunningPipeline() throws Exception {
        QueueTaskFuture<WorkflowRun> futureRun =
                TestUtils.createAndRunJobNoWait(j, "githubIssue233", "githubIssue233.jenkinsfile");
        WorkflowRun run = futureRun.waitForStart();

        SemaphoreStep.waitForStart("wait/1", run);
        List<PipelineStage> stages = new PipelineGraphApi(run).createTree().getStages();

        String stagesStringRunning = TestUtils.collectStagesAsString(stages, PipelineStage::getName);

        SemaphoreStep.success("wait/1", null);
        // Wait for Pipeline to end (terminating it means end nodes might not be
        // created).
        j.waitForCompletion(run);

        stages = new PipelineGraphApi(run).createTree().getStages();
        String stagesStringFinished = TestUtils.collectStagesAsString(stages, PipelineStage::getName);
        assertThat(stagesStringRunning, equalTo(stagesStringFinished));
    }

    @Issue("GH#233")
    @Test
    void gh233_singleRunningParallelBranch() throws Exception {
        WorkflowJob job = TestUtils.createJob(
                j, "gh233_singleRunningParallelBranch", "gh233_singleRunningParallelBranch.jenkinsfile");
        QueueTaskFuture<WorkflowRun> futureRun = job.scheduleBuild2(0);
        WorkflowRun run = futureRun.waitForStart();

        SemaphoreStep.waitForStart("wait/1", run);
        List<PipelineStage> stages = new PipelineGraphApi(run).createTree().getStages();
        String stagesStringRunning = TestUtils.collectStagesAsString(stages, PipelineStage::getName);
        LOGGER.log(Level.INFO, stagesStringRunning);
        SemaphoreStep.success("wait/1", null);
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
    void gh233_singleRunningNestedParallelBranch() throws Exception {
        WorkflowJob job = TestUtils.createJob(
                j, "gh233_singleRunningNestedParallelBranch", "gh233_singleRunningNestedParallelBranch.jenkinsfile");
        QueueTaskFuture<WorkflowRun> futureRun = job.scheduleBuild2(0);
        WorkflowRun run = futureRun.waitForStart();

        SemaphoreStep.waitForStart("wait/1", run);
        List<PipelineStage> stages = new PipelineGraphApi(run).createTree().getStages();
        String stagesStringRunning = TestUtils.collectStagesAsString(stages, PipelineStage::getName);

        SemaphoreStep.success("wait/1", null);
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
    void gh233_singleRunningMultipleNestedParallelBranch() throws Exception {
        WorkflowJob job = TestUtils.createJob(
                j,
                "gh233_singleRunningMultipleNestedParallelBranch",
                "gh233_singleRunningMultipleNestedParallelBranch.jenkinsfile");
        QueueTaskFuture<WorkflowRun> futureRun = job.scheduleBuild2(0);
        WorkflowRun run = futureRun.waitForStart();

        j.waitForMessage("Testing A1", run);
        j.waitForMessage("Finished A1", run);
        SemaphoreStep.waitForStart("wait/1", run);
        List<PipelineStage> stages = new PipelineGraphApi(run).createTree().getStages();
        String stagesStringRunning = TestUtils.collectStagesAsString(stages, TestUtils::nodeNameAndStatus);

        LOGGER.log(Level.INFO, stagesStringRunning);
        SemaphoreStep.success("wait/1", null);
        // Wait for Pipeline to end (terminating it means end nodes might not be
        // created).
        j.waitForCompletion(run);

        List<PipelineStage> finishedStages =
                new PipelineGraphApi(run).createTree().getStages();
        String stagesStringFinished = TestUtils.collectStagesAsString(finishedStages, TestUtils::nodeNameAndStatus);
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
    void gh233_multipleRunningParallelBranches() throws Exception {
        WorkflowJob job = TestUtils.createJob(
                j, "gh233_multipleRunningParallelBranches", "gh233_multipleRunningParallelBranches.jenkinsfile");

        QueueTaskFuture<WorkflowRun> futureRun = job.scheduleBuild2(0);
        WorkflowRun run = futureRun.waitForStart();
        SemaphoreStep.waitForStart("a/1", run);
        SemaphoreStep.waitForStart("b/1", run);
        List<PipelineStage> stages = new PipelineGraphApi(run).createTree().getStages();
        String stagesStringRunning = TestUtils.collectStagesAsString(stages, PipelineStage::getName);

        LOGGER.log(Level.INFO, stagesStringRunning);
        SemaphoreStep.success("a/1", null);
        SemaphoreStep.success("b/1", null);
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
    void gh233_multipleRunningNestedParallelBranches() throws Exception {
        WorkflowJob job = TestUtils.createJob(
                j,
                "gh233_multipleRunningNestedParallelBranches",
                "gh233_multipleRunningNestedParallelBranches.jenkinsfile");
        QueueTaskFuture<WorkflowRun> futureRun = job.scheduleBuild2(0);
        WorkflowRun run = futureRun.waitForStart();

        SemaphoreStep.waitForStart("a1/1", run);
        SemaphoreStep.waitForStart("a2/1", run);
        List<PipelineStage> stages = new PipelineGraphApi(run).createTree().getStages();
        String stagesStringRunning = TestUtils.collectStagesAsString(stages, TestUtils::nodeNameAndStatus);
        LOGGER.log(Level.INFO, stagesStringRunning);

        SemaphoreStep.success("a1/1", null);
        SemaphoreStep.success("a2/1", null);
        // Wait for Pipeline to end (terminating it means end nodes might not be
        // created).
        j.waitForCompletion(run);

        List<PipelineStage> finishedStages =
                new PipelineGraphApi(run).createTree().getStages();
        String stagesStringFinished = TestUtils.collectStagesAsString(finishedStages, TestUtils::nodeNameAndStatus);
        LOGGER.log(Level.INFO, stagesStringFinished);

        assertThat(
                stagesStringRunning, equalTo("Hello{running}[A{running}[Parallel{running}[A1{running},A2{running}]]]"));
        assertThat(
                stagesStringFinished,
                equalTo("Hello{success}[A{success}[Parallel{success}[A1{success},A2{success}]]]"));
    }

    @Issue("GH#222")
    @Test
    void gh222_statusPropagatesToParent() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "gh222_statusPropagatesToParent", "gh222_statusPropagatesToParent.jenkinsfile", Result.FAILURE);

        List<PipelineStage> stages = new PipelineGraphApi(run).createTree().getStages();
        String stagesString = TestUtils.collectStagesAsString(stages, TestUtils::nodeNameAndStatus);

        assertThat(stagesString, equalTo("ParentStage{failure}[SubStageA{failure},SubStageB{skipped}]"));
    }

    @Test
    void pipelineWithSyntaxError() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "pipelineWithSyntaxError", "pipelineWithSyntaxError.jenkinsfile", Result.FAILURE);

        List<PipelineStage> stages = new PipelineGraphApi(run).createTree().getStages();
        String stagesString = TestUtils.collectStagesAsString(stages, TestUtils::nodeNameAndStatus);

        assertThat(stagesString, equalTo("%s{failure}".formatted(Messages.FlowNodeWrapper_noStage())));
    }

    @Test
    void stagesGetValidTimings() throws Exception {
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
    void gh_358_parallelStagesMarkedAsSkipped() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(
                j,
                "gh_358_parallelStagesMarkedAsSkipped",
                "gh_358_parallelStagesMarkedAsSkipped.jenkinsfile",
                Result.FAILURE);

        List<PipelineStage> stages = new PipelineGraphApi(run).createTree().getStages();
        String stagesString = TestUtils.collectStagesAsString(stages, TestUtils::nodeNameAndStatus);

        assertThat(
                stagesString,
                equalTo(
                        "foo{success},first-parallel{failure}[bar{skipped},baz{failure}],second-parallel{skipped},Post Actions{success}"));
    }

    @Test
    void getAgentForSingleStagePipeline() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "getAgentForSingleStagePipeline", "singleStagePipeline.jenkinsfile", Result.SUCCESS);

        List<PipelineStage> stages = new PipelineGraphApi(run).createTree().getStages();

        assertThat(stages.size(), equalTo(1));
        assertThat(stages.get(0).getAgent(), equalTo("built-in"));
    }

    @Test
    void getAgentForSingleStagePipelineWithExternalAgent() throws Exception {
        var testingLabel = new LabelAtom("external");
        DumbSlave agent = j.createSlave(testingLabel);
        j.waitOnline(agent);

        WorkflowRun run = TestUtils.createAndRunJob(
                j,
                "getAgentForSingleStagePipelineWithExternalAgent",
                "singleStagePipelineWithExternalAgent.jenkinsfile",
                Result.SUCCESS);

        List<PipelineStage> stages = new PipelineGraphApi(run).createTree().getStages();

        assertThat(stages.size(), equalTo(1));
        assertThat(stages.get(0).getAgent(), equalTo(agent.getNodeName()));
    }

    @Test
    void getAgentForParallelPipelineWithExternalAgent() throws Exception {
        var testingLabel = new LabelAtom("external");
        DumbSlave agent = j.createSlave(testingLabel);
        j.waitOnline(agent);

        WorkflowRun run = TestUtils.createAndRunJob(
                j,
                "getAgentForParallelPipelineWithExternalAgent",
                "parallelPipelineWithExternalAgent.jenkinsfile",
                Result.SUCCESS);

        List<PipelineStage> stages = new PipelineGraphApi(run).createTree().getStages();

        // Parallel pipeline structure:
        // name: Parallel, type: STAGE
        // name: Parallel, type: PARALLEL_BLOCK

        // name: Builtin, type: PARALLEL
        // name: Stage : Start, type: STEPS_BLOCK
        // name: Builtin, type: STAGE
        // name: Allocate node : Start, type: STEPS_BLOCK

        assertThat(stages.size(), equalTo(1));
        assertThat(stages.get(0).getType(), equalTo("STAGE"));
        assertThat(stages.get(0).getName(), equalTo("Parallel"));
        assertThat(stages.get(0).getAgent(), equalTo(null));

        List<PipelineStage> children = stages.get(0).getChildren();

        assertThat(children.size(), equalTo(2));

        PipelineStage builtinStage = children.get(0);
        assertThat(builtinStage.getType(), equalTo("PARALLEL"));
        assertThat(builtinStage.getName(), equalTo("Builtin"));
        assertThat(builtinStage.getAgent(), equalTo("built-in"));

        PipelineStage externalStage = children.get(1);
        assertThat(externalStage.getType(), equalTo("PARALLEL"));
        assertThat(externalStage.getName(), equalTo("External"));
        assertThat(externalStage.getAgent(), equalTo(agent.getNodeName()));
    }

    @Issue("GH#616")
    @Test
    void createTree_stageResult() throws Exception {
        WorkflowRun run =
                TestUtils.createAndRunJob(j, "stageResult", "gh616_stageResult.jenkinsfile", Result.UNSTABLE, false);
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
                        "{success-stage,success-stage,STAGE,success},",
                        "{failure-stage,failure-stage,STAGE,failure},",
                        "{unstable-stage,unstable-stage,STAGE,unstable}")));
    }

    @Issue("GH#764")
    @Test
    void createTree_branchResult() throws Exception {
        WorkflowRun run =
                TestUtils.createAndRunJob(j, "branchResult", "gh764_branchResult.jenkinsfile", Result.UNSTABLE, false);
        PipelineGraphApi api = new PipelineGraphApi(run);
        PipelineGraph graph = api.createTree();

        List<PipelineStage> stages = graph.getStages();

        String stagesString = TestUtils.collectStagesAsString(stages, TestUtils::nodeNameAndStatus);
        assertThat(
                stagesString,
                equalTo(String.join(
                        "",
                        "Parallel{unstable}[",
                        "success-branch{success},",
                        "failure-branch{failure},",
                        "unstable-branch{unstable}",
                        "]")));
    }
}
