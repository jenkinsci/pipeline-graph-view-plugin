package io.jenkins.plugins.pipelinegraphview.analysis;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import edu.umd.cs.findbugs.annotations.NonNull;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition;
import org.jenkinsci.plugins.workflow.graphanalysis.FlowChunkWithContext;
import org.jenkinsci.plugins.workflow.graphanalysis.ForkScanner;
import org.jenkinsci.plugins.workflow.graphanalysis.MemoryFlowChunk;
import org.jenkinsci.plugins.workflow.graphanalysis.StandardChunkVisitor;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

/**
 * Tests the stage collection
 * @author Sam Van Oort
 */
@WithJenkins
class StageTest {

    private JenkinsRule jenkinsRule;

    @BeforeEach
    void setUp(JenkinsRule rule) {
        jenkinsRule = rule;
    }

    public static class CollectingChunkVisitor extends StandardChunkVisitor {
        final Deque<MemoryFlowChunk> allChunks = new ArrayDeque<>();

        public List<MemoryFlowChunk> getChunks() {
            return new ArrayList<>(allChunks);
        }

        @Override
        protected void handleChunkDone(@NonNull MemoryFlowChunk chunk) {
            allChunks.push(chunk);
            this.chunk = new MemoryFlowChunk();
        }
    }

    /** Assert that chunk flownode IDs match expected, use 0 or -1 ID for null flownode */
    private static void assertChunkBoundary(
            FlowChunkWithContext chunk, int beforeId, int firstId, int lastId, int afterId) {
        // First check the chunk boundaries, then the before/after
        assertNotNull(chunk.getFirstNode());
        assertEquals(firstId, Integer.parseInt(chunk.getFirstNode().getId()));
        assertNotNull(chunk.getLastNode());
        assertEquals(lastId, Integer.parseInt(chunk.getLastNode().getId()));

        if (beforeId > 0) {
            assertNotNull(chunk.getNodeBefore());
            assertEquals(beforeId, Integer.parseInt(chunk.getNodeBefore().getId()));
        } else {
            assertNull(chunk.getNodeBefore());
        }

        if (afterId > 0) {
            assertNotNull(chunk.getNodeAfter());
            assertEquals(afterId, Integer.parseInt(chunk.getNodeAfter().getId()));
        } else {
            assertNull(chunk.getNodeAfter());
        }
    }

    @Test
    void testBlockStage() throws Exception {
        WorkflowJob job = jenkinsRule.jenkins.createProject(WorkflowJob.class, "Blocky job");

        job.setDefinition(new CpsFlowDefinition("""
                node {
                   stage ('Build') {
                     echo ('Building')
                   }
                   stage ('Test') {
                     echo ('Testing')
                   }
                   stage ('Deploy') {
                     writeFile file: 'file.txt', text:'content'
                     archive(includes: 'file.txt')
                     echo ('Deploying')
                   }
                }""", true));
        /*
        * Node dump follows, format:
        [ID]{parent,ids} flowNodeClassName stepDisplayName [st=startId if a block node]
        Action format:
        - actionClassName actionDisplayName
        ------------------------------------------------------------------------------------------
        [2]{}FlowStartNode Start of Pipeline
        [3]{2}StepStartNode Allocate node : Start
          -LogActionImpl Console Output
          -WorkspaceActionImpl Workspace
        [4]{3}StepStartNode Allocate node : Body : Start
          -BodyInvocationAction null
        [5]{4}StepStartNode Stage : Start
        [6]{5}StepStartNode Build
          -BodyInvocationAction null
          -LabelAction Build
        [7]{6}StepAtomNode Print Message
          -LogActionImpl Console Output
        [8]{7}StepEndNode Stage : Body : End  [st=6]
          -BodyInvocationAction null
        [9]{8}StepEndNode Stage : End  [st=5]
        [10]{9}StepStartNode Stage : Start
        [11]{10}StepStartNode Test
          -BodyInvocationAction null
          -LabelAction Test
        [12]{11}StepAtomNode Print Message
          -LogActionImpl Console Output
        [13]{12}StepEndNode Stage : Body : End  [st=11]
          -BodyInvocationAction null
        [14]{13}StepEndNode Stage : End  [st=10]
        [15]{14}StepStartNode Stage : Start
        [16]{15}StepStartNode Deploy
          -BodyInvocationAction null
          -LabelAction Deploy
        [17]{16}StepAtomNode Write file to workspace
        [18]{17}StepAtomNode Archive artifacts
          -LogActionImpl Console Output
        [19]{18}StepAtomNode Print Message
          -LogActionImpl Console Output
        [20]{19}StepEndNode Stage : Body : End  [st=16]
          -BodyInvocationAction null
        [21]{20}StepEndNode Stage : End  [st=15]
        [22]{21}StepEndNode Allocate node : Body : End  [st=4]
          -BodyInvocationAction null
        [23]{22}StepEndNode Allocate node : End  [st=3]
        [24]{23}FlowEndNode End of Pipeline  [st=2]
        */

        WorkflowRun build = jenkinsRule.assertBuildStatusSuccess(job.scheduleBuild2(0));

        ForkScanner scan = new ForkScanner();
        scan.setup(build.getExecution().getCurrentHeads());
        CollectingChunkVisitor visitor = new CollectingChunkVisitor();
        scan.visitSimpleChunks(visitor, new StageChunkFinder());

        List<MemoryFlowChunk> stages = visitor.getChunks();
        assertEquals(3, stages.size());
        assertChunkBoundary(stages.get(0), 5, 6, 8, 9);
        assertChunkBoundary(stages.get(1), 10, 11, 13, 14);
        assertChunkBoundary(stages.get(2), 15, 16, 20, 21);
    }
}
