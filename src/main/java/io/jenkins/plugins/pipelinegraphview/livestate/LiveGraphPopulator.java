package io.jenkins.plugins.pipelinegraphview.livestate;

import hudson.Extension;
import org.jenkinsci.plugins.workflow.flow.FlowExecution;
import org.jenkinsci.plugins.workflow.flow.GraphListener;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.graphanalysis.DepthFirstScanner;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Extension that captures every new {@link FlowNode} across every running execution and
 * feeds it to the corresponding {@link LiveGraphState}. The downstream {@code PipelineGraphApi}
 * path reads a snapshot of that state instead of walking the whole execution each time.
 *
 * <p>We use {@link GraphListener.Synchronous} rather than the async variant because callers
 * expect "once a node is a head, the next API read reflects it" — async delivery creates a
 * lag window where the snapshot is behind the execution, which breaks tests that check state
 * at precise trigger points and would surprise anyone hitting the REST API after an event.
 * The work done under the monitor is trivial ({@code ArrayList}/{@code HashSet} additions),
 * so the CPS VM thread is not meaningfully blocked. Every code path is still wrapped in
 * try/catch and poisons the state on failure so a bug here can never disrupt a build.
 *
 * <p>The javadoc also forbids blocking work here, which rules out any {@code DepthFirstScanner}
 * catch-up walk inside this method. {@link LiveGraphState} starts unready and is only
 * marked ready by {@link LiveGraphLifecycle} (on an event thread, not the CPS VM). If
 * {@code onNewHead} fires for an execution the lifecycle never saw (e.g. plugin installed
 * mid-build), the state stays unready, {@code snapshot()} keeps returning {@code null},
 * and HTTP readers fall back to the scanner for the remainder of that run.
 */
@Extension
public class LiveGraphPopulator implements GraphListener.Synchronous {

    private static final Logger logger = LoggerFactory.getLogger(LiveGraphPopulator.class);

    @Override
    public void onNewHead(FlowNode node) {
        LiveGraphState state = null;
        try {
            FlowExecution execution = node.getExecution();
            state = LiveGraphRegistry.get().getOrCreate(execution);
            if (state == null) {
                return; // feature disabled or execution not a WorkflowRun
            }
            state.addNode(node);
        } catch (Throwable t) {
            // A thrown exception here propagates into the CPS VM and can abort the build.
            // Poison the state so subsequent reads fall back to the scanner; log the failure
            // but never rethrow.
            logger.warn("live state failed; falling back to scanner", t);
            if (state != null) {
                state.poison();
            }
        }
    }

    /**
     * Backfills the live state from the execution's persisted graph. Called only from
     * {@link LiveGraphLifecycle#onResumed}, which runs on a Jenkins event thread — never
     * from a {@link GraphListener.Synchronous} path on the CPS VM.
     */
    static void catchUp(FlowExecution execution, LiveGraphState state) {
        try {
            DepthFirstScanner scanner = new DepthFirstScanner();
            scanner.setup(execution.getCurrentHeads());
            for (FlowNode existing : scanner) {
                state.addNode(existing);
            }
        } catch (Throwable t) {
            logger.warn("catch-up failed; poisoning state", t);
            state.poison();
        }
    }
}
