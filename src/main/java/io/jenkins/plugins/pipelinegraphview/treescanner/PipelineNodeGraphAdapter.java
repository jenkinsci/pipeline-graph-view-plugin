package io.jenkins.plugins.pipelinegraphview.treescanner;

import io.jenkins.plugins.pipelinegraphview.utils.FlowNodeWrapper;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineGraphBuilderApi;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineStepBuilderApi;
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
 * @author Tim Brown Adapter class that runs a 'PipelineNodeTreeVisitor' and
 *         adapts the outputs to
 *         look more like that of the original PipelineGraphNodeVisitor. The
 *         original
 *         PipelineGraphNodeVisitor code can be found here:
 *         https://github.com/jenkinsci/blueocean-plugin/blob/master/blueocean-pipeline-api-impl/src/main/java/io/jenkins/blueocean/rest/impl/pipeline/PipelineNodeTreeVisitor.java
 */
public class PipelineNodeGraphAdapter implements PipelineGraphBuilderApi, PipelineStepBuilderApi {

    private static final Logger logger = LoggerFactory.getLogger(PipelineNodeGraphAdapter.class);
    private boolean isDebugEnabled = logger.isDebugEnabled();
    private PipelineNodeTreeScanner treeScanner;
    private List<FlowNodeWrapper> pipelineNodesList;
    private Map<String, List<FlowNodeWrapper>> stepsMap;
    private Map<String, String> nodesToRemap;

    public PipelineNodeGraphAdapter(WorkflowRun run) {
        treeScanner = new PipelineNodeTreeScanner(run);
    }

