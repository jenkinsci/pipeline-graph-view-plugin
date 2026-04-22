package io.jenkins.plugins.pipelinegraphview.livestate;

import edu.umd.cs.findbugs.annotations.NonNull;
import hudson.Extension;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineGraph;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineGraphApi;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineGraphViewCache;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineStepApi;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineStepList;
import org.jenkinsci.plugins.workflow.flow.FlowExecution;
import org.jenkinsci.plugins.workflow.flow.FlowExecutionListener;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Creates {@link LiveGraphState} entries at execution start / resume and handles the
 * handoff to the on-disk cache at completion. Without the completion handoff, the first
 * HTTP read after the build finishes would fall through to a full scanner sweep — wasting
 * the work the live-state path already did.
 */
@Extension
public class LiveGraphLifecycle extends FlowExecutionListener {

    private static final Logger logger = LoggerFactory.getLogger(LiveGraphLifecycle.class);

    @Override
    public void onRunning(@NonNull FlowExecution execution) {
        try {
            // Fresh execution — no history to catch up, so mark ready immediately. The
            // listener will populate nodes as they arrive via onNewHead.
            LiveGraphState state = LiveGraphRegistry.get().getOrCreate(execution);
            if (state != null) {
                state.markReady();
            }
        } catch (Throwable t) {
            logger.warn("onRunning failed", t);
        }
    }

    @Override
    public void onResumed(@NonNull FlowExecution execution) {
        try {
            // Resume after a Jenkins restart. The execution's persisted graph may contain
            // nodes from before the restart that our in-memory state doesn't know about,
            // so catch up here (safe — this runs on a Jenkins event thread, not the CPS VM)
            // before flipping the state to ready.
            LiveGraphState state = LiveGraphRegistry.get().getOrCreate(execution);
            if (state != null) {
                LiveGraphPopulator.catchUp(execution, state);
                state.markReady();
            }
        } catch (Throwable t) {
            logger.warn("onResumed failed", t);
        }
    }

    @Override
    public void onCompleted(@NonNull FlowExecution execution) {
        try {
            WorkflowRun run = workflowRunFor(execution);
            if (run != null) {
                // Compute one last time while the live state is still in the registry; this
                // path hits the snapshot/cache rather than the scanner.
                PipelineGraph graph = new PipelineGraphApi(run).computeTree();
                PipelineStepList allSteps = new PipelineStepApi(run).computeAllSteps();
                // WorkflowRun.isBuilding() can still be true here even though FlowExecution
                // is complete; rebuild the step list with runIsComplete=true so the persisted
                // copy reflects reality. PipelineGraph.complete comes from
                // FlowExecution.isComplete() and is already correct.
                PipelineStepList finalSteps = new PipelineStepList(allSteps.steps, true);
                PipelineGraphViewCache.get().seed(run, graph, finalSteps);
            }
        } catch (Throwable t) {
            logger.warn("seeding disk cache on completion failed", t);
        } finally {
            try {
                LiveGraphRegistry.get().remove(execution);
            } catch (Throwable t) {
                logger.warn("state eviction on completion failed", t);
            }
        }
    }

    private static WorkflowRun workflowRunFor(FlowExecution execution) {
        try {
            Object exec = execution.getOwner().getExecutable();
            return exec instanceof WorkflowRun r ? r : null;
        } catch (Exception e) {
            return null;
        }
    }
}
