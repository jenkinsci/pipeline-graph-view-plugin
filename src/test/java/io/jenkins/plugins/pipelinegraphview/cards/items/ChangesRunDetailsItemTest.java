package io.jenkins.plugins.pipelinegraphview.cards.items;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import hudson.model.Result;
import io.jenkins.plugins.pipelinegraphview.Messages;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem;
import io.jenkins.plugins.pipelinegraphview.utils.TestUtils;
import java.util.Optional;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

@WithJenkins
class ChangesRunDetailsItemTest {

    @Test
    void get_noChanges(JenkinsRule j) throws Exception {
        // build once, there should be no change set
        WorkflowRun run =
                TestUtils.createAndRunJob(j, "simpleWithSCM", "singleStagePipelineWithSCM.jenkinsfile", Result.SUCCESS);
        Optional<RunDetailsItem> detailsItem = ChangesRunDetailsItem.get(run);
        assertTrue(detailsItem.isEmpty());
    }

    @Test
    void get_changes(JenkinsRule j) throws Exception {
        WorkflowJob job = TestUtils.createJob(j, "simpleWithSCM", "singleStagePipelineWithSCM.jenkinsfile", true);
        // build twice to establish a change set
        j.assertBuildStatus(Result.SUCCESS, job.scheduleBuild2(0));
        j.assertBuildStatus(Result.SUCCESS, job.scheduleBuild2(0));

        WorkflowRun run = job.getLastBuild();

        Optional<RunDetailsItem> detailsItem = ChangesRunDetailsItem.get(run);

        assertTrue(detailsItem.isPresent());

        RunDetailsItem.RunDetail changesDetails = (RunDetailsItem.RunDetail) detailsItem.get();

        assertEquals(
                new RunDetailsItem.ItemContent.LinkContent("../changes", Messages.changes()), changesDetails.content());
        assertEquals("symbol-code-slash-outline plugin-ionicons-api", changesDetails.icon());
    }
}
