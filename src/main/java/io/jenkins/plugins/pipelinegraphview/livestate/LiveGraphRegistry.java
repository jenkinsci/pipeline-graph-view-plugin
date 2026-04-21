package io.jenkins.plugins.pipelinegraphview.livestate;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import java.time.Duration;
import jenkins.util.SystemProperties;
import org.jenkinsci.plugins.workflow.flow.FlowExecution;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

/**
 * Singleton holding one {@link LiveGraphState} per in-progress run.
 * Entries are created on demand by the listener / lifecycle code, removed on completion,
 * and otherwise bounded by a Caffeine LRU so abandoned entries (deleted runs, listener
 * bugs) don't leak.
 */
public final class LiveGraphRegistry {

    private static final LiveGraphRegistry INSTANCE = new LiveGraphRegistry();

    public static LiveGraphRegistry get() {
        return INSTANCE;
    }

    private final Cache<String, LiveGraphState> states = Caffeine.newBuilder()
            .maximumSize(256)
            .expireAfterAccess(Duration.ofMinutes(30))
            .build();

    LiveGraphRegistry() {}

    /**
     * Escape hatch. Setting this system property to {@code false} makes
     * {@link #snapshot(WorkflowRun)} always return {@code null}, forcing callers to use the
     * scanner fallback. Useful if a regression lands in the live-state path.
     */
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
        return states.get(key, LiveGraphState::new);
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
