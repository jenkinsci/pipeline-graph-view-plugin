package io.jenkins.plugins.pipelinegraphview.utils;

import static org.awaitility.Awaitility.await;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;

import hudson.model.Item;
import hudson.model.User;
import hudson.security.ACL;
import hudson.security.ACLContext;
import jenkins.model.Jenkins;
import org.htmlunit.Page;
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.support.steps.input.InputAction;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInfo;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.MockAuthorizationStrategy;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@WithJenkins
class InputPermissionsTest {

    private JenkinsRule j;
    private WorkflowRun run;

    @BeforeEach
    void setUp(JenkinsRule j, TestInfo test) throws Exception {
        this.j = j;
        JenkinsRule.DummySecurityRealm realm = j.createDummySecurityRealm();
        realm.addGroups("carol", "release-team");
        j.jenkins.setSecurityRealm(realm);
        j.jenkins.setAuthorizationStrategy(new MockAuthorizationStrategy()
                .grant(Jenkins.ADMINISTER)
                .everywhere()
                .to("admin")
                .grant(Jenkins.READ, Item.READ)
                .everywhere()
                .toEveryone()
                .grant(Item.BUILD)
                .everywhere()
                .to("builder")
                .grant(Item.CANCEL)
                .everywhere()
                .to("canceller"));

        // Live graphs are cached by run id beyond each test's Jenkins, so each test needs its own job
        WorkflowJob job = j.createProject(
                WorkflowJob.class, test.getTestMethod().orElseThrow().getName());
        job.setDefinition(new CpsFlowDefinition("""
                pipeline {
                    agent none
                    stages {
                        stage('Approvals') {
                            parallel {
                                stage('Open') { steps { input id: 'Open', message: 'Open?' } }
                                stage('Restricted') {
                                    steps {
                                        input id: 'Restricted', message: 'Restricted?', submitter: 'alice,release-team'
                                    }
                                }
                            }
                        }
                    }
                }
                """, true));
        run = job.scheduleBuild2(0).waitForStart();
        await().until(() -> run.getAction(InputAction.class) != null
                && run.getAction(InputAction.class).getExecutions().size() == 2);
    }

    @Test
    void inputWithoutSubmitterNeedsBuildToProceedAndCancelToAbort() {
        assertPermissions("Open", "builder", true, true);
        assertPermissions("Open", "canceller", false, true);
        assertPermissions("Open", "reader", false, false);
        assertPermissions("Open", "admin", true, true);
    }

    @Test
    void inputWithSubmitterNeedsToBeASubmitterToProceed() {
        assertPermissions("Restricted", "alice", true, true);
        assertPermissions("Restricted", "ALICE", true, true);
        assertPermissions("Restricted", "carol", true, true);
        assertPermissions("Restricted", "builder", false, false);
        assertPermissions("Restricted", "canceller", false, true);
        assertPermissions("Restricted", "reader", false, false);
        assertPermissions("Restricted", "admin", true, true);
    }

    @Test
    void eachUserGetsTheirOwnPermissionsFromTheSharedGraph() throws Exception {
        // The graph is cached once the first user's request computes it
        JsonNode alice = fetch("alice", "stages/tree");
        JsonNode builder = fetch("builder", "stages/tree");

        assertThat(inputStep(alice, "Restricted").path("canProceed").asBoolean(), is(true));
        assertThat(inputStep(alice, "Open").path("canProceed").asBoolean(), is(false));
        assertThat(inputStep(builder, "Restricted").path("canProceed").asBoolean(), is(false));
        assertThat(inputStep(builder, "Open").path("canProceed").asBoolean(), is(true));
    }

    @Test
    void addsPermissionsToSteps() throws Exception {
        JsonNode steps = fetch("canceller", "stages/allSteps");

        JsonNode restricted = inputStep(steps, "Restricted");
        assertThat(restricted.path("canProceed").asBoolean(), is(false));
        assertThat(restricted.path("canAbort").asBoolean(), is(true));
    }

    private void assertPermissions(String inputId, String user, boolean canProceed, boolean canAbort) {
        try (ACLContext ignored = ACL.as2(User.getById(user, true).impersonate2())) {
            InputPermissions permissions = InputPermissions.forCurrentUser(run).get(inputId);
            assertThat(user + " can proceed with " + inputId, permissions.canProceed(), is(canProceed));
            assertThat(user + " can abort " + inputId, permissions.canAbort(), is(canAbort));
        }
    }

    private JsonNode fetch(String user, String path) throws Exception {
        try (JenkinsRule.WebClient wc = j.createWebClient().login(user)) {
            Page page = wc.goTo(run.getUrl() + path, "application/json");
            return JsonMapper.builder().build().readTree(page.getWebResponse().getContentAsString());
        }
    }

    /** Finds the {@code inputStep} with the given id anywhere in the response. */
    private static JsonNode inputStep(JsonNode json, String id) {
        if (json.path("inputStep").path("id").asString().equals(id)) {
            return json.path("inputStep");
        }
        for (JsonNode child : json) {
            JsonNode found = inputStep(child, id);
            if (!found.isMissingNode()) {
                return found;
            }
        }
        return JsonMapper.builder().build().missingNode();
    }
}
