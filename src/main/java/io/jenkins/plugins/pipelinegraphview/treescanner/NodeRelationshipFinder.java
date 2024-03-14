package io.jenkins.plugins.pipelinegraphview.treescanner;

import edu.umd.cs.findbugs.annotations.CheckForNull;
import edu.umd.cs.findbugs.annotations.NonNull;
import io.jenkins.plugins.pipelinegraphview.utils.FlowNodeWrapper;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineNodeUtil;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import org.jenkinsci.plugins.workflow.cps.nodes.StepAtomNode;
import org.jenkinsci.plugins.workflow.graph.BlockEndNode;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class NodeRelationshipFinder {
    private static final Logger logger = LoggerFactory.getLogger(NodeRelationshipFinder.class);
    private boolean isDebugEnabled = logger.isDebugEnabled();

    private LinkedHashMap<String, FlowNode> endNodes = new LinkedHashMap<>();
    private ArrayDeque<FlowNode> pendingEndNodes = new ArrayDeque<>();
    private ArrayDeque<FlowNode> pendingStartNodes = new ArrayDeque<>();

    // Somewhere to temporarily store the parallel branches information whilst we
    // are handing a parallel block.
    // The StatusAndTiming API requires us to the structure of the parallel block to
    // get the status of a branch.
    private ArrayDeque<NodeRelationship> pendingBranchRelationships = new ArrayDeque<>();

    private NodeRelationship subsequentStepRelationship = null;
    private LinkedHashMap<String, NodeRelationship> relationships = new LinkedHashMap<>();

    // Print debug message if 'isDebugEnabled' is true.
    private void dump(String message, Object... args) {
        if (isDebugEnabled) {
            logger.debug(String.format(message, args));
        }
    }

    public NodeRelationshipFinder() {}

    /**
     * Determines the relationship between FlowNodes {@link FlowNode#getParents()}.
     */
    @NonNull
    public LinkedHashMap<String, NodeRelationship> getNodeRelationships(
            @NonNull LinkedHashMap<String, FlowNode> nodeMap) {
        dump("Original Ids: %s", String.join(", ", nodeMap.keySet()));
        // This is important, determining the the relationships depends on the order of
        // iteration.
        // If there was a method to tell if a node was a parallel block this might be
        // less of an issue.
        List<String> sortedIds = new ArrayList<>(nodeMap.keySet());
        Collections.sort(sortedIds, new FlowNodeWrapper.NodeIdComparator().reversed());
        dump("Sorted Ids: %s", String.join(", ", sortedIds));
        for (String id : sortedIds) {
            getRelationshipForNode(nodeMap.get(id));
        }
        return relationships;
    }

    private void getRelationshipForNode(@NonNull FlowNode node) {
        // Assign start node to end node.
        if (node instanceof StepAtomNode) {
            addStepRelationship((StepAtomNode) node);
        } else if (node instanceof BlockEndNode<?>) {
            handleBlockEnd((BlockEndNode<?>) node);
        } else {
            handleBlockStart(node);
        }
    }

    private void handleBlockStart(@NonNull FlowNode node) {
        // Reset step relationship - shouldn't carry over between blocks.
        subsequentStepRelationship = null;
        // Assign end node to start node.
        if (FlowNodeWrapper.isStart(node)) {
            addBlockRelationship(node);
        } else {
            dump("Why are we here?? %s - %s", node.getId(), node.getClass());
        }
    }

    private void addStepRelationship(@NonNull StepAtomNode step) {
        dump("Generating relationship for step %s", step.getId());
        FlowNode after = null;
        // If we are followed by a step, that will be our after node, otherwise use the
        // end node of the block.
        if (subsequentStepRelationship != null) {
            after = subsequentStepRelationship.getStart();
            dump("Getting after node (%s) from subsequentStepRelationship", after.getId());
        } else if (!pendingEndNodes.isEmpty()){
            after = pendingEndNodes.peek();
            dump(
                    "Getting after node (%s) from endNodes stack (size: %s)",
                    (after != null) ? after.getId() : "null", endNodes.size());
        }
        NodeRelationship nodeRelationship = new NodeRelationship(step, step, after);
        relationships.put(step.getId(), nodeRelationship);
        // Reset this so the next step will use this step as it's after node (if it's in the same block).
        subsequentStepRelationship = nodeRelationship;
    }

    private void handleBlockEnd(@NonNull BlockEndNode<?> endNode) {
        // Blindly push a new start pending reliable way to check for parallel node.
        FlowNode startNode = endNode.getStartNode();
        endNodes.put(startNode.getId(), endNode);
        pendingEndNodes.push(endNode);
        dump("Adding %s to pendingEndNodes", endNode.getId());
        pendingStartNodes.push(startNode);
    }

    private void addBlockRelationship(@NonNull FlowNode node) {
        NodeRelationship blockRelationship = null;
        // Can be null if the block is running, in this case we give the end node as the
        // current nodes.
        FlowNode endNode = endNodes.getOrDefault(node.getId(), node);
        if (PipelineNodeUtil.isParallelBranch(node)) {
            addParallelBranchRelationship(node, endNode);
        } else {
            dump("Adding relationship for %s", node.getId());
            if (!pendingBranchRelationships.isEmpty()) {
                blockRelationship = addParallelRelationship(node, endNode);
            } else {
                blockRelationship = addStageRelationship(node, endNode);
            }
            relationships.put(node.getId(), blockRelationship);
            // Set this relationship for the end node as well - as the relationship
            // encompasses it too.
            if (endNode != node) {
                relationships.put(endNode.getId(), blockRelationship);
            }
            // Remove end node from stack (if there is one).
            if (!pendingEndNodes.isEmpty()) {
                pendingEndNodes.pop();
            }
        }
    }

    private void addParallelBranchRelationship(@NonNull FlowNode node, @NonNull FlowNode endNode) {
        FlowNode after = getBlockAfterNode();
        // Store a parallel branch relationship - these will be used to build up the
        // parent parallel block relationship.
        // Once generated, that relationship will be superseded this one.
        dump(
                "Adding parallel branch relationship for %s(%s)->%s(%s)",
                node.getId(),
                node.getClass().getName(),
                endNode.getId(),
                endNode.getClass().getName());
        // After doesn't matter as this relationship object is temporary (only start and
        // end node are used).
        NodeRelationship blockRelationship = new NodeRelationship(node, endNode, after);
        pendingBranchRelationships.push(blockRelationship);
    }

    private NodeRelationship addParallelRelationship(@NonNull FlowNode node, @NonNull FlowNode endNode) {
        FlowNode after = getBlockAfterNode();
        dump(
                "Generating relationship for parallel Block %s (with after %s)",
                node.getId(), (after != null) ? after.getId() : "null");
        // handle parallel block case.
        NodeRelationship parallelRelationship =
                new ParallelBlockRelationship(node, endNode, after, pendingBranchRelationships);
        // Set branch relationship to the parent ParallelBlockRelationship - as they are
        // fairly interdependent.
        for (NodeRelationship r : pendingBranchRelationships) {
            relationships.put(r.getStart().getId(), parallelRelationship);
            // End nodes can be null when graph is running.
            if (r.getEnd() != null) {
                relationships.put(r.getEnd().getId(), parallelRelationship);
            }
        }
        pendingBranchRelationships.clear();
        return parallelRelationship;
    }

    @CheckForNull
    private FlowNode getBlockAfterNode() {
        FlowNode after = null;
        if (!pendingEndNodes.isEmpty()) {
            after = pendingEndNodes.pop();
        }
        dump(
                "Getting after node (%s) from pendingEndNodes stack (size: %s)",
                (after != null) ? after.getId() : "null", pendingEndNodes.size());
        return after;
    }

    private NodeRelationship addStageRelationship(@NonNull FlowNode node, @NonNull FlowNode endNode) {
        FlowNode after = getBlockAfterNode();
        dump(
                "Generating relationship for Block %s{%s}->%s{%s} (with after %s{%s})",
                node.getId(),
                node.getClass(),
                endNode.getId(),
                endNode.getClass(),
                (after != null) ? after.getId() : "null",
                (after != null) ? after.getClass() : "null");
        return new NodeRelationship(node, endNode, after);
    }
}
