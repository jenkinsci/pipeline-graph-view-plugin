package io.jenkins.plugins.pipelinegraphview;

import hudson.model.Result;
import io.jenkins.plugins.pipelinegraphview.utils.TestUtils;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.junit.Assert;
import org.junit.Rule;
import org.junit.Test;
import org.jvnet.hudson.test.Issue;
import org.jvnet.hudson.test.JenkinsRule;

public class PipelineGraphDisplayURLProviderTest {

    @Rule
    public JenkinsRule j = new JenkinsRule();

    @Issue("JENKINS-71715")
    @Test
    public void redirect_urls() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "hello_world_scripted", "helloWorldScriptedPipeline.jenkinsfile", Result.SUCCESS);

        PipelineGraphDisplayURLProvider provider = new PipelineGraphDisplayURLProvider();
        String root = provider.getRoot();
        Assert.assertEquals(provider.getRunURL(run), root + "job/hello_world_scripted/1/pipeline-graph");
        Assert.assertEquals(provider.getConsoleURL(run), root + "job/hello_world_scripted/1/pipeline-console");
    }
}
