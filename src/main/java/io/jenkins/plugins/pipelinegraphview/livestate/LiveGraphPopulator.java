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
            // Lazy initial catch-up: if the listener is seeing nodes for an execution it's
            // never observed (plugin upgrade mid-build, Jenkins resume without onResumed
            // firing first), the early history is already in the FlowExecution's storage.
            // Backfill it once before processing this event.
            if (state.size() == 0 && !state.hasSeen(node.getId())) {
                catchUp(execution, state);
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
