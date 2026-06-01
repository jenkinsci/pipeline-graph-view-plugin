package io.jenkins.plugins.pipelinegraphview.buildflow;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

import hudson.model.Result;
import io.jenkins.plugins.pipelinegraphview.utils.TestUtils;
import net.sf.json.JSONArray;
import net.sf.json.JSONObject;
import org.htmlunit.Page;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

@WithJenkins
class BuildFlowActionTest {

    @Test
    void apiReturnsNodesAndEdges(JenkinsRule j) throws Exception {
        TestUtils.createJob(j, "downstream", "helloWorldScriptedPipeline.jenkinsfile");
        WorkflowRun upstream = TestUtils.createAndRunJob(j, "upstream", "buildStep.jenkinsfile", Result.SUCCESS);

        JenkinsRule.WebClient wc = j.createWebClient();
        Page page = wc.goTo(upstream.getUrl() + "build-flow/api", "application/json");
        String json = page.getWebResponse().getContentAsString();
        JSONObject envelope = JSONObject.fromObject(json);
        JSONObject response = envelope.getJSONObject("data");

        JSONArray nodes = response.getJSONArray("nodes");
        JSONArray edges = response.getJSONArray("edges");

        assertThat(nodes.size(), is(2));
        assertThat(edges.size(), is(1));
        assertThat(response.getBoolean("isAnyBuildOngoing"), is(false));
    }

    @Test
    void actionNotRegisteredForStandaloneBuild(JenkinsRule j) throws Exception {
        WorkflowRun run =
                TestUtils.createAndRunJob(j, "standalone", "helloWorldScriptedPipeline.jenkinsfile", Result.SUCCESS);
        BuildFlowAction action = run.getAction(BuildFlowAction.class);
        assertThat(action, is(nullValue()));
    }

    @Test
    void actionRegisteredForTriggeredBuild(JenkinsRule j) throws Exception {
        TestUtils.createJob(j, "downstream", "helloWorldScriptedPipeline.jenkinsfile");
        WorkflowRun upstream = TestUtils.createAndRunJob(j, "upstream", "buildStep.jenkinsfile", Result.SUCCESS);
        BuildFlowAction action = upstream.getAction(BuildFlowAction.class);
        assertThat(action, is(notNullValue()));
    }

    @Test
    void shouldDisplayBuildFlow_trueForTriggeredBuild(JenkinsRule j) throws Exception {
        TestUtils.createJob(j, "downstream", "helloWorldScriptedPipeline.jenkinsfile");
        WorkflowRun upstream = TestUtils.createAndRunJob(j, "upstream", "buildStep.jenkinsfile", Result.SUCCESS);
        BuildFlowAction action = upstream.getAction(BuildFlowAction.class);
        assertThat(action, is(notNullValue()));
        assertThat(action.shouldDisplayBuildFlow(), is(true));
    }
}
