package io.jenkins.plugins.pipelinegraphview.utils;

import static org.awaitility.Awaitility.await;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.sameInstance;
import static org.jenkinsci.plugins.workflow.test.steps.SemaphoreStep.*;

import hudson.model.Result;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.time.Duration;
import java.util.ArrayList;
import java.util.concurrent.atomic.AtomicInteger;
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

@WithJenkins
class PipelineGraphViewCacheTest {

    private JenkinsRule j;
    private PipelineGraphViewCache cache;

    @BeforeEach
    void setUp(JenkinsRule j) {
        this.j = j;
        // Use a fresh per-test instance so state doesn't leak between cases.
        this.cache = new PipelineGraphViewCache();
    }

    @Test
    void coldCache_computesAndWritesFile() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(j, "cold", "smokeTest.jenkinsfile", Result.FAILURE);
        File treeFile = new File(run.getRootDir(), PipelineGraphViewCache.TREE_FILE_NAME);
        // LiveGraphLifecycle#onCompleted now seeds the on-disk cache at build completion,
        // so the file usually exists by this point. Delete it to exercise the cold-cache
        // path of getGraph without changing the rest of the test's intent.
        Files.deleteIfExists(treeFile.toPath());
        cache.invalidateMemory();

        AtomicInteger computes = new AtomicInteger();
        PipelineGraph graph = cache.getGraph(run, () -> {
            computes.incrementAndGet();
            return new PipelineGraphApi(run).computeTree();
        });

