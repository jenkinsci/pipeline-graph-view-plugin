package io.jenkins.plugins.pipelinegraphview.utils;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;

import hudson.model.Result;
import java.util.List;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.junit.Rule;
import org.junit.Test;
import org.jvnet.hudson.test.Issue;
import org.jvnet.hudson.test.JenkinsRule;

public class PipelineGraphApiTest {

  @Rule public JenkinsRule j = new JenkinsRule();

  @Test
  public void createTree_unstableSmokes() throws Exception {
    WorkflowRun run =
        TestUtils.createAndRunJob(
            j, "unstableSmokes", "unstableSmokes.jenkinsfile", Result.FAILURE);
    PipelineGraphApi api = new PipelineGraphApi(run);
    PipelineGraph graph = api.createTree();

    List<PipelineStage> stages = graph.getStages();

    String stagesString =
        TestUtils.collectStagesAsString(
            stages,
            (PipelineStage stage) ->
                String.format(
                    "{%d,%s,%s,%s,%s}",
                    stage.getCompletePercent(),
                    stage.getName(),
                    stage.getTitle(),
                    stage.getType(),
                    stage.getState()));
    assertThat(
        stagesString,
        is(
            String.join(
                "",
                "{50,unstable-one,unstable-one,STAGE,UNSTABLE},",
                "{50,success,success,STAGE,SUCCESS},",
                "{50,unstable-two,unstable-two,STAGE,UNSTABLE},",
                "{50,failure,failure,STAGE,FAILURE}")));
  }

  @Test
  public void createTree_complexSmokes() throws Exception {
    WorkflowRun run =
        TestUtils.createAndRunJob(j, "complexSmokes", "complexSmokes.jenkinsfile", Result.SUCCESS);
    PipelineGraphApi api = new PipelineGraphApi(run);
    PipelineGraph graph = api.createTree();

    List<PipelineStage> stages = graph.getStages();

    String stagesString = TestUtils.collectStagesAsString(stages, PipelineStage::getName);
    assertThat(
        stagesString,
        is(
            String.join(
                "",
                "Non-Parallel Stage,",
                "Parallel Stage[Branch A,Branch B,Branch C[Nested 1,Nested 2]],",
                "Skipped stage,",
                "Parallel Stage 2[Branch A,Branch B,Branch C[Nested 1,Nested 2]]")));
  }

  @Test
  public void createTree_scriptedParallel() throws Exception {
    WorkflowRun run =
        TestUtils.createAndRunJob(
            j, "scriptedParallel", "scriptedParallel.jenkinsfile", Result.SUCCESS);
    PipelineGraphApi api = new PipelineGraphApi(run);
    PipelineGraph graph = api.createTree();

    List<PipelineStage> stages = graph.getStages();

    String stagesString = TestUtils.collectStagesAsString(stages, PipelineStage::getName);
    assertThat(stagesString, is("A,Parallel[B[BA,BB],C[CA,CB]],D[E[EA,EB],F[FA,FB]],G"));
  }

  @Issue("GH#85")
  @Test
  public void createTree_syntheticStages() throws Exception {
    WorkflowRun run =
        TestUtils.createAndRunJob(
            j, "syntheticStages", "syntheticStages.jenkinsfile", Result.SUCCESS);
    PipelineGraphApi api = new PipelineGraphApi(run);
    PipelineGraph graph = api.createTree();

    List<PipelineStage> stages = graph.getStages();

    String stagesString =
        TestUtils.collectStagesAsString(
            stages,
            (PipelineStage stage) ->
                String.format("{%s,%s}", stage.getName(), stage.isSynthetic() ? "true" : "false"));
    assertThat(
        stagesString,
        is(
            String.join(
                "",
                "{Checkout SCM,true},",
                "{Stage 1,false},",
                "{Stage 2,false},",
                "{Post Actions,true}")));
  }

  @Issue("GH#87")
  @Test
  public void createTree_skippedParallel() throws Exception {
    WorkflowRun run =
        TestUtils.createAndRunJob(
            j, "skippedParallel", "skippedParallel.jenkinsfile", Result.SUCCESS);
    PipelineGraphApi api = new PipelineGraphApi(run);
    PipelineGraph graph = api.createTree();

    List<PipelineStage> stages = graph.getStages();

    String stagesString =
        TestUtils.collectStagesAsString(
            stages,
            (PipelineStage stage) -> String.format("{%s,%s}", stage.getName(), stage.getState()));
    assertThat(stagesString, is("{Stage 1,SUCCESS},{Parallel stage,skipped},{Stage 2,SUCCESS}"));
  }
}
