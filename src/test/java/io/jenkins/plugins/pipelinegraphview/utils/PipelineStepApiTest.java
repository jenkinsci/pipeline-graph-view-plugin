package io.jenkins.plugins.pipelinegraphview.utils;

import hudson.model.Result;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.junit.Rule;
import org.junit.Test;
import org.jvnet.hudson.test.JenkinsRule;

import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;

public class PipelineStepApiTest {
    private static final Logger LOGGER = Logger.getLogger(PipelineStepApiTest.class.getName());

    @Rule
    public JenkinsRule j = new JenkinsRule();

    @Test
    public void unstableSmokes() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(j, "unstableSmokes", "unstableSmokes.jenkinsfile", Result.FAILURE);
        PipelineStepApi api = new PipelineStepApi(run);

        // We don't need to prefix with 'Branch: ' as these are not Declarative parallel stages.
        String unstableOneId = TestUtils.getNodesByDisplayName(run, "unstable-one").get(0).getId();
        String successId = TestUtils.getNodesByDisplayName(run, "success").get(0).getId();
        String unstableTwoId = TestUtils.getNodesByDisplayName(run, "unstable-two").get(0).getId();
        String failureID = TestUtils.getNodesByDisplayName(run, "failure").get(0).getId();
        
        List<PipelineStep> steps = api.getSteps(unstableOneId).getSteps();
        assertThat(steps, hasSize(3));
        assertThat(steps.get(0).getName(), is("Print Message"));
        assertThat(steps.get(1).getName(), is("Set stage result to unstable"));
        assertThat(steps.get(2).getName(), is("Print Message"));

        steps = api.getSteps(successId).getSteps();
        assertThat(steps, hasSize(1));
        assertThat(steps.get(0).getName(), is("Print Message"));

        steps = api.getSteps(unstableTwoId).getSteps();
        assertThat(steps, hasSize(2));
        assertThat(steps.get(0).getName(), is("Error signal"));
        assertThat(steps.get(1).getName(), is("Set stage result to unstable"));

        steps = api.getSteps(failureID).getSteps();
        assertThat(steps, hasSize(2));
        assertThat(steps.get(0).getName(), is("Set stage result to unstable"));
        assertThat(steps.get(1).getName(), is("Error signal"));
    }

    @Test
    public void complexParallelBranchesHaveCorrectSteps() throws Exception {
        // It's a bit dirty, but do this in one to avoid reloading and rerunning the job (as it takes a long time)
        WorkflowRun run = TestUtils.createAndRunJob(j, "complexParallelSmokes", "complexParallelSmokes.jenkinsfile", Result.SUCCESS);
        PipelineStepApi api = new PipelineStepApi(run);
        List<PipelineStep> steps = api.getSteps("1").getSteps();
        assertThat(steps, hasSize(0));

        // Dynamically find the nodes which will be returned by the GraphAPI
        String branchAId = TestUtils.getNodesByDisplayName(run, "Branch: Branch A").get(0).getId();
        String branchBId = TestUtils.getNodesByDisplayName(run, "Branch: Branch B").get(0).getId();
        String branchCId = TestUtils.getNodesByDisplayName(run, "Branch: Branch C").get(0).getId();
        String branchNested1Id = TestUtils.getNodesByDisplayName(run, "Nested 1").get(0).getId();
        String branchNested2Id = TestUtils.getNodesByDisplayName(run, "Nested 2").get(0).getId();

        // Check 'Branch A'
        api = new PipelineStepApi(run);
        steps = api.getSteps(branchAId).getSteps();
        assertThat(steps, hasSize(2));
        assertThat(steps.get(0).getName(), is("Print Message"));
        assertThat(steps.get(1).getName(), is("Print Message"));

        // Check 'Branch B'
        steps = api.getSteps(branchBId).getSteps();
        assertThat(steps, hasSize(2));
        assertThat(steps.get(0).getName(), is("Print Message"));
        assertThat(steps.get(1).getName(), is("Print Message"));

        // Check 'Branch C'
        steps = api.getSteps(branchCId).getSteps();
        assertThat(steps, hasSize(0));

        // Check 'Nested 1'
        steps = api.getSteps(branchNested1Id).getSteps();
        assertThat(steps, hasSize(2));
        assertThat(steps.get(0).getName(), is("Print Message"));
        assertThat(steps.get(1).getName(), is("Print Message"));

        // Check 'Nested 2'
        steps = api.getSteps(branchNested2Id).getSteps();
        assertThat(steps, hasSize(2));
        assertThat(steps.get(0).getName(), is("Print Message"));
        assertThat(steps.get(1).getName(), is("Print Message"));
    }
}
