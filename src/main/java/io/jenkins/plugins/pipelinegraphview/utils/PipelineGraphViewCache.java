package io.jenkins.plugins.pipelinegraphview.utils;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.function.Supplier;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

/**
 * Disk-backed cache for the computed pipeline graph and step list of completed runs.
 * For in-progress runs the cache is transparent (every call recomputes). Once a run is
 * no longer building, results are persisted as JSON under the run's directory and can be
 * streamed straight back to HTTP clients without going through Jackson on the read path.
 *
 * <p>The on-disk format is the same wire JSON the {@code tree} / {@code allSteps} endpoints
 * emit (the {@code data} portion of the {@code {"status":"ok","data":...}} envelope).
 * {@link #tryServeTree(WorkflowRun, OutputStream)} / {@link #tryServeAllSteps(WorkflowRun,
 * OutputStream)} wrap that in the envelope and copy bytes through.
 *
 * <p>Schema version is encoded in the file name: a future format change just bumps
 * {@link #SCHEMA_VERSION} so old files become orphans on disk and are ignored.
 */
public class PipelineGraphViewCache {

    public static final int SCHEMA_VERSION = 1;

    public static final String TREE_FILE_NAME = "pipeline-graph-view-tree.v" + SCHEMA_VERSION + ".json";
    public static final String ALL_STEPS_FILE_NAME = "pipeline-graph-view-allsteps.v" + SCHEMA_VERSION + ".json";
    public static final String LEGACY_XSTREAM_FILE_NAME = "pipeline-graph-view-cache.xml";

    private static final byte[] ENVELOPE_PREFIX = "{\"status\":\"ok\",\"data\":".getBytes(StandardCharsets.UTF_8);
    private static final byte[] ENVELOPE_SUFFIX = "}".getBytes(StandardCharsets.UTF_8);

    private static final Logger logger = LoggerFactory.getLogger(PipelineGraphViewCache.class);
    private static final PipelineGraphViewCache INSTANCE = new PipelineGraphViewCache();

    private static final ObjectMapper MAPPER = JsonMapper.builder()
            .changeDefaultPropertyInclusion(inc -> inc.withValueInclusion(JsonInclude.Include.NON_NULL))
            .changeDefaultVisibility(v -> v.withFieldVisibility(JsonAutoDetect.Visibility.ANY))
            .build();

    private final Cache<String, CachedValue> memCache =
            Caffeine.newBuilder().maximumSize(256).build();

    public static PipelineGraphViewCache get() {
        return INSTANCE;
    }

    PipelineGraphViewCache() {}

    /**
     * If a cached graph file exists for {@code run}, write it to {@code out} wrapped in the
     * Stapler {@code okJSON} envelope and return {@code true}. Otherwise no bytes are written.
     */
    public boolean tryServeTree(WorkflowRun run, OutputStream out) throws IOException {
        return tryServe(treeFile(run), out);
    }

    /** {@link #tryServeTree} for the all-steps payload. */
    public boolean tryServeAllSteps(WorkflowRun run, OutputStream out) throws IOException {
        return tryServe(allStepsFile(run), out);
    }

    private boolean tryServe(File file, OutputStream out) throws IOException {
        if (!file.isFile()) {
            return false;
        }
        out.write(ENVELOPE_PREFIX);
        try (InputStream in = new BufferedInputStream(new FileInputStream(file))) {
            in.transferTo(out);
        }
        out.write(ENVELOPE_SUFFIX);
        return true;
    }

    public PipelineGraph getGraph(WorkflowRun run, Supplier<PipelineGraph> compute) {
        if (run.isBuilding()) {
            return compute.get();
        }
        CachedValue entry = memCache.get(run.getExternalizableId(), k -> new CachedValue());
        synchronized (entry) {
            if (entry.graph == null) {
                entry.graph = readJson(treeFile(run), PipelineGraph.class);
            }
            if (entry.graph == null) {
                entry.graph = compute.get();
                writeJson(treeFile(run), entry.graph);
            }
            return entry.graph;
        }
    }

    public PipelineStepList getAllSteps(WorkflowRun run, Supplier<PipelineStepList> compute) {
        if (run.isBuilding()) {
            return compute.get();
        }
        CachedValue entry = memCache.get(run.getExternalizableId(), k -> new CachedValue());
        synchronized (entry) {
            if (entry.allSteps == null) {
                entry.allSteps = readJson(allStepsFile(run), PipelineStepList.class);
            }
            if (entry.allSteps == null) {
                entry.allSteps = compute.get();
                writeJson(allStepsFile(run), entry.allSteps);
            }
            return entry.allSteps;
        }
    }

    /**
     * Writes a final graph and step list directly to disk, bypassing the {@code isBuilding}
     * guard on {@link #getGraph} / {@link #getAllSteps}. Intended for
     * {@code FlowExecutionListener.onCompleted}, where the execution is known complete but
     * {@code WorkflowRun.isBuilding()} may not have flipped yet.
     */
    public void seed(WorkflowRun run, PipelineGraph graph, PipelineStepList allSteps) {
        CachedValue entry = memCache.get(run.getExternalizableId(), k -> new CachedValue());
        synchronized (entry) {
            entry.graph = graph;
            entry.allSteps = allSteps;
            writeJson(treeFile(run), graph);
            writeJson(allStepsFile(run), allSteps);
        }
    }

    /** Returns the JSON-decoded value at {@code source} or {@code null} if the file is absent or unreadable. */
    private <T> T readJson(File source, Class<T> type) {
        if (!source.isFile()) {
            return null;
        }
        try (InputStream in = new BufferedInputStream(new FileInputStream(source))) {
            return MAPPER.readValue(in, type);
        } catch (IOException e) {
            // A corrupt/older file shouldn't wedge the cache: drop it and fall back to compute.
            logger.warn("Failed to read pipeline graph cache for {}; recomputing", source.getName(), e);
            return null;
        }
    }

    private void writeJson(File target, Object data) {
        File dir = target.getParentFile();
        File tmp = null;
        try {
            tmp = File.createTempFile(target.getName() + ".", ".tmp", dir);
            try (OutputStream os = new BufferedOutputStream(new FileOutputStream(tmp))) {
                MAPPER.writeValue(os, data);
            }
            try {
                Files.move(
                        tmp.toPath(),
                        target.toPath(),
                        StandardCopyOption.ATOMIC_MOVE,
                        StandardCopyOption.REPLACE_EXISTING);
            } catch (AtomicMoveNotSupportedException e) {
                Files.move(tmp.toPath(), target.toPath(), StandardCopyOption.REPLACE_EXISTING);
            }
            tmp = null;
            // Best-effort cleanup of any pre-v1 XStream cache left behind by older versions
            // of the plugin.
            new File(dir, LEGACY_XSTREAM_FILE_NAME).delete();
        } catch (IOException e) {
            logger.warn("Failed to write pipeline graph cache for {}", target.getName(), e);
        } finally {
            if (tmp != null) {
                tmp.delete();
            }
        }
    }

    private File treeFile(WorkflowRun run) {
        return new File(run.getRootDir(), TREE_FILE_NAME);
    }

    private File allStepsFile(WorkflowRun run) {
        return new File(run.getRootDir(), ALL_STEPS_FILE_NAME);
    }

    /** Test hook: drop in-memory entries so the next call re-runs the supplier. */
    void invalidateMemory() {
        memCache.invalidateAll();
    }

    static class CachedValue {
        PipelineGraph graph;
        PipelineStepList allSteps;
    }
}
