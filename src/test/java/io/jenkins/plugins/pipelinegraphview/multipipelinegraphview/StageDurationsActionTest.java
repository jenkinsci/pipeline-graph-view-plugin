package io.jenkins.plugins.pipelinegraphview.multipipelinegraphview;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

import hudson.model.User;
import hudson.security.ACL;
import hudson.security.ACLContext;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineGraphViewCache;
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
class StageDurationsActionTest {

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
    void inTheOverflowMenuOfTheNewJobPage() throws Exception {
        userWithNewJobPage("alice", true);

        try (JenkinsRule.WebClient wc = j.createWebClient().login("alice")) {
            JSONObject menu =
                    JSONObject.fromObject(wc.goTo("job/example/contextMenu?menu-only=true", "application/json")
                            .getWebResponse()
                            .getContentAsString());
            JSONObject item = findItem(menu, "Stage durations");
            assertThat(item, notNullValue());
            assertThat(item.getJSONObject("event").getString("url"), is("multi-pipeline-graph/durations"));
        }
    }

    @Test
    void notOfferedOnTheClassicJobPage() throws Exception {
        User bob = userWithNewJobPage("bob", false);

        try (ACLContext ignored = ACL.as(bob)) {
            assertThat(new StageDurationsActionFactory().createFor(job), empty());
        }
    }

    private static JSONObject findItem(JSONObject menu, String displayName) {
        for (Object o : menu.getJSONArray("items")) {
            JSONObject item = (JSONObject) o;
            if (displayName.equals(item.optString("displayName"))) {
                return item;
            }
        }
        return null;
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
            assertThat(
                    "the durations page's graph requests carry the cache token",
                    page.getElementById("stage-durations-root").getAttribute("data-graph-cache-version"),
                    is(String.valueOf(PipelineGraphViewCache.SCHEMA_VERSION)));
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
            assertThat(
                    JSONObject.fromObject(usual)
                            .getJSONArray("data")
                            .getJSONObject(0)
                            .getBoolean("building"),
                    is(false));
        }
    }
}
