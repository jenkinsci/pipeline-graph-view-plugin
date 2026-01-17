package io.jenkins.plugins.pipelinegraphview.utils;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasEntry;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;

import hudson.model.Result;
import hudson.model.queue.QueueTaskFuture;
import io.jenkins.plugins.pipelinegraphview.treescanner.NodeRelationship;
import io.jenkins.plugins.pipelinegraphview.treescanner.NodeRelationshipFinder;
import io.jenkins.plugins.pipelinegraphview.treescanner.ParallelBlockRelationship;
import io.jenkins.plugins.pipelinegraphview.treescanner.PipelineNodeGraphAdapter;
import io.jenkins.plugins.pipelinegraphview.treescanner.PipelineNodeTreeScanner;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.test.steps.SemaphoreStep;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.Issue;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.LogRecorder;
import org.jvnet.hudson.test.WithoutJenkins;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

@WithJenkins
class PipelineStepApiTest {

    private static final Logger LOGGER = Logger.getLogger(PipelineStepApiTest.class.getName());

    private JenkinsRule j;

    private final LogRecorder l = new LogRecorder();

    @BeforeEach
    void enabledDebugLogs(JenkinsRule j) {
        this.j = j;
        l.record(PipelineGraphApi.class, Level.FINEST);
        l.record(PipelineNodeTreeScanner.class, Level.FINEST);
        l.record(PipelineNodeGraphAdapter.class, Level.FINEST);
        l.record(NodeRelationshipFinder.class, Level.FINEST);
        l.record(NodeRelationship.class, Level.FINEST);
        l.record(ParallelBlockRelationship.class, Level.FINEST);
    }

    @Test
    void unstableSmokes() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(j, "unstableSmokes", "unstableSmokes.jenkinsfile", Result.FAILURE);
        PipelineStepApi api = new PipelineStepApi(run);

        String unstableOneId =
                TestUtils.getNodesByDisplayName(run, "unstable-one").get(0).getId();
        String successId =
                TestUtils.getNodesByDisplayName(run, "success").get(0).getId();
        String unstableTwoId =
                TestUtils.getNodesByDisplayName(run, "unstable-two").get(0).getId();
        String failureID =
                TestUtils.getNodesByDisplayName(run, "failure").get(0).getId();

        List<PipelineStep> steps = api.getSteps(unstableOneId).steps;
        assertThat(steps, hasSize(3));
        assertThat(steps.get(0).name, is("foo"));
        assertThat(steps.get(0).title, is(""));
        assertThat(steps.get(1).name, is("oops-one"));
        assertThat(steps.get(1).title, is("Set stage result to unstable"));
        assertThat(steps.get(2).name, is("bar"));
        assertThat(steps.get(2).title, is(""));

        steps = api.getSteps(successId).steps;
        assertThat(steps, hasSize(1));
        assertThat(steps.get(0).name, is("baz"));
        assertThat(steps.get(0).title, is(""));

        steps = api.getSteps(unstableTwoId).steps;
        assertThat(steps, hasSize(2));
        assertThat(steps.get(0).name, is("will-be-caught"));
        assertThat(steps.get(0).title, is("Error signal"));
        assertThat(steps.get(1).name, is("oops-two"));
        assertThat(steps.get(1).title, is("Set stage result to unstable"));

