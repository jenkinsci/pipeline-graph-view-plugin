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
import java.util.Map;
import org.jenkinsci.plugins.workflow.cps.nodes.StepAtomNode;
import org.jenkinsci.plugins.workflow.graph.BlockEndNode;
import org.jenkinsci.plugins.workflow.graph.BlockStartNode;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class NodeRelationshipFinder {
    private static final Logger logger = LoggerFactory.getLogger(NodeRelationshipFinder.class);
    private boolean isDebugEnabled = logger.isDebugEnabled();

    private LinkedHashMap<String, FlowNode> endNodes = new LinkedHashMap<>();

    /* Stack of stacks to store the last seen node for each nested block we have gone into.
     * Used to assign the after node for relationships.
     * This can be a different type, depending on situation:
     *  - For the last Atom node in a block, will be the BlockEndNode (or null if the step is running).
     *  - For nodes that have later siblings, this will be the previous sibling we found.
     *    - This might be a AtomNode or a BlockStartNode (when a step is followed by a StepBlock).
     */
    private ArrayDeque<ArrayDeque<FlowNode>> lastSeenNodes = new ArrayDeque<>();
    private Map<String, ArrayDeque<FlowNode>> seenChildNodes = new LinkedHashMap<>();

    /*  Somewhere to temporarily store the parallel branches information whilst we
     * are handing a parallel block.
     * The StatusAndTiming API requires us to the structure of the parallel block to
     * get the status of a branch.
     */
    private ArrayDeque<NodeRelationship> pendingBranchRelationships = new ArrayDeque<>();

    private LinkedHashMap<String, NodeRelationship> relationships = new LinkedHashMap<>();

    public NodeRelationshipFinder() {}

    /**
     * Determines the relationship between FlowNodes {@link FlowNode#getParents()}.
     */
    @NonNull
    public LinkedHashMap<String, NodeRelationship> getNodeRelationships(
            @NonNull LinkedHashMap<String, FlowNode> nodeMap) {
        if (isDebugEnabled) {
            logger.debug("Original Ids: {}", String.join(", ", nodeMap.keySet()));
        }
        // This is important, determining the the relationships depends on the order of
        // iteration.
        // If there was a method to tell if a node was a parallel block this might be
        // less of an issue.
        List<String> sortedIds = new ArrayList<>(nodeMap.keySet());
        Collections.sort(sortedIds, new FlowNodeWrapper.NodeIdComparator().reversed());
        if (isDebugEnabled) {
            logger.debug("Sorted Ids: {}", String.join(", ", sortedIds));
        }
        for (String id : sortedIds) {
            getRelationshipForNode(nodeMap.get(id));
            // Add this node to the parents's stack as the last of it's child nodes that
            //  we have seen.
            addSeenNodes(nodeMap.get(id));
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
        // Assign end node to start node.
        if (FlowNodeWrapper.isStart(node)) {
            addBlockRelationship(node);
        } else {
            logger.debug("Why are we here?? {} - {}", node.getId(), node.getClass());
        }
    }

    private void addSeenNodes(FlowNode node) {
        if (!seenChildNodes.keySet().contains(node.getEnclosingId())) {
            seenChildNodes.put(node.getEnclosingId(), new ArrayDeque<FlowNode>());
        }
        if (isDebugEnabled) {
            logger.debug("Adding {} to seenChildNodes {}", node.getId(), node.getEnclosingId());
        }
        seenChildNodes.get(node.getEnclosingId()).push(node);
    }

    @CheckForNull
    private FlowNode getAfterNode(FlowNode node) {
        FlowNode after = null;
        // The after node is the last child of the enclosing node, except for the last node in
        // a block, then it's the last node in the enclosing nodes list (likely, this blocks end node).
        FlowNode parentStartNode = getFirstEnclosingNode(node);
        ArrayDeque<FlowNode> laterSiblings = getProcessedChildren(parentStartNode);
        if (parentStartNode != null && laterSiblings.isEmpty()) {
            // If there are no later siblings, get the parents later sibling.
            ArrayDeque<FlowNode> parentsLaterSiblings = getProcessedChildren(getFirstEnclosingNode(parentStartNode));
            after = parentsLaterSiblings.isEmpty() ? null : parentsLaterSiblings.peek();
            if (isDebugEnabled) {
                logger.debug(parentsLaterSiblings.toString());
            }
        } else {
            if (isDebugEnabled) {
                logger.debug(laterSiblings.toString());
            }
            after = laterSiblings.peek();
        }
        return after;
    }

    @CheckForNull
    private BlockStartNode getFirstEnclosingNode(FlowNode node) {
        List<? extends BlockStartNode> enclosingBlocks = node.getEnclosingBlocks();
        return enclosingBlocks.isEmpty() ? null : enclosingBlocks.get(0);
    }

    private ArrayDeque<FlowNode> getProcessedChildren(@CheckForNull FlowNode node) {
        if (node != null && seenChildNodes.keySet().contains(node.getId())) {
            return seenChildNodes.get(node.getId());
        }
        return new ArrayDeque<FlowNode>();
    }

    private void addStepRelationship(@NonNull StepAtomNode step) {
        if (isDebugEnabled) {
            logger.debug("Generating relationship for step {}", step.getId());
        }
        // FlowNode after = subsequentNode;
        FlowNode after = getAfterNode(step);
        if (isDebugEnabled) {
            logger.debug(
                    "Adding step for {}({}),{}({})",
                    step.getId(),
                    step.getClass().getName(),
                    after == null ? "null" : after.getId(),
                    after == null ? "null" : after.getClass().getName());
        }
        NodeRelationship nodeRelationship = new NodeRelationship(step, step, after);
        relationships.put(step.getId(), nodeRelationship);
    }

    private void handleBlockEnd(@NonNull BlockEndNode<?> endNode) {
        // Blindly push a new start pending reliable way to check for parallel node.
        FlowNode startNode = endNode.getStartNode();
        endNodes.put(startNode.getId(), endNode);
        // Create new stack for this block, add the end node and push it to stack of stacks.
        ArrayDeque<FlowNode> nodeBlockStack = new ArrayDeque<>();
        lastSeenNodes.push(nodeBlockStack);
    }

    private void addBlockRelationship(@NonNull FlowNode node) {
        NodeRelationship blockRelationship = null;
        // Can be null if the block is running, in this case we give the end node as the
        // current nodes.
        FlowNode endNode = endNodes.getOrDefault(node.getId(), node);
        if (PipelineNodeUtil.isParallelBranch(node)) {
            addParallelBranchRelationship(node, endNode);
        } else {
            if (isDebugEnabled) {
                logger.debug("Adding relationship for {}", node.getId());
            }
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
        }
    }

    private void addParallelBranchRelationship(@NonNull FlowNode node, @NonNull FlowNode endNode) {
        FlowNode after = getAfterNode(node);
        // Store a parallel branch relationship - these will be used to build up the
        // parent parallel block relationship.
        // Once generated, that relationship will be superseded this one.
        if (isDebugEnabled) {
            logger.debug(
                    "Adding parallel branch relationship for {}({})->{}({})",
                    node.getId(),
                    node.getClass().getName(),
                    endNode.getId(),
                    endNode.getClass().getName());
        }
        // After doesn't matter as this relationship object is temporary (only start and
        // end node are used).
        NodeRelationship blockRelationship = new NodeRelationship(node, endNode, after);
        pendingBranchRelationships.push(blockRelationship);
    }

    private NodeRelationship addParallelRelationship(@NonNull FlowNode node, @NonNull FlowNode endNode) {
        FlowNode after = getAfterNode(node);
        if (isDebugEnabled) {
            logger.debug(
                    "Generating relationship for parallel Block {} (with after {})",
                    node.getId(),
                    (after != null) ? after.getId() : "null");
        }
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

    private NodeRelationship addStageRelationship(@NonNull FlowNode node, @NonNull FlowNode endNode) {
        FlowNode after = getAfterNode(node);
        if (isDebugEnabled) {
            logger.debug(
                    "Generating relationship for Block {}{{}}->{}{{}} (with after {}{{}})",
                    node.getId(),
                    node.getClass(),
                    endNode.getId(),
                    endNode.getClass(),
                    (after != null) ? after.getId() : "null",
                    (after != null) ? after.getClass() : "null");
        }
        return new NodeRelationship(node, endNode, after);
    }
}
