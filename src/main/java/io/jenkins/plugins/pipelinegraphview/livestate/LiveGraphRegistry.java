package io.jenkins.plugins.pipelinegraphview.livestate;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineGraph;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineStepList;
import java.time.Duration;
import jenkins.util.SystemProperties;
import org.jenkinsci.plugins.workflow.flow.FlowExecution;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

/**
 * Singleton holding one {@link LiveGraphState} per in-progress run.
 * Entries are created on demand by the listener / lifecycle code, removed on completion,
 * and otherwise bounded by a Caffeine LRU so abandoned entries (deleted runs, listener
 * bugs) don't leak.
 *
 * <p>Operator knobs:
 * <ul>
 *   <li>{@code io.jenkins.plugins.pipelinegraphview.livestate.LiveGraphRegistry.enabled}
 *       ({@code boolean}, default {@code true}) — set to {@code false} to disable the
 *       live-state path entirely and force scanner fallback.</li>
 *   <li>{@code io.jenkins.plugins.pipelinegraphview.livestate.LiveGraphRegistry.size}
 *       ({@code int}, default {@code 512}) — max concurrent in-progress runs tracked.
 *       Extra runs use the scanner path until an entry evicts.</li>
 * </ul>
 */
public final class LiveGraphRegistry {

    // IMPORTANT: keep CACHE_MAX_SIZE declared BEFORE INSTANCE. Static fields initialise in
    // source order, and the instance's Caffeine builder reads CACHE_MAX_SIZE — if INSTANCE
    // were declared first, CACHE_MAX_SIZE would still be 0 during construction and Caffeine
    // would evict every entry immediately (maximumSize(0) means "no entries allowed").
    private static final int CACHE_MAX_SIZE =
            SystemProperties.getInteger(LiveGraphRegistry.class.getName() + ".size", 512);

    private static final LiveGraphRegistry INSTANCE = new LiveGraphRegistry();

    public static LiveGraphRegistry get() {
        return INSTANCE;
    }

    private final Cache<String, LiveGraphState> states = Caffeine.newBuilder()
            .maximumSize(CACHE_MAX_SIZE)
            .expireAfterAccess(Duration.ofMinutes(30))
            .build();

    LiveGraphRegistry() {}

    /** See the {@code .enabled} knob documented on the class javadoc. */
    private static boolean disabled() {
        return !SystemProperties.getBoolean(LiveGraphRegistry.class.getName() + ".enabled", true);
    }

    LiveGraphState getOrCreate(FlowExecution execution) {
        if (disabled()) {
            return null;
        }
        String key = keyFor(execution);
        if (key == null) {
            return null;
        }
        return states.get(key, k -> new LiveGraphState());
    }

    /**
     * Returns the state's current version, or {@code null} if there's no usable state
     * (feature disabled, not populated, poisoned, or not yet ready). Cheap — lets callers
     * short-circuit to {@link #cachedGraph}/{@link #cachedAllSteps} without paying for a
     * full snapshot first.
     */
    public Long currentVersion(WorkflowRun run) {
        if (disabled()) {
            return null;
        }
        LiveGraphState state = states.getIfPresent(run.getExternalizableId());
        return state == null ? null : state.currentVersion();
    }

    /**
     * Returns a snapshot of the live state for this run, or {@code null} if none exists
     * (feature disabled, state never populated, state poisoned). Callers must treat
     * {@code null} as "fall back to the scanner path."
     */
    public LiveGraphSnapshot snapshot(WorkflowRun run) {
        if (disabled()) {
            return null;
        }
        LiveGraphState state = states.getIfPresent(run.getExternalizableId());
        return state == null ? null : state.snapshot();
    }

    void remove(FlowExecution execution) {
        String key = keyFor(execution);
        if (key != null) {
            states.invalidate(key);
        }
    }

    /**
     * Returns a previously-cached {@link PipelineGraph} for this run if it was computed at
     * or after {@code minVersion}, otherwise {@code null}. Use {@link LiveGraphSnapshot#version()}
     * as the argument — cache entries older than the caller's snapshot are rejected.
     */
    public PipelineGraph cachedGraph(WorkflowRun run, long minVersion) {
        if (disabled()) {
            return null;
        }
        LiveGraphState state = states.getIfPresent(run.getExternalizableId());
        return state == null ? null : state.cachedGraph(minVersion);
    }

    public void cacheGraph(WorkflowRun run, long version, PipelineGraph graph) {
        if (disabled()) {
            return;
        }
        LiveGraphState state = states.getIfPresent(run.getExternalizableId());
        if (state != null) {
            state.cacheGraph(version, graph);
        }
    }

    public PipelineStepList cachedAllSteps(WorkflowRun run, long minVersion) {
        if (disabled()) {
            return null;
        }
        LiveGraphState state = states.getIfPresent(run.getExternalizableId());
        return state == null ? null : state.cachedAllSteps(minVersion);
    }

    public void cacheAllSteps(WorkflowRun run, long version, PipelineStepList steps) {
        if (disabled()) {
            return;
        }
        LiveGraphState state = states.getIfPresent(run.getExternalizableId());
        if (state != null) {
            state.cacheAllSteps(version, steps);
        }
    }

    private static String keyFor(FlowExecution execution) {
        try {
            Object exec = execution.getOwner().getExecutable();
            if (exec instanceof WorkflowRun run) {
                return run.getExternalizableId();
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }
}
