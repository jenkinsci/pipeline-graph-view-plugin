package io.jenkins.plugins.pipelinegraphview.treescanner;

import edu.umd.cs.findbugs.annotations.CheckForNull;
import edu.umd.cs.findbugs.annotations.NonNull;
import io.jenkins.plugins.pipelinegraphview.analysis.TimingInfo;
import io.jenkins.plugins.pipelinegraphview.livestate.BlockResolutionCache;
import io.jenkins.plugins.pipelinegraphview.livestate.LiveGraphRegistry;
import io.jenkins.plugins.pipelinegraphview.utils.FlowNodeWrapper;
import io.jenkins.plugins.pipelinegraphview.utils.NodeRunStatus;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineNodeUtil;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeoutException;
import org.jenkinsci.plugins.pipeline.modeldefinition.actions.ExecutionModelAction;
import org.jenkinsci.plugins.workflow.actions.ErrorAction;
import org.jenkinsci.plugins.workflow.cps.nodes.StepAtomNode;
import org.jenkinsci.plugins.workflow.flow.FlowExecution;
import org.jenkinsci.plugins.workflow.graph.AtomNode;
import org.jenkinsci.plugins.workflow.graph.BlockEndNode;
import org.jenkinsci.plugins.workflow.graph.BlockStartNode;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.graphanalysis.DepthFirstScanner;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.support.steps.input.InputAction;
import org.jenkinsci.plugins.workflow.support.steps.input.InputStep;
import org.jenkinsci.plugins.workflow.support.steps.input.InputStepExecution;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Generates a Tree Representation of the DAG.
 *
 * @author Tim Brown
 */
public class PipelineNodeTreeScanner {
    private final WorkflowRun run;
    private final FlowExecution execution;

    // Maps a node ID to a given node wrapper. Stores Stages and parallel blocks -
    // not steps.
    private Map<String, FlowNodeWrapper> stageNodeMap = new LinkedHashMap<>();

    // Maps a node ID to a given step node wrapper.
    private Map<String, FlowNodeWrapper> stepNodeMap = new LinkedHashMap<>();

    private final boolean declarative;

    private static final Logger logger = LoggerFactory.getLogger(PipelineNodeTreeScanner.class);
    private final boolean isDebugEnabled = logger.isDebugEnabled();

    public PipelineNodeTreeScanner(@NonNull WorkflowRun run) {
        this.run = run;
        this.execution = run.getExecution();
        this.declarative = run.getAction(ExecutionModelAction.class) != null;
        this.build();
    }

    /**
     * Builds from a caller-supplied node collection, skipping the {@link DepthFirstScanner}
     * walk. The caller is responsible for having observed every node already. Supply
     * {@code enclosingIdsByNodeId} to read ancestry from the map instead of FlowNode storage,
     * and {@code activeNodeIds} to use the set for liveness checks instead of
     * {@link FlowNode#isActive()}.
     */
    public PipelineNodeTreeScanner(
            @NonNull WorkflowRun run,
            @NonNull Collection<FlowNode> nodes,
            @CheckForNull Map<String, List<String>> enclosingIdsByNodeId,
            @CheckForNull Set<String> activeNodeIds) {
        this.run = run;
        this.execution = run.getExecution();
        this.declarative = run.getAction(ExecutionModelAction.class) != null;
        this.buildFrom(nodes, enclosingIdsByNodeId, activeNodeIds);
    }

    /**
     * Builds the flow node graph.
     */
    public void build() {
        if (isDebugEnabled) {
            logger.debug("Building graph");
        }
        if (execution != null) {
            buildFrom(getAllNodes(), null, null);
        } else {
            this.stageNodeMap = new LinkedHashMap<>();
            this.stepNodeMap = new LinkedHashMap<>();
        }
        if (isDebugEnabled) {
            logger.debug("Graph built");
        }
    }

