package io.jenkins.plugins.pipelinegraphview.utils;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.nullValue;

import io.jenkins.plugins.pipelinegraphview.livestate.LiveGraphRegistry;
import io.jenkins.plugins.pipelinegraphview.treescanner.PipelineNodeGraphAdapter;
import java.lang.reflect.Constructor;
import java.util.Map;
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition;
import org.jenkinsci.plugins.workflow.cps.CpsFlowExecution;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.test.steps.SemaphoreStep;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

/**
 * {@code CpsFlowExecution.start()} registers its first flow head before giving it a start node, so a
 * request that lands just after the build starts sees a {@code null} entry in
 * {@code getCurrentHeads()}. The window is too short to hit reliably, so these tests add a head with
 * no node to a running execution to recreate that state.
 */
@WithJenkins
class StartingRunHeadsTest {

    @Test
    void graphCanBeBuiltWhileAHeadHasNoNode(JenkinsRule j) throws Exception {
        WorkflowJob job = j.createProject(WorkflowJob.class, "starting");
        job.setDefinition(new CpsFlowDefinition("stage('Build') { semaphore 'wait' }", true));
        WorkflowRun run = job.scheduleBuild2(0).waitForStart();
        SemaphoreStep.waitForStart("wait/1", run);
        CpsFlowExecution execution = (CpsFlowExecution) run.getExecution();

        Object emptyHead = addHeadWithoutNode(execution);
        try {
            assertThat(execution.getCurrentHeads(), hasItem(nullValue()));

            PipelineNodeGraphAdapter adapter = new PipelineNodeGraphAdapter(run);
            assertThat(
                    adapter.getPipelineNodes().stream()
                            .map(FlowNodeWrapper::getDisplayName)
                            .toList(),
                    contains("Build"));
            new PipelineGraphApi(run).createTree();
            LiveGraphRegistry.pausedNodeIds(run);
        } finally {
            removeHead(execution, emptyHead);
        }

        SemaphoreStep.success("wait/1", null);
        j.assertBuildStatusSuccess(j.waitForCompletion(run));
    }

    private static Object addHeadWithoutNode(CpsFlowExecution execution) throws Exception {
        Class<?> flowHeadClass = Class.forName(
                "org.jenkinsci.plugins.workflow.cps.FlowHead", true, CpsFlowExecution.class.getClassLoader());
        Constructor<?> constructor = flowHeadClass.getDeclaredConstructor(CpsFlowExecution.class, int.class);
        constructor.setAccessible(true);
        Object head = constructor.newInstance(execution, Integer.MAX_VALUE);
        synchronized (execution) {
            heads(execution).put(Integer.MAX_VALUE, head);
        }
        return head;
    }

    private static void removeHead(CpsFlowExecution execution, Object head) throws Exception {
        synchronized (execution) {
            heads(execution).values().remove(head);
        }
    }

    @SuppressWarnings("unchecked")
    private static Map<Integer, Object> heads(CpsFlowExecution execution) throws Exception {
        var field = CpsFlowExecution.class.getDeclaredField("heads");
        field.setAccessible(true);
        return (Map<Integer, Object>) field.get(execution);
    }
}
