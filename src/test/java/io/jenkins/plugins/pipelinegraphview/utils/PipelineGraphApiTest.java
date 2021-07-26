package io.jenkins.plugins.pipelinegraphview.utils;

import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import hudson.model.Result;
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.junit.Rule;
import org.junit.Test;
import org.jvnet.hudson.test.JenkinsRule;

import java.net.URL;
import java.util.List;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;

public class PipelineGraphApiTest {

    @Rule
    public JenkinsRule j = new JenkinsRule();


    @Test
    public void createGraph_unstableSmokes() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(j, "unstableSmokes", "unstableSmokes.jenkinsfile", Result.FAILURE);
        PipelineGraphApi api = new PipelineGraphApi(run);
        PipelineGraph graph = api.createGraph();

        List<PipelineStage> stages = graph.getStages();
        assertThat(stages, hasSize(4));
        PipelineStage pipelineStage = stages.get(0);

        assertThat(pipelineStage.getCompletePercent(), is(50));
        assertThat(pipelineStage.getName(), is("unstable-one"));
        assertThat(pipelineStage.getTitle(), is("unstable-one"));
        assertThat(pipelineStage.getType(), is("STAGE"));
        assertThat(pipelineStage.getState(), is("UNSTABLE"));

        pipelineStage = stages.get(1);

        assertThat(pipelineStage.getCompletePercent(), is(50));
        assertThat(pipelineStage.getName(), is("success"));
        assertThat(pipelineStage.getTitle(), is("success"));
        assertThat(pipelineStage.getType(), is("STAGE"));
        assertThat(pipelineStage.getState(), is("SUCCESS"));

        pipelineStage = stages.get(2);

        assertThat(pipelineStage.getCompletePercent(), is(50));
        assertThat(pipelineStage.getName(), is("unstable-two"));
        assertThat(pipelineStage.getTitle(), is("unstable-two"));
        assertThat(pipelineStage.getType(), is("STAGE"));
        assertThat(pipelineStage.getState(), is("UNSTABLE"));

        pipelineStage = stages.get(3);

