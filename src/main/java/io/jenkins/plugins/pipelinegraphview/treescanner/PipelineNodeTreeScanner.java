package io.jenkins.plugins.pipelinegraphview.treescanner;

import edu.umd.cs.findbugs.annotations.CheckForNull;
import edu.umd.cs.findbugs.annotations.NonNull;
import io.jenkins.plugins.pipelinegraphview.utils.FlowNodeWrapper;
import io.jenkins.plugins.pipelinegraphview.utils.NodeRunStatus;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineNodeUtil;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.jenkinsci.plugins.pipeline.modeldefinition.actions.ExecutionModelAction;
import org.jenkinsci.plugins.workflow.actions.ErrorAction;
import org.jenkinsci.plugins.workflow.flow.FlowExecution;
import org.jenkinsci.plugins.workflow.graph.BlockEndNode;
import org.jenkinsci.plugins.workflow.graph.BlockStartNode;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.graphanalysis.DepthFirstScanner;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.pipelinegraphanalysis.TimingInfo;
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

    /**
     * Point in time snapshot of all the active heads.
     */
    private List<FlowNode> heads;

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

    // Print debug message if 'isDebugEnabled' is true.
    private void dump(String message, Object... args) {
        if (isDebugEnabled) {
            logger.debug(String.format(message, args));
        }
    }

    /**
     * Builds the flow node graph.
     */
    public void build() {
        dump("Building graph");
        if (execution != null) {
            LinkedHashMap<String, FlowNode> nodes = getAllNodes();
            NodeRelationshipFinder finder = new NodeRelationshipFinder();
            LinkedHashMap<String, NodeRelationship> relationships = finder.getNodeRelationships(nodes);
            GraphBuilder builder = new GraphBuilder(nodes, relationships, this.run, this.execution);
            dump("Original nodes:");
            dump(FlowNodeWrapper.getNodeGraphviz(builder.getNodes()));
            this.stageNodeMap = builder.getStageMapping();
            this.stepNodeMap = builder.getStepMapping();
            List<FlowNodeWrapper> remappedNodes = new ArrayList<>(this.stageNodeMap.values());
            remappedNodes.addAll(this.stepNodeMap.values());
            dump("Remapped nodes:");
            dump(FlowNodeWrapper.getNodeGraphviz(remappedNodes));
        } else {
            this.stageNodeMap = new LinkedHashMap<>();
            this.stepNodeMap = new LinkedHashMap<>();
        }
        dump("Graph built");
    }

    /**
     * Gets all the nodes that are reachable in the graph.
     */
    private LinkedHashMap<String, FlowNode> getAllNodes() {
        heads = execution.getCurrentHeads();
        final DepthFirstScanner scanner = new DepthFirstScanner();
        scanner.setup(heads);

        // nodes that we've visited
        final LinkedHashMap<String, FlowNode> nodeMap = new LinkedHashMap<>();

        for (FlowNode n : scanner) {
            nodeMap.put(n.getId(), n);
        }
        return nodeMap;
    }

    @NonNull
    public List<FlowNodeWrapper> getStageSteps(String startNodeId) {
        List<FlowNodeWrapper> stageSteps = new ArrayList<>();
        FlowNodeWrapper wrappedStage = stageNodeMap.get(startNodeId);
        for (FlowNodeWrapper wrappedStep : stepNodeMap.values()) {
            if (wrappedStep.getParents().contains(wrappedStage)) {
                stageSteps.add(wrappedStep);
            }
        }
        Collections.sort(stageSteps, new FlowNodeWrapper.NodeComparator());
        dump("Returning %s steps for node '%s'", stageSteps.size(), startNodeId);
        return stageSteps;
    }

    @NonNull
    public Map<String, List<FlowNodeWrapper>> getAllSteps() {
        Map<String, List<FlowNodeWrapper>> stageNodeStepMap = new LinkedHashMap<>();
        for (String stageId : stageNodeMap.keySet()) {
            stageNodeStepMap.put(stageId, getStageSteps(stageId));
        }

        return stageNodeStepMap;
    }

    @NonNull
    public List<FlowNodeWrapper> getPipelineNodes() {
        List<FlowNodeWrapper> stageNodes = new ArrayList<>(this.stageNodeMap.values());
        Collections.sort(stageNodes, new FlowNodeWrapper.NodeComparator());
        return stageNodes;
    }

    @NonNull
    public Map<String, FlowNodeWrapper> getPipelineNodeMap() {
        return this.stageNodeMap;
    }

    @NonNull
    public boolean isDeclarative() {
        return this.declarative;
    }

    private class GraphBuilder {
        private final Map<String, FlowNode> nodeMap;
        private final Map<String, NodeRelationship> relationships;
        private final WorkflowRun run;

        @NonNull
        private final FlowExecution execution;

        private Map<String, FlowNodeWrapper> wrappedNodeMap = new LinkedHashMap<>();
        // These two are populated when required using by filtering unwanted nodes from
        // 'wrappedNodeMap' into a new map.
        private Map<String, FlowNodeWrapper> wrappedStepMap;
        private Map<String, FlowNodeWrapper> wrappedStageMap;

        // The root stage in the graph. We assign any unhandled exceptions to this.
        // FlowNodeWrapper rootStage = null;

        private final Logger logger = LoggerFactory.getLogger(GraphBuilder.class);
        private boolean isDebugEnabled = logger.isDebugEnabled();

        /*
         * Builds a graph representing this Execution. Stages an steps aer represented
         * in the same graph.
         */
        public GraphBuilder(
                @NonNull Map<String, FlowNode> nodeMap,
                @NonNull Map<String, NodeRelationship> relationships,
                @NonNull WorkflowRun run,
                @NonNull FlowExecution execution) {
            this.nodeMap = nodeMap;
            this.relationships = relationships;
            this.run = run;
            this.execution = execution;
            buildGraph();
        }

        // Print debug message if 'isDebugEnabled' is true.
        private void dump(String message, Object... args) {
            if (isDebugEnabled) {
                logger.debug(String.format(message, args));
            }
        }

        protected List<FlowNodeWrapper> getNodes() {
            return wrappedNodeMap.entrySet().stream()
                    .map(entrySet -> entrySet.getValue())
                    .collect(Collectors.toList());
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
            dump("Remapping stages");
            // Find any root stages (ones without parents) that have steps - we want to return these.
            // This should only be FlowNodeStart nodes, but I want to be flexible - if a Stage has steps then the
            // step view should display it.
            // NOTE: In instances where this isn't the FlowNodeStart, this might add an unexpected FlowNode to the graph
            // view.
            List<FlowNodeWrapper> rootStagesWithSteps = getStagesWithChildSteps().stream()
                    .filter(s -> s.getFirstParent() == null)
                    .collect(Collectors.toList());
            Map<String, FlowNodeWrapper> stageMap = this.wrappedNodeMap.entrySet().stream()
                    .filter(e -> rootStagesWithSteps.contains(e.getValue()) || shouldBeInStageMap(e.getValue()))
                    .collect(Collectors.toMap(e -> e.getKey(), e -> e.getValue()));
            List<FlowNodeWrapper> nodeList = new ArrayList<FlowNodeWrapper>(stageMap.values());
            Collections.sort(nodeList, new FlowNodeWrapper.NodeComparator());
            for (FlowNodeWrapper stage : nodeList) {
                FlowNodeWrapper firstParent = stage.getFirstParent();
                // Remap parentage of stages that aren't children of stages (e.g. allocate node
                // step).
                dump("First parent of stage %s: %s", stage.getId(), firstParent);
                if (firstParent != null) {
                    dump("Parent exists in stage map: %s", stageMap.containsKey(firstParent.getId()));
                }
                if (firstParent != null && !stageMap.containsKey(firstParent.getId())) {
                    stageMap.put(stage.getId(), remapNode(stage, stageMap));
                }
            }
            this.wrappedStageMap = stageMap;
            return this.wrappedStageMap;
        }

        /* Filter wrappedNodes to get list of steps.
         */
        private Map<String, FlowNodeWrapper> getSteps() {
            return this.wrappedNodeMap.entrySet().stream()
                    .filter(e -> shouldBeInStepMap(e.getValue()))
                    .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
        }

        /* Filter wrappedNodes to get list of steps.
         */
        private List<FlowNodeWrapper> getStagesWithChildSteps() {
            return getSteps().entrySet().stream()
                    .map(e -> e.getValue().getFirstParent())
                    .filter(p -> p != null)
                    .map(p -> wrappedNodeMap.get(p.getId()))
                    .collect(Collectors.toList());
        }

        private boolean shouldBeInStageMap(FlowNodeWrapper n) {
            // We also want to drop steps blocks - as the front-end doesn't expect them.
            // For the future: Adding Step Blocks as stages might be a good way to handle them in the
            // future.
            return !shouldBeInStepMap(n) && !isSuperfluousStartNode(n) && !n.isStepsBlock();
        }

        /*
         * Returns true if this is a start node that we can safely drop.
         * We only want to keep start nodes that we to represent unhandled exceptions in
         * the stages map.
         * Put another way, we only want to need the 'PIPELINE_START' stage if it houses an unhandled exception.
         */
        private boolean isSuperfluousStartNode(FlowNodeWrapper n) {
            return n.getType() == FlowNodeWrapper.NodeType.PIPELINE_START && !n.isUnhandledException();
        }

        /*
         * Remaps (creates a new) FlowNodeWrapper for nodes that are children of nodes
         * that don't exist in the final graph.
         * The new parents will be the closest ancestor in the graph, as determined by
         * findParentNode.
         */
        private @NonNull FlowNodeWrapper remapNode(
                @NonNull FlowNodeWrapper wrappedNode, @NonNull Map<String, FlowNodeWrapper> stageMap) {
            dump("Remapping node %s, %s", wrappedNode.getId(), wrappedNode.getClass());
            // Create new wrapper as we don't want to change the old one.
            FlowNodeWrapper remappedNode = new FlowNodeWrapper(
                    wrappedNode.getNode(),
                    wrappedNode.getStatus(),
                    wrappedNode.getTiming(),
                    wrappedNode.getInputStep(),
                    wrappedNode.getRun(),
                    wrappedNode.getType());
            FlowNodeWrapper closestParent = findParentNode(wrappedNode, stageMap);
            dump(
                    "Found closest parent for node %s, %s",
                    wrappedNode.getId(), (closestParent != null) ? closestParent.getId() : "null");
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

            dump("Remapping steps");
            Map<String, FlowNodeWrapper> stepMap = getSteps();
            Map<String, FlowNodeWrapper> stageMap = this.getStageMapping();
            List<FlowNodeWrapper> nodeList = new ArrayList<FlowNodeWrapper>(stepMap.values());
            nodeList.sort(new FlowNodeWrapper.NodeComparator());
            for (FlowNodeWrapper step : nodeList) {
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
            List<FlowNode> nodeList = new ArrayList<>(nodeMap.values());
            nodeList.sort(new FlowNodeWrapper.FlowNodeComparator());
            // If the Pipeline ended with an unhandled exception, then we want to catch the
            // node which threw it.
            BlockEndNode<?> nodeThatThrewException = null;
            if (!nodeList.isEmpty()) {
                boolean hasStage = nodeList.stream().anyMatch(PipelineNodeUtil::isStage);

                nodeThatThrewException = getUnhandledException(nodeList.get(nodeList.size() - 1), hasStage);
            }
            for (FlowNode node : nodeList) {
                if (nodeThatThrewException == node) {
                    handleException(node, this.relationships.get(node.getId()));
                    continue;
                } else if (node instanceof BlockEndNode) {
                    // Drop End nodes from Pipeline - unless they are responsible for the unhandled
                    // exception.
                    dump("Skipping end node %s, %s", node.getId(), node.getClass());
                    continue;
                }
                dump("Wrapping %s [%s]", node.getId(), node.getClass());
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
        private @CheckForNull BlockEndNode<?> getUnhandledException(@NonNull FlowNode node, boolean hasStage) {
            // Check for an unhandled exception.
            ErrorAction errorAction = node.getAction(ErrorAction.class);
            if (errorAction != null) {
                // If this is a Jenkins failure exception, then we don't need to add a new node
                // - it will come from an existing step if there is a stage for the step to be part of.
                if (hasStage && PipelineNodeUtil.isJenkinsFailureException(errorAction.getError())) {
                    return null;
                }
                dump(
                        "getUnhandledException => Found unhandled exception: %s",
                        errorAction.getError().getMessage());
                FlowNode nodeThatThrewException = ErrorAction.findOrigin(errorAction.getError(), this.execution);
                if (nodeThatThrewException instanceof BlockEndNode<?>) {
                    dump(
                            "getUnhandledException => Returning nodeThatThrewException: %s",
                            nodeThatThrewException.getId());
                    return (BlockEndNode<?>) nodeThatThrewException;
                }

                /*
                 * This is a corner case for trivial graphs - ones that only have one action. In
                 * this case the error can be thrown by a the FlowStartNode, which would mean a
                 * single node needs to be a stage and a step. Rather than adding a fake node
                 * to the graph, we use the end node that we were given to act as the step
                 * - this might need additional logic when getting the log for the exception.
                 */
                if (node instanceof BlockEndNode<?> && nodeMap.values().size() <= 2) {
                    dump("getUnhandledException => Returning node: %s", node.getId());
                    return (BlockEndNode<?>) node;
                }
                logger.error(String.format(
                        "Could not find BlockEndNode that threw exception:%n%s.", errorAction.getDisplayName()));
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
            dump(
                    "Wrapping nodeWhichThrewException %s [%s]",
                    nodeWhichThrewException.getId(), nodeWhichThrewException.getClass());
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
                    logger.error(String.format(
                            "Couldn't find start of node %s (parent of %s) in wrappedNodeMap.",
                            parent.getId(), wrappedNode.getId()));
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
                dump("Adding parent %s to %s", wrappedParent.getId(), wrappedNode.getId());
                wrappedNode.addParent(wrappedParent);
            }
        }

        /*
         * Finds the first node the list of enclosing nodes not exists in the provided
         * map of nodes.
         */
        private @CheckForNull FlowNodeWrapper findParentNode(
                @NonNull FlowNodeWrapper child, @NonNull Map<String, FlowNodeWrapper> wrappedNodeMap) {
            List<String> enclosingIds = child.getNode().getAllEnclosingIds();
            Set<String> knownNodes = wrappedNodeMap.keySet();
            for (String possibleParentId : enclosingIds) {
                dump("Checking if %s in %s", possibleParentId, String.join(", ", knownNodes));
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
            if (relationship instanceof ParallelBlockRelationship && PipelineNodeUtil.isParallelBranch(node)) {
                ParallelBlockRelationship parallelRelationship = (ParallelBlockRelationship) relationship;
                timing = parallelRelationship.getBranchTimingInfo(this.run, (BlockStartNode) node);
                status = parallelRelationship.getBranchStatus(this.run, (BlockStartNode) node);
            } else {
                timing = relationship.getTimingInfo(this.run);
                status = relationship.getStatus(this.run);
            }
            return new FlowNodeWrapper(node, status, timing, this.run);
        }
    }
}
