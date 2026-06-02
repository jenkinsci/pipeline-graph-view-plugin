package io.jenkins.plugins.pipelinegraphview.buildflow;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

import hudson.model.Result;
import io.jenkins.plugins.pipelinegraphview.utils.TestUtils;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

@WithJenkins
class BuildFlowGraphTest {

    private JenkinsRule j;

    @BeforeEach
    void setup(JenkinsRule j) {
        this.j = j;
    }

    @Test
    void linearChain_upstreamTriggersDownstream() throws Exception {
        TestUtils.createJob(j, "downstream", "helloWorldScriptedPipeline.jenkinsfile");
        WorkflowRun upstream = TestUtils.createAndRunJob(j, "upstream", "buildStep.jenkinsfile", Result.SUCCESS);

        BuildFlowGraph graph = new BuildFlowGraph(upstream, true, true);
        BuildFlowResponse response = graph.build();

        assertThat(response.nodes(), hasSize(2));
        assertThat(response.edges(), hasSize(1));
        assertThat(response.isAnyBuildOngoing(), is(false));

        // Verify node IDs
        BuildFlowNode upstreamNode = response.nodes().stream()
                .filter(BuildFlowNode::isCurrentBuild)
                .findFirst()
                .orElseThrow();
        assertThat(upstreamNode.jobName(), is("upstream"));
        assertThat(upstreamNode.status(), is("SUCCESS"));

        BuildFlowNode downstreamNode = response.nodes().stream()
                .filter(n -> !n.isCurrentBuild())
                .findFirst()
                .orElseThrow();
        assertThat(downstreamNode.jobName(), is("downstream"));
        assertThat(downstreamNode.status(), is("SUCCESS"));

        // Verify edge
        BuildFlowEdge edge = response.edges().get(0);
        assertThat(edge.from(), is(upstreamNode.id()));
        assertThat(edge.to(), is(downstreamNode.id()));
    }

    @Test
    void downstreamBuild_showsUpstreamWhenQueried() throws Exception {
        TestUtils.createJob(j, "downstream", "helloWorldScriptedPipeline.jenkinsfile");
        TestUtils.createAndRunJob(j, "upstream", "buildStep.jenkinsfile", Result.SUCCESS);

        // Query from downstream's perspective
        WorkflowRun downstreamRun = j.jenkins
                .getItemByFullName("downstream", org.jenkinsci.plugins.workflow.job.WorkflowJob.class)
                .getLastBuild();

        BuildFlowGraph graphWithUpstream = new BuildFlowGraph(downstreamRun, true, true);
        BuildFlowResponse responseWithUpstream = graphWithUpstream.build();
        assertThat(responseWithUpstream.nodes(), hasSize(2));

        BuildFlowGraph graphWithoutUpstream = new BuildFlowGraph(downstreamRun, false, true);
        BuildFlowResponse responseWithoutUpstream = graphWithoutUpstream.build();
        // Without upstream, only the downstream itself (and its own downstream, if any)
        assertThat(responseWithoutUpstream.nodes(), hasSize(1));
    }

    @Test
    void hideDownstream_showsPathToTargetOnly() throws Exception {
        TestUtils.createJob(j, "downstream", "helloWorldScriptedPipeline.jenkinsfile");
        WorkflowRun upstream = TestUtils.createAndRunJob(j, "upstream", "buildStep.jenkinsfile", Result.SUCCESS);

        // From upstream's perspective, hiding downstream should still show upstream (itself)
        // but hide its children
        BuildFlowGraph graph = new BuildFlowGraph(upstream, true, false);
        BuildFlowResponse response = graph.build();
        // Should show only upstream (target), not downstream
        assertThat(response.nodes(), hasSize(1));
        assertThat(response.nodes().get(0).jobName(), is("upstream"));
    }

    @Test
    void isTruncated_falseForSmallGraphs() throws Exception {
        TestUtils.createJob(j, "downstream", "helloWorldScriptedPipeline.jenkinsfile");
        WorkflowRun upstream = TestUtils.createAndRunJob(j, "upstream", "buildStep.jenkinsfile", Result.SUCCESS);

        BuildFlowGraph graph = new BuildFlowGraph(upstream, true, true);
        BuildFlowResponse response = graph.build();
        assertThat(response.isTruncated(), is(false));
    }

    @Test
    void standaloneBuild_hasNoFlow() throws Exception {
        WorkflowRun run =
                TestUtils.createAndRunJob(j, "standalone", "helloWorldScriptedPipeline.jenkinsfile", Result.SUCCESS);

        assertThat(BuildFlowGraph.hasUpstreamOrDownstream(run), is(false));

        BuildFlowGraph graph = new BuildFlowGraph(run, true, true);
        BuildFlowResponse response = graph.build();
        assertThat(response.nodes(), hasSize(1));
        assertThat(response.edges(), is(empty()));
    }

    @Test
    void hasUpstreamOrDownstream_trueForTriggeredBuild() throws Exception {
        TestUtils.createJob(j, "downstream", "helloWorldScriptedPipeline.jenkinsfile");
        WorkflowRun upstream = TestUtils.createAndRunJob(j, "upstream", "buildStep.jenkinsfile", Result.SUCCESS);

        assertThat(BuildFlowGraph.hasUpstreamOrDownstream(upstream), is(true));
    }

    @Test
    void recentResults_returnsUpToSixHistoryItems() throws Exception {
        // Create the job once, then run it 8 times to exceed the cap of 6 (current + 5 previous)
        org.jenkinsci.plugins.workflow.job.WorkflowJob job =
                TestUtils.createJob(j, "multi-run", "helloWorldScriptedPipeline.jenkinsfile");
        for (int i = 0; i < 8; i++) {
            j.assertBuildStatus(Result.SUCCESS, job.scheduleBuild2(0));
        }

        WorkflowRun lastRun = job.getLastBuild();

        BuildFlowGraph graph = new BuildFlowGraph(lastRun, true, true);
        BuildFlowResponse response = graph.build();

        BuildFlowNode node = response.nodes().get(0);
        assertThat(node.recentResults(), hasSize(6)); // current + 5 previous (capped)
        assertThat(node.recentResults(), everyItem(is("SUCCESS")));
    }
}
