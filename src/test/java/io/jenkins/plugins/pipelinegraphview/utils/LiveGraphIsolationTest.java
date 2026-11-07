package io.jenkins.plugins.pipelinegraphview.utils;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.contains;

import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.test.steps.SemaphoreStep;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.RepetitionInfo;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

@WithJenkins
class LiveGraphIsolationTest {

    /**
     * Each repetition gets its own Jenkins, whose in-progress run has the same id as the
     * previous one's, so live state kept beyond a Jenkins would be served for the wrong run.
     */
    @RepeatedTest(2)
    void liveStateBelongsToItsJenkins(JenkinsRule j, RepetitionInfo repetition) throws Exception {
        String stage = "Waiting " + repetition.getCurrentRepetition();
        WorkflowJob job = j.createProject(WorkflowJob.class, "same-name");
        job.setDefinition(new CpsFlowDefinition("stage('" + stage + "') { semaphore 'wait' }", true));
        WorkflowRun run = job.scheduleBuild2(0).waitForStart();
        SemaphoreStep.waitForStart("wait/1", run);

        assertThat(
                new PipelineGraphApi(run)
                        .createTree().stages.stream()
                                .map(AbstractPipelineNode::getName)
                                .toList(),
                contains(stage));
    }
}
