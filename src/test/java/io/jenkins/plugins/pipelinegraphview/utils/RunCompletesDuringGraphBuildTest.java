package io.jenkins.plugins.pipelinegraphview.utils;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.is;

import edu.umd.cs.findbugs.annotations.NonNull;
import hudson.model.Action;
import hudson.model.Result;
import java.util.Collection;
import java.util.List;
import org.jenkinsci.plugins.pipeline.modeldefinition.actions.ExecutionModelAction;
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.test.steps.SemaphoreStep;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.TestExtension;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

@WithJenkins
class RunCompletesDuringGraphBuildTest {

    /**
     * The tree scanner looks this action up after the live snapshot has been taken and before
     * the graph is assembled, so finishing the run here lands in the window between the two.
     */
    @TestExtension("graphIsNotCompleteWhileItsStagesWereResolvedAsRunning")
    public static class FinishRunWhileBuildingGraph extends jenkins.model.TransientActionFactory<WorkflowRun> {
        static volatile Thread requestThread;
        static volatile JenkinsRule j;

        @Override
        public Class<WorkflowRun> type() {
            return WorkflowRun.class;
        }

        @Override
        public Class<ExecutionModelAction> actionType() {
            return ExecutionModelAction.class;
        }

        @NonNull
        @Override
        public Collection<? extends Action> createFor(@NonNull WorkflowRun run) {
            if (Thread.currentThread() == requestThread) {
                requestThread = null;
                try {
                    SemaphoreStep.success("wait/1", null);
                    j.waitForCompletion(run);
                } catch (Exception e) {
                    throw new AssertionError(e);
                }
            }
            return List.of();
        }
    }

    @Test
    void graphIsNotCompleteWhileItsStagesWereResolvedAsRunning(JenkinsRule j) throws Exception {
        WorkflowJob job = j.createProject(WorkflowJob.class, "finishing");
        job.setDefinition(
                new CpsFlowDefinition("stage('one') { echo 'one' }\nstage('two') { semaphore 'wait' }", true));
        WorkflowRun run = job.scheduleBuild2(0).waitForStart();
        SemaphoreStep.waitForStart("wait/1", run);

        FinishRunWhileBuildingGraph.j = j;
        FinishRunWhileBuildingGraph.requestThread = Thread.currentThread();
        PipelineGraph graph = new PipelineGraphApi(run).computeTree();

        assertThat(run.isBuilding(), is(false));
        List<PipelineState> states =
                graph.stages.stream().map(PipelineStage::getState).toList();
        // The frontend stops polling once a response is complete, so a complete response must
        // not carry a stage that is still running.
        assertThat(
                "complete=" + graph.complete + " states=" + states,
                graph.complete && states.stream().anyMatch(PipelineState::isInProgress),
                is(false));

        j.assertBuildStatus(Result.SUCCESS, run);
        PipelineGraph finalGraph = new PipelineGraphApi(run).createTree();
        assertThat(finalGraph.complete, is(true));
        assertThat(
                finalGraph.stages.stream().map(PipelineStage::getState).toList(),
                contains(PipelineState.SUCCESS, PipelineState.SUCCESS));
    }
}
