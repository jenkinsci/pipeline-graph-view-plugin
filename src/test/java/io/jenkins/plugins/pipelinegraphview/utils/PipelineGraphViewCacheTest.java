package io.jenkins.plugins.pipelinegraphview.utils;

import static org.awaitility.Awaitility.await;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.jenkinsci.plugins.workflow.test.steps.SemaphoreStep.*;

import hudson.XmlFile;
import hudson.model.Result;
import hudson.util.XStream2;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineGraphViewCache.CachedPayload;
import java.io.File;
import java.nio.file.Files;
import java.time.Duration;
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

    private static final String CACHE_FILE_NAME = "pipeline-graph-view-cache.xml";

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
        File cacheFile = new File(run.getRootDir(), CACHE_FILE_NAME);
        assertThat("no cache file before first call", cacheFile.exists(), is(false));

        AtomicInteger computes = new AtomicInteger();
        PipelineGraph graph = cache.getGraph(run, () -> {
            computes.incrementAndGet();
            return new PipelineGraphApi(run).computeTree();
        });

        assertThat(graph, is(not(nullValue())));
        assertThat(graph.stages.isEmpty(), is(false));
        assertThat("supplier ran exactly once", computes.get(), equalTo(1));
        assertThat("cache file exists after first call", cacheFile.exists(), is(true));
        assertThat("cache file is non-empty", Files.size(cacheFile.toPath()), greaterThan(0L));
    }

    @Test
    void warmCache_returnsPayloadWithoutComputing() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(j, "warm", "smokeTest.jenkinsfile", Result.FAILURE);
        cache.getGraph(run, () -> new PipelineGraphApi(run).computeTree());

        // Drop in-memory cache to force re-read from disk on next call.
        cache.invalidateMemory();

        AtomicInteger computes = new AtomicInteger();
        PipelineGraph again = cache.getGraph(run, () -> {
            computes.incrementAndGet();
            return new PipelineGraphApi(run).computeTree();
        });

        assertThat(again, is(not(nullValue())));
        assertThat("supplier did not run — served from disk", computes.get(), equalTo(0));
        assertThat(again.stages.isEmpty(), is(false));
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

            File cacheFile = new File(run.getRootDir(), CACHE_FILE_NAME);
            assertThat("no cache file while run is in-progress", cacheFile.exists(), is(false));
            assertThat("both calls recomputed", computes.get(), equalTo(2));
        } finally {
            run.getExecutor().interrupt();
            j.waitForCompletion(run);
        }
    }

    @Test
    void schemaVersionMismatch_isIgnoredAndRecomputed() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(j, "schema", "smokeTest.jenkinsfile", Result.FAILURE);
        File cacheFile = new File(run.getRootDir(), CACHE_FILE_NAME);

        // Write a stale-version payload directly to disk.
        CachedPayload stale = new CachedPayload();
        stale.schemaVersion = Integer.MIN_VALUE;
        XStream2 xstream = new XStream2();
        xstream.alias("pipeline-graph-view-cache", CachedPayload.class);
        new XmlFile(xstream, cacheFile).write(stale);
        assertThat(cacheFile.exists(), is(true));

        AtomicInteger computes = new AtomicInteger();
        PipelineGraph graph = cache.getGraph(run, () -> {
            computes.incrementAndGet();
            return new PipelineGraphApi(run).computeTree();
        });

        assertThat("stale file ignored; supplier ran", computes.get(), equalTo(1));
        assertThat(graph.stages.isEmpty(), is(false));
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
