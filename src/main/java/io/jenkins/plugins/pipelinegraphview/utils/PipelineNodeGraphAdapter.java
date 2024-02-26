package io.jenkins.plugins.pipelinegraphview.utils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * @author Tim Brown Adapter class that runs a 'PipelineNodeTreeVisitor' and adapts the outputs to
 *     look more like that of the original PipelineGraphNodeVisitor. The original
 *     PipelineGraphNodeVisitor code can be found here:
 *     https://github.com/jenkinsci/blueocean-plugin/blob/master/blueocean-pipeline-api-impl/src/main/java/io/jenkins/blueocean/rest/impl/pipeline/PipelineNodeTreeVisitor.java
 */
public class PipelineNodeGraphAdapter implements PipelineGraphBuilderApi, PipelineStepBuilderApi {

    private static final Logger logger = LoggerFactory.getLogger(PipelineNodeGraphAdapter.class);
    private boolean isDebugEnabled = true; // logger.isDebugEnabled();
    private PipelineNodeTreeVisitor treeVisitor;
    private boolean isChildrenRemapped = false;
    private List<FlowNodeWrapper> pipelineNodesList;
    private Map<String, List<FlowNodeWrapper>> stepsMap;
    private Map<String, String> nodesToRemap;

    public PipelineNodeGraphAdapter(WorkflowRun run) {
        treeVisitor = new PipelineNodeTreeVisitor(run);
    }

    private Map<String, String> getNodesToRemap(List<FlowNodeWrapper> pipelineNodesList) {
        if (this.nodesToRemap != null) {
            return this.nodesToRemap;
        }
        // Get a map of nodes to remap. The first id is the node to map from, the second is the node to
        // map to.
        // Most of the logic here is to relatecate old behavior - it might not be to everyones liking.
        this.nodesToRemap = new HashMap<String, String>();

        for (int i = pipelineNodesList.size() - 1; i >= 0; i--) {
            FlowNodeWrapper node = pipelineNodesList.get(i);
            for (FlowNodeWrapper parent : node.getParents()) {
                // 1. Parallel Start Nodes that have a Stage with the same name as a parent will be mapped to that
                // parent stage
                // id.
                if (node.getType() == FlowNodeWrapper.NodeType.PARALLEL_BLOCK
                        && parent.getType() == FlowNodeWrapper.NodeType.STAGE) {
                    dump(String.format(
                            "getNodesToRemap => Found Parallel block {id: %s, name: %s, type: %s} that has a Stage {id: %s, name: %s, type: %s} as a parent. Adding to remap list.",
                            node.getId(),
                            node.getDisplayName(),
                            node.getType(),
                            parent.getId(),
                            parent.getDisplayName(),
                            parent.getType()));
                    this.nodesToRemap.put(node.getId(), parent.getId());
                    // Skip other checks.
                    continue;
                }
                // 2. (Declarative) Stages that have a Parallel branch as a parent with the same name as them will be
                // mapped to that
                // parent parallel branch id.
                if (false
                        && treeVisitor.isDeclarative()
                        && node.getType() == FlowNodeWrapper.NodeType.STAGE
                        && parent.getType() == FlowNodeWrapper.NodeType.PARALLEL) {
                    // && parent.getDisplayName() == node.getDisplayName()) {
                    dump(String.format(
                            "getNodesToRemap => (Declarative) Found Stage {id: %s, name: %s, type: %s} that has a Parallel Branch with the name {id: %s, name: %s, type: %s} as a parent. Adding to remap list.",
                            node.getId(),
                            node.getDisplayName(),
                            node.getType(),
                            parent.getId(),
                            parent.getDisplayName(),
                            parent.getType()));
                    this.nodesToRemap.put(node.getId(), parent.getId());
                    // Skip other checks.
                    continue;
                }
                // 3. If the node has a parent has he same name then remap child nodes to that parent. This removes some
                // superfluous stages.
                if (node.getDisplayName().equals(parent.getDisplayName())) {
                    dump(String.format(
                            "getNodesToRemap => (Declarative) Found Stage {id: %s, name: %s, type: %s} that is an only child name has a parnet with the same name {id: %s, name: %s, type: %s}. Adding to remap list.",
                            node.getId(),
                            node.getDisplayName(),
                            node.getType(),
                            parent.getId(),
                            parent.getDisplayName(),
                            parent.getType()));
                    this.nodesToRemap.put(node.getId(), parent.getId());
                    continue;
                }
            }
        }
        for (String nodeId : this.nodesToRemap.keySet()) {
            this.nodesToRemap.put(nodeId, getFinalParent(nodeId, this.nodesToRemap));
        }
        return this.nodesToRemap;
    }