    private Map<String, String> getNodesToRemap(List<FlowNodeWrapper> pipelineNodesList) {
        if (this.nodesToRemap != null) {
            return this.nodesToRemap;
        }
        // Get a map of nodes to remap. The first id is the node to map from, the second
        // is the node to
        // map to.
        // Most of the logic here is to recreate old behavior - it might not be to
        // everyone's liking.
        this.nodesToRemap = new HashMap<String, String>();
        for (int i = pipelineNodesList.size() - 1; i >= 0; i--) {
            FlowNodeWrapper node = pipelineNodesList.get(i);
            for (FlowNodeWrapper parent : node.getParents()) {
                // Parallel Start Nodes that have a Stage with the same name as a parent will be
                // mapped to that
                // parent stage
                // id.
                if (node.getType() == FlowNodeWrapper.NodeType.PARALLEL_BLOCK
                        && parent.getType() == FlowNodeWrapper.NodeType.STAGE) {
                    if (isDebugEnabled) {
                        logger.debug(
                                "getNodesToRemap => Found Parallel block {id: {}, name: {}, type: {}} that has a Stage {id: {}, name: {}, type: {}} as a parent. Adding to remap list.",
                                node.getId(),
                                node.getDisplayName(),
                                node.getType(),
                                parent.getId(),
                                parent.getDisplayName(),
                                parent.getType());
                    }
                    this.nodesToRemap.put(node.getId(), parent.getId());
                    // Skip other checks.
                    continue;
                }
                // If the node has a parent which is a parallel branch, with the same name and
                // has only one child (this node)
                // then remap child nodes to that parent. This removes some superfluous stages
                // in parallel branches.
                if (parent.getType() == FlowNodeWrapper.NodeType.PARALLEL
                        && node.getDisplayName().equals(parent.getDisplayName())) {
                    if (isDebugEnabled) {
                        logger.debug(
                                "getNodesToRemap => Found Stage {id: {}, name: {}, type: {}} that is an only child and has a parent with the same name {id: {}, name: {}, type: {}}. Adding to remap list.",
                                node.getId(),
                                node.getDisplayName(),
                                node.getType(),
                                parent.getId(),
                                parent.getDisplayName(),
                                parent.getType());
                    }
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

    private String getFinalParent(String nodeId, Map<String, String> nodesToRemap) {
        if (nodesToRemap.containsKey(nodeId)) {
            // We only want to calculate this once if we do it after remapping the nodes it
            // will cause
            // issues.
            // So store the result in the class and return it if we have already calculated.
            return getFinalParent(nodesToRemap.get(nodeId), nodesToRemap);
        }
        return nodeId;
    }

    // Useful for dumping node maps to console. These can then be viewed in dor or
    // online via:
    // https://dreampuf.github.io/GraphvizOnline
    private void dumpNodeGraphviz(
            List<FlowNodeWrapper> localPipelineNodesList, Map<String, List<FlowNodeWrapper>> localStepsMap) {
        if (isDebugEnabled) {
            List<FlowNodeWrapper> nodes = new ArrayList<>(localPipelineNodesList);
            if (stepsMap != null) {
                for (List<FlowNodeWrapper> stepsList : localStepsMap.values()) {
                    nodes.addAll(stepsList);
                }
            }
            if (isDebugEnabled) {
                logger.debug(FlowNodeWrapper.getNodeGraphviz(nodes));
            }
        }
    }

    private void dumpNodeGraphviz(List<FlowNodeWrapper> nodes) {
        dumpNodeGraphviz(nodes, stepsMap);
    }

    private void remapStageParentage() {
        // We only want to remap nodes once, otherwise we could cause issues.
        // So store the result in the object and return it if we have already done this.
        if (pipelineNodesList != null) {
            return;
        }
        Map<String, FlowNodeWrapper> pipelineNodeMap = treeScanner.getPipelineNodeMap();

        this.pipelineNodesList = new ArrayList<FlowNodeWrapper>(pipelineNodeMap.values());
        Collections.sort(this.pipelineNodesList, new FlowNodeWrapper.NodeComparator());
        // Remove children whose parents were skipped.
        Map<String, String> nodesToRemap = getNodesToRemap(this.pipelineNodesList);
        if (isDebugEnabled) {
            logger.debug(
                    "remapStageParentage => nodesToRemap: {}",
                    nodesToRemap.entrySet().stream()
                            .map(entrySet -> entrySet.getKey() + ":" + entrySet.getValue())
                            .collect(Collectors.joining(",", "[", "]")));
        }
        dumpNodeGraphviz(this.pipelineNodesList);
        // Find all nodes that have a parent to remap (see 'getNodesToRemap') and change
        // their parentage
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
                    String newParentId = nodesToRemap.get(parentId);
                    if (newParentId != null) {
                        FlowNodeWrapper newParent = pipelineNodeMap.get(newParentId);
                        node.addEdge(newParent);
                        node.addParent(newParent);
                        if (isDebugEnabled) {
                            logger.debug(
                                    "remapStageParentage => Remapped parent node of {id: {}, name: {}, type: {}} from {id: {}, name: {}, type: {}} to {id: {}, name: {}, type: {}}.",
                                    node.getId(),
                                    node.getDisplayName(),
                                    node.getType(),
                                    parent.getId(),
                                    parent.getDisplayName(),
                                    parent.getType(),
                                    newParent.getId(),
                                    newParent.getDisplayName(),
                                    newParent.getType());
                        }
                    } else {
                        if (isDebugEnabled) {
                            logger.debug(
                                    "remapStageParentage => Removed parent of {id: {}, name: {}, type: {}} - was {id: {}, name: {}, type: {}}.",
                                    node.getId(),
                                    node.getDisplayName(),
                                    node.getType(),
                                    parent.getId(),
                                    parent.getDisplayName(),
                                    parent.getType());
                        }
                    }
                }
            }
        }
        // Remove remapped nodes from the tree
        this.pipelineNodesList = this.pipelineNodesList.stream()
                .
                // Filter out obsolete Parallel block nodes - ones whose children were remapped
                // to a
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
        if (this.stepsMap != null) {
            return;
        }
        this.stepsMap = treeScanner.getAllSteps();
        dumpNodeGraphviz(getPipelineNodes(), this.stepsMap);
        Map<String, String> nodesToRemap = getNodesToRemap(getPipelineNodes());
        for (Map.Entry<String, String> remapEntry : nodesToRemap.entrySet()) {
            String originalParentId = remapEntry.getKey();
            if (this.stepsMap.containsKey(originalParentId)) {
                String remappedParentId = remapEntry.getValue();
                if (isDebugEnabled) {
                    logger.debug(
                            "remapStepParentage => Remapping {} steps from stage {} to {}.",
                            this.stepsMap.get(originalParentId).size(),
                            originalParentId,
                            remappedParentId);
                }
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

    public Map<String, List<FlowNodeWrapper>> getStep() {
        if (this.stepsMap == null) {
            remapStepParentage();
        }
        return this.stepsMap;
    }
}
