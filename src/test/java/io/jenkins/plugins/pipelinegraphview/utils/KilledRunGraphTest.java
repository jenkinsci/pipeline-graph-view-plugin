package io.jenkins.plugins.pipelinegraphview.utils;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;

import hudson.model.Result;
import io.jenkins.plugins.pipelinegraphview.livestate.LiveGraphRegistry;
import java.io.File;
import java.util.List;
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.test.steps.SemaphoreStep;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

@WithJenkins
class KilledRunGraphTest {

    @Test
    void stagesOfAHardKilledRunAreKept(JenkinsRule j) throws Exception {
        WorkflowJob job = j.createProject(WorkflowJob.class, "killed");
        job.setDefinition(
                new CpsFlowDefinition("stage('one') { echo 'one' }\nstage('two') { semaphore 'wait' }", true));
        WorkflowRun run = job.scheduleBuild2(0).waitForStart();
        SemaphoreStep.waitForStart("wait/1", run);

        run.doKill();
        j.assertBuildStatus(Result.ABORTED, j.waitForCompletion(run));
        assertThat(run.getExecution(), is(nullValue()));

        assertThat(new File(run.getRootDir(), PipelineGraphViewCache.TREE_FILE_NAME).isFile(), is(true));
        assertThat(LiveGraphRegistry.get().snapshot(run), is(nullValue()));

        PipelineGraph graph = new PipelineGraphApi(run).createTree();
        assertThat(graph.complete, is(true));
        assertThat(graph.stages.stream().map(PipelineStage::getName).toList(), contains("one", "two"));
        assertThat(
                graph.stages.stream().map(PipelineStage::getState).toList(),
                contains(PipelineState.SUCCESS, PipelineState.ABORTED));

        PipelineStepList steps = new PipelineStepApi(run).getAllSteps();
        assertThat(steps.runIsComplete, is(true));
        List<String> stepStates =
                steps.steps.stream().map(s -> s.getName() + ":" + s.getState()).toList();
        assertThat(stepStates.toString(), stepStates, hasItem("wait:" + PipelineState.ABORTED));
    }
}