    private Map<String, String> zgetNodesToRemap(List<FlowNodeWrapper> pipelineNodesList) {
        this.nodesToRemap = new HashMap<String, String>();
        return this.nodesToRemap;
    }

    private String getFinalParent(String nodeId, Map<String, String> nodesToRemap) {
        if (nodesToRemap.containsKey(nodeId)) {
            // We only want to calculate this once if we do it after remapping the nodes it will cause
            // issues.
            // So store the result in the class and return it if we have already calculated.
            return getFinalParent(nodesToRemap.get(nodeId), nodesToRemap);
        }
        return nodeId;
    }

    // Print debug message if 'isDebugEnabled' is true.
    private void dump(String message) {
        if (isDebugEnabled) {
            logger.info(message);
        }
    }

    private void dumpNodeGraphviz(
            List<FlowNodeWrapper> localPipelineNodesList, Map<String, List<FlowNodeWrapper>> localStepsMap) {
        List<FlowNodeWrapper> nodes = new ArrayList<FlowNodeWrapper>();
        nodes.addAll(localPipelineNodesList);
        dumpNodeGraphviz(nodes);
    }

    // Useful to dumping node maps to console. These can then be viewed in Graphviz, e.g. online via:
    // https://dreampuf.github.io/GraphvizOnline
    private void dumpNodeGraphviz(List<FlowNodeWrapper> nodes) {
        // if (logger.isTraceEnabled()) {
        String nodeMapStr = String.format("digraph G {%n");
        for (FlowNodeWrapper node : nodes) {
            nodeMapStr += String.format(
                    "  %s [label=\"{id: %s, name: %s, type: %s}\"]%n",
                    node.getId(), node.getId(), node.getDisplayName(), node.getType());
            for (FlowNodeWrapper parent : node.getParents()) {
                nodeMapStr += String.format("  %s -> %s%n", node.getId(), parent.getId());
            }
            if (this.stepsMap != null) {
                for (FlowNodeWrapper step : stepsMap.getOrDefault(node.getId(), new ArrayList<>())) {
                    nodeMapStr += String.format(
                            "  %s [label=\"{id: %s, name: %s, type: %s}\"]%n",
                            step.getId(), step.getId(), step.getDisplayName(), step.getType());
                    nodeMapStr += String.format("  %s -> %s%n", step.getId(), node.getId());
                }
            }
        }
        nodeMapStr += String.format("}");
        logger.info(nodeMapStr);
        // }
    }