    private void buildFrom(
            Collection<FlowNode> nodes,
            @CheckForNull Map<String, List<String>> enclosingIdsByNodeId,
            @CheckForNull Set<String> activeNodeIds) {
        if (execution == null || nodes.isEmpty()) {
            this.stageNodeMap = new LinkedHashMap<>();
            this.stepNodeMap = new LinkedHashMap<>();
            return;
        }
        NodeRelationshipFinder finder = new NodeRelationshipFinder(enclosingIdsByNodeId);
        Map<String, NodeRelationship> relationships = finder.getNodeRelationships(nodes);
        GraphBuilder builder =
                new GraphBuilder(nodes, relationships, this.run, this.execution, enclosingIdsByNodeId, activeNodeIds);
        if (isDebugEnabled) {
            logger.debug("Original nodes: count={}", builder.getNodes().size());
        }
        this.stageNodeMap = builder.getStageMapping();
        this.stepNodeMap = builder.getStepMapping();
        if (isDebugEnabled) {
            logger.debug("Remapped nodes: stages={}, steps={}", this.stageNodeMap.size(), this.stepNodeMap.size());
        }
    }

    /**
     * Gets all the nodes that are reachable in the graph.
     */
    private List<FlowNode> getAllNodes() {
        List<FlowNode> heads = execution.getCurrentHeads();
        final DepthFirstScanner scanner = new DepthFirstScanner();
        scanner.setup(heads);

        // nodes that we've visited
        final List<FlowNode> nodes = new ArrayList<>();
        for (FlowNode n : scanner) {
            nodes.add(n);
        }
        return nodes;
    }

    @NonNull
    public List<FlowNodeWrapper> getStageSteps(String startNodeId) {
        return getAllSteps().getOrDefault(startNodeId, new ArrayList<>());
    }

    @NonNull
    public Map<String, List<FlowNodeWrapper>> getAllSteps() {
        Map<String, List<FlowNodeWrapper>> stageNodeStepMap = new LinkedHashMap<>();
        for (String stageId : stageNodeMap.keySet()) {
            stageNodeStepMap.put(stageId, new ArrayList<>());
        }
        for (FlowNodeWrapper step : stepNodeMap.values()) {
            List<FlowNodeWrapper> parents = step.getParents();
            if (parents.isEmpty()) {
                continue;
            }
            if (parents.size() == 1) {
                List<FlowNodeWrapper> bucket =
                        stageNodeStepMap.get(parents.get(0).getId());
                if (bucket != null) {
                    bucket.add(step);
                }
                continue;
            }
            // A step with multiple parents belongs to every matching stage, but only once.
            Set<String> seen = new HashSet<>(parents.size());
            for (FlowNodeWrapper parent : parents) {
                if (seen.add(parent.getId())) {
                    List<FlowNodeWrapper> bucket = stageNodeStepMap.get(parent.getId());
                    if (bucket != null) {
                        bucket.add(step);
                    }
                }
            }
        }
        return stageNodeStepMap;
    }

    @NonNull
    public List<FlowNodeWrapper> getPipelineNodes() {
        List<FlowNodeWrapper> stageNodes = new ArrayList<>(this.stageNodeMap.values());
        stageNodes.sort(new FlowNodeWrapper.NodeComparator());
        return stageNodes;
    }

    @NonNull
    public Map<String, FlowNodeWrapper> getPipelineNodeMap() {
        return this.stageNodeMap;
    }

    public boolean isDeclarative() {
        return this.declarative;
    }

    private static class GraphBuilder {
        private final Collection<FlowNode> nodes;
        private final Map<String, NodeRelationship> relationships;
        private final WorkflowRun run;

        @NonNull
        private final FlowExecution execution;

        // Optional pre-computed ancestry. When present, findParentNode avoids the storage
        // read lock that FlowNode#getAllEnclosingIds would take.
        @CheckForNull
        private final Map<String, List<String>> enclosingIdsByNodeId;

        // Node IDs considered active at snapshot time (current heads + enclosing blocks).
        // When non-null, {@code NodeRunStatus} reads liveness from this set.
        @CheckForNull
        private final Set<String> activeNodeIds;

        private final Map<String, FlowNodeWrapper> wrappedNodeMap = new LinkedHashMap<>();
        // These two are populated when required using by filtering unwanted nodes from
        // 'wrappedNodeMap' into a new map.
        private Map<String, FlowNodeWrapper> wrappedStepMap;
        private Map<String, FlowNodeWrapper> wrappedStageMap;

