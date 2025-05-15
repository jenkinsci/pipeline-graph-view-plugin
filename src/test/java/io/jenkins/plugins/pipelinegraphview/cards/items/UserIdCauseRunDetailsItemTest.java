package io.jenkins.plugins.pipelinegraphview.cards.items;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import hudson.model.Cause;
import hudson.model.CauseAction;
import hudson.model.Result;
import hudson.model.User;
import io.jenkins.plugins.pipelinegraphview.Messages;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem;
import io.jenkins.plugins.pipelinegraphview.utils.TestUtils;
import java.io.IOException;
import java.util.HashMap;
import java.util.Optional;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

@WithJenkins
class UserIdCauseRunDetailsItemTest {

    private static WorkflowRun run;

    @BeforeAll
    static void beforeAll(JenkinsRule j) throws Exception {
        run = TestUtils.createAndRunJob(j, "simple", "singleStagePipeline.jenkinsfile", Result.SUCCESS);
    }

    @BeforeEach
    void setUp() {
        run.removeActions(CauseAction.class);
        User.getAll().forEach(user -> {
            try {
                user.delete();
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        });
    }

    @Test
    void get_noActionsOfType() {
        Optional<RunDetailsItem> detailsItem = UserIdCauseRunDetailsItem.get(run);

        assertTrue(detailsItem.isEmpty());
    }

    @Test
    void get_noUserIdCause() {
        run.addAction(new CauseAction(new Cause.UpstreamCause(run)));

        Optional<RunDetailsItem> detailsItem = UserIdCauseRunDetailsItem.get(run);

        assertTrue(detailsItem.isEmpty());
    }

    @Test
    void get_userNotFound() {
        run.addAction(new CauseAction(new Cause.UserIdCause("User Id")));

        Optional<RunDetailsItem> detailsItem = UserIdCauseRunDetailsItem.get(run);

        assertTrue(detailsItem.isEmpty());
    }

    @Test
    void get() {
        run.addAction(new CauseAction(new Cause.UserIdCause("User Id")));
        User.get("User Id", true, new HashMap<>());

        Optional<RunDetailsItem> detailsItem = UserIdCauseRunDetailsItem.get(run);

        assertTrue(detailsItem.isPresent());

        RunDetailsItem.RunDetail userDetails = (RunDetailsItem.RunDetail) detailsItem.get();

        assertEquals(
                new RunDetailsItem.ItemContent.PlainContent(Messages.cause_user("User Id")), userDetails.content());
        assertEquals("symbol-person-outline plugin-ionicons-api", userDetails.icon());
    }
}
