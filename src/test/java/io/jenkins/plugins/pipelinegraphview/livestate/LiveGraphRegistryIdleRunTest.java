package io.jenkins.plugins.pipelinegraphview.livestate;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;

import com.github.benmanes.caffeine.cache.Cache;
import java.lang.reflect.Field;
import java.time.Duration;
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.test.steps.SemaphoreStep;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

@WithJenkins
class LiveGraphRegistryIdleRunTest {

    /*
     * A step can run for hours without adding a node or anyone viewing the run. If the run's
     * state expired in that time, the next node would recreate it without the earlier nodes, it
     * would never become ready, and every later read and the final graph would come from the
     * scanner.
     */
    @Test
    void runIdleOnALongStepKeepsItsLiveState(JenkinsRule j) throws Exception {
        WorkflowJob job = j.createProject(WorkflowJob.class);
        job.setDefinition(new CpsFlowDefinition(
                "stage('Test') { semaphore 'long' }\nstage('PostProcess') { semaphore 'post' }", true));
        WorkflowRun run = job.scheduleBuild2(0).waitForStart();
        SemaphoreStep.waitForStart("long/1", run);
        assertThat(LiveGraphRegistry.get().snapshot(run), is(notNullValue()));

        shortenAnyIdleExpiry();
        Thread.sleep(100);

        SemaphoreStep.success("long/1", null);
        SemaphoreStep.waitForStart("post/1", run);
        LiveGraphSnapshot snapshot = LiveGraphRegistry.get().snapshot(run);
        assertThat(snapshot, is(notNullValue()));
        assertThat(snapshot.nodes().stream().map(FlowNode::getDisplayName).toList(), hasItem("Test"));

        SemaphoreStep.success("post/1", null);
        j.assertBuildStatusSuccess(j.waitForCompletion(run));
    }

    /* Stands in for the run sitting idle for as long as the registry would keep its state. */
    private static void shortenAnyIdleExpiry() throws ReflectiveOperationException {
        Field field = LiveGraphRegistry.class.getDeclaredField("states");
        field.setAccessible(true);
        Cache<?, ?> states = (Cache<?, ?>) field.get(LiveGraphRegistry.get());
        states.policy().expireAfterAccess().ifPresent(e -> e.setExpiresAfter(Duration.ofMillis(1)));
        states.policy().expireAfterWrite().ifPresent(e -> e.setExpiresAfter(Duration.ofMillis(1)));
    }
}