        // The root stage in the graph. We assign any unhandled exceptions to this.
        // FlowNodeWrapper rootStage = null;

        private final Logger logger = LoggerFactory.getLogger(GraphBuilder.class);
        private final InputAction inputAction;
        private final boolean isDebugEnabled = logger.isDebugEnabled();

        /*
         * Builds a graph representing this Execution. Stages an steps aer represented
         * in the same graph.
         */
        public GraphBuilder(
                Collection<FlowNode> nodes,
                @NonNull Map<String, NodeRelationship> relationships,
                @NonNull WorkflowRun run,
                @NonNull FlowExecution execution,
                @CheckForNull Map<String, List<String>> enclosingIdsByNodeId,
                @CheckForNull Set<String> activeNodeIds) {
            this.nodes = nodes;
            this.relationships = relationships;
            this.run = run;
            this.inputAction = run.getAction(InputAction.class);
            this.execution = execution;
            this.enclosingIdsByNodeId = enclosingIdsByNodeId;
            this.activeNodeIds = activeNodeIds;
            buildGraph();
        }

        protected List<FlowNodeWrapper> getNodes() {
            return new ArrayList<>(wrappedNodeMap.values());
        }

        /*
         * Get the mapping of only the Stages, and Parallels (not-steps) in the graph.
         * This will remove any steps and step-block from the graph.
         * Any stages that have a step/step block for a parent (e.g. any inside an
         * allocate node block)
         * will be remapped to the closest not-step parent.
         */
        public @NonNull Map<String, FlowNodeWrapper> getStageMapping() {
            if (this.wrappedStageMap != null) {
                return this.wrappedStageMap;
            }
            if (isDebugEnabled) {
                logger.debug("Remapping stages");
            }
            // Preserve wrappedNodeMap's LinkedHashMap insertion order (ID-ascending) —
            // downstream code in getAllSteps relies on iteration order to produce
            // per-stage step buckets without an extra sort.
            // i.e., don't change this to a stream.
            Map<String, FlowNodeWrapper> stageMap = new LinkedHashMap<>();
            for (Map.Entry<String, FlowNodeWrapper> e : this.wrappedNodeMap.entrySet()) {
                if (shouldBeInStageMap(e.getValue())) {
                    stageMap.put(e.getKey(), e.getValue());
                }
            }

            if (stageMap.isEmpty()) {
                // Force at least one stage so that the log can be viewed
                for (Map.Entry<String, FlowNodeWrapper> e : this.wrappedNodeMap.entrySet()) {
                    if (isStartNode(e.getValue())) {
                        stageMap.put(e.getKey(), e.getValue());
                    }
                }
            }
            for (FlowNodeWrapper stage : stageMap.values()) {
                FlowNodeWrapper firstParent = stage.getFirstParent();
                // Remap parentage of stages that aren't children of stages (e.g. allocate node
                // step).
                if (isDebugEnabled) {
                    logger.debug("Stages has {} parents", stage.getParents().size());
                    logger.debug("First parent of stage {}: {}", stage.getId(), firstParent);
                    if (firstParent != null) {
                        logger.debug("Parent exists in stage map: {}", stageMap.containsKey(firstParent.getId()));
                    }
                }
                if (firstParent != null && !stageMap.containsKey(firstParent.getId())) {
                    stageMap.put(stage.getId(), remapNode(stage, stageMap));
                }
            }
            this.wrappedStageMap = stageMap;
            return this.wrappedStageMap;
        }

        private boolean shouldBeInStageMap(FlowNodeWrapper n) {
            // We also want to drop steps blocks - as the front-end doesn't expect them.
            // For the future: Adding Step Blocks as stages might be a good way to handle them in the
            // future.
            return !shouldBeInStepMap(n) && !isStartNode(n) && !n.isStepsBlock();
        }

        /*
         * Returns true if this is a start node that we will drop, unless it's the only node.
         */
        private boolean isStartNode(FlowNodeWrapper n) {
            return n.getType() == FlowNodeWrapper.NodeType.PIPELINE_START;
        }

