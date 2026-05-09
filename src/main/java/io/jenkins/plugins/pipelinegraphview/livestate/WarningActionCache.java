package io.jenkins.plugins.pipelinegraphview.livestate;

import edu.umd.cs.findbugs.annotations.CheckForNull;
import edu.umd.cs.findbugs.annotations.NonNull;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;
import org.jenkinsci.plugins.workflow.actions.WarningAction;

/**
 * Per-run cache of {@link WarningAction} lookups between two flow nodes. The underlying scan
 * in {@code StatusAndTiming.findWorstWarningBetween} walks every node between a stage's start
 * and end, which dominates {@code /allSteps} on large completed runs. WarningActions don't
 * change after attach, so once both endpoints exist (and for completed blocks, the set of
 * inner nodes is fixed) the result is stable and can be memoised.
 */
public final class WarningActionCache {

    // ConcurrentHashMap disallows null values, so we wrap each result in Optional — the
    // Optional is never itself null, it's either present (a WarningAction) or empty
    // (cached: no warning on this range). Map.get returning null means "not yet cached".
    private final Map<String, Optional<WarningAction>> byRange = new ConcurrentHashMap<>();

    WarningActionCache() {}

    /**
     * Returns the cached result for {@code (startId, endId)}, or invokes {@code computer} to
     * resolve and caches the result before returning.
     */
    @CheckForNull
    public WarningAction getOrCompute(
            @NonNull String startId, @NonNull String endId, @NonNull Supplier<WarningAction> computer) {
        String k = key(startId, endId);
        Optional<WarningAction> cached = byRange.get(k);
        if (cached != null) {
            return cached.orElse(null);
        }
        WarningAction computed = computer.get();
        byRange.put(k, Optional.ofNullable(computed));
        return computed;
    }

    private static String key(String startId, String endId) {
        return startId + ':' + endId;
    }
}
