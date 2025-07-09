package io.jenkins.plugins.pipelinegraphview.utils;

import io.jenkins.plugins.pipelinegraphview.treescanner.PipelineNodeGraphAdapter;
import java.util.Map;
import java.util.concurrent.CancellationException;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ConcurrentHashMap;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

public class CachedPipelineNodeGraphAdaptor {

    public static final CachedPipelineNodeGraphAdaptor instance = new CachedPipelineNodeGraphAdaptor();

    private final Map<TaskKey, CompletableFuture<PipelineNodeGraphAdapter>> tasks = new ConcurrentHashMap<>();

    private CachedPipelineNodeGraphAdaptor() {}

    public PipelineNodeGraphAdapter getFor(WorkflowRun run) {
        TaskKey key = new TaskKey(run);

        CompletableFuture<PipelineNodeGraphAdapter> task = tasks.computeIfAbsent(
                key, (ignored) -> CompletableFuture.supplyAsync(() -> new PipelineNodeGraphAdapter(run)));

        try {
            return task.join();
        } catch (CancellationException | CompletionException e) {
            throw new RuntimeException("Failure computing graph for " + key.job + " - " + key.run, e);
        } finally {
            tasks.remove(key);
        }
    }

    private record TaskKey(String job, String run) {
        TaskKey(WorkflowRun run) {
            this(run.getParent().getFullName(), run.getId());
        }
    }
}
