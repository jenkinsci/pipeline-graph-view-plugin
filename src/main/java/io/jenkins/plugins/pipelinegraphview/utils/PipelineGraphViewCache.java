package io.jenkins.plugins.pipelinegraphview.utils;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import hudson.XmlFile;
import hudson.util.XStream2;
import io.jenkins.plugins.pipelinegraphview.analysis.TimingInfo;
import java.io.File;
import java.io.IOException;
import java.util.function.Supplier;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Disk-backed cache for the computed pipeline graph and step list of completed runs.
 * For in-progress runs the cache is transparent (every call recomputes). Once a run is
 * no longer building, results are persisted under the run's directory, so later
 * requests — including after a Jenkins restart — are served without recomputation.
 */
public class PipelineGraphViewCache {

    /**
     * Hand-bump when any persisted DTO shape changes in a non-backwards-compatible way.
     * Older files are ignored and recomputed on the next read.
     */
    static final int SCHEMA_VERSION = 1;

    private static final String CACHE_FILE_NAME = "pipeline-graph-view-cache.xml";
    private static final Logger logger = LoggerFactory.getLogger(PipelineGraphViewCache.class);
    private static final PipelineGraphViewCache INSTANCE = new PipelineGraphViewCache();

    private final Cache<String, CachedPayload> memCache =
            Caffeine.newBuilder().maximumSize(256).build();

    public static PipelineGraphViewCache get() {
        return INSTANCE;
    }

    PipelineGraphViewCache() {}

    public PipelineGraph getGraph(WorkflowRun run, Supplier<PipelineGraph> compute) {
        if (run.isBuilding()) {
            return compute.get();
        }
        CachedPayload payload = load(run);
        synchronized (payload) {
            if (payload.graph == null) {
                payload.graph = compute.get();
                payload.schemaVersion = SCHEMA_VERSION;
                write(run, payload);
            }
            return payload.graph;
        }
    }

    public PipelineStepList getAllSteps(WorkflowRun run, Supplier<PipelineStepList> compute) {
        if (run.isBuilding()) {
            return compute.get();
        }
        CachedPayload payload = load(run);
        synchronized (payload) {
            if (payload.allSteps == null) {
                payload.allSteps = compute.get();
                payload.schemaVersion = SCHEMA_VERSION;
                write(run, payload);
            }
            return payload.allSteps;
        }
    }

    /**
     * Writes a final graph and step list directly to disk, bypassing the {@code isBuilding}
     * guard used by {@link #getGraph} / {@link #getAllSteps}. Intended for use at
     * {@code FlowExecutionListener.onCompleted}, where the execution is known complete but
     * {@code WorkflowRun.isBuilding()} may not have flipped yet. Calling this avoids wasting
     * the work already done by the live-state path: without it, the first read after
     * completion falls through to a full scanner sweep.
     */
    public void seed(WorkflowRun run, PipelineGraph graph, PipelineStepList allSteps) {
        CachedPayload payload = load(run);
        synchronized (payload) {
            payload.graph = graph;
            payload.allSteps = allSteps;
            payload.schemaVersion = SCHEMA_VERSION;
            write(run, payload);
        }
    }

    private CachedPayload load(WorkflowRun run) {
        return memCache.get(run.getExternalizableId(), k -> readFromDisk(run));
    }

    private CachedPayload readFromDisk(WorkflowRun run) {
        XmlFile file = cacheFile(run);
        if (!file.exists()) {
            return new CachedPayload();
        }
        try {
            Object read = file.read();
            if (read instanceof CachedPayload loaded && loaded.schemaVersion == SCHEMA_VERSION) {
                return loaded;
            }
            logger.debug("Discarding pipeline graph cache for {}: schema version mismatch", run.getExternalizableId());
        } catch (IOException e) {
            logger.warn("Failed to read pipeline graph cache for {}", run.getExternalizableId(), e);
        }
        return new CachedPayload();
    }

    private void write(WorkflowRun run, CachedPayload payload) {
        try {
            cacheFile(run).write(payload);
        } catch (IOException e) {
            logger.warn("Failed to write pipeline graph cache for {}", run.getExternalizableId(), e);
        }
    }

    private XmlFile cacheFile(WorkflowRun run) {
        return new XmlFile(XSTREAM, new File(run.getRootDir(), CACHE_FILE_NAME));
    }

    /** Test hook: drop in-memory entries so the next call goes through the disk read path. */
    void invalidateMemory() {
        memCache.invalidateAll();
    }

    static class CachedPayload {
        int schemaVersion;
        PipelineGraph graph;
        PipelineStepList allSteps;
    }

    private static final XStream2 XSTREAM = new XStream2();

    static {
        XSTREAM.alias("pipeline-graph-view-cache", CachedPayload.class);
        XSTREAM.alias("pipeline-graph", PipelineGraph.class);
        XSTREAM.alias("pipeline-stage", PipelineStage.class);
        XSTREAM.alias("pipeline-step", PipelineStep.class);
        XSTREAM.alias("pipeline-step-list", PipelineStepList.class);
        XSTREAM.alias("pipeline-input-step", PipelineInputStep.class);
        XSTREAM.alias("timing-info", TimingInfo.class);
        XSTREAM.alias("pipeline-state", PipelineState.class);
    }
}
