package io.jenkins.plugins.pipelinegraphview.utils;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;

import hudson.model.Result;
import java.util.List;
import java.util.Optional;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.junit.Rule;
import org.junit.Test;
import org.jvnet.hudson.test.JenkinsRule;

public class PipelineGraphApiTest {

  @Rule public JenkinsRule j = new JenkinsRule();

  @Test
  public void createGraph_unstableSmokes() throws Exception {
    WorkflowRun run =
        TestUtils.createAndRunJob(
            j, "unstableSmokes", "unstableSmokes.jenkinsfile", Result.FAILURE);
    PipelineGraphApi api = new PipelineGraphApi(run);
    PipelineGraph graph = api.createGraph();

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
  public void createGraph_complexSmokes() throws Exception {
    WorkflowRun run =
        TestUtils.createAndRunJob(j, "complexSmokes", "complexSmokes.jenkinsfile", Result.SUCCESS);
    PipelineGraphApi api = new PipelineGraphApi(run);
    PipelineGraph graph = api.createGraph();

    List<PipelineStage> stages = graph.getStages();

    String stagesString =
        TestUtils.collectStagesAsString(
            stages,
            (PipelineStage stage) ->
                String.format(
                    "{%s,%s}",
                    stage.getName(), Optional.ofNullable(stage.getSeqContainerName()).orElse("-")));

    // As this is a graph view, and 'Branch C' doesn't have and steps, it doesn't get added as a
    // node.
    // Instead, its first child with steps 'Nested 1' gets added as a node, and all other children
    // get added as siblings. The 'getSeqContainerName' property of the 'Nested 1' now gets set to
    // its parent's display name ('Branch C') so the frontend can add a label.
    assertThat(
        stagesString,
        is(
            String.join(
                "",
                "{Non-Parallel Stage,-},",
                "{Parallel Stage,-}[{Branch A,-},{Branch B,-},{Nested 1,Branch C}],",
                "{Skipped stage,-},",
                "{Parallel Stage 2,-}[{Branch A,-},{Branch B,-},{Nested 1,Branch C}]")));
  }

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
}