        steps = api.getSteps(failureID).steps;
        assertThat(steps, hasSize(2));
        assertThat(steps.get(0).name, is("oops-masked"));
        assertThat(steps.get(0).title, is("Set stage result to unstable"));
        assertThat(steps.get(1).name, is("oops-failure"));
        assertThat(steps.get(1).title, is("Error signal"));
    }

    @Test
    void complexParallelBranchesHaveCorrectSteps() throws Exception {
        // It's a bit dirty, but do this in one to avoid reloading and rerunning the job
        // (as it takes a
        // long time)
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "complexParallelSmokes", "complexParallelSmokes.jenkinsfile", Result.SUCCESS);

        // Dynamically find the nodes which will be returned by the GraphAPI
        String nonParallelId = TestUtils.getNodesByDisplayName(run, "Non-Parallel Stage")
                .get(0)
                .getId();
        // We need to prefix with 'Branch: ' as these are Declarative parallel stages.
        String branchAId =
                TestUtils.getNodesByDisplayName(run, "Branch: Branch A").get(0).getId();
        String branchBId =
                TestUtils.getNodesByDisplayName(run, "Branch: Branch B").get(0).getId();
        String branchCId =
                TestUtils.getNodesByDisplayName(run, "Branch: Branch C").get(0).getId();
        String branchNested1Id =
                TestUtils.getNodesByDisplayName(run, "Nested 1").get(0).getId();
        String branchNested2Id =
                TestUtils.getNodesByDisplayName(run, "Nested 2").get(0).getId();

        // Check 'Non-Parallel Stage'
        PipelineStepApi api = new PipelineStepApi(run);
        List<PipelineStep> steps = api.getSteps(nonParallelId).steps;
        assertThat(steps, hasSize(2));
        assertThat(steps.get(0).name, is("This stage will be executed first."));
        assertThat(steps.get(0).title, is(""));
        assertThat(steps.get(1).name, is("Print Message"));
        assertThat(steps.get(1).title, is(""));

        // Check 'Branch A'
        steps = api.getSteps(branchAId).steps;
        assertThat(steps, hasSize(2));
        assertThat(steps.get(0).name, is("On Branch A - 1"));
        assertThat(steps.get(0).title, is(""));
        assertThat(steps.get(1).name, is("On Branch A - 2"));
        assertThat(steps.get(1).title, is(""));

        // Check 'Branch B'
        steps = api.getSteps(branchBId).steps;
        assertThat(steps, hasSize(2));
        assertThat(steps.get(0).name, is("On Branch B - 1"));
        assertThat(steps.get(0).title, is(""));
        assertThat(steps.get(1).name, is("On Branch B - 2"));
        assertThat(steps.get(1).title, is(""));

        // Check 'Branch C'
        steps = api.getSteps(branchCId).steps;
        assertThat(steps, hasSize(0));

        // Check 'Nested 1'
        steps = api.getSteps(branchNested1Id).steps;
        assertThat(steps, hasSize(2));
        assertThat(steps.get(0).name, is("In stage Nested 1 - 1 within Branch C"));
        assertThat(steps.get(0).title, is(""));
        assertThat(steps.get(1).name, is("In stage Nested 1 - 2 within Branch C"));
        assertThat(steps.get(1).title, is(""));

        // Check 'Nested 2'
        steps = api.getSteps(branchNested2Id).steps;
        assertThat(steps, hasSize(2));
        assertThat(steps.get(0).name, is("In stage Nested 2 - 1 within Branch C"));
        assertThat(steps.get(0).title, is(""));
        assertThat(steps.get(1).name, is("In stage Nested 2 - 2 within Branch C"));
        assertThat(steps.get(1).title, is(""));
    }

    @Test
    void nestedStagesHaveCorrectSteps() throws Exception {
        // It's a bit dirty, but do this in one to avoid reloading and rerunning the job
        // (as it takes a
        // long time)
        WorkflowRun run = TestUtils.createAndRunJob(j, "nestedStages", "nestedStages.jenkinsfile", Result.SUCCESS);

        String childAId = TestUtils.getNodesByDisplayName(run, "Child A").get(0).getId();
        String childBId = TestUtils.getNodesByDisplayName(run, "Child B").get(0).getId();
        String grandchildBId =
                TestUtils.getNodesByDisplayName(run, "Grandchild B").get(0).getId();
        String childCId = TestUtils.getNodesByDisplayName(run, "Child C").get(0).getId();
        String grandchildCId =
                TestUtils.getNodesByDisplayName(run, "Grandchild C").get(0).getId();
        String greatGrandchildCId = TestUtils.getNodesByDisplayName(run, "Great-grandchild C")
                .get(0)
                .getId();

        PipelineStepApi api = new PipelineStepApi(run);

        // Check 'Child A'
        List<PipelineStep> steps = api.getSteps(childAId).steps;
        assertThat(steps, hasSize(1));
        assertThat(steps.get(0).name, is("In child A"));
        assertThat(steps.get(0).title, is(""));

        // Check 'Child A'
        steps = api.getSteps(childBId).steps;
        assertThat(steps, hasSize(0));

        // Check 'Grandchild B'
        steps = api.getSteps(grandchildBId).steps;
        assertThat(steps, hasSize(1));
        assertThat(steps.get(0).name, is("In grandchild B"));
        assertThat(steps.get(0).title, is(""));

        // Check 'Child C'
        steps = api.getSteps(childCId).steps;
        assertThat(steps, hasSize(0));

        // Check 'Grandchild C'
        steps = api.getSteps(grandchildCId).steps;
        assertThat(steps, hasSize(0));

        // Check 'Great-Grandchild C'
        steps = api.getSteps(greatGrandchildCId).steps;
        assertThat(steps, hasSize(1));
        assertThat(steps.get(0).name, is("In great-grandchild C"));
        assertThat(steps.get(0).title, is(""));
    }

    @Test
    void getAllStepsReturnsStepsForComplexParallelBranches() throws Exception {
        // It's a bit dirty, but do this in one to avoid reloading and rerunning the job
        // (as it takes a
        // long time)
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "complexParallelSmokes", "complexParallelSmokes.jenkinsfile", Result.SUCCESS);

        // Check 'Non-Parallel Stage'
        PipelineStepApi api = new PipelineStepApi(run);

        List<PipelineStep> steps = api.getAllSteps().steps;
        assertThat(steps, hasSize(11));
        assertThat(steps.get(0).name, is("This stage will be executed first."));
        assertThat(steps.get(0).title, is(""));
        assertThat(steps.get(1).name, is("Print Message"));
        assertThat(steps.get(1).title, is(""));
        assertThat(steps.get(2).name, is("On Branch A - 1"));
        assertThat(steps.get(2).title, is(""));
        assertThat(steps.get(3).name, is("On Branch A - 2"));
        assertThat(steps.get(3).title, is(""));
        assertThat(steps.get(4).name, is("On Branch B - 1"));
        assertThat(steps.get(4).title, is(""));
        assertThat(steps.get(5).name, is("On Branch B - 2"));
        assertThat(steps.get(5).title, is(""));

        assertThat(steps.get(6).name, is("In stage Nested 1 - 1 within Branch C"));
        assertThat(steps.get(6).title, is(""));
        assertThat(steps.get(7).name, is("In stage Nested 1 - 2 within Branch C"));
        assertThat(steps.get(7).title, is(""));
        assertThat(steps.get(8).name, is("In stage Nested 2 - 1 within Branch C"));
        assertThat(steps.get(8).title, is(""));
        assertThat(steps.get(9).name, is("In stage Nested 2 - 2 within Branch C"));
        assertThat(steps.get(9).title, is(""));
        assertThat(steps.get(10).name, is("Get contextual object from internal APIs"));
        assertThat(steps.get(10).title, is(""));
    }

    @Test
    void getAllStepsReturnsStepsForNestedStages() throws Exception {
        // It's a bit dirty, but do this in one to avoid reloading and rerunning the job
        // (as it takes a
        // long time)
        WorkflowRun run = TestUtils.createAndRunJob(j, "nestedStages", "nestedStages.jenkinsfile", Result.SUCCESS);

        PipelineStepApi api = new PipelineStepApi(run);

        List<PipelineStep> steps = api.getAllSteps().steps;
        assertThat(steps, hasSize(3));
        assertThat(steps.get(0).name, is("In child A"));
        assertThat(steps.get(0).title, is(""));
        assertThat(steps.get(1).name, is("In grandchild B"));
        assertThat(steps.get(1).title, is(""));
        assertThat(steps.get(2).name, is("In great-grandchild C"));
        assertThat(steps.get(2).title, is(""));
    }

    @Test
    @DisplayName("When no stage synthetic stage is used")
    void noStage() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(j, "noStage", "noStage.jenkinsfile", Result.SUCCESS);

        PipelineStepApi api = new PipelineStepApi(run);

        PipelineStepList allSteps = api.getAllSteps();
        List<PipelineStep> steps = allSteps.steps;
        assertThat(steps, hasSize(2));

        PipelineStep pipelineStep = steps.get(0);
        assertThat(pipelineStep.name, is("Hi 1"));
        assertThat(pipelineStep.title, is(""));
        assertThat(pipelineStep.stageId, is("2"));

        pipelineStep = steps.get(1);
        assertThat(pipelineStep.name, is("Hi 2"));
        assertThat(pipelineStep.title, is(""));
        assertThat(pipelineStep.stageId, is("2"));
    }

    @Issue("GH#92")
    @Test
    void githubIssue92RegressionTest() throws Exception {
        // It's a bit dirty, but do this in one to avoid reloading and rerunning the job
        // (as it takes a
        // long time)
        WorkflowRun run = TestUtils.createAndRunJob(j, "githubIssue92", "githubIssue92.jenkinsfile", Result.SUCCESS);

        PipelineStepApi api = new PipelineStepApi(run);

        // Linux 8
        String linux8CheckoutId = TestUtils.getNodesByDisplayName(run, "Checkout (linux-8)")
                .get(0)
                .getId();
        String linux8BuildId =
                TestUtils.getNodesByDisplayName(run, "Build (linux-8)").get(0).getId();
        String linux8ArchiveId =
                TestUtils.getNodesByDisplayName(run, "Archive (linux-8)").get(0).getId();

        // Linux 11
        String linux11CheckoutId = TestUtils.getNodesByDisplayName(run, "Checkout (linux-11)")
                .get(0)
                .getId();
        String linux11BuildId =
                TestUtils.getNodesByDisplayName(run, "Build (linux-11)").get(0).getId();
        String linux11ArchiveId = TestUtils.getNodesByDisplayName(run, "Archive (linux-11)")
                .get(0)
                .getId();

        String deployStageId =
                TestUtils.getNodesByDisplayName(run, "Deploy").get(0).getId();

        List<PipelineStep> steps = api.getSteps(linux8CheckoutId).steps;
        assertThat(steps, hasSize(1));
        assertThat(steps.get(0).name, is("Checking out linux-8"));
        assertThat(steps.get(0).title, is(""));

        steps = api.getSteps(linux8BuildId).steps;
        assertThat(steps, hasSize(1));
        assertThat(steps.get(0).name, is("Building linux-8"));
        assertThat(steps.get(0).title, is(""));

        steps = api.getSteps(linux8ArchiveId).steps;
        assertThat(steps, hasSize(1));
        assertThat(steps.get(0).name, is("Archiving linux-8"));
        assertThat(steps.get(0).title, is(""));

        steps = api.getSteps(linux11CheckoutId).steps;
        assertThat(steps, hasSize(1));
        assertThat(steps.get(0).name, is("Checking out linux-11"));
        assertThat(steps.get(0).title, is(""));

        steps = api.getSteps(linux11BuildId).steps;
        assertThat(steps, hasSize(1));
        assertThat(steps.get(0).name, is("Building linux-11"));
        assertThat(steps.get(0).title, is(""));

        steps = api.getSteps(linux11ArchiveId).steps;
        assertThat(steps, hasSize(1));
        assertThat(steps.get(0).name, is("Archiving linux-11"));
        assertThat(steps.get(0).title, is(""));

        steps = api.getSteps(deployStageId).steps;
        assertThat(steps, hasSize(1));
        assertThat(steps.get(0).name, is("Deploying..."));
        assertThat(steps.get(0).title, is(""));
    }

    @Issue("GH#213")
    @Test
    void githubIssue213RegressionTest_scriptedError() throws Exception {
        // It's a bit dirty, but do this in one to avoid reloading and rerunning the job
        // (as it takes a
        // long time)
        WorkflowRun run = TestUtils.createAndRunJob(j, "githubIssue213", "unstableSmokes.jenkinsfile", Result.FAILURE);

        PipelineStepApi api = new PipelineStepApi(run);

        String failureStage =
                TestUtils.getNodesByDisplayName(run, "failure").get(0).getId();

        List<PipelineStep> steps = api.getSteps(failureStage).steps;
        assertThat(steps, hasSize(2));
        PipelineStep errorStep = steps.get(1);
        assertThat(errorStep.name, is("oops-failure"));
        assertThat(errorStep.title, is("Error signal"));
        FlowNode node = run.getExecution().getNode(String.valueOf(errorStep.id));
        String errorText = PipelineNodeUtil.getExceptionText(node);
        assertThat(errorText, equalTo("oops-failure"));
    }

    @Issue("GH#213")
    @Test
    void githubIssue213RegressionTest_errorStep() throws Exception {
        // It's a bit dirty, but do this in one to avoid reloading and rerunning the job
        // (as it takes a
        // long time)
        WorkflowRun run =
                TestUtils.createAndRunJob(j, "githubIssue213_errorStep", "unstableSmokes.jenkinsfile", Result.FAILURE);

        PipelineStepApi api = new PipelineStepApi(run);

        String failureStage =
                TestUtils.getNodesByDisplayName(run, "failure").get(0).getId();

        List<PipelineStep> steps = api.getSteps(failureStage).steps;
        assertThat(steps, hasSize(2));
        PipelineStep errorStep = steps.get(1);
        assertThat(errorStep.name, is("oops-failure"));
        assertThat(errorStep.title, is("Error signal"));
        FlowNode node = run.getExecution().getNode(String.valueOf(errorStep.id));
        String errorText = PipelineNodeUtil.getExceptionText(node);
        assertThat(errorText, equalTo("oops-failure"));
    }

    @Issue("GH#213")
    @Test
    void githubIssue213RegressionTest_pipelineCallsUndefinedVar() throws Exception {
        // It's a bit dirty, but do this in one to avoid reloading and rerunning the job
        // (as it takes a
        // long time)
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "githubIssue213_callsUnknownVariable", "callsUnknownVariable.jenkinsfile", Result.FAILURE);

        PipelineStepApi api = new PipelineStepApi(run);

        List<PipelineStep> steps = api.getAllSteps().steps;
        assertThat(steps, hasSize(2));
        PipelineStep errorStep = steps.get(1);
        assertThat(errorStep.name, equalTo("Pipeline error"));
    }

    @Issue("GH#274")
    @Test
    void githubIssue274RegressionTest_suppressFlowInterruptedExceptions() throws Exception {
        // It's a bit dirty, but do this in one test to avoid reloading and rerunning
        // the job (as it takes a
        // long time)
        WorkflowRun run = TestUtils.createAndRunJob(j, "githubIssue274", "githubIssue274.jenkinsfile", Result.FAILURE);

        PipelineStepApi api = new PipelineStepApi(run);

        String failureStage =
                TestUtils.getNodesByDisplayName(run, "failure").get(0).getId();

        List<PipelineStep> steps = api.getSteps(failureStage).steps;
        assertThat(steps, hasSize(2));
        PipelineStep errorStep = steps.get(0);
        FlowNode node = run.getExecution().getNode(String.valueOf(errorStep.id));
        String errorText = PipelineNodeUtil.getExceptionText(node);
        assertThat(
                errorText,
                not(containsString(
                        "Found unhandled org.jenkinsci.plugins.workflow.steps.FlowInterruptedException exception")));
    }

    @Issue("GH#233")
    @Test
    void stepApiReturnsSameResultForRunningPipeline() throws Exception {
        QueueTaskFuture<WorkflowRun> futureRun =
                TestUtils.createAndRunJobNoWait(j, "githubIssue233", "githubIssue233.jenkinsfile");
        WorkflowRun run = futureRun.waitForStart();

        SemaphoreStep.waitForStart("wait/1", run);
        List<PipelineStep> steps = new PipelineStepApi(run).getAllSteps().steps;

        Function<PipelineStep, String> converter = s -> s.stageId + "->" + s.name;
        String stepsStringRunning = TestUtils.collectStepsAsString(steps, converter);

        SemaphoreStep.success("wait/1", null);
        // Wait for Pipeline to end (terminating it means end nodes might not be
        // created).
        j.waitForCompletion(run);

        steps = new PipelineStepApi(run).getAllSteps().steps;
        String stepsStringFinished = TestUtils.collectStepsAsString(steps, converter);
        String[] expected = stepsStringRunning.split(",");
        String[] actual = stepsStringFinished.split(",");
        for (int i = 0; i < expected.length; i++) {
            assertThat(actual[i], equalTo(expected[i]));
        }
    }

    @Test
    void pipelineWithSyntaxError() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "pipelineWithSyntaxError", "pipelineWithSyntaxError.jenkinsfile", Result.FAILURE);

        List<PipelineStep> steps = new PipelineStepApi(run).getAllSteps().steps;
        String stepsString = TestUtils.collectStepsAsString(steps, TestUtils::nodeNameAndStatus);

        assertThat(stepsString, equalTo("Pipeline error{failure}"));
    }

    @Test
    void stepsGetValidTimings() throws Exception {
        WorkflowRun run =
                TestUtils.createAndRunJob(j, "nestedStageSleep", "nestedStageSleep.jenkinsfile", Result.SUCCESS);

        List<PipelineStep> steps = new PipelineStepApi(run).getAllSteps().steps;

        Map<String, TestUtils.TimeRange> checks = new LinkedHashMap<>();
        // Give large ranges - we are testing that the values are feasible, not that they are precise.
        checks.put("In grandchild A", new TestUtils.TimeRange(1000L, 0L, 0L, 5000L, 500L, 500L));
        checks.put("In grandchild B", new TestUtils.TimeRange(1000L, 0L, 0L, 5000L, 500L, 500L));
        checks.put("1", new TestUtils.TimeRange(1000L, 0L, 1000L, 5000L, 500L, 3000L));
        for (AbstractPipelineNode n : steps) {
            assertThat(checks, hasEntry(is(n.name), notNullValue()));
            TestUtils.assertTimesInRange(n, checks.get(n.name));
        }
    }

    @Issue("GH#362")
    @Test
    void gh362_pausedParallelBranches() throws Exception {
        WorkflowJob job = TestUtils.createJob(
                j, "gh233_multipleRunningParallelBranches", "gh233_multipleRunningParallelBranches.jenkinsfile");

        QueueTaskFuture<WorkflowRun> futureRun = job.scheduleBuild2(0);
        WorkflowRun run = futureRun.waitForStart();
        SemaphoreStep.waitForStart("a/1", run);
        SemaphoreStep.waitForStart("b/1", run);
        // Sleep to allow Pipeline to reach sleep.
        List<PipelineStep> steps = new PipelineStepApi(run).getAllSteps().steps;
        String stepsString = TestUtils.collectStepsAsString(steps, TestUtils::nodeNameAndStatus);

        SemaphoreStep.success("a/1", null);
        SemaphoreStep.success("b/1", null);
        LOGGER.log(Level.INFO, stepsString);
        // Wait for Pipeline to end (terminating it means end nodes might not be
        // created).
        j.waitForCompletion(run);
        List<PipelineStep> finishedSteps = new PipelineStepApi(run).getAllSteps().steps;
        String stepsStringFinished = TestUtils.collectStepsAsString(finishedSteps, TestUtils::nodeNameAndStatus);
        LOGGER.log(Level.INFO, stepsStringFinished);

        assertThat(stepsString, equalTo("a{running},b{running}"));
        assertThat(stepsStringFinished, equalTo("a{success},b{success}"));
    }

    @Issue("GH#362")
    @Test
    void gh362_stepsBeforeStepBlockGetValidStatus() throws Exception {
        WorkflowJob job = TestUtils.createJob(j, "stepBlockInSteps", "stepBlockInSteps.jenkinsfile");

        QueueTaskFuture<WorkflowRun> futureRun = job.scheduleBuild2(0);
        WorkflowRun run = futureRun.waitForStart();
        SemaphoreStep.waitForStart("1/1", run);
        List<PipelineStep> steps = new PipelineStepApi(run).getAllSteps().steps;
        String stepsString = TestUtils.collectStepsAsString(steps, TestUtils::nodeNameAndStatus);

        SemaphoreStep.success("1/1", null);
        LOGGER.log(Level.INFO, stepsString);
        // Wait for Pipeline to end (terminating it means end nodes might not be
        // created).
        j.waitForCompletion(run);

        List<PipelineStep> finishedSteps = new PipelineStepApi(run).getAllSteps().steps;
        String stepsStringFinished = TestUtils.collectStepsAsString(finishedSteps, TestUtils::nodeNameAndStatus);
        LOGGER.log(Level.INFO, stepsStringFinished);

        assertThat(stepsString, equalTo("Hello World{success},1{running}"));
        assertThat(stepsStringFinished, equalTo("Hello World{success},1{success},Goodbye World{success}"));

        Map<String, TestUtils.TimeRange> checks = new LinkedHashMap<>();
        // Give large ranges - we are testing that the values are feasible, not that they are precise.
        checks.put("Hello World", new TestUtils.TimeRange(100L, 0L, 0L, 10000L, 1000L, 1000L));
        checks.put("1", new TestUtils.TimeRange(100L, 0L, 10L, 10000L, 3000L, 3000L));
        checks.put("Goodbye World", new TestUtils.TimeRange(0L, 0L, 0L, 10000L, 1000L, 1000L));
        for (AbstractPipelineNode n : finishedSteps) {
            assertThat(checks, hasEntry(is(n.name), notNullValue()));
            TestUtils.assertTimesInRange(n, checks.get(n.name));
        }
    }

    @Test
    @WithoutJenkins
    void clearTextContents() {
        assertThat(PipelineStepApi.cleanTextContent("Hello World"), equalTo("Hello World"));
        assertThat(PipelineStepApi.cleanTextContent("abc[10m]def"), equalTo("abc[10m]def"));
        // 3-4 bit
        assertThat(PipelineStepApi.cleanTextContent("\033[32mHello World\033[0m"), equalTo("Hello World"));
        assertThat(PipelineStepApi.cleanTextContent("\033[1;32mHello World\033[0m"), equalTo("Hello World"));
        // 8-bit
        assertThat(PipelineStepApi.cleanTextContent("\033[38;5;6mHello World\033[0m"), equalTo("Hello World"));
        // with colon as separator character
        assertThat(PipelineStepApi.cleanTextContent("\033[38:5:6mHello World\033[0m"), equalTo("Hello World"));
        // 24-bit rgb
        assertThat(PipelineStepApi.cleanTextContent("\033[38;2;0;255;128mHello World\033[0m"), equalTo("Hello World"));
    }

    @Test
    @DisplayName("Feature flags are extracted from markAsHiddenForDisplay steps")
    void markAsHiddenForDisplay() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "markAsHiddenForDisplay", "markAsHiddenForDisplay.jenkinsfile", Result.SUCCESS);
        PipelineStepApi api = new PipelineStepApi(run);

        // Get all steps
        List<PipelineStep> allSteps = api.getAllSteps().steps;
        assertThat(allSteps, hasSize(4));

        // Test 1: Normal step with no flags
        PipelineStep normalStep = allSteps.get(0);
        assertThat(normalStep.name, is("This is visible"));
        assertThat(normalStep.getFlags(), notNullValue());
        assertThat(normalStep.getFlags().isEmpty(), is(true));

        // Test 2: Step marked as hidden
        PipelineStep hiddenStep = allSteps.get(1);
        assertThat(hiddenStep.name, is("This step is hidden"));
        assertThat(hiddenStep.getFlags(), hasEntry("hidden", Boolean.TRUE));

        // Test 3: Another visible step
        PipelineStep visibleStep = allSteps.get(2);
        assertThat(visibleStep.name, is("This is also visible"));
        assertThat(visibleStep.getFlags(), notNullValue());
        assertThat(visibleStep.getFlags().isEmpty(), is(true));

        // Test 4: Nested hidden - outer is hidden
        PipelineStep nestedOuterStep = allSteps.get(3);
        assertThat(nestedOuterStep.name, is("Outer is hidden"));
        assertThat(nestedOuterStep.getFlags(), hasEntry("hidden", Boolean.TRUE));
    }
}