        /*
         * Remaps (creates a new) FlowNodeWrapper for nodes that are children of nodes
         * that don't exist in the final graph.
         * The new parents will be the closest ancestor in the graph, as determined by
         * findParentNode.
         */
        private @NonNull FlowNodeWrapper remapNode(
                @NonNull FlowNodeWrapper wrappedNode, @NonNull Map<String, FlowNodeWrapper> stageMap) {
            if (isDebugEnabled) {
                logger.debug("Remapping node {}, {}", wrappedNode.getId(), wrappedNode.getClass());
            }
            // Create new wrapper as we don't want to change the old one.
            FlowNodeWrapper remappedNode = new FlowNodeWrapper(
                    wrappedNode.getNode(),
                    wrappedNode.getStatus(),
                    wrappedNode.getTiming(),
                    wrappedNode.getInputStep(),
                    wrappedNode.getRun(),
                    wrappedNode.getType());
            FlowNodeWrapper closestParent = findParentNode(wrappedNode, stageMap);
            if (isDebugEnabled) {
                logger.debug(
                        "Found closest parent for node {}, {}",
                        wrappedNode.getId(),
                        (closestParent != null) ? closestParent.getId() : "null");
            }
            if (closestParent != null) {
                remappedNode.addParent(closestParent);
                remappedNode.addEdge(closestParent);
            }
            return remappedNode;
        }

        /*
         * This will remove any Stages and Step Blocks from the mapping. Still will be
         * children of stages.
         * This provides a similar representation to PipelineStepVisitor.
         */
        public @NonNull Map<String, FlowNodeWrapper> getStepMapping() {
            if (wrappedStepMap != null) {
                return wrappedStepMap;
            }

            if (isDebugEnabled) {
                logger.debug("Remapping steps");
            }
            Map<String, FlowNodeWrapper> stepMap = new LinkedHashMap<>();
            for (Map.Entry<String, FlowNodeWrapper> e : this.wrappedNodeMap.entrySet()) {
                if (shouldBeInStepMap(e.getValue())) {
                    stepMap.put(e.getKey(), e.getValue());
                }
            }

            Map<String, FlowNodeWrapper> stageMap = this.getStageMapping();
            for (FlowNodeWrapper step : stepMap.values()) {
                FlowNodeWrapper firstParent = step.getFirstParent();
                // Remap parentage of steps that aren't children of stages (e.g. are in Step
                // Block).
                if (firstParent != null && !stageMap.containsKey(firstParent.getId())) {
                    stepMap.put(step.getId(), remapNode(step, stageMap));
                }
            }

            this.wrappedStepMap = stepMap;
            return this.wrappedStepMap;
        }

        private boolean shouldBeInStepMap(FlowNodeWrapper n) {
            return n.isStep() || isExceptionStep(n);
        }

        /*
         * Returns true if this the node we use to represent and unhandled exception in
         * the steps map.
         */
        private boolean isExceptionStep(FlowNodeWrapper n) {
            return n.getType() == FlowNodeWrapper.NodeType.UNHANDLED_EXCEPTION && n.isUnhandledException();
        }

        /*
         * Builds a graph from the list of nodes and relationships given to the class.
         */
        private void buildGraph() {
            List<FlowNode> nodeList = FlowNodeWrapper.sortByFlowNodeId(nodes, false);
            // If the Pipeline ended with an unhandled exception, then we want to catch the
            // node which threw it.
            BlockEndNode<?> nodeThatThrewException = null;
            if (!nodeList.isEmpty()) {
                nodeThatThrewException = getUnhandledException(nodeList.get(nodeList.size() - 1));
            }
            for (FlowNode node : nodeList) {
                if (nodeThatThrewException == node) {
                    handleException(node, this.relationships.get(node.getId()));
                    continue;
                } else if (node instanceof BlockEndNode) {
                    // Drop End nodes from Pipeline - unless they are responsible for the unhandled
                    // exception.
                    if (isDebugEnabled) {
                        logger.debug("Skipping end node {}, {}", node.getId(), node.getClass());
                    }
                    continue;
                }
                if (isDebugEnabled) {
                    logger.debug("Wrapping {} [{}]", node.getId(), node.getClass());
                }
                FlowNodeWrapper wrappedNode = wrapNode(node, relationships.get(node.getId()));
                // Assign parent.
                FlowNodeWrapper parent = findParentNode(wrappedNode, wrappedNodeMap);
                assignParent(wrappedNode, parent);
                wrappedNodeMap.put(node.getId(), wrappedNode);
            }
        }

