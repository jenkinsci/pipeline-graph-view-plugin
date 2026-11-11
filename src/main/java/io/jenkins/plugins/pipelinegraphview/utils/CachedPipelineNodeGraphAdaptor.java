package io.jenkins.plugins.pipelinegraphview.utils;

import io.jenkins.plugins.pipelinegraphview.treescanner.PipelineNodeGraphAdapter;
import java.util.Map;
import java.util.concurrent.CancellationException;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ConcurrentHashMap;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class CachedPipelineNodeGraphAdaptor {

    public static final CachedPipelineNodeGraphAdaptor instance = new CachedPipelineNodeGraphAdaptor();
    private static final Logger log = LoggerFactory.getLogger(CachedPipelineNodeGraphAdaptor.class);

    private final Map<String, CompletableFuture<PipelineNodeGraphAdapter>> tasks = new ConcurrentHashMap<>();

    private CachedPipelineNodeGraphAdaptor() {}

    /**
     * Like {@link #getFor(WorkflowRun)}, but builds a fresh adapter once the run is complete: a
     * shared build may have started before completion, and its statuses would still say running.
     */
    public PipelineNodeGraphAdapter getFor(WorkflowRun run, boolean complete) {
        return complete ? new PipelineNodeGraphAdapter(run) : getFor(run);
    }

    public PipelineNodeGraphAdapter getFor(WorkflowRun run) {
        String key = run.getExternalizableId();

        CompletableFuture<PipelineNodeGraphAdapter> task = tasks.computeIfAbsent(key, (ignored) -> {
            log.debug("Creating new PipelineNodeGraphAdapter for run: {}", key);
            return CompletableFuture.supplyAsync(() -> new PipelineNodeGraphAdapter(run));
        });

        try {
            return task.join();
        } catch (CancellationException | CompletionException e) {
            throw new RuntimeException("Failure computing graph for " + key, e);
        } finally {
            tasks.remove(key);
        }
    }
}
