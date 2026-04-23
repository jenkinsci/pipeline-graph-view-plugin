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
 * Creates and readies {@link LiveGraphState} entries at execution start / resume, and
 * hands the final graph off to the on-disk cache at completion so the first post-build
 * read doesn't need a fresh scanner sweep.
 */
@Extension
public class LiveGraphLifecycle extends FlowExecutionListener {

    private static final Logger logger = LoggerFactory.getLogger(LiveGraphLifecycle.class);

    @Override
    public void onRunning(@NonNull FlowExecution execution) {
        try {
            // Fresh execution — no prior nodes to catch up.
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
            // Resumed after a Jenkins restart: the execution's persisted graph already holds
            // nodes we never saw live. Running here (not on the CPS VM) makes a scanner walk
            // safe.
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
                PipelineGraph graph = new PipelineGraphApi(run).computeTree();
                PipelineStepList allSteps = new PipelineStepApi(run).computeAllSteps();
                // WorkflowRun.isBuilding() can still be true here even though FlowExecution
                // is complete; rebuild with runIsComplete=true so the persisted copy matches
                // reality. PipelineGraph.complete already reflects FlowExecution.isComplete().
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
