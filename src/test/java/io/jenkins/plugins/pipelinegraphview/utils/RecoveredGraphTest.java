package io.jenkins.plugins.pipelinegraphview.utils;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;

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
