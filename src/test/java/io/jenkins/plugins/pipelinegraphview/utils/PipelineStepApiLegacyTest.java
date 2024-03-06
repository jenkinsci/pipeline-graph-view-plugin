package io.jenkins.plugins.pipelinegraphview.utils;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

import hudson.model.Result;
import java.util.List;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.junit.Rule;
import org.junit.Test;
import org.jvnet.hudson.test.Issue;
import org.jvnet.hudson.test.JenkinsRule;

public class PipelineStepApiLegacyTest {
    @Rule
    public JenkinsRule j = new JenkinsRule();

    @Test
    public void unstableSmokes() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(j, "unstableSmokes", "unstableSmokes.jenkinsfile", Result.FAILURE);
        PipelineStepApi api = new PipelineStepApi(run);

        String unstableOneId = TestUtils.getNodesByDisplayName(run, "unstable-one").get(0).getId();
        String successId = TestUtils.getNodesByDisplayName(run, "success").get(0).getId();
        String unstableTwoId = TestUtils.getNodesByDisplayName(run, "unstable-two").get(0).getId();
        String failureID = TestUtils.getNodesByDisplayName(run, "failure").get(0).getId();

        List<PipelineStep> steps = api.getLegacySteps(unstableOneId).getSteps();
        assertThat(steps, hasSize(3));
        assertThat(steps.get(0).getName(), is("foo"));
        assertThat(steps.get(0).getTitle(), is("Print Message"));
        assertThat(steps.get(1).getName(), is("oops-one"));
        assertThat(steps.get(1).getTitle(), is("Set stage result to unstable"));
        assertThat(steps.get(2).getName(), is("bar"));
        assertThat(steps.get(2).getTitle(), is("Print Message"));

        steps = api.getSteps(successId).getSteps();
        assertThat(steps, hasSize(1));
        assertThat(steps.get(0).getName(), is("baz"));
        assertThat(steps.get(0).getTitle(), is("Print Message"));

        steps = api.getSteps(unstableTwoId).getSteps();
        assertThat(steps, hasSize(2));
        assertThat(steps.get(0).getName(), is("will-be-caught"));
        assertThat(steps.get(0).getTitle(), is("Error signal"));
        assertThat(steps.get(1).getName(), is("oops-two"));
        assertThat(steps.get(1).getTitle(), is("Set stage result to unstable"));

