package io.jenkins.plugins.pipelinegraphview.multipipelinegraphview;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.instanceOf;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

import hudson.model.User;
import hudson.security.ACL;
import hudson.security.ACLContext;
import java.util.List;
import java.util.Map;
import jenkins.model.experimentalflags.UserExperimentalFlagsProperty;
import net.sf.json.JSONObject;
import org.htmlunit.html.HtmlPage;
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

@WithJenkins
class StageDurationsDetailTest {

    private JenkinsRule j;
    private WorkflowJob job;

    @BeforeEach
    void setUp(JenkinsRule j) throws Exception {
        this.j = j;
        j.jenkins.setSecurityRealm(j.createDummySecurityRealm());
        job = j.createProject(WorkflowJob.class, "example");
        job.setDefinition(new CpsFlowDefinition("stage('Build') { echo 'hi' }", true));
    }

    @Test
    void offeredOnTheNewJobPage() throws Exception {
        User alice = userWithNewJobPage("alice", true);

        try (ACLContext ignored = ACL.as(alice)) {
            List<?> details = new StageDurationsDetailFactory().createFor(job);
            assertThat(details, contains(instanceOf(StageDurationsDetail.class)));
            assertThat(
                    ((StageDurationsDetail) details.get(0)).getLink(),
                    is("job/example/multi-pipeline-graph/durations"));
        }
    }

    @Test
    void notOfferedOnTheClassicJobPage() throws Exception {
        User bob = userWithNewJobPage("bob", false);

        try (ACLContext ignored = ACL.as(bob)) {
            assertThat(new StageDurationsDetailFactory().createFor(job), empty());
        }
    }

    @Test
    void durationsPageShowsANoticeWithoutBuilds() throws Exception {
        userWithNewJobPage("alice", true);

        try (JenkinsRule.WebClient wc = j.createWebClient().login("alice")) {
            HtmlPage page = wc.getPage(job, "multi-pipeline-graph/durations");
            assertThat(page.getElementById("stage-durations-root"), nullValue());
            assertThat(page.querySelector(".jenkins-notice").getTextContent(), containsString("No builds"));
        }
    }

    @Test
    void durationsPageRenders() throws Exception {
        userWithNewJobPage("alice", true);
        j.buildAndAssertSuccess(job);

        try (JenkinsRule.WebClient wc = j.createWebClient().login("alice")) {
            wc.getOptions().setThrowExceptionOnScriptError(false);
            HtmlPage page = wc.getPage(job, "multi-pipeline-graph/durations");
            assertThat(page.getElementById("stage-durations-root"), notNullValue());
            assertThat(
                    page.getElementById("stage-durations-root").getAttribute("data-current-job-path"),
                    is(j.contextPath + "/job/example/"));
        }
    }

    private static User userWithNewJobPage(String id, boolean enabled) throws Exception {
        User user = User.getById(id, true);
        user.addProperty(new UserExperimentalFlagsProperty(Map.of("new-job-page.flag", String.valueOf(enabled))));
        return user;
    }

    @Test
    void runsLimitDefaultsAndIsCapped() {
        assertThat(MultiPipelineGraphViewAction.runsLimit(null), is(10));
        assertThat(MultiPipelineGraphViewAction.runsLimit("25"), is(25));
        assertThat(MultiPipelineGraphViewAction.runsLimit("500"), is(MultiPipelineGraphViewAction.MAX_RUNS));
        assertThat(MultiPipelineGraphViewAction.runsLimit("0"), is(1));
        assertThat(MultiPipelineGraphViewAction.runsLimit("lots"), is(10));
    }

    @Test
    void runsReturnsTheRequestedNumberOfBuilds() throws Exception {
        for (int i = 0; i < 12; i++) {
            j.buildAndAssertSuccess(job);
        }

        try (JenkinsRule.WebClient wc = j.createWebClient()) {
            String all = wc.goTo("job/example/multi-pipeline-graph/runs?limit=12", "application/json")
                    .getWebResponse()
                    .getContentAsString();
            String usual = wc.goTo("job/example/multi-pipeline-graph/runs", "application/json")
                    .getWebResponse()
                    .getContentAsString();
            assertThat(JSONObject.fromObject(all).getJSONArray("data").size(), is(12));
            assertThat(JSONObject.fromObject(usual).getJSONArray("data").size(), is(10));
        }
    }
}
