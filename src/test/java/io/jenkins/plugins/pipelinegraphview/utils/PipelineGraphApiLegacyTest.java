package io.jenkins.plugins.pipelinegraphview.utils;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;

import hudson.model.Result;
import java.util.List;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.Issue;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

@WithJenkins
class PipelineGraphApiLegacyTest {

    @Test
    void createLegacyTree_unstableSmokes(JenkinsRule j) throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(j, "unstableSmokes", "unstableSmokes.jenkinsfile", Result.FAILURE);
        PipelineGraphApi api = new PipelineGraphApi(run);
        PipelineGraph graph = api.createLegacyTree();

        List<PipelineStage> stages = graph.getStages();

        String stagesString = TestUtils.collectStagesAsString(
                stages,
                (PipelineStage stage) -> String.format(
                        "{%s,%s,%s,%s}", stage.getName(), stage.getTitle(), stage.getType(), stage.getState()));
        assertThat(
                stagesString,
                is(String.join(
                        "",
                        "{unstable-one,unstable-one,STAGE,unstable},",
                        "{success,success,STAGE,success},",
                        "{unstable-two,unstable-two,STAGE,unstable},",
                        "{failure,failure,STAGE,failure}")));

        PipelineGraph newGraph = api.createShallowTree();
        String newStagesString = TestUtils.collectStagesAsString(
                newGraph.getStages(),
                (PipelineStage stage) -> String.format(
                        "{%s,%s,%s,%s}", stage.getName(), stage.getTitle(), stage.getType(), stage.getState()));
        assertThat(newStagesString, is(stagesString));
    }

    @Test
    void createLegacyTree_complexSmokes(JenkinsRule j) throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(j, "complexSmokes", "complexSmokes.jenkinsfile", Result.SUCCESS);
        PipelineGraphApi api = new PipelineGraphApi(run);
        PipelineGraph graph = api.createLegacyTree();

        List<PipelineStage> stages = graph.getStages();

        String stagesString = TestUtils.collectStagesAsString(stages, PipelineStage::getName);

        // Compare to old result.
        assertThat(
                stagesString,
                is(String.join(
                        "",
                        "Non-Parallel Stage,",
                        "Parallel Stage[Branch A,Branch B,Branch C[Nested 1,Nested 2]],",
                        "Skipped stage,",
                        "Parallel Stage 2[Branch A,Branch B,Branch C[Nested 1,Nested 2]]")));

        // Compare to new implmentation.
        PipelineGraph newGraph = api.createShallowTree();
        String newStagesString = TestUtils.collectStagesAsString(newGraph.getStages(), PipelineStage::getName);
        assertThat(newStagesString, is(stagesString));
    }

    @Test
    void createLegacyTree_scriptedParallel(JenkinsRule j) throws Exception {
        WorkflowRun run =
                TestUtils.createAndRunJob(j, "scriptedParallel", "scriptedParallel.jenkinsfile", Result.SUCCESS);
        PipelineGraphApi api = new PipelineGraphApi(run);
        PipelineGraph graph = api.createLegacyTree();

        List<PipelineStage> stages = graph.getStages();

        // Compare to old result.
        String stagesString = TestUtils.collectStagesAsString(stages, PipelineStage::getName);
        assertThat(stagesString, is("A,Parallel[B[BA,BB],C[CA,CB]],D[E[EA,EB],F[FA,FB]],G"));

        // Compare to new implmentation.
        PipelineGraph newGraph = api.createShallowTree();
        String newStagesString = TestUtils.collectStagesAsString(newGraph.getStages(), PipelineStage::getName);
        assertThat(newStagesString, is(stagesString));
    }

    @Issue("GH#85")
    @Test
    void createLegacyTree_syntheticStages(JenkinsRule j) throws Exception {
        WorkflowRun run =
                TestUtils.createAndRunJob(j, "syntheticStages", "syntheticStages.jenkinsfile", Result.SUCCESS);
        PipelineGraphApi api = new PipelineGraphApi(run);
        PipelineGraph graph = api.createLegacyTree();

        List<PipelineStage> stages = graph.getStages();

        // Compare to old result.
        String stagesString = TestUtils.collectStagesAsString(
                stages,
                (PipelineStage stage) ->
                        String.format("{%s,%s}", stage.getName(), stage.isSynthetic() ? "true" : "false"));
        assertThat(
                stagesString,
                is(String.join(
                        "", "{Checkout SCM,true},", "{Stage 1,false},", "{Stage 2,false},", "{Post Actions,true}")));

        // Compare to new implmentation.
        PipelineGraph newGraph = api.createShallowTree();
        String newStagesString = TestUtils.collectStagesAsString(
                newGraph.getStages(),
                (PipelineStage stage) ->
                        String.format("{%s,%s}", stage.getName(), stage.isSynthetic() ? "true" : "false"));
        assertThat(newStagesString, is(stagesString));
    }

    @Issue("GH#87")
    @Test
    void createLegacyTree_skippedParallel(JenkinsRule j) throws Exception {
        WorkflowRun run =
                TestUtils.createAndRunJob(j, "skippedParallel", "skippedParallel.jenkinsfile", Result.SUCCESS);
        PipelineGraphApi api = new PipelineGraphApi(run);
        PipelineGraph graph = api.createLegacyTree();

        List<PipelineStage> stages = graph.getStages();

        // Compare to old result.
        String stagesString = TestUtils.collectStagesAsString(
                stages, (PipelineStage stage) -> String.format("{%s,%s}", stage.getName(), stage.getState()));
        assertThat(stagesString, is("{Stage 1,success},{Parallel stage,skipped},{Stage 2,success}"));

        // Compare to new implmentation.
        PipelineGraph newGraph = api.createShallowTree();
        String newStagesString = TestUtils.collectStagesAsString(
                newGraph.getStages(),
                (PipelineStage stage) -> String.format("{%s,%s}", stage.getName(), stage.getState()));
        assertThat(newStagesString, is(stagesString));
    }

    @Issue("GH#616")
    @Test
    void createLegacyTree_stageResult(JenkinsRule j) throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "gh616_stageResult", "gh616_stageResult.jenkinsfile", Result.UNSTABLE, false);
        PipelineGraphApi api = new PipelineGraphApi(run);
        PipelineGraph graph = api.createLegacyTree();

        List<PipelineStage> stages = graph.getStages();

        String stagesString = TestUtils.collectStagesAsString(
                stages,
                (PipelineStage stage) -> String.format(
                        "{%s,%s,%s,%s}", stage.getName(), stage.getTitle(), stage.getType(), stage.getState()));
        assertThat(
                stagesString,
                is(String.join(
                        "",
                        "{success-stage,success-stage,STAGE,success},",
                        "{failure-stage,failure-stage,STAGE,failure},",
                        "{unstable-stage,unstable-stage,STAGE,unstable}")));
    }
}
