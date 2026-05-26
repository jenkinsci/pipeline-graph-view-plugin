package io.jenkins.plugins.pipelinegraphview.buildflow;

import edu.umd.cs.findbugs.annotations.NonNull;
import hudson.Extension;
import hudson.model.Action;
import hudson.model.Run;
import java.util.Collection;
import java.util.Collections;
import jenkins.model.TransientActionFactory;

/**
 * Registers {@link BuildFlowAction} on {@link Run} instances that have upstream or downstream builds.
 * Uses a ThreadLocal reentrance guard to prevent StackOverflow: hasUpstreamOrDownstream() calls
 * run.getAction() which triggers transient action resolution which re-calls this factory.
 * The guard breaks the recursion by returning empty on re-entry.
 */
@Extension(ordinal = Integer.MAX_VALUE - 10)
public class BuildFlowActionFactory extends TransientActionFactory<Run> {

    private static final ThreadLocal<Boolean> CREATING = ThreadLocal.withInitial(() -> false);

    @Override
    public Class<Run> type() {
        return Run.class;
    }

    @NonNull
    @Override
    public Collection<? extends Action> createFor(@NonNull Run target) {
        if (CREATING.get()) {
            return Collections.emptyList();
        }
        CREATING.set(true);
        try {
            if (BuildFlowGraph.hasUpstreamOrDownstream(target)) {
                return Collections.singleton(new BuildFlowAction(target));
            }
            return Collections.emptyList();
        } finally {
            CREATING.set(false);
        }
    }
}