        /*
         * Returns the origin of any unhandled exception for this node, or null if none
         * found.
         */
        private @CheckForNull BlockEndNode<?> getUnhandledException(@NonNull FlowNode node) {
            // Check for an unhandled exception.
            ErrorAction errorAction = node.getAction(ErrorAction.class);
            // If this is a Jenkins failure exception, then we don't need to add a new node
            // - it will come from an existing step.
            if (errorAction != null && !PipelineNodeUtil.isJenkinsFailureException(errorAction.getError())) {
                if (isDebugEnabled) {
                    logger.debug(
                            "getUnhandledException => Found unhandled exception: {}",
                            errorAction.getError().getMessage());
                }
                FlowNode nodeThatThrewException = ErrorAction.findOrigin(errorAction.getError(), this.execution);
                if (nodeThatThrewException instanceof BlockEndNode<?>) {
                    if (isDebugEnabled) {
                        logger.debug(
                                "getUnhandledException => Returning nodeThatThrewException: {}",
                                nodeThatThrewException.getId());
                    }
                    return (BlockEndNode<?>) nodeThatThrewException;
                }

                /*
                 * This is a corner case for trivial graphs - ones that only have one action. In
                 * this case the error can be thrown by a the FlowStartNode, which would mean a
                 * single nodes needs to be a stage and a step. Rather than adding a fake node
                 * to the graph, we use the end node that we were given to act as the step
                 * - this might need additional logic when getting the log for the exception.
                 */
                if (node instanceof BlockEndNode<?> && nodes.size() <= 2) {
                    if (isDebugEnabled) {
                        logger.debug("getUnhandledException => Returning node: {}", node.getId());
                    }
                    return (BlockEndNode<?>) node;
                }
                logger.error("Could not find BlockEndNode that threw exception:{}.", errorAction.getDisplayName());
            }
            return null;
        }

        /*
         * Adds any unhandled exception to the graph, assigning the parent at the same
         * time.
         * This should appear in the resultant graph as a NodeType.UNHANDLED_EXCEPTION
         * (the underlying FlowNode class isn't guaranteed).
         */
        private void handleException(
                @NonNull FlowNode nodeWhichThrewException, @NonNull NodeRelationship relationship) {
            assert relationship != null;
            if (isDebugEnabled) {
                logger.debug(
                        "Wrapping nodeWhichThrewException {} [{}]",
                        nodeWhichThrewException.getId(),
                        nodeWhichThrewException.getClass());
            }
            FlowNodeWrapper wrappedNode = wrapNode(nodeWhichThrewException, relationship);
            FlowNode startNode = null;
            startNode = ((BlockEndNode<?>) nodeWhichThrewException).getStartNode();
            assignParent(wrappedNode, startNode);
            wrappedNodeMap.put(wrappedNode.getId(), wrappedNode);
        }

        /*
         * Assigns a given parent FlowNode to a given FlowNodeWrapper.
         */
        private void assignParent(@NonNull FlowNodeWrapper wrappedNode, @CheckForNull FlowNode parent) {
            if (parent != null) {
                if (!wrappedNodeMap.containsKey(parent.getId())) {
                    logger.error(
                            "Couldn't find start of node {} (parent of {}) in wrappedNodeMap.",
                            parent.getId(),
                            wrappedNode.getId());
                } else {
                    FlowNodeWrapper wrappedParent = wrappedNodeMap.get(parent.getId());
                    assignParent(wrappedNode, wrappedParent);
                }
            }
        }

