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
 *     look more like that of the PipelineGraphNodeVisitor.
 */
public class PipelineNodeGraphAdapter {

  private static final Logger logger = LoggerFactory.getLogger(PipelineNodeGraphAdapter.class);
  private boolean isDebugEnabled = logger.isDebugEnabled();
  private PipelineNodeTreeVisitor treeVisitor;

  public PipelineNodeGraphAdapter(WorkflowRun run) {
    treeVisitor = new PipelineNodeTreeVisitor(run);
  }

  private Map<String, String> getNodesToRemap() {
    // Get a map of nodes to remap. The first id is the node to map from, the second is the node to
    // map to.
    Map<String, String> remappedStages = new HashMap<String, String>();
    List<FlowNodeWrapper> pipelineNodesList = treeVisitor.getPipelineNodes();
    for (FlowNodeWrapper node : pipelineNodesList) {
      for (FlowNodeWrapper parent : node.getParents()) {
        // 1. Parallel Start Nodes that have a Stage as a parent will be mapped to that parent stage
        // id.
        if (node.getType() == FlowNodeWrapper.NodeType.PARALLEL_BLOCK
            && parent.getType() == FlowNodeWrapper.NodeType.STAGE) {
          dump(
              String.format(
                  "getNodesToRemap => Found Parallel block {id: %s, name: %s, type: %s} that has a Stage {id: %s, name: %s, type: %s} as a parent. Adding to remap list.",
                  node.getId(),
                  node.getDisplayName(),
                  node.getType(),
                  parent.getId(),
                  parent.getDisplayName(),
                  parent.getType()));
          remappedStages.put(node.getId(), parent.getId());
        }
        // 2. (Declarative) Stages that have a Parallel branch as a parent will be mapped to that
        // parent stage id.
        if (treeVisitor.isDeclarative()
            && node.getType() == FlowNodeWrapper.NodeType.STAGE
            && parent.getType() == FlowNodeWrapper.NodeType.PARALLEL) {
          dump(
              String.format(
                  "getNodesToRemap => (Declarative) Found Stage {id: %s, name: %s, type: %s} that has a Parallel Branch {id: %s, name: %s, type: %s} parent. Adding to remap list.",
                  node.getId(),
                  node.getDisplayName(),
                  node.getType(),
                  parent.getId(),
                  parent.getDisplayName(),
                  parent.getType()));
          remappedStages.put(node.getId(), parent.getId());
        }
      }
    }
    return remappedStages;
  }

  // Print debug message if 'isDebugEnabled' is true.
  private void dump(String message) {
    if (isDebugEnabled) {
      logger.debug(message);
    }
  }

  // Useful to dumping node maps to console. These can then be viewed in Graphviz, e.g. online via:
  // https://dreampuf.github.io/GraphvizOnline
  private void dumpNodeGraphviz(List<FlowNodeWrapper> nodes) {
    if (logger.isTraceEnabled()) {
      String nodeMapStr = "";
      for (FlowNodeWrapper node : nodes) {
        for (FlowNodeWrapper parent : node.getParents()) {
          nodeMapStr += String.format("%s -> %s%n", node.getId(), parent.getId());
        }
      }
      logger.trace(nodeMapStr);
    }
  }

  public List<FlowNodeWrapper> getPipelineNodes() {
    Map<String, FlowNodeWrapper> pipelineNodeMap = treeVisitor.getPipelineNodeMap();
    List<FlowNodeWrapper> pipelineNodesList =
        new ArrayList<FlowNodeWrapper>(pipelineNodeMap.values());
    Collections.sort(pipelineNodesList, new FlowNodeWrapper.NodeComparator());
    // Remove children whoes parents were skipped.#
    Map<String, String> remappedStages = getNodesToRemap();
    dump(
        String.format(
            "getPipelineNodes => remappedStages: %s",
            remappedStages.entrySet().stream()
                .map(entrySet -> entrySet.getKey() + ":" + entrySet.getValue())
                .collect(Collectors.joining(",", "[", "]"))));
    dumpNodeGraphviz(pipelineNodesList);
    List<String> obsoleteParallelBlocks = new ArrayList<String>();
    // Find all nodes that have a parent to remap (see 'getNodesToRemap') and change their parentage
    // to the designated parent.
    for (int i = pipelineNodesList.size() - 1; i >= 0; i--) {
      FlowNodeWrapper node = pipelineNodesList.get(i);
      List<String> parentIds =
          node.getParents().stream().map(FlowNodeWrapper::getId).collect(Collectors.toList());
      for (String parentId : parentIds) {
        if (remappedStages.containsKey(parentId)) {
          FlowNodeWrapper parent = pipelineNodeMap.get(parentId);
          node.removeEdge(parent);
          node.removeParent(parent);
          FlowNodeWrapper newParent = pipelineNodeMap.get(remappedStages.get(parentId));
          node.addEdge(newParent);
          node.addParent(newParent);
          dump(
              String.format(
                  "getPipelineNodes => Remapped parent node of {id: %s, name: %s, type: %s} from {id: %s, name: %s, type: %s} to {id: %s, name: %s, type: %s}.",
                  node.getId(),
                  node.getDisplayName(),
                  node.getType(),
                  parent.getId(),
                  parent.getDisplayName(),
                  parent.getType(),
                  newParent.getId(),
                  newParent.getDisplayName(),
                  newParent.getType()));
          // If we just dropped a parallel block then remove it from the graph.
          if (parent.getType() == FlowNodeWrapper.NodeType.PARALLEL_BLOCK) {
            obsoleteParallelBlocks.add(parent.getId());
          }
        }
      }
    }
    pipelineNodesList =
        pipelineNodesList.stream()
            .
            // Remove obsolete Parallel block nodes - ones whoes children were remapped to a stage.
            filter(n -> !obsoleteParallelBlocks.contains(n.getId()))
            .
            // Remove children from not-run nodes.
            filter(
                n -> n.getParents().isEmpty() || n.getParents().get(0).getStatus().wasExecuted())
            .collect(Collectors.toList());
    
    dumpNodeGraphviz(pipelineNodesList);
    return pipelineNodesList;
  }

  public Map<String, List<FlowNodeWrapper>> getAllSteps() {
    Map<String, List<FlowNodeWrapper>> stepsMap = treeVisitor.getAllSteps();
    Map<String, String> remappedStages = getNodesToRemap();
    for (String originalParentId : remappedStages.keySet()) {
      if (stepsMap.containsKey(originalParentId)) {
        String remappedParentId = remappedStages.get(originalParentId);
        List<FlowNodeWrapper> remappedParentStepsList =
            stepsMap.getOrDefault(remappedParentId, new ArrayList<FlowNodeWrapper>());
        remappedParentStepsList.addAll(stepsMap.get(originalParentId));
        // Ensure steps are sorted correctly.
        Collections.sort(remappedParentStepsList, new FlowNodeWrapper.NodeComparator());
        stepsMap.put(remappedParentId, remappedParentStepsList);
      }
    }
    stepsMap.entrySet().stream()
        .filter(e -> !(remappedStages.containsKey(e.getKey())))
        .map(Map.Entry::getKey)
        .collect(Collectors.toList())
        .forEach(remappedStages.keySet()::remove);

    return stepsMap;
  }

  public List<FlowNodeWrapper> getStageSteps(String startNodeId) {
    return getAllSteps().getOrDefault(startNodeId, new ArrayList<FlowNodeWrapper>());
  }
}