        steps = api.getSteps(failureID).getSteps();
        assertThat(steps, hasSize(2));
        assertThat(steps.get(0).getName(), is("oops-masked"));
        assertThat(steps.get(0).getTitle(), is("Set stage result to unstable"));
        assertThat(steps.get(1).getName(), is("oops-failure"));
        assertThat(steps.get(1).getTitle(), is("Error signal"));
    }

    @Test
    public void complexParallelBranchesHaveCorrectSteps() throws Exception {
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
        String branchAId = TestUtils.getNodesByDisplayName(run, "Branch: Branch A").get(0).getId();
        String branchBId = TestUtils.getNodesByDisplayName(run, "Branch: Branch B").get(0).getId();
        String branchCId = TestUtils.getNodesByDisplayName(run, "Branch: Branch C").get(0).getId();
        String branchNested1Id = TestUtils.getNodesByDisplayName(run, "Nested 1").get(0).getId();
        String branchNested2Id = TestUtils.getNodesByDisplayName(run, "Nested 2").get(0).getId();

        // Check 'Non-Parallel Stage'
        PipelineStepApi api = new PipelineStepApi(run);
        List<PipelineStep> steps = api.getLegacySteps(nonParallelId).getSteps();
        assertThat(steps, hasSize(2));
        assertThat(steps.get(0).getName(), is("This stage will be executed first."));
        assertThat(steps.get(0).getTitle(), is("Print Message"));
        assertThat(steps.get(1).getName(), is("Print Message"));
        assertThat(steps.get(1).getTitle(), is(""));

        // Check 'Branch A'
        steps = api.getSteps(branchAId).getSteps();
        assertThat(steps, hasSize(2));
        assertThat(steps.get(0).getName(), is("On Branch A - 1"));
        assertThat(steps.get(0).getTitle(), is("Print Message"));
        assertThat(steps.get(1).getName(), is("On Branch A - 2"));
        assertThat(steps.get(1).getTitle(), is("Print Message"));

        // Check 'Branch B'
        steps = api.getSteps(branchBId).getSteps();
        assertThat(steps, hasSize(2));
        assertThat(steps.get(0).getName(), is("On Branch B - 1"));
        assertThat(steps.get(0).getTitle(), is("Print Message"));
        assertThat(steps.get(1).getName(), is("On Branch B - 2"));
        assertThat(steps.get(1).getTitle(), is("Print Message"));

        // Check 'Branch C'
        steps = api.getSteps(branchCId).getSteps();
        assertThat(steps, hasSize(0));

        // Check 'Nested 1'
        steps = api.getSteps(branchNested1Id).getSteps();
        assertThat(steps, hasSize(2));
        assertThat(steps.get(0).getName(), is("In stage Nested 1 - 1 within Branch C"));
        assertThat(steps.get(0).getTitle(), is("Print Message"));
        assertThat(steps.get(1).getName(), is("In stage Nested 1 - 2 within Branch C"));
        assertThat(steps.get(1).getTitle(), is("Print Message"));

        // Check 'Nested 2'
        steps = api.getSteps(branchNested2Id).getSteps();
        assertThat(steps, hasSize(2));
        assertThat(steps.get(0).getName(), is("In stage Nested 2 - 1 within Branch C"));
        assertThat(steps.get(0).getTitle(), is("Print Message"));
        assertThat(steps.get(1).getName(), is("In stage Nested 2 - 2 within Branch C"));
        assertThat(steps.get(1).getTitle(), is("Print Message"));
    }

    @Test
    public void nestedStagesHaveCorrectSteps() throws Exception {
        // It's a bit dirty, but do this in one to avoid reloading and rerunning the job
        // (as it takes a
        // long time)
        WorkflowRun run = TestUtils.createAndRunJob(j, "nestedStages", "nestedStages.jenkinsfile", Result.SUCCESS);

        String childAId = TestUtils.getNodesByDisplayName(run, "Child A").get(0).getId();
        String childBId = TestUtils.getNodesByDisplayName(run, "Child B").get(0).getId();
        String grandchildBId = TestUtils.getNodesByDisplayName(run, "Grandchild B").get(0).getId();
        String childCId = TestUtils.getNodesByDisplayName(run, "Child C").get(0).getId();
        String grandchildCId = TestUtils.getNodesByDisplayName(run, "Grandchild C").get(0).getId();
        String greatGrandchildCId = TestUtils.getNodesByDisplayName(run, "Great-grandchild C")
                .get(0)
                .getId();

        PipelineStepApi api = new PipelineStepApi(run);

        // Check 'Child A'
        List<PipelineStep> steps = api.getSteps(childAId).getSteps();
        assertThat(steps, hasSize(1));
        assertThat(steps.get(0).getName(), is("In child A"));
        assertThat(steps.get(0).getTitle(), is("Print Message"));

        // Check 'Child A'
        steps = api.getSteps(childBId).getSteps();
        assertThat(steps, hasSize(0));

        // Check 'Grandchild B'
        steps = api.getSteps(grandchildBId).getSteps();
        assertThat(steps, hasSize(1));
        assertThat(steps.get(0).getName(), is("In grandchild B"));
        assertThat(steps.get(0).getTitle(), is("Print Message"));

        // Check 'Child C'
        steps = api.getSteps(childCId).getSteps();
        assertThat(steps, hasSize(0));

        // Check 'Grandchild C'
        steps = api.getSteps(grandchildCId).getSteps();
        assertThat(steps, hasSize(0));

        // Check 'Great-Grandchild C'
        steps = api.getSteps(greatGrandchildCId).getSteps();
        assertThat(steps, hasSize(1));
        assertThat(steps.get(0).getName(), is("In great-grandchild C"));
        assertThat(steps.get(0).getTitle(), is("Print Message"));
    }

    @Test
    public void getAllStepsReturnsStepsForComplexParallelBranches() throws Exception {
        // It's a bit dirty, but do this in one to avoid reloading and rerunning the job
        // (as it takes a
        // long time)
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "complexParallelSmokes", "complexParallelSmokes.jenkinsfile", Result.SUCCESS);

        // Check 'Non-Parallel Stage'
        PipelineStepApi api = new PipelineStepApi(run);

        List<PipelineStep> steps = api.getAllSteps().getSteps();
        assertThat(steps, hasSize(10));
        assertThat(steps.get(0).getName(), is("This stage will be executed first."));
        assertThat(steps.get(0).getTitle(), is("Print Message"));
        assertThat(steps.get(1).getName(), is("Print Message"));
        assertThat(steps.get(1).getTitle(), is(""));
        assertThat(steps.get(2).getName(), is("On Branch A - 1"));
        assertThat(steps.get(2).getTitle(), is("Print Message"));
        assertThat(steps.get(3).getName(), is("On Branch A - 2"));
        assertThat(steps.get(3).getTitle(), is("Print Message"));
        assertThat(steps.get(4).getName(), is("On Branch B - 1"));
        assertThat(steps.get(4).getTitle(), is("Print Message"));
        assertThat(steps.get(5).getName(), is("On Branch B - 2"));
        assertThat(steps.get(5).getTitle(), is("Print Message"));

        assertThat(steps.get(6).getName(), is("In stage Nested 1 - 1 within Branch C"));
        assertThat(steps.get(6).getTitle(), is("Print Message"));
        assertThat(steps.get(7).getName(), is("In stage Nested 1 - 2 within Branch C"));
        assertThat(steps.get(7).getTitle(), is("Print Message"));
        assertThat(steps.get(8).getName(), is("In stage Nested 2 - 1 within Branch C"));
        assertThat(steps.get(8).getTitle(), is("Print Message"));
        assertThat(steps.get(9).getName(), is("In stage Nested 2 - 2 within Branch C"));
        assertThat(steps.get(9).getTitle(), is("Print Message"));
    }

    @Test
    public void getAllStepsReturnsStepsForNestedStages() throws Exception {
        // It's a bit dirty, but do this in one to avoid reloading and rerunning the job
        // (as it takes a
        // long time)
        WorkflowRun run = TestUtils.createAndRunJob(j, "nestedStages", "nestedStages.jenkinsfile", Result.SUCCESS);

        PipelineStepApi api = new PipelineStepApi(run);

        List<PipelineStep> steps = api.getAllSteps().getSteps();
        assertThat(steps, hasSize(3));
        assertThat(steps.get(0).getName(), is("In child A"));
        assertThat(steps.get(0).getTitle(), is("Print Message"));
        assertThat(steps.get(1).getName(), is("In grandchild B"));
        assertThat(steps.get(1).getTitle(), is("Print Message"));
        assertThat(steps.get(2).getName(), is("In great-grandchild C"));
        assertThat(steps.get(2).getTitle(), is("Print Message"));
    }

    @Issue("GH#92")
    @Test
    public void githubIssue92RegressionTest() throws Exception {
        // It's a bit dirty, but do this in one to avoid reloading and rerunning the job
        // (as it takes a
        // long time)
        WorkflowRun run = TestUtils.createAndRunJob(j, "githubIssue92", "githubIssue92.jenkinsfile", Result.SUCCESS);

        PipelineStepApi api = new PipelineStepApi(run);

        // Linux 8
        String linux8CheckoutId = TestUtils.getNodesByDisplayName(run, "Checkout (linux-8)")
                .get(0)
                .getId();
        String linux8BuildId = TestUtils.getNodesByDisplayName(run, "Build (linux-8)").get(0).getId();
        String linux8ArchiveId = TestUtils.getNodesByDisplayName(run, "Archive (linux-8)").get(0).getId();

        // Linux 11
        String linux11CheckoutId = TestUtils.getNodesByDisplayName(run, "Checkout (linux-11)")
                .get(0)
                .getId();
        String linux11BuildId = TestUtils.getNodesByDisplayName(run, "Build (linux-11)").get(0).getId();
        String linux11ArchiveId = TestUtils.getNodesByDisplayName(run, "Archive (linux-11)")
                .get(0)
                .getId();

        String deployStageId = TestUtils.getNodesByDisplayName(run, "Deploy").get(0).getId();

        List<PipelineStep> steps = api.getLegacySteps(linux8CheckoutId).getSteps();
        assertThat(steps, hasSize(1));
        assertThat(steps.get(0).getName(), is("Checking out linux-8"));
        assertThat(steps.get(0).getTitle(), is("Print Message"));

        steps = api.getSteps(linux8BuildId).getSteps();
        assertThat(steps, hasSize(1));
        assertThat(steps.get(0).getName(), is("Building linux-8"));
        assertThat(steps.get(0).getTitle(), is("Print Message"));

        steps = api.getSteps(linux8ArchiveId).getSteps();
        assertThat(steps, hasSize(1));
        assertThat(steps.get(0).getName(), is("Archiving linux-8"));
        assertThat(steps.get(0).getTitle(), is("Print Message"));

        steps = api.getSteps(linux11CheckoutId).getSteps();
        assertThat(steps, hasSize(1));
        assertThat(steps.get(0).getName(), is("Checking out linux-11"));
        assertThat(steps.get(0).getTitle(), is("Print Message"));

        steps = api.getSteps(linux11BuildId).getSteps();
        assertThat(steps, hasSize(1));
        assertThat(steps.get(0).getName(), is("Building linux-11"));
        assertThat(steps.get(0).getTitle(), is("Print Message"));

        steps = api.getSteps(linux11ArchiveId).getSteps();
        assertThat(steps, hasSize(1));
        assertThat(steps.get(0).getName(), is("Archiving linux-11"));
        assertThat(steps.get(0).getTitle(), is("Print Message"));

        steps = api.getSteps(deployStageId).getSteps();
        assertThat(steps, hasSize(1));
        assertThat(steps.get(0).getName(), is("Deploying..."));
        assertThat(steps.get(0).getTitle(), is("Print Message"));
    }

    @Issue("GH#213")
    @Test
    public void githubIssue213RegressionTest_scriptedError() throws Exception {
        // It's a bit dirty, but do this in one to avoid reloading and rerunning the job
        // (as it takes a
        // long time)
        WorkflowRun run = TestUtils.createAndRunJob(j, "githubIssue213", "unstableSmokes.jenkinsfile", Result.FAILURE);

        PipelineStepApi api = new PipelineStepApi(run);

        String failureStage = TestUtils.getNodesByDisplayName(run, "failure").get(0).getId();

        List<PipelineStep> steps = api.getLegacySteps(failureStage).getSteps();
        assertThat(steps, hasSize(2));
        PipelineStep errorStep = steps.get(1);
        assertThat(errorStep.getName(), is("oops-failure"));
        assertThat(errorStep.getTitle(), is("Error signal"));
        FlowNode node = run.getExecution().getNode(String.valueOf(errorStep.getId()));
        String errorText = PipelineNodeUtil.getExceptionText(node);
        assertThat(errorText, equalTo("oops-failure"));
    }

    @Issue("GH#213")
    @Test
    public void githubIssue213RegressionTest_errorStep() throws Exception {
        // It's a bit dirty, but do this in one to avoid reloading and rerunning the job
        // (as it takes a
        // long time)
        WorkflowRun run = TestUtils.createAndRunJob(j, "githubIssue213_errorStep", "unstableSmokes.jenkinsfile",
                Result.FAILURE);

        PipelineStepApi api = new PipelineStepApi(run);

        String failureStage = TestUtils.getNodesByDisplayName(run, "failure").get(0).getId();

        List<PipelineStep> steps = api.getLegacySteps(failureStage).getSteps();
        assertThat(steps, hasSize(2));
        PipelineStep errorStep = steps.get(1);
        assertThat(errorStep.getName(), is("oops-failure"));
        assertThat(errorStep.getTitle(), is("Error signal"));
        FlowNode node = run.getExecution().getNode(String.valueOf(errorStep.getId()));
        String errorText = PipelineNodeUtil.getExceptionText(node);
        assertThat(errorText, equalTo("oops-failure"));
    }

    @Issue("GH#213")
    @Test
    public void githubIssue213RegressionTest_pipelineCallsUndefinedVar() throws Exception {
        // It's a bit dirty, but do this in one to avoid reloading and rerunning the job
        // (as it takes a
        // long time)
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "githubIssue213_callsUnknownVariable", "callsUnknownVariable.jenkinsfile", Result.FAILURE);

        PipelineStepApi api = new PipelineStepApi(run);

        List<PipelineStep> steps = api.getAllSteps().getSteps();
        assertThat(steps, hasSize(2));
        PipelineStep errorStep = steps.get(1);
        assertThat(errorStep.getName(), equalTo("Pipeline error"));
    }

    @Issue("GH#274")
    @Test
    public void githubIssue274RegressionTest_suppressFlowInterruptedExceptions() throws Exception {
        TestUtils.createJob(j, "simpleError", "simpleError.jenkinsfile");

        // It's a bit dirty, but do this in one to avoid reloading and rerunning the job
        // (as it takes a
        // long time)
        WorkflowRun run = TestUtils.createAndRunJob(j, "githubIssue274", "githubIssue274.jenkinsfile", Result.FAILURE);

        PipelineStepApi api = new PipelineStepApi(run);

        String failureStage = TestUtils.getNodesByDisplayName(run, "failure").get(0).getId();

        List<PipelineStep> steps = api.getLegacySteps(failureStage).getSteps();
        assertThat(steps, hasSize(2));
        PipelineStep errorStep = steps.get(0);
        FlowNode node = run.getExecution().getNode(String.valueOf(errorStep.getId()));
        String errorText = PipelineNodeUtil.getExceptionText(node);
        assertThat(
                errorText,
                not(containsString(
                        "Found unhandled org.jenkinsci.plugins.workflow.steps.FlowInterruptedException exception")));
    }
}