    private void remapStageParentage() {
        // We only want to remap nodes once, otherwise we could cause issues.
        // So store the result in the object and return it if we have already done this.
        if (pipelineNodesList != null) {
            return;
        }
        Map<String, FlowNodeWrapper> pipelineNodeMap = treeVisitor.getPipelineNodeMap();

        this.pipelineNodesList = new ArrayList<FlowNodeWrapper>(pipelineNodeMap.values());
        Collections.sort(this.pipelineNodesList, new FlowNodeWrapper.NodeComparator());
        // Remove children whose parents were skipped.
        Map<String, String> nodesToRemap = getNodesToRemap(this.pipelineNodesList);
        dump(String.format(
                "remapStageParentage => nodesToRemap: %s",
                nodesToRemap.entrySet().stream()
                        .map(entrySet -> entrySet.getKey() + ":" + entrySet.getValue())
                        .collect(Collectors.joining(",", "[", "]"))));
        dumpNodeGraphviz(this.pipelineNodesList);
        // Find all nodes that have a parent to remap (see 'getNodesToRemap') and change their parentage
        // to the designated parent.
        for (int i = this.pipelineNodesList.size() - 1; i >= 0; i--) {
            FlowNodeWrapper node = this.pipelineNodesList.get(i);
            List<String> parentIds =
                    node.getParents().stream().map(FlowNodeWrapper::getId).collect(Collectors.toList());
            for (String parentId : parentIds) {
                if (nodesToRemap.containsKey(parentId)) {
                    FlowNodeWrapper parent = pipelineNodeMap.get(parentId);
                    node.removeEdge(parent);
                    node.removeParent(parent);
                    FlowNodeWrapper newParent = pipelineNodeMap.get(nodesToRemap.get(parentId));
                    node.addEdge(newParent);
                    node.addParent(newParent);
                    dump(String.format(
                            "remapStageParentage => Remapped parent node of {id: %s, name: %s, type: %s} from {id: %s, name: %s, type: %s} to {id: %s, name: %s, type: %s}.",
                            node.getId(),
                            node.getDisplayName(),
                            node.getType(),
                            parent.getId(),
                            parent.getDisplayName(),
                            parent.getType(),
                            newParent.getId(),
                            newParent.getDisplayName(),
                            newParent.getType()));
                }
            }
        }
        // Remove remapped nodes from the tree
        this.pipelineNodesList = this.pipelineNodesList.stream()
                .
                // Filter out obsolete Parallel block nodes - ones whose children were remapped to a
                // stage.
                filter(n -> !nodesToRemap.containsKey(n.getId()))
                .
                // Fitter out children from not-run nodes.
                filter(n -> n.getParents().isEmpty()
                        || n.getParents().get(0).getStatus().wasExecuted())
                .collect(Collectors.toList());
        dumpNodeGraphviz(this.pipelineNodesList);
    }

    private void remapStepParentage() {
        // We only want to do this once, so return early if we have an existing value.
        // if (this.stepsMap != null) {
        //  return;
        // }
        this.stepsMap = treeVisitor.getAllSteps();
        dumpNodeGraphviz(getPipelineNodes(), this.stepsMap);
        Map<String, String> nodesToRemap = getNodesToRemap(getPipelineNodes());
        for (Map.Entry<String, String> remapEntry : nodesToRemap.entrySet()) {
            String originalParentId = remapEntry.getKey();
            if (this.stepsMap.containsKey(originalParentId)) {
                String remappedParentId = remapEntry.getValue();
                dump(String.format(
                        "remapStepParentage => Remapping %s steps from stage %s to %s.",
                        this.stepsMap.get(originalParentId).size(), originalParentId, remappedParentId));
                List<FlowNodeWrapper> remappedParentStepsList =
                        this.stepsMap.getOrDefault(remappedParentId, new ArrayList<>());
                remappedParentStepsList.addAll(this.stepsMap.get(originalParentId));
                // Ensure steps are sorted correctly.
                Collections.sort(remappedParentStepsList, new FlowNodeWrapper.NodeComparator());
                this.stepsMap.put(remappedParentId, remappedParentStepsList);
                this.stepsMap.remove(originalParentId);
            }
        }
        dumpNodeGraphviz(getPipelineNodes(), this.stepsMap);
    }

    public List<FlowNodeWrapper> getPipelineNodes() {
        if (this.pipelineNodesList == null) {
            remapStageParentage();
        }
        return this.pipelineNodesList;
    }

    public Map<String, List<FlowNodeWrapper>> getAllSteps() {
        if (this.stepsMap == null) {
            remapStepParentage();
        }
        return this.stepsMap;
    }

    public List<FlowNodeWrapper> getStageSteps(String startNodeId) {
        return getAllSteps().getOrDefault(startNodeId, new ArrayList<FlowNodeWrapper>());
    }
}
