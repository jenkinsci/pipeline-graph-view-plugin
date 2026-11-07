package io.jenkins.plugins.pipelinegraphview.utils;

import static org.awaitility.Awaitility.await;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.nullValue;

import hudson.model.User;
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.support.steps.input.InputAction;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

@WithJenkins
class PipelineInputStepTest {

    private JenkinsRule j;

    @BeforeEach
    void setUp(JenkinsRule j) {
        this.j = j;
        User.getById("alice", true).setFullName("Alice Smith");
    }

    @Test
    void namesUsersAndKeepsOtherSubmittersAsWritten() {
        assertThat(
                PipelineInputStep.approvers("alice, release-team ,alice,, "), contains("Alice Smith", "release-team"));
    }

    @Test
    void hasNoApproversWhenAnyoneWhoCanBuildCanApprove() {
        assertThat(PipelineInputStep.approvers(null), nullValue());
        assertThat(PipelineInputStep.approvers(" , "), nullValue());
    }

    @Test
    void graphSaysWhoCanApproveAPausedInput() throws Exception {
        WorkflowJob job = j.createProject(WorkflowJob.class, "approvers");
        job.setDefinition(new CpsFlowDefinition("""
                pipeline {
                    agent none
                    stages {
                        stage('Release') {
                            steps { input message: 'Release?', submitter: 'alice,release-team' }
                        }
                    }
                }
                """, true));
        WorkflowRun run = job.scheduleBuild2(0).waitForStart();
        await().until(() -> run.getAction(InputAction.class) != null
                && !run.getAction(InputAction.class).getExecutions().isEmpty());

        PipelineGraphApi api = new PipelineGraphApi(run);
        PipelineInputStep input = await().until(
                        () -> api.createTree().stages.stream()
                                .filter(stage -> stage.name.equals("Release"))
                                .findFirst()
                                .map(PipelineStage::getInputStep)
                                .orElse(null),
                        step -> step != null);

        assertThat(input.approvers(), contains("Alice Smith", "release-team"));
    }
}
