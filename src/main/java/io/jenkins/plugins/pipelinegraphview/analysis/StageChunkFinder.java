package io.jenkins.plugins.pipelinegraphview.analysis;

import edu.umd.cs.findbugs.annotations.CheckForNull;
import edu.umd.cs.findbugs.annotations.NonNull;
import org.jenkinsci.plugins.workflow.actions.LabelAction;
import org.jenkinsci.plugins.workflow.actions.StageAction;
import org.jenkinsci.plugins.workflow.cps.nodes.StepAtomNode;
import org.jenkinsci.plugins.workflow.cps.nodes.StepEndNode;
import org.jenkinsci.plugins.workflow.cps.nodes.StepStartNode;
import org.jenkinsci.plugins.workflow.graph.BlockEndNode;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.graph.StepNode;
import org.jenkinsci.plugins.workflow.graphanalysis.ChunkFinder;
import org.jenkinsci.plugins.workflow.support.steps.StageStep;

/**
 * Finds both block-scoped and legacy stages
 * @author Sam Van Oort
 */
public class StageChunkFinder implements ChunkFinder {

    @Override
    public boolean isStartInsideChunk() {
        return true;
    }

    @Override
    public boolean isChunkStart(@NonNull FlowNode current, @CheckForNull FlowNode previous) {
        if ((current instanceof StepAtomNode || current instanceof StepStartNode)
                && !(((StepNode) current).getDescriptor() instanceof StageStep.DescriptorImpl)) {
            // Faster than looking at actions
            return false;
        } else if (current instanceof BlockEndNode) {
            return false;
        } else if (current instanceof StepStartNode startNode) {
            if (!(startNode.getDescriptor() instanceof StageStep.DescriptorImpl)) {
                return false;
            }
            return startNode.getAction(LabelAction.class) != null;
        }
        return current.getAction(StageAction.class) != null;
    }

    /** End is where you have a label marker before it... or  */
    @Override
    public boolean isChunkEnd(@NonNull FlowNode current, @CheckForNull FlowNode previous) {
        // First a block-scoped stage
        if (current instanceof StepEndNode stepEndNode
                && stepEndNode.getDescriptor() instanceof StageStep.DescriptorImpl) {
            // We have to look for the labelaction because block-scoped stage creates two nested blocks
            return stepEndNode.getStartNode().getAction(LabelAction.class) != null;
        }
        // Then a marker-scoped stage
        if (previous != null) {
            return isChunkStart(previous, null);
        }
        return false;
    }
}
