package io.jenkins.plugins.pipelinegraphview.livestate;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import edu.umd.cs.findbugs.annotations.CheckForNull;
import hudson.Extension;
import hudson.ExtensionList;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineGraph;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineNodeUtil;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineStepList;
import java.time.Duration;
import java.util.HashSet;
import java.util.Set;
import jenkins.util.SystemProperties;
import org.jenkinsci.plugins.workflow.flow.FlowExecution;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

/**
 * Holds one {@link LiveGraphState} per in-progress run of this Jenkins.
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
@Extension
public final class LiveGraphRegistry {

    private static final int CACHE_MAX_SIZE =
            SystemProperties.getInteger(LiveGraphRegistry.class.getName() + ".size", 512);

    public static LiveGraphRegistry get() {
        return ExtensionList.lookupSingleton(LiveGraphRegistry.class);
    }

    private final Cache<String, LiveGraphState> states = Caffeine.newBuilder()
            .maximumSize(CACHE_MAX_SIZE)
            .expireAfterAccess(Duration.ofMinutes(30))
            .build();

    public LiveGraphRegistry() {}

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
        // The key is the run's externalizable id, which is reused when a job is deleted and
        // recreated (build numbers restart). Reuse an entry only when it was populated from this
        // very execution, otherwise the new run would be served the old run's nodes.
        return states.asMap()
                .compute(
                        key,
                        (k, existing) -> existing != null && existing.belongsTo(execution)
                                ? existing
                                : new LiveGraphState(execution));
    }

    /**
     * Returns the state for this run, only if it was populated from the run's current execution.
     * A job can be deleted and recreated, so a build number (and thus externalizable id) can be
     * reused by an unrelated execution; such an entry is treated as absent.
     */
    @CheckForNull
    private LiveGraphState stateFor(WorkflowRun run) {
        return stateFor(run.getExecution());
    }

    @CheckForNull
    private LiveGraphState stateFor(@CheckForNull FlowExecution execution) {
        if (disabled() || execution == null) {
            return null;
        }
        String key = keyFor(execution);
        if (key == null) {
            return null;
        }
        LiveGraphState state = states.getIfPresent(key);
        return state != null && state.belongsTo(execution) ? state : null;
    }

    /**
     * Returns the key a cached result must match, or {@code null} if there's no usable state
     * (feature disabled, not populated, poisoned, or not yet ready). Cheap — lets callers
     * short-circuit to {@link #cachedGraph}/{@link #cachedAllSteps} without paying for a
     * full snapshot first.
     */
    @CheckForNull
    public LiveGraphCacheKey cacheKey(WorkflowRun run) {
        if (disabled()) {
            return null;
        }
        LiveGraphState state = stateFor(run);
        Long version = state == null ? null : state.currentVersion();
        return version == null ? null : new LiveGraphCacheKey(version, pausedNodeIds(run));
    }

    /** The running steps that are paused, e.g. waiting for input or a lock. */
    public static Set<String> pausedNodeIds(WorkflowRun run) {
        FlowExecution execution = run.getExecution();
        if (execution == null) {
            return Set.of();
        }
        Set<String> ids = new HashSet<>();
        for (FlowNode head : PipelineNodeUtil.currentHeads(execution)) {
            if (PipelineNodeUtil.isPaused(head)) {
                ids.add(head.getId());
            }
        }
        return ids;
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
        LiveGraphState state = stateFor(run);
        return state == null ? null : state.snapshot(run.getExecution());
    }

    void remove(FlowExecution execution) {
        String key = keyFor(execution);
        if (key != null) {
            states.asMap().computeIfPresent(key, (k, existing) -> existing.belongsTo(execution) ? null : existing);
        }
    }

    /**
     * Returns a previously-cached {@link PipelineGraph} for this run if it satisfies
     * {@code key}, otherwise {@code null}.
     */
    public PipelineGraph cachedGraph(WorkflowRun run, LiveGraphCacheKey key) {
        if (disabled()) {
            return null;
        }
        LiveGraphState state = stateFor(run);
        return state == null ? null : state.cachedGraph(key);
    }

    public void cacheGraph(WorkflowRun run, LiveGraphCacheKey key, PipelineGraph graph) {
        if (disabled()) {
            return;
        }
        LiveGraphState state = stateFor(run);
        if (state != null) {
            state.cacheGraph(key, graph);
        }
    }

    public PipelineStepList cachedAllSteps(WorkflowRun run, LiveGraphCacheKey key) {
        if (disabled()) {
            return null;
        }
        LiveGraphState state = stateFor(run);
        return state == null ? null : state.cachedAllSteps(key);
    }

    public void cacheAllSteps(WorkflowRun run, LiveGraphCacheKey key, PipelineStepList steps) {
        if (disabled()) {
            return;
        }
        LiveGraphState state = stateFor(run);
        if (state != null) {
            state.cacheAllSteps(key, steps);
        }
    }

    /**
     * Returns a per-run monitor that callers can synchronise on to dedup concurrent graph
     * rebuilds. Null when the live state isn't present (caller just computes directly).
     */
    @CheckForNull
    public Object graphComputeLock(WorkflowRun run) {
        LiveGraphState state = stateFor(run);
        return state == null ? null : state.graphComputeLock();
    }

    /** See {@link #graphComputeLock(WorkflowRun)} — the matching lock for the steps path. */
    @CheckForNull
    public Object allStepsComputeLock(WorkflowRun run) {
        LiveGraphState state = stateFor(run);
        return state == null ? null : state.allStepsComputeLock();
    }

    /**
     * Returns the {@link WarningActionCache} for this execution, or {@code null} when the
     * live state isn't present. Callers fall back to uncached scans on null.
     */
    @CheckForNull
    public WarningActionCache warningActionCache(FlowExecution execution) {
        LiveGraphState state = stateFor(execution);
        return state == null ? null : state.warningActionCache();
    }

    /**
     * Returns the {@link BlockResolutionCache} for this execution, or {@code null} when the
     * live state isn't present. Callers fall back to uncached resolution on null.
     */
    @CheckForNull
    public BlockResolutionCache blockResolutionCache(FlowExecution execution) {
        LiveGraphState state = stateFor(execution);
        return state == null ? null : state.blockResolutionCache();
    }

    /**
     * Returns the {@link SkippedStageCache} for this execution, or {@code null} when the live
     * state isn't present. Callers fall back to uncached action-list walks on null.
     */
    @CheckForNull
    public SkippedStageCache skippedStageCache(FlowExecution execution) {
        LiveGraphState state = stateFor(execution);
        return state == null ? null : state.skippedStageCache();
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