        assertThat(graph, is(not(nullValue())));
        assertThat(graph.stages.isEmpty(), is(false));
        assertThat("supplier ran exactly once", computes.get(), equalTo(1));
        assertThat("cache file exists after first call", treeFile.exists(), is(true));
        assertThat("cache file is non-empty", Files.size(treeFile.toPath()), greaterThan(0L));
    }

    @Test
    void warmCache_streamsDirectlyWithoutComputing() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(j, "warm-stream", "smokeTest.jenkinsfile", Result.FAILURE);
        // Force-populate the disk cache via getGraph; this also writes the JSON file.
        cache.getGraph(run, () -> new PipelineGraphApi(run).computeTree());

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        boolean served = cache.tryServeTree(run, out);

        assertThat("cached tree served from disk", served, is(true));
        String body = out.toString(StandardCharsets.UTF_8);
        assertThat("body wrapped in Stapler okJSON envelope", body, containsString("\"status\":\"ok\""));
        assertThat("body contains stages payload", body, containsString("\"stages\""));
    }

    @Test
    void warmCache_returnsObjectFromDiskWithoutRecomputing() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(j, "warm-object", "smokeTest.jenkinsfile", Result.FAILURE);
        PipelineGraph original = cache.getGraph(run, () -> new PipelineGraphApi(run).computeTree());

        // Drop in-memory cache to force re-read from disk on next call.
        cache.invalidateMemory();

        AtomicInteger computes = new AtomicInteger();
        PipelineGraph again = cache.getGraph(run, () -> {
            computes.incrementAndGet();
            return new PipelineGraphApi(run).computeTree();
        });

        assertThat(again, is(not(nullValue())));
        assertThat("supplier did not run — deserialised from disk", computes.get(), equalTo(0));
        assertThat(again.stages.isEmpty(), is(false));
        assertThat("complete flag round-tripped", again.complete, is(original.complete));
        // Confirm we rebuilt a usable TimingInfo on read; getters NPE if it's null.
        var first = again.stages.get(0);
        assertThat(first.id, is(original.stages.get(0).id));
        assertThat(first.getStartTimeMillis(), is(original.stages.get(0).getStartTimeMillis()));
    }

    @Test
    void inProgressRun_doesNotPersist() throws Exception {
        WorkflowRun run = startLongRunningJob();
        try {
            AtomicInteger computes = new AtomicInteger();
            cache.getGraph(run, () -> {
                computes.incrementAndGet();
                return new PipelineGraphApi(run).computeTree();
            });
            cache.getGraph(run, () -> {
                computes.incrementAndGet();
                return new PipelineGraphApi(run).computeTree();
            });

            File treeFile = new File(run.getRootDir(), PipelineGraphViewCache.TREE_FILE_NAME);
            assertThat("no cache file while run is in-progress", treeFile.exists(), is(false));
            assertThat("both calls recomputed", computes.get(), equalTo(2));
        } finally {
            run.getExecutor().interrupt();
            j.waitForCompletion(run);
        }
    }

    @Test
    void tryServeReturnsFalseWhenNoFile() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(j, "missing", "smokeTest.jenkinsfile", Result.FAILURE);
        Files.deleteIfExists(new File(run.getRootDir(), PipelineGraphViewCache.TREE_FILE_NAME).toPath());
        Files.deleteIfExists(new File(run.getRootDir(), PipelineGraphViewCache.ALL_STEPS_FILE_NAME).toPath());

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        assertThat(cache.tryServeTree(run, out), is(false));
        assertThat(cache.tryServeAllSteps(run, out), is(false));
        assertThat("no bytes written when nothing to serve", out.size(), equalTo(0));
    }

    @Test
    void writingNewCacheRemovesLegacyXStreamFile() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(j, "legacy", "smokeTest.jenkinsfile", Result.FAILURE);
        File legacy = new File(run.getRootDir(), PipelineGraphViewCache.LEGACY_XSTREAM_FILE_NAME);
        Files.writeString(legacy.toPath(), "<pipeline-graph-view-cache/>");
        // Ensure the new-format files are absent so getGraph triggers a write.
        Files.deleteIfExists(new File(run.getRootDir(), PipelineGraphViewCache.TREE_FILE_NAME).toPath());
        cache.invalidateMemory();

        cache.getGraph(run, () -> new PipelineGraphApi(run).computeTree());

        assertThat("legacy XStream cache file is removed", legacy.exists(), is(false));
    }

    @Test
    void incompleteResultsAreNotCached() throws Exception {
        // A finished run can capture a graph just as completion is observed and produce one
        // whose statuses still say "running". Persisting that (or memoising it) would serve
        // the incomplete graph for the rest of the run's life: the tree endpoint treats a
        // cache hit as final and the frontend stops polling.
        WorkflowRun run = TestUtils.createAndRunJob(j, "incomplete", "smokeTest.jenkinsfile", Result.FAILURE);
        File treeFile = new File(run.getRootDir(), PipelineGraphViewCache.TREE_FILE_NAME);
        File stepsFile = new File(run.getRootDir(), PipelineGraphViewCache.ALL_STEPS_FILE_NAME);
        Files.deleteIfExists(treeFile.toPath());
        Files.deleteIfExists(stepsFile.toPath());
        cache.invalidateMemory();

        PipelineGraph incompleteGraph = new PipelineGraph(new ArrayList<>(), false);
        PipelineStepList incompleteSteps = new PipelineStepList(false);
        assertThat(cache.getGraph(run, () -> incompleteGraph), is(sameInstance(incompleteGraph)));
        assertThat(cache.getAllSteps(run, () -> incompleteSteps), is(sameInstance(incompleteSteps)));

        assertThat("incomplete graph is not persisted", treeFile.exists(), is(false));
        assertThat("incomplete step list is not persisted", stepsFile.exists(), is(false));

        // Nothing was memoised either, so the next request rebuilds rather than returning the
        // incomplete result forever.
        AtomicInteger computes = new AtomicInteger();
        PipelineGraph completeGraph = new PipelineGraphApi(run).computeTree();
        PipelineStepList completeSteps = new PipelineStepList(true);
        assertThat(
                cache.getGraph(run, () -> {
                    computes.incrementAndGet();
                    return completeGraph;
                }),
                is(sameInstance(completeGraph)));
        assertThat(
                cache.getAllSteps(run, () -> {
                    computes.incrementAndGet();
                    return completeSteps;
                }),
                is(sameInstance(completeSteps)));
        assertThat("both results were recomputed", computes.get(), equalTo(2));
        assertThat("the complete graph is persisted", treeFile.exists(), is(true));
        assertThat("the complete step list is persisted", stepsFile.exists(), is(true));
    }

    @Test
    void emptyCompleteGraphIsNotCached() throws Exception {
        // An empty graph can be produced for a run whose execution is unavailable (e.g. a
        // force-killed one) or whose job was deleted and recreated. Caching it as final would
        // freeze the stage view empty, so such a result must always be rebuilt.
        WorkflowRun run = TestUtils.createAndRunJob(j, "empty-graph", "smokeTest.jenkinsfile", Result.FAILURE);
        File treeFile = new File(run.getRootDir(), PipelineGraphViewCache.TREE_FILE_NAME);
        Files.deleteIfExists(treeFile.toPath());
        cache.invalidateMemory();

        PipelineGraph emptyGraph = new PipelineGraph(new ArrayList<>(), true);
        assertThat(cache.getGraph(run, () -> emptyGraph), is(sameInstance(emptyGraph)));
        assertThat("empty graph is not persisted", treeFile.exists(), is(false));

        AtomicInteger computes = new AtomicInteger();
        PipelineGraph realGraph = new PipelineGraphApi(run).computeTree();
        assertThat(
                cache.getGraph(run, () -> {
                    computes.incrementAndGet();
                    return realGraph;
                }),
                is(sameInstance(realGraph)));
        assertThat("the next request rebuilt rather than serving the empty graph", computes.get(), equalTo(1));
        assertThat("the non-empty graph is persisted", treeFile.exists(), is(true));
    }

    @Test
    void seedRefusesIncompletePayloads() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(j, "seed-incomplete", "smokeTest.jenkinsfile", Result.FAILURE);
        File treeFile = new File(run.getRootDir(), PipelineGraphViewCache.TREE_FILE_NAME);
        File stepsFile = new File(run.getRootDir(), PipelineGraphViewCache.ALL_STEPS_FILE_NAME);
        Files.deleteIfExists(treeFile.toPath());
        Files.deleteIfExists(stepsFile.toPath());
        cache.invalidateMemory();

        cache.seed(run, new PipelineGraph(new ArrayList<>(), false), new PipelineStepList(true));
        assertThat("incomplete graph is not seeded", treeFile.exists(), is(false));

        cache.seed(run, new PipelineGraph(new ArrayList<>(), true), new PipelineStepList(true));
        assertThat("empty graph is not seeded", treeFile.exists(), is(false));

        PipelineGraph graph = new PipelineGraphApi(run).computeTree();
        cache.seed(run, graph, new PipelineStepList(false));
        assertThat("incomplete step list is not seeded", stepsFile.exists(), is(false));

        cache.seed(run, graph, new PipelineStepList(true));
        assertThat("complete payloads are seeded", treeFile.exists(), is(true));
        assertThat("complete payloads are seeded", stepsFile.exists(), is(true));
    }

    private WorkflowRun startLongRunningJob() throws Exception {
        String jenkinsfile = "node { echo 'hi'; semaphore 'wait' }";
        var job = j.createProject(WorkflowJob.class, "running");
        job.setDefinition(new CpsFlowDefinition(jenkinsfile, true));
        var future = job.scheduleBuild2(0);
        WorkflowRun run = future.waitForStart();
        // Wait until the semaphore step is actually blocking so the run is reliably "building".
        await().atMost(Duration.ofSeconds(30)).until(run::isBuilding);
        waitForStart("wait/1", run);
        return run;
    }
}
