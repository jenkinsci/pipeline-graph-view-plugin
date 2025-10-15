package io.jenkins.plugins.pipelinegraphview.cards.items;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import hudson.model.Result;
import hudson.plugins.git.GitSCM;
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
        assertEquals(1, job.getLastBuild().getNumber());
        assertEquals(
                "b6dc82faf9248fece30bc704c09edbb4708c9756",
                ((GitSCM) (job.getLastBuild().getSCMs().get(0)))
                        .getBranches()
                        .get(0)
                        .getName());
        j.assertBuildStatus(Result.SUCCESS, job.scheduleBuild2(0));

        WorkflowRun run = job.getLastBuild();
        assertEquals(2, run.getNumber());
        assertEquals(
                "1dc41d9c9758a111baebebe5f6bcd39c66040941",
                ((GitSCM) (run.getSCMs().get(0))).getBranches().get(0).getName());
        assertEquals(1, run.getChangeSets().size());
        assertEquals(21, run.getChangeSets().get(0).getItems().length);

        Optional<RunDetailsItem> detailsItem = ChangesRunDetailsItem.get(run);

        assertTrue(detailsItem.isPresent());

        RunDetailsItem.RunDetail changesDetails = (RunDetailsItem.RunDetail) detailsItem.get();

        assertEquals(
                new RunDetailsItem.ItemContent.LinkContent("../changes", Messages.changes()), changesDetails.content());
        assertEquals("symbol-code-slash-outline plugin-ionicons-api", changesDetails.icon());
    }
}
