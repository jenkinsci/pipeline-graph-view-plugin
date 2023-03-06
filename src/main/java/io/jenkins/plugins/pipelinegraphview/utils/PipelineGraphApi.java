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

  private List<PipelineStageInternal> getPipelineNodes(PipelineNodeGraphAdapter builder) {
    return builder.getPipelineNodes().stream()
        .map(
            flowNodeWrapper -> {
              String state = flowNodeWrapper.getStatus().getResult().name();
              // TODO: Why do we do this? Seems like it will return uppercase for some states and
              // lowercase for others?
              if (flowNodeWrapper.getStatus().getState() != BlueRun.BlueRunState.FINISHED) {
                state = flowNodeWrapper.getStatus().getState().name().toLowerCase(Locale.ROOT);
              }
              String displayName = flowNodeWrapper.getDisplayName();
              if (flowNodeWrapper.getType() == FlowNodeWrapper.NodeType.PARALLEL_BLOCK) {
                displayName = "Parallel";
              }
              return new PipelineStageInternal(
                  flowNodeWrapper
                      .getId(), // TODO no need to parse it BO returns a string even though the
                  // datatype is number on the frontend
                  displayName,
                  flowNodeWrapper.getParents().stream()
                      .map(FlowNodeWrapper::getId)
                      .collect(Collectors.toList()),
                  state,
                  50, // TODO how ???
                  flowNodeWrapper.getType().name(),
                  flowNodeWrapper
                      .getDisplayName(), // TODO blue ocean uses timing information: "Passed in 0s"
                  flowNodeWrapper.isSynthetic(),
                  flowNodeWrapper.getTiming());
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

  public PipelineGraph createTree() {
    PipelineNodeGraphAdapter builder = new PipelineNodeGraphAdapter(run);
    // We want to remap children here, so we don't update the parents of the original objects - as these are completely new representations.
    List<PipelineStageInternal> stages = getPipelineNodes(builder);

    // id => stage
    Map<String, PipelineStageInternal> stageMap =
        stages.stream()
            .collect(
                Collectors.toMap(
                    PipelineStageInternal::getId, stage -> stage, (u, v) -> u, LinkedHashMap::new));

    Map<String, List<String>> stageToChildrenMap = new HashMap<>();
    List<String> childNodes = new ArrayList<>();

    FlowExecution execution = run.getExecution();
    if (execution == null) {
      // If we don't have an execution - e.g. if the Pipeline has a syntax error - then return an
      // empty graph.
      return new PipelineGraph(new ArrayList<>(), false);
    }
    stages.forEach(
        stage -> {
          if (stage.getParents().isEmpty()) {
            stageToChildrenMap.put(stage.getId(), new ArrayList<>());
          } else {
            List<String> parentChildren = stageToChildrenMap.getOrDefault(stage.getParents().get(0), new ArrayList<String>());
            parentChildren.add(stage.getId());
            childNodes.add(stage.getId());
            stageToChildrenMap.put(stage.getParents().get(0), parentChildren);
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
            .filter(stage -> !childNodes.contains(stage.getId()))
            .collect(Collectors.toList());
    return new PipelineGraph(stageResults, execution != null && execution.isComplete());
  }
}
