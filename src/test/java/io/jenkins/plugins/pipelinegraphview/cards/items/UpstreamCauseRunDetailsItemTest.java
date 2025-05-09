package io.jenkins.plugins.pipelinegraphview.cards.items;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import hudson.model.Cause;
import hudson.model.CauseAction;
import hudson.model.Result;
import io.jenkins.plugins.pipelinegraphview.Messages;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem;
import io.jenkins.plugins.pipelinegraphview.utils.TestUtils;
import java.util.Optional;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

@WithJenkins
class UpstreamCauseRunDetailsItemTest {

    private static WorkflowRun run;
    private static String baseUrl;

    @BeforeAll
    static void beforeAll(JenkinsRule j) throws Exception {
        run = TestUtils.createAndRunJob(j, "simple", "singleStagePipeline.jenkinsfile", Result.SUCCESS);
        baseUrl = j.getURL().toString();
    }

    @BeforeEach
    void setUp() {
        run.removeActions(CauseAction.class);
    }

    @Test
    void get_noActionsOfType() {
        Optional<RunDetailsItem> detailsItem = UpstreamCauseRunDetailsItem.get(run);

        assertTrue(detailsItem.isEmpty());
    }

    @Test
    void get_noUpstreamCause() {
        run.addAction(new CauseAction(new Cause.UserIdCause("User Id")));

        Optional<RunDetailsItem> detailsItem = UpstreamCauseRunDetailsItem.get(run);

        assertTrue(detailsItem.isEmpty());
    }

    @Test
    void get() {
        run.addAction(new CauseAction(new Cause.UpstreamCause(run)));

        Optional<RunDetailsItem> detailsItem = UpstreamCauseRunDetailsItem.get(run);

        assertTrue(detailsItem.isPresent());

        RunDetailsItem.RunDetail userDetails = (RunDetailsItem.RunDetail) detailsItem.get();

        assertEquals(
                new RunDetailsItem.ItemContent.LinkContent(baseUrl + run.getUrl(), Messages.cause_upstream("#1")),
                userDetails.content());
        assertEquals("symbol-play-circle-outline plugin-ionicons-api", userDetails.icon());
    }
}
