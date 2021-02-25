package io.jenkins.plugins.pipelinegraphview;

import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import hudson.model.Result;
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.junit.Rule;
import org.junit.Test;
import org.jvnet.hudson.test.JenkinsRule;

import java.net.URL;
import java.util.List;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;

public class PipelineGraphApiTest {

    @Rule
    public JenkinsRule j = new JenkinsRule();


    @Test
    public void unstableSmokes() throws Exception {
        WorkflowRun run = createAndRunJob("unstableSmokes", "unstableSmokes.jenkinsfile", Result.FAILURE);
        PipelineGraphApi api = new PipelineGraphApi(run);
        PipelineGraph graph = api.createGraph();

        List<PipelineStage> stages = graph.getStages();
        assertThat(stages, hasSize(4));
        PipelineStage pipelineStage = stages.get(0);

        assertThat(pipelineStage.getCompletePercent(), is(50));
        assertThat(pipelineStage.getName(), is("unstable-one"));
        assertThat(pipelineStage.getTitle(), is("unstable-one"));
        assertThat(pipelineStage.getType(), is("STAGE"));
        assertThat(pipelineStage.getState(), is("UNSTABLE"));

        pipelineStage = stages.get(1);

        assertThat(pipelineStage.getCompletePercent(), is(50));
        assertThat(pipelineStage.getName(), is("success"));
        assertThat(pipelineStage.getTitle(), is("success"));
        assertThat(pipelineStage.getType(), is("STAGE"));
        assertThat(pipelineStage.getState(), is("SUCCESS"));

        pipelineStage = stages.get(2);

        assertThat(pipelineStage.getCompletePercent(), is(50));
        assertThat(pipelineStage.getName(), is("unstable-two"));
        assertThat(pipelineStage.getTitle(), is("unstable-two"));
        assertThat(pipelineStage.getType(), is("STAGE"));
        assertThat(pipelineStage.getState(), is("UNSTABLE"));

        pipelineStage = stages.get(3);

        assertThat(pipelineStage.getCompletePercent(), is(50));
        assertThat(pipelineStage.getName(), is("failure"));
        assertThat(pipelineStage.getTitle(), is("failure"));
        assertThat(pipelineStage.getType(), is("STAGE"));
        assertThat(pipelineStage.getState(), is("FAILURE"));
    }

    @Test
    public void complexSmokes() throws Exception {
        WorkflowRun run = createAndRunJob("complexSmokes", "complexSmokes.jenkinsfile", Result.SUCCESS);
        PipelineGraphApi api = new PipelineGraphApi(run);
        PipelineGraph graph = api.createGraph();

        List<PipelineStage> stages = graph.getStages();
        assertThat(stages, hasSize(14));

        // TODO implement parallel stage handling
    }

    private WorkflowRun createAndRunJob(String jobName, String jenkinsFileName, Result expectedResult) throws Exception {
        WorkflowJob job = createJob(jobName, jenkinsFileName);
        j.assertBuildStatus(expectedResult, job.scheduleBuild2(0));
        return job.getLastBuild();
    }

    private WorkflowJob createJob(String jobName, String jenkinsFileName) throws java.io.IOException {
        WorkflowJob job = j.createProject(WorkflowJob.class, jobName);

        URL resource = Resources.getResource(getClass(), jenkinsFileName);
        String jenkinsFile = Resources.toString(resource, Charsets.UTF_8);
        job.setDefinition(new CpsFlowDefinition(jenkinsFile, true));
        return job;
    }


}