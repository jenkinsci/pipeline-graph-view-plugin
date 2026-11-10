package io.jenkins.plugins.pipelinegraphview.utils;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.lessThan;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;

import hudson.model.Result;
import io.jenkins.plugins.pipelinegraphview.livestate.LiveGraphRegistry;
import java.io.File;
import java.util.List;
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.test.steps.SemaphoreStep;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

@WithJenkins
class KilledRunGraphTest {

    private JenkinsRule j;

    @BeforeEach
    void setUp(JenkinsRule j) {
        this.j = j;
    }

    @Test
    void stagesOfAHardKilledRunAreKept() throws Exception {
        WorkflowRun run = startAndWait("stage('one') { echo 'one' }\nstage('two') { semaphore 'wait' }");
        kill(run);

        assertThat(new File(run.getRootDir(), PipelineGraphViewCache.TREE_FILE_NAME).isFile(), is(true));
        assertThat(LiveGraphRegistry.get().snapshot(run), is(nullValue()));

        PipelineGraph graph = new PipelineGraphApi(run).createTree();
        assertThat(graph.complete, is(true));
        assertThat(names(graph.stages), contains("one", "two"));
        assertThat(states(graph.stages), contains(PipelineState.SUCCESS, PipelineState.ABORTED));

        PipelineStepList steps = new PipelineStepApi(run).getAllSteps();
        assertThat(steps.runIsComplete, is(true));
        List<String> stepStates =
                steps.steps.stream().map(s -> s.getName() + ":" + s.getState()).toList();
        assertThat(stepStates.toString(), stepStates, hasItem("wait:" + PipelineState.ABORTED));
    }

    @Test
    void finishedParallelBranchKeepsItsOwnResultAndDuration() throws Exception {
        WorkflowRun run = startAndWait("stage('par') { parallel a: { echo 'a' }, b: { semaphore 'wait' } }");
        // Long enough that stretching branch a to the kill time would show in its duration.
        Thread.sleep(3000);
        kill(run);

        PipelineStage par = new PipelineGraphApi(run).createTree().stages.get(0);
        assertThat(par.getState(), is(PipelineState.ABORTED));
        assertThat(names(par.children), contains("a", "b"));
        assertThat(states(par.children), contains(PipelineState.SUCCESS, PipelineState.ABORTED));
        assertThat(par.children.get(0).getTotalDurationMillis(), is(lessThan(2000L)));
    }

    @Test
    void pausedStepOfAHardKilledRunIsAborted() throws Exception {
        WorkflowJob job = j.createProject(WorkflowJob.class, "paused");
        job.setDefinition(new CpsFlowDefinition("stage('approve') { input 'Proceed?' }", true));
        WorkflowRun run = job.scheduleBuild2(0).waitForStart();
        j.waitForMessage("Proceed?", run);
        kill(run);

        PipelineGraph graph = new PipelineGraphApi(run).createTree();
        assertThat(states(graph.stages), contains(PipelineState.ABORTED));
        List<PipelineStep> steps = new PipelineStepApi(run).getAllSteps().steps;
        List<PipelineState> stepStates =
                steps.stream().map(PipelineStep::getState).toList();
        assertThat(stepStates, hasItem(PipelineState.ABORTED));
        assertThat(stepStates, everyItem(not(PipelineState.PAUSED)));
        // The input can no longer be answered, so it mustn't be offered.
        assertThat(steps.stream().filter(s -> s.inputStep != null).toList(), is(empty()));
    }

    private WorkflowRun startAndWait(String script) throws Exception {
        WorkflowJob job = j.createProject(WorkflowJob.class);
        job.setDefinition(new CpsFlowDefinition(script, true));
        WorkflowRun run = job.scheduleBuild2(0).waitForStart();
        SemaphoreStep.waitForStart("wait/1", run);
        return run;
    }

    private void kill(WorkflowRun run) throws Exception {
        run.doKill();
        j.assertBuildStatus(Result.ABORTED, j.waitForCompletion(run));
        assertThat(run.getExecution(), is(nullValue()));
    }

    private static List<String> names(List<PipelineStage> stages) {
        return stages.stream().map(PipelineStage::getName).toList();
    }

    private static List<PipelineState> states(List<PipelineStage> stages) {
        return stages.stream().map(PipelineStage::getState).toList();
    }
}
