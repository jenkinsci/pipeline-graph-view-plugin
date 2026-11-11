package io.jenkins.plugins.pipelinegraphview.utils;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.is;

import io.jenkins.plugins.pipelinegraphview.treescanner.PipelineNodeGraphAdapter;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.concurrent.atomic.AtomicInteger;
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition;
import org.jenkinsci.plugins.workflow.flow.GraphListener;
import org.jenkinsci.plugins.workflow.graph.BlockEndNode;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.TestExtension;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

@WithJenkins
class StageEndHeadScanTest {

    private static final AtomicInteger scans = new AtomicInteger();

    @Test
    void stageScannedWhileItsEndIsTheHeadIsNotLeftRunning(JenkinsRule j) throws Exception {
        WorkflowJob job = j.createProject(WorkflowJob.class);
        job.setDefinition(new CpsFlowDefinition("stage('a') { echo 'a' }\nstage('b') { echo 'b' }", true));
        WorkflowRun run = j.buildAndAssertSuccess(job);

        assertThat(scans.get(), is(greaterThan(0)));
        PipelineGraph graph = new PipelineGraphApi(run).createTree();
        assertThat(
                graph.stages.stream().map(PipelineStage::getState).toList(),
                contains(PipelineState.SUCCESS, PipelineState.SUCCESS));
    }

    /** A scanner read (no live snapshot) landing in the window where stage a's end is the head. */
    @TestExtension("stageScannedWhileItsEndIsTheHeadIsNotLeftRunning")
    public static class ScanAtStageEnd implements GraphListener.Synchronous {
        @Override
        public void onNewHead(FlowNode node) {
            try {
                if (node instanceof BlockEndNode<?> end
                        && "a".equals(end.getStartNode().getDisplayName())
                        && node.getExecution().getOwner().getExecutable() instanceof WorkflowRun run) {
                    new PipelineGraphApi(run).createTreeFrom(new PipelineNodeGraphAdapter(run), null, null, false);
                    scans.incrementAndGet();
                }
            } catch (IOException e) {
                throw new UncheckedIOException(e);
            }
        }
    }
}
