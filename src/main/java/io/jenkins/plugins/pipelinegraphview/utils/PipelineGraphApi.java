package io.jenkins.plugins.pipelinegraphview.utils;

import static java.util.Collections.emptyList;

import hudson.model.Cause;
import hudson.model.CauseAction;
import hudson.model.Item;
import hudson.model.Queue;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeoutException;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.jenkinsci.plugins.workflow.flow.FlowExecution;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class PipelineGraphApi {
  private static final Logger logger = LoggerFactory.getLogger(PipelineStepApi.class);
  private final transient WorkflowRun run;

  public PipelineGraphApi(WorkflowRun run) {
    this.run = run;
  }

  public Integer replay() throws ExecutionException, InterruptedException, TimeoutException {
    run.checkPermission(Item.BUILD);

    CauseAction causeAction = new CauseAction(new Cause.UserIdCause());

    if (!run.getParent().isBuildable()) {
      return null;
    }

    Queue.Item item = Queue.getInstance().schedule2(run.getParent(), 0, causeAction).getItem();
    if (item == null) {
      return null;
    }

    return run.getParent().getNextBuildNumber();
  }

  private List<PipelineStageInternal> getPipelineNodes() {
    PipelineNodeGraphVisitor builder = new PipelineNodeGraphVisitor(run);
    return builder.getPipelineNodes().stream()
        .map(
            flowNodeWrapper -> {
              String state = flowNodeWrapper.getStatus().getResult().name();
              if (flowNodeWrapper.getStatus().getState() != BlueRun.BlueRunState.FINISHED) {
                state = flowNodeWrapper.getStatus().getState().name().toLowerCase(Locale.ROOT);
              }

              return new PipelineStageInternal(
                  flowNodeWrapper
                      .getId(), // TODO no need to parse it BO returns a string even though the
                  // datatype is number on the frontend
                  flowNodeWrapper.getDisplayName(),
                  flowNodeWrapper.getParents().stream()
                      .map(FlowNodeWrapper::getId)
                      .collect(Collectors.toList()),
                  state,
                  50, // TODO how ???
                  flowNodeWrapper.getType().name(),
                  flowNodeWrapper
                      .getDisplayName(), // TODO blue ocean uses timing information: "Passed in 0s"
                  flowNodeWrapper.isSynthetic());
            })
        .collect(Collectors.toList());
  }

  private Function<String, PipelineStage> mapper(
      Map<String, PipelineStageInternal> stageMap, Map<String, List<String>> stageToChildrenMap) {

    return id -> {
      List<String> orDefault = stageToChildrenMap.getOrDefault(id, emptyList());
      List<PipelineStage> children =
          orDefault.stream().map(mapper(stageMap, stageToChildrenMap)).collect(Collectors.toList());
      return stageMap.get(id).toPipelineStage(children);
    };
  }

  /*
   * Create a Tree from the GraphVisitor.
   * Original source: https://github.com/jenkinsci/workflow-support-plugin/blob/master/src/main/java/org/jenkinsci/plugins/workflow/support/visualization/table/FlowGraphTable.java#L126
   */
  public PipelineGraph createTree() {
    List<PipelineStageInternal> stages = getPipelineNodes();
    List<String> topLevelStageIds = new ArrayList<>();

    // id => stage
    Map<String, PipelineStageInternal> stageMap =
        stages.stream()
            .collect(
                Collectors.toMap(
                    PipelineStageInternal::getId, stage -> stage, (u, v) -> u, LinkedHashMap::new));

    Map<String, List<String>> stageToChildrenMap = new HashMap<>();

    FlowExecution execution = run.getExecution();
    if (execution == null) {
      // If we don't have an execution - e.g. if the Pipeline has a syntax error - then return an
      // empty graph.
      return new PipelineGraph(new ArrayList<>(), false);
    }
    stages.forEach(
        stage -> {
          try {
            FlowNode stageNode = execution.getNode(stage.getId());
            if (stageNode == null) {
              return;
            }
            List<String> ancestors = getAncestors(stage, stageMap);
            String treeParentId = null;
            // Compare the list of GraphVistor ancestors to the IDs of the enclosing node in the
            // execution.
            // If a node encloses another node, it means it's a tree parent, so the first ancestor
            // ID we find
            // which matches an enclosing node then it's the stages tree parent.
            List<String> enclosingIds = stageNode.getAllEnclosingIds();
            for (String ancestorId : ancestors) {
              if (enclosingIds.contains(ancestorId)) {
                treeParentId = ancestorId;
                break;
              }
            }
            if (treeParentId != null) {
              List<String> childrenOfParent =
                  stageToChildrenMap.getOrDefault(treeParentId, new ArrayList<>());
              childrenOfParent.add(stage.getId());
              stageToChildrenMap.put(treeParentId, childrenOfParent);
            } else {
              // If we can't find a matching parent in the execution and GraphVistor then this is a
              // top level node.
              stageToChildrenMap.put(stage.getId(), new ArrayList<>());
              topLevelStageIds.add(stage.getId());
            }
          } catch (java.io.IOException ex) {
            logger.error(
                "Caught a "
                    + ex.getClass().getSimpleName()
                    + " when trying to find parent of stage '"
                    + stage.getName()
                    + "'");
          }
        });

    List<PipelineStage> stageResults =
        stageMap.values().stream()
            .map(
                pipelineStageInternal -> {
                  List<PipelineStage> children =
                      stageToChildrenMap.getOrDefault(pipelineStageInternal.getId(), emptyList())
                          .stream()
                          .map(mapper(stageMap, stageToChildrenMap))
                          .collect(Collectors.toList());

                  return pipelineStageInternal.toPipelineStage(children);
                })
            .filter(stage -> topLevelStageIds.contains(stage.getId()))
            .collect(Collectors.toList());
    return new PipelineGraph(stageResults, execution.isComplete());
  }

  private List<String> getAncestors(
      PipelineStageInternal stage, Map<String, PipelineStageInternal> stageMap) {
    List<String> ancestors = new ArrayList<>();
    if (!stage.getParents().isEmpty()) {
      String parentId = stage.getParents().get(0); // Assume one parent.
      ancestors.add(parentId);
      if (stageMap.containsKey(parentId)) {
        PipelineStageInternal parent = stageMap.get(parentId);
        ancestors.addAll(getAncestors(parent, stageMap));
      }
    }
    return ancestors;
  }
}
