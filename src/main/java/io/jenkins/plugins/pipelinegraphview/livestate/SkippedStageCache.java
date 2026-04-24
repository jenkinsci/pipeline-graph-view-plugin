package io.jenkins.plugins.pipelinegraphview.livestate;

import edu.umd.cs.findbugs.annotations.NonNull;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

/**
 * Per-run cache of {@link io.jenkins.plugins.pipelinegraphview.utils.PipelineNodeUtil#isSkippedStage}
 * results, keyed by node ID. Skip tags are attached by the declarative pipeline framework at
 * block start and never change afterwards, so the boolean can be memoised for the lifetime of
 * the run.
 */
public final class SkippedStageCache {

    private final Map<String, Boolean> byNodeId = new ConcurrentHashMap<>();

    SkippedStageCache() {}

    public boolean getOrCompute(@NonNull String nodeId, @NonNull Supplier<Boolean> computer) {
        return byNodeId.computeIfAbsent(nodeId, k -> computer.get());
    }

    /** Visible for testing — the number of node IDs resolved so far. */
    int size() {
        return byNodeId.size();
    }
}