        assertThat(pipelineStage.getCompletePercent(), is(50));
        assertThat(pipelineStage.getName(), is("failure"));
        assertThat(pipelineStage.getTitle(), is("failure"));
        assertThat(pipelineStage.getType(), is("STAGE"));
        assertThat(pipelineStage.getState(), is("FAILURE"));
    }

    @Test
    public void createGraph_complexSmokes() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(j, "complexSmokes", "complexSmokes.jenkinsfile", Result.SUCCESS);
        PipelineGraphApi api = new PipelineGraphApi(run);
        PipelineGraph graph = api.createGraph();

        List<PipelineStage> stages = graph.getStages();
        assertThat(stages, hasSize(4));

        // Top level stages
        // Non-Parallel Stage
        PipelineStage pipelineStage = stages.get(0);
        assertThat(pipelineStage.getName(), is("Non-Parallel Stage"));

        List<PipelineStage> children = pipelineStage.getChildren();
        assertThat(children, hasSize(0));

        // Parallel Stage
        pipelineStage = stages.get(1);
        assertThat(pipelineStage.getName(), is("Parallel Stage"));

        children = pipelineStage.getChildren();
        assertThat(children, hasSize(3));

        // Parallel Stage - children
        PipelineStage child = children.get(0);
        assertThat(child.getName(), is("Branch A"));
        
        child = children.get(1);
        assertThat(child.getName(), is("Branch B"));

        // As this is a graph view, and Branch C doesn't have and steps, it doesn't get added as a node.
        // Instead it's first child with steps 'Nested 1' gets added as a node, and all other children
        // get added add siblings. The 'getSeqContainerName' property of the Nested 1 noe gets set to it's
        // parent's display name ('Branch C') so the frontend can add a lable.
        child = children.get(2);
        assertThat(child.getName(), is("Nested 1"));
        assertThat(child.getSeqContainerName(), is("Branch C"));

        PipelineStage sibling = child.getNextSibling();
        assertThat(sibling.getName(), is("Nested 2"));

        // Skipped stage
        pipelineStage = stages.get(2);
        assertThat(pipelineStage.getName(), is("Skipped stage"));

        children = pipelineStage.getChildren();
        assertThat(children, hasSize(0));
    }


    @Test
    public void createTree_unstableSmokes() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(j, "unstableSmokes", "unstableSmokes.jenkinsfile", Result.FAILURE);
        PipelineGraphApi api = new PipelineGraphApi(run);
        PipelineGraph graph = api.createTree();

        List<PipelineStage> stages = graph.getStages();
        assertThat(stages, hasSize(4));
        PipelineStage pipelineStage = stages.get(0);

        assertThat(pipelineStage.getCompletePercent(), is(50));
        assertThat(pipelineStage.getName(), is("unstable-one"));
        assertThat(pipelineStage.getTitle(), is("unstable-one"));
        assertThat(pipelineStage.getType(), is("STAGE"));
        assertThat(pipelineStage.getState(), is("UNSTABLE"));

        pipelineStage = stages.get(1);

        assertThat(pipelineStage.getCompletePercent(), is(50));
        assertThat(pipelineStage.getName(), is("success"));
        assertThat(pipelineStage.getTitle(), is("success"));
        assertThat(pipelineStage.getType(), is("STAGE"));
        assertThat(pipelineStage.getState(), is("SUCCESS"));

        pipelineStage = stages.get(2);

        assertThat(pipelineStage.getCompletePercent(), is(50));
        assertThat(pipelineStage.getName(), is("unstable-two"));
        assertThat(pipelineStage.getTitle(), is("unstable-two"));
        assertThat(pipelineStage.getType(), is("STAGE"));
        assertThat(pipelineStage.getState(), is("UNSTABLE"));

        pipelineStage = stages.get(3);

        assertThat(pipelineStage.getCompletePercent(), is(50));
        assertThat(pipelineStage.getName(), is("failure"));
        assertThat(pipelineStage.getTitle(), is("failure"));
        assertThat(pipelineStage.getType(), is("STAGE"));
        assertThat(pipelineStage.getState(), is("FAILURE"));
    }

    @Test
    public void createTree_complexSmokes() throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(j, "complexSmokes", "complexSmokes.jenkinsfile", Result.SUCCESS);
        PipelineGraphApi api = new PipelineGraphApi(run);
        PipelineGraph graph = api.createTree();

        List<PipelineStage> stages = graph.getStages();
        assertThat(stages, hasSize(4));

        // Top level stages
        // Non-Parallel Stage
        PipelineStage pipelineStage = stages.get(0);
        assertThat(pipelineStage.getName(), is("Non-Parallel Stage"));

        List<PipelineStage> children = pipelineStage.getChildren();
        assertThat(children, hasSize(0));

        // Parallel Stage
        pipelineStage = stages.get(1);
        assertThat(pipelineStage.getName(), is("Parallel Stage"));

        children = pipelineStage.getChildren();
        assertThat(children, hasSize(3));

        // Parallel Stage - children
        PipelineStage child = children.get(0);
        assertThat(child.getName(), is("Branch A"));
        
        child = children.get(1);
        assertThat(child.getName(), is("Branch B"));

        child = children.get(2);
        assertThat(child.getName(), is("Branch C"));

        children = child.getChildren();
        assertThat(children, hasSize(2));

        // Branch C - children
        child = children.get(0);
        assertThat(child.getName(), is("Nested 1"));

        child = children.get(1);
        assertThat(child.getName(), is("Nested 2"));

        // Skipped stage
        pipelineStage = stages.get(2);
        assertThat(pipelineStage.getName(), is("Skipped stage"));

        children = pipelineStage.getChildren();
        assertThat(children, hasSize(0));
    }
}