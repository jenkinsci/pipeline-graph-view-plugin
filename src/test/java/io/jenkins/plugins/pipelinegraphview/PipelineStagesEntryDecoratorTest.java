package io.jenkins.plugins.pipelinegraphview;

import static org.awaitility.Awaitility.await;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.oneOf;
import static org.hamcrest.Matchers.startsWith;

import hudson.model.Result;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineGraphApi;
import io.jenkins.plugins.pipelinegraphview.utils.TestUtils;
import java.util.List;
import java.util.Map;
import java.util.stream.StreamSupport;
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.support.steps.input.InputAction;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@WithJenkins
class PipelineStagesEntryDecoratorTest {

    private JenkinsRule j;

    @BeforeEach
    void setUp(JenkinsRule j) {
        this.j = j;
    }

    @Test
    void keepsChildrenOfMatrixStages() throws Exception {
        JsonNode stages = historyPageStages("matrix", "matrix.jenkinsfile");

        assertThat(stages.size(), is(1));
        JsonNode matrix = stages.get(0);
        assertThat(matrix.path("name").asString(), is("BuildAndTest"));
        assertThat(matrix.path("children").size(), is(12));
        for (JsonNode branch : matrix.path("children")) {
            assertThat(branch.path("type").asString(), is("PARALLEL"));
            assertThat(branch.path("name").asString(), startsWith("Matrix - PLATFORM = "));
            assertThat(names(branch.path("children")), contains("Build", "Test"));
        }
    }

    @Test
    void dropsChildrenOfOtherStages() throws Exception {
        JsonNode stages = historyPageStages("parallel", "complexParallelSmokes.jenkinsfile");

        assertThat(names(stages), hasSize(3));
        for (JsonNode stage : stages) {
            assertThat(stage.has("children"), is(false));
            assertThat(stage.has("type"), is(false));
        }
    }

    @Test
    void gathersPendingInputOfNestedStagesOntoTopLevelStage() throws Exception {
        WorkflowJob job = j.createProject(WorkflowJob.class, "parallelInput");
        job.setDefinition(new CpsFlowDefinition("""
                pipeline {
                    agent any
                    stages {
                        stage('Sign-off') {
                            parallel {
                                stage('QA') { steps { input id: 'QA', message: 'QA sign-off?' } }
                                stage('Security') {
                                    stages {
                                        stage('Security approval') { steps { input id: 'Sec', message: 'Security approves?' } }
                                    }
                                }
                            }
                        }
                    }
                }
                """, true));
        WorkflowRun run = job.scheduleBuild2(0).waitForStart();
        PipelineGraphApi api = new PipelineGraphApi(run);

        JsonNode signOff = await().until(
                        () -> JsonMapper.builder()
                                .build()
                                .readTree(PipelineStagesEntryDecorator.toHistoryPageJson(
                                        api.createTree(), null, Map.of()))
                                .path("stages")
                                .get(0),
                        stage -> stage != null && stage.path("pendingInputs").size() == 2);

        assertThat(signOff.path("name").asString(), is("Sign-off"));
        assertThat(signOff.path("state").asString(), is("paused"));
        assertThat(signOff.has("children"), is(false));
        assertThat(signOff.has("inputStep"), is(false));
        List<String> stageNames = StreamSupport.stream(
                        signOff.path("pendingInputs").spliterator(), false)
                .map(pending -> pending.path("stageName").asString())
                .toList();
        assertThat(stageNames, containsInAnyOrder("QA", "Security approval"));
        for (JsonNode pending : signOff.path("pendingInputs")) {
            assertThat(pending.path("input").path("id").asString(), is(oneOf("QA", "Sec")));
        }

        InputAction inputAction = run.getAction(InputAction.class);
        inputAction.getExecution("QA").proceed(null);
        inputAction.getExecution("Sec").proceed(null);
        j.assertBuildStatusSuccess(j.waitForCompletion(run));
    }

    private JsonNode historyPageStages(String jobName, String jenkinsFile) throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(j, jobName, jenkinsFile, Result.SUCCESS);
        String json =
                PipelineStagesEntryDecorator.toHistoryPageJson(new PipelineGraphApi(run).createTree(), null, Map.of());
        return JsonMapper.builder().build().readTree(json).path("stages");
    }

    private static List<String> names(JsonNode stages) {
        return StreamSupport.stream(stages.spliterator(), false)
                .map(stage -> stage.path("name").asString())
                .toList();
    }
}
