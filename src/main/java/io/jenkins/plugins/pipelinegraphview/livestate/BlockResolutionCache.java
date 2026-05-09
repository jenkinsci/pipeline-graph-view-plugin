package io.jenkins.plugins.pipelinegraphview.livestate;

import edu.umd.cs.findbugs.annotations.NonNull;
import io.jenkins.plugins.pipelinegraphview.analysis.TimingInfo;
import io.jenkins.plugins.pipelinegraphview.utils.NodeRunStatus;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

/**
 * Per-run cache of computed {@link TimingInfo} and {@link NodeRunStatus} for closed
 * block relationships, keyed by {@code (startId, endId)}. Entries are stable once the
 * block has ended, so the cache never needs to invalidate.
 */
public final class BlockResolutionCache {

    private final Map<String, TimingInfo> timingByRange = new ConcurrentHashMap<>();
    private final Map<String, NodeRunStatus> statusByRange = new ConcurrentHashMap<>();

    BlockResolutionCache() {}

    @NonNull
    public TimingInfo getOrComputeTiming(
            @NonNull String startId, @NonNull String endId, @NonNull Supplier<TimingInfo> computer) {
        return timingByRange.computeIfAbsent(key(startId, endId), k -> computer.get());
    }

    @NonNull
    public NodeRunStatus getOrComputeStatus(
            @NonNull String startId, @NonNull String endId, @NonNull Supplier<NodeRunStatus> computer) {
        return statusByRange.computeIfAbsent(key(startId, endId), k -> computer.get());
    }

    /** Visible for testing — combined size of the timing and status caches. */
    int size() {
        return timingByRange.size() + statusByRange.size();
    }

    private static String key(String startId, String endId) {
        return startId + ':' + endId;
    }
}
