package io.jenkins.plugins.pipelinegraphview.livestate;

import edu.umd.cs.findbugs.annotations.NonNull;
import hudson.Extension;
import org.jenkinsci.plugins.workflow.flow.FlowExecution;
import org.jenkinsci.plugins.workflow.flow.FlowExecutionListener;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Creates {@link LiveGraphState} entries at execution start / resume and evicts them on
 * completion. Without this, entries are still created lazily by {@link LiveGraphPopulator}
 * on first {@code onNewHead}, but {@code onResumed} guarantees the catch-up scan happens
 * once up-front rather than at the first event after restart.
 */
@Extension
public class LiveGraphLifecycle extends FlowExecutionListener {

    private static final Logger logger = LoggerFactory.getLogger(LiveGraphLifecycle.class);

    @Override
    public void onRunning(@NonNull FlowExecution execution) {
        try {
            LiveGraphRegistry.get().getOrCreate(execution);
        } catch (Throwable t) {
            logger.warn("onRunning failed", t);
        }
    }

    @Override
    public void onResumed(@NonNull FlowExecution execution) {
        try {
            LiveGraphState state = LiveGraphRegistry.get().getOrCreate(execution);
            if (state != null) {
                LiveGraphPopulator.catchUp(execution, state);
            }
        } catch (Throwable t) {
            logger.warn("onResumed failed", t);
        }
    }

    @Override
    public void onCompleted(@NonNull FlowExecution execution) {
        try {
            LiveGraphRegistry.get().remove(execution);
        } catch (Throwable t) {
            logger.warn("onCompleted failed", t);
        }
    }
}
