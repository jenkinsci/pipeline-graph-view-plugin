package io.jenkins.plugins.pipelinegraphview.livestate;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.sameInstance;

import hudson.model.Result;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineGraph;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineGraphApi;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineStepApi;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineStepList;
import io.jenkins.plugins.pipelinegraphview.utils.TestUtils;
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.test.steps.SemaphoreStep;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

@WithJenkins
class LiveGraphLifecycleTest {

    private static final String ENABLED_PROPERTY = LiveGraphRegistry.class.getName() + ".enabled";

    private JenkinsRule j;

    @BeforeEach
    void setUp(JenkinsRule j) {
        this.j = j;
    }

    @Test
    void liveStatePopulatesDuringBuildAndEvictsOnCompletion() throws Exception {
        WorkflowJob job = j.createProject(WorkflowJob.class, "live");
        job.setDefinition(new CpsFlowDefinition(
                "stage('one') { echo 'hello' }\n"
                        + "stage('gate') { semaphore 'wait' }\n"
                        + "stage('two') { echo 'done' }\n",
                true));
        WorkflowRun run = job.scheduleBuild2(0).waitForStart();
        try {
            SemaphoreStep.waitForStart("wait/1", run);

            LiveGraphSnapshot midSnapshot = LiveGraphRegistry.get().snapshot(run);
            assertThat("live snapshot is present while run is building", midSnapshot, is(notNullValue()));
            assertThat(
                    "live snapshot contains nodes observed so far",
                    midSnapshot.nodes().size(),
                    is(greaterThan(0)));
            assertThat("snapshot exposes the state's version counter", midSnapshot.version(), is(greaterThan(0L)));

            // The snapshot path should produce a correct in-progress tree.
            PipelineGraph midGraph = new PipelineGraphApi(run).createTree();
            assertThat(midGraph, is(notNullValue()));
        } finally {
            SemaphoreStep.success("wait/1", null);
            j.waitForCompletion(run);
        }
        j.assertBuildStatus(Result.SUCCESS, run);

        // onCompleted evicts the live state; subsequent reads fall through to the scanner
        // path (which, combined with the #885 disk cache, handles completed runs).
        assertThat(
                "live snapshot is evicted once the run completes",
                LiveGraphRegistry.get().snapshot(run),
                is(nullValue()));
    }

    @Test
    void featureFlagDisabledReturnsEmptySnapshot() throws Exception {
        System.setProperty(ENABLED_PROPERTY, "false");
        try {
            WorkflowRun run = TestUtils.createAndRunJob(j, "flag-off", "smokeTest.jenkinsfile", Result.FAILURE);
            assertThat(LiveGraphRegistry.get().snapshot(run), is(nullValue()));

            // The scanner fallback still produces a usable graph.
            PipelineGraph graph = new PipelineGraphApi(run).createTree();
            assertThat(graph, is(notNullValue()));
            assertThat(graph.complete, is(true));
        } finally {
            System.clearProperty(ENABLED_PROPERTY);
        }
    }

    @Test
    void repeatCallsReturnCachedDtoWhenNoNewNodes() throws Exception {
        WorkflowJob job = j.createProject(WorkflowJob.class, "cache-hit");
        job.setDefinition(new CpsFlowDefinition(
                "stage('one') { echo 'hello' }\n"
                        + "stage('gate') { semaphore 'wait' }\n"
                        + "stage('two') { echo 'done' }\n",
                true));
        WorkflowRun run = job.scheduleBuild2(0).waitForStart();
        try {
            SemaphoreStep.waitForStart("wait/1", run);

            PipelineGraphApi graphApi = new PipelineGraphApi(run);
            PipelineStepApi stepApi = new PipelineStepApi(run);

            PipelineGraph firstGraph = graphApi.createTree();
            PipelineGraph secondGraph = graphApi.createTree();
            PipelineStepList firstSteps = stepApi.getAllSteps();
            PipelineStepList secondSteps = stepApi.getAllSteps();

            // Same underlying state version → cache hit → identical instance.
            assertThat("repeat createTree returns cached instance", secondGraph, is(sameInstance(firstGraph)));
            assertThat("repeat getAllSteps returns cached instance", secondSteps, is(sameInstance(firstSteps)));
        } finally {
            SemaphoreStep.success("wait/1", null);
            j.waitForCompletion(run);
        }
    }

    @Test
    void newNodeInvalidatesOutputCache() throws Exception {
        WorkflowJob job = j.createProject(WorkflowJob.class, "cache-miss");
        job.setDefinition(new CpsFlowDefinition(
                "stage('a') { semaphore 'gateA' }\n" + "stage('b') { semaphore 'gateB' }\n", true));
        WorkflowRun run = job.scheduleBuild2(0).waitForStart();
        try {
            SemaphoreStep.waitForStart("gateA/1", run);
            PipelineGraphApi api = new PipelineGraphApi(run);

            PipelineGraph beforeAdvance = api.createTree();
            LiveGraphSnapshot snapshotBefore = LiveGraphRegistry.get().snapshot(run);
            assertThat("snapshot present before advance", snapshotBefore, is(notNullValue()));
            long versionBefore = snapshotBefore.version();

            // Advance the pipeline — new flow nodes are added which bump the state's version
            // and should invalidate the cached DTO.
            SemaphoreStep.success("gateA/1", null);
            SemaphoreStep.waitForStart("gateB/1", run);

            LiveGraphSnapshot snapshotAfter = LiveGraphRegistry.get().snapshot(run);
            assertThat("snapshot present after advance", snapshotAfter, is(notNullValue()));
            assertThat("new nodes bumped the version", snapshotAfter.version(), is(greaterThan(versionBefore)));

            PipelineGraph afterAdvance = api.createTree();
            assertThat(
                    "cache was invalidated; a fresh graph was computed",
                    afterAdvance,
                    is(not(sameInstance(beforeAdvance))));
        } finally {
            // Release both gates so the build can always complete even if an assertion
            // threw before we reached the second semaphore.
            try {
                SemaphoreStep.success("gateA/1", null);
            } catch (Exception ignored) {
                // Already released or never reached — fine.
            }
            try {
                SemaphoreStep.success("gateB/1", null);
            } catch (Exception ignored) {
                // Ditto.
            }
            j.waitForCompletion(run);
        }
    }
}