        /*
         * Assigns a given parent FlowNodeWrapper to a given FlowNodeWrapper.
         */
        private void assignParent(@NonNull FlowNodeWrapper wrappedNode, @CheckForNull FlowNodeWrapper wrappedParent) {
            if (wrappedParent != null) {
                if (isDebugEnabled) {
                    logger.debug("Adding parent {} to {}", wrappedParent.getId(), wrappedNode.getId());
                }
                wrappedNode.addParent(wrappedParent);
            }
        }

        /*
         * Finds the first node the list of enclosing nodes not exists in the provided
         * map of nodes.
         */
        private @CheckForNull FlowNodeWrapper findParentNode(
                @NonNull FlowNodeWrapper child, @NonNull Map<String, FlowNodeWrapper> wrappedNodeMap) {
            // Prefer the pre-computed ancestry: FlowNode#getAllEnclosingIds goes through the
            // storage read lock and contends with the running build's writes.
            List<String> enclosingIds;
            if (enclosingIdsByNodeId != null) {
                enclosingIds = enclosingIdsByNodeId.getOrDefault(child.getId(), List.of());
            } else {
                enclosingIds = child.getNode().getAllEnclosingIds();
            }
            Set<String> knownNodes = wrappedNodeMap.keySet();
            for (String possibleParentId : enclosingIds) {
                if (knownNodes.contains(possibleParentId)) {
                    return wrappedNodeMap.get(possibleParentId);
                }
            }
            // Should only happen for the first node in the graph we are remapping.
            return null;
        }

        /*
         * Wraps a FlowNode in a FlowNodeWrapper.
         */
        private @NonNull FlowNodeWrapper wrapNode(@NonNull FlowNode node, @NonNull NodeRelationship relationship) {
            TimingInfo timing = null;
            NodeRunStatus status = null;
            if (relationship instanceof ParallelBlockRelationship parallelRelationship
                    && PipelineNodeUtil.isParallelBranch(node)) {
                timing = parallelRelationship.getBranchTimingInfo(this.run, (BlockStartNode) node);
                status = parallelRelationship.getBranchStatus(this.run, (BlockStartNode) node);
            } else {
                FlowNode start = relationship.getStart();
                FlowNode end = relationship.getEnd();
                // Timing and status for a closed block are stable once the BlockEndNode
                // exists AND the block is no longer active; memoise so subsequent requests
                // don't re-walk actions per block.
                // We must not cache while the start node is still active: the status can
                // still change (e.g. IN_PROGRESS → SUCCESS), and an incorrectly cached
                // value would be returned for the remainder of the run.
                boolean blockClosed = start != end && end instanceof BlockEndNode<?>
                        && (activeNodeIds == null || !activeNodeIds.contains(start.getId()));
                BlockResolutionCache cache = blockClosed
                        ? LiveGraphRegistry.get().blockResolutionCache(execution)
                        : null;
                if (cache != null) {
                    timing = cache.getOrComputeTiming(
                            start.getId(), end.getId(), () -> relationship.getTimingInfo(this.run));
                    // Use the activeNodeIds-aware overload so the set is consulted even for
                    // cached entries — the cache supplier captures activeNodeIds by reference.
                    status = cache.getOrComputeStatus(
                            start.getId(), end.getId(), () -> relationship.getStatus(this.run, activeNodeIds));
                } else {
                    timing = relationship.getTimingInfo(this.run);
                    status = relationship.getStatus(this.run, activeNodeIds);
                }
            }

            InputStep inputStep = null;
            if (node instanceof AtomNode atomNode
                    && PipelineNodeUtil.isPausedForInputStep((StepAtomNode) atomNode, inputAction)) {
                try {
                    for (InputStepExecution execution : inputAction.getExecutions()) {
                        FlowNode theNode = execution.getContext().get(FlowNode.class);
                        if (theNode != null && theNode.equals(atomNode)) {
                            inputStep = execution.getInput();
                            break;
                        }
                    }
                } catch (IOException | InterruptedException | TimeoutException e) {
                    logger.error("Error getting FlowNode from execution context: {}", e.getMessage(), e);
                }
            }

            return new FlowNodeWrapper(node, status, timing, inputStep, this.run);
        }
    }
}
