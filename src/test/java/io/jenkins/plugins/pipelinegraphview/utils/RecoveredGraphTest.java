package io.jenkins.plugins.pipelinegraphview.utils;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.fail;

import com.github.benmanes.caffeine.cache.Cache;
import hudson.model.Result;
import io.jenkins.plugins.pipelinegraphview.livestate.LiveGraphRegistry;
import java.io.File;
import java.lang.reflect.Field;
import java.nio.file.Files;
import java.util.List;
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.test.steps.SemaphoreStep;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

/**
 * A force-killed build has no {@code FlowExecution} left, so the normal graph path returns
 * nothing. The plugin captured the nodes while it was running, and Jenkins leaves their XML
 * files in the build directory, so the stage graph can still be recovered.
 */
@WithJenkins
class RecoveredGraphTest {

    @Test
    void recoversStagesFromLiveStateAfterHardKill(JenkinsRule j) throws Exception {
        WorkflowRun run = hardKilledRun(j, "recover-live");

        PipelineGraph tree = new PipelineGraphApi(run).createTree();
        assertThat(
                "the hard-killed run still shows its stages and their results",
                stageStates(tree),
                contains("one:success", "two:aborted"));
        assertThat("the recovered graph is final", tree.complete, is(true));
        assertThat("the recovered graph is cached", treeFile(run).exists(), is(true));

        PipelineStepList steps = new PipelineStepApi(run).getAllSteps();
        assertThat("the recovered step list is final", steps.runIsComplete, is(true));
        assertThat("the recovered step list is not empty", steps.steps, is(not(empty())));
    }

    @Test
    void recoversStagesFromNodeFilesWhenLiveStateIsGone(JenkinsRule j) throws Exception {
        WorkflowRun run = hardKilledRun(j, "recover-files");

        // Simulate a Jenkins restart: the in-memory state is gone, only workflow/*.xml remains.
        clearLiveStates();
        Files.deleteIfExists(treeFile(run).toPath());

        PipelineGraph tree = new PipelineGraphApi(run).createTree();
        assertThat(
                "the stages are recovered from the node files with their results",
                stageStates(tree),
                contains("one:success", "two:aborted"));
        assertThat("the recovered graph is final", tree.complete, is(true));
    }

    @Test
    void recoversFinishedParallelBranchAfterHardKill(JenkinsRule j) throws Exception {
        WorkflowJob job = j.createProject(WorkflowJob.class, "recover-parallel");
        job.setDefinition(new CpsFlowDefinition("""
                pipeline {
                  agent any
                  stages {
                    stage('Parallel') {
                      parallel {
                        stage('finished') { steps { echo 'done' } }
                        stage('held') { steps { semaphore 'hold' } }
                      }
                    }
                  }
                }""", true));
        WorkflowRun run = job.scheduleBuild2(0).waitForStart();
        SemaphoreStep.waitForStart("hold/1", run);
        // The parallel block is still open; wait until the first branch has closed so its result
        // is already recorded when the run is killed.
        awaitStageState(run, "finished", PipelineState.SUCCESS);
        run.doKill();
        j.assertBuildStatus(Result.ABORTED, j.waitForCompletion(run));
        assertThat("test setup: Jenkins dropped the execution", run.getExecution(), is(nullValue()));

        // Simulate a Jenkins restart: the branch end nodes left in workflow/*.xml then look like
        // heads of the graph, because the parallel block never got its own end node.
        clearLiveStates();
        Files.deleteIfExists(treeFile(run).toPath());

        PipelineGraph tree = new PipelineGraphApi(run).createTree();
        assertThat(
                "the branch that finished before the kill keeps its own result",
                TestUtils.collectStagesAsString(tree.stages, stage -> stage.getName() + ":" + stage.getState()),
                equalTo("Parallel:aborted[finished:success,held:aborted]"));
    }

    private static void awaitStageState(WorkflowRun run, String stageName, PipelineState state) throws Exception {
        for (int i = 0; i < 300; i++) {
            if (hasStageState(new PipelineGraphApi(run).createTree(), stageName, state)) {
                return;
            }
            Thread.sleep(100);
        }
        fail("stage '" + stageName + "' did not reach " + state);
    }

    private static boolean hasStageState(PipelineGraph graph, String name, PipelineState state) {
        return graph.stages.stream().anyMatch(stage -> hasStageState(stage, name, state));
    }

    private static boolean hasStageState(PipelineStage stage, String name, PipelineState state) {
        return (name.equals(stage.getName()) && state == stage.getState())
                || stage.getChildren().stream().anyMatch(child -> hasStageState(child, name, state));
    }

    private static WorkflowRun hardKilledRun(JenkinsRule j, String jobName) throws Exception {
        WorkflowJob job = j.createProject(WorkflowJob.class, jobName);
        job.setDefinition(new CpsFlowDefinition("""
                pipeline {
                  agent any
                  stages {
                    stage('one') { steps { echo 'one' } }
                    stage('two') { steps { semaphore 'hold' } }
                  }
                }""", true));
        WorkflowRun run = job.scheduleBuild2(0).waitForStart();
        SemaphoreStep.waitForStart("hold/1", run);
        run.doKill();
        j.assertBuildStatus(Result.ABORTED, j.waitForCompletion(run));
        assertThat("test setup: Jenkins dropped the execution", run.getExecution(), is(nullValue()));
        return run;
    }

    private static File treeFile(WorkflowRun run) {
        return new File(run.getRootDir(), PipelineGraphViewCache.TREE_FILE_NAME);
    }

    private static List<String> stageStates(PipelineGraph graph) {
        return graph.stages.stream()
                .map(stage -> stage.getName() + ":" + stage.getState().name().toLowerCase())
                .toList();
    }

    private static void clearLiveStates() throws Exception {
        LiveGraphRegistry registry = LiveGraphRegistry.get();
        Field states = registry.getClass().getDeclaredField("states");
        states.setAccessible(true);
        ((Cache<?, ?>) states.get(registry)).invalidateAll();
    }
}
