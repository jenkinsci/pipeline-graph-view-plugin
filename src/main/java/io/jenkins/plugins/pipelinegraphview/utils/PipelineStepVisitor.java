package io.jenkins.plugins.pipelinegraphview.utils;

import edu.umd.cs.findbugs.annotations.CheckForNull;
import edu.umd.cs.findbugs.annotations.NonNull;
import java.io.IOException;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeoutException;
import org.jenkinsci.plugins.pipeline.modeldefinition.actions.ExecutionModelAction;
import org.jenkinsci.plugins.workflow.cps.nodes.StepAtomNode;
import org.jenkinsci.plugins.workflow.cps.nodes.StepEndNode;
import org.jenkinsci.plugins.workflow.flow.FlowExecution;
import org.jenkinsci.plugins.workflow.graph.AtomNode;
import org.jenkinsci.plugins.workflow.graph.BlockEndNode;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.graphanalysis.ForkScanner;
import org.jenkinsci.plugins.workflow.graphanalysis.MemoryFlowChunk;
import org.jenkinsci.plugins.workflow.graphanalysis.StandardChunkVisitor;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.pipelinegraphanalysis.StageChunkFinder;
import org.jenkinsci.plugins.workflow.pipelinegraphanalysis.StatusAndTiming;
import org.jenkinsci.plugins.workflow.pipelinegraphanalysis.TimingInfo;
import org.jenkinsci.plugins.workflow.support.actions.PauseAction;
import org.jenkinsci.plugins.workflow.support.steps.input.InputAction;
import org.jenkinsci.plugins.workflow.support.steps.input.InputStep;
import org.jenkinsci.plugins.workflow.support.steps.input.InputStepExecution;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Gives steps in a given FlowGraph and assigned them to the nearing stage or parallel block
 * boundary.
 *
 * <p>Original source:
 * https://github.com/jenkinsci/blueocean-plugin/blob/master/blueocean-pipeline-api-impl/src/main/java/io/jenkins/blueocean/rest/impl/pipeline/PipelineStepVisitor.java
 *
 * @author Vivek Pandey
 * @author Tim Brown
 */
public class PipelineStepVisitor extends StandardChunkVisitor {
  private final WorkflowRun run;

  private final ArrayDeque<FlowNodeWrapper> stageSteps = new ArrayDeque<>();

  private final Map<String, FlowNodeWrapper> stepMap = new HashMap<>();
  private final Map<String, List<FlowNodeWrapper>> stageStepMap = new HashMap<>();

  private final ArrayDeque<FlowNode> pendingBlocks = new ArrayDeque<>();

  private FlowNode currentStage;

  private InputAction inputAction;

  private final boolean declarative;

  private static final Logger logger = LoggerFactory.getLogger(PipelineStepVisitor.class);

  public PipelineStepVisitor(WorkflowRun run) {
    this.run = run;
    this.inputAction = run.getAction(InputAction.class);
    declarative = run.getAction(ExecutionModelAction.class) != null;
    FlowExecution execution = run.getExecution();
    if (execution != null) {
      try {
        ForkScanner.visitSimpleChunks(execution.getCurrentHeads(), this, new StageChunkFinder());
      } catch (final Throwable t) {
        // Log run ID, because the eventual exception handler (probably Stapler) isn't specific
        // enough to do so
        logger.debug(
            "Caught a "
                + t.getClass().getSimpleName()
                + " traversing the graph for run "
                + run.getExternalizableId());
        throw t;
      }
    } else {
      logger.debug("Could not find execution for run " + run.getExternalizableId());
    }
  }

  @Override
  public void parallelBranchStart(
      @NonNull FlowNode parallelStartNode,
      @NonNull FlowNode branchStartNode,
      @NonNull ForkScanner scanner) {
    FlowNode finishedBlock = null;
    if (!pendingBlocks.isEmpty()) {
      finishedBlock = pendingBlocks.pop();
      // Finished processing atom nodes in this block
      if (logger.isDebugEnabled()) {
        logger.debug(
            "parallelBranchStart. Removed Node ID: "
                + finishedBlock.getId()
                + "("
                + finishedBlock.getDisplayName()
                + "-"
                + ") from pendingBlocks.");
      }
    }
    if (logger.isDebugEnabled()) {
      logger.debug(
          "parallelBranchStart. Node ID: "
              + branchStartNode.getId()
              + " - "
              + branchStartNode.getDisplayName()
              + " - "
              + PipelineNodeUtil.isStage(branchStartNode)
              + " - "
              + PipelineNodeUtil.isParallelBranch(branchStartNode)
              + " - "
              + PipelineNodeUtil.isSyntheticStage(branchStartNode)
              + " .");
    }

    if (logger.isDebugEnabled()) {
      logger.debug("Pushing steps to stage in parallelBranchStart.");
    }
    // Record which stage the steps belong to this parallel block.
    pushStageStepsToMap(branchStartNode);
  }

  @Override
  public void parallelBranchEnd(
      @NonNull FlowNode parallelStartNode,
      @NonNull FlowNode branchEndNode,
      @NonNull ForkScanner scanner) {
    if (branchEndNode instanceof StepEndNode) {
      FlowNode branchStartNode = ((StepEndNode) branchEndNode).getStartNode();
      if (logger.isDebugEnabled()) {
        logger.debug(
            "Node ID: "
                + branchStartNode.getId()
                + " - "
                + PipelineNodeUtil.isStage(branchStartNode)
                + " - "
                + PipelineNodeUtil.isParallelBranch(branchStartNode)
                + " - "
                + PipelineNodeUtil.isSyntheticStage(branchStartNode)
                + " .");
      }
      pendingBlocks.push(branchStartNode);
    }
  }

  @Override
  public void chunkStart(
      @NonNull FlowNode startNode,
      @CheckForNull FlowNode beforeBlock,
      @NonNull ForkScanner scanner) {
    super.chunkStart(startNode, beforeBlock, scanner);
    FlowNode finishedBlock = null;
    if (!pendingBlocks.isEmpty()) {
      finishedBlock = pendingBlocks.pop();
      // Finished processing atom nodes in this block
      if (logger.isDebugEnabled()) {
        logger.debug(
            "chunkStart. Removed Node ID: "
                + finishedBlock.getId()
                + "("
                + finishedBlock.getDisplayName()
                + "} from pendingBlocks.");
      }
    }
    if (logger.isDebugEnabled()) {
      logger.debug(
          "Node ID: "
              + startNode.getId()
              + " - "
              + startNode.getDisplayName()
              + " - "
              + PipelineNodeUtil.isStage(startNode)
              + " - "
              + PipelineNodeUtil.isParallelBranch(startNode)
              + " - "
              + PipelineNodeUtil.isSyntheticStage(startNode)
              + " .");
    }
    // Do not add steps to this stage if it's parent is a parallel block  and it's a declarative step - (it should get addded to
    // that instead).
    // This could be a quirk of how the GraphVisitor works - possible 
    if (PipelineNodeUtil.isParallelBranch(pendingBlocks.peek()) && isDeclarative()) {
      if (logger.isDebugEnabled()) {
        logger.debug(
            "Not pushing steps to stage '"
                + startNode.getDisplayName()
                + "' in chunkStart as parent is parallel block in declarative pipeline.");
      }
    } else {
      if (logger.isDebugEnabled()) {
        logger.debug("Pushing step to stage in chunkStart.");
      }
      // Record which stage the steps belong to.
      pushStageStepsToMap(startNode);
    }
  }

  @Override
  public void chunkEnd(
      @NonNull FlowNode endNode, @CheckForNull FlowNode afterChunk, @NonNull ForkScanner scanner) {
    super.chunkEnd(endNode, afterChunk, scanner);
    if (endNode instanceof StepEndNode) {
      FlowNode startNode = ((StepEndNode) endNode).getStartNode();
      if (logger.isDebugEnabled()) {
        logger.debug(
            "chunkEnd. Node ID: "
                + startNode.getId()
                + " - "
                + startNode.getDisplayName()
                + " - "
                + PipelineNodeUtil.isStage(startNode)
                + " - "
                + PipelineNodeUtil.isParallelBranch(startNode)
                + " - "
                + PipelineNodeUtil.isSyntheticStage(startNode)
                + " .");
      }
      pendingBlocks.push(startNode);
    }
    if (endNode instanceof StepEndNode
        && PipelineNodeUtil.isStage(((StepEndNode) endNode).getStartNode())) {
      currentStage = ((StepEndNode) endNode).getStartNode();
    } else {
      final String id = endNode.getEnclosingId();
      currentStage =
          endNode.getEnclosingBlocks().stream()
              .filter((block) -> block.getId().equals(id))
              .findFirst()
              .orElse(null);
    }

    // if we're using marker-based (and not block-scoped) stages, add the last node as part of its
    // contents
    if (!(endNode instanceof BlockEndNode)) {
      atomNode(null, endNode, afterChunk, scanner);
    }
  }

  @Override
  public void atomNode(
      @CheckForNull FlowNode before,
      @NonNull FlowNode atomNode,
      @CheckForNull FlowNode after,
      @NonNull ForkScanner scan) {

    if (atomNode instanceof StepAtomNode
        && !PipelineNodeUtil.isSkippedStage(
            currentStage)) { // if skipped stage, we don't collect its steps

      long pause = PauseAction.getPauseDuration(atomNode);
      chunk.setPauseTimeMillis(chunk.getPauseTimeMillis() + pause);

      TimingInfo times = StatusAndTiming.computeChunkTiming(run, pause, atomNode, atomNode, after);

      if (times == null) {
        times = new TimingInfo();
      }

      NodeRunStatus status;
      InputStep inputStep = null;
      if (PipelineNodeUtil.isPausedForInputStep((StepAtomNode) atomNode, inputAction)) {
        status = new NodeRunStatus(BlueRun.BlueRunResult.UNKNOWN, BlueRun.BlueRunState.PAUSED);
        try {
          for (InputStepExecution execution : inputAction.getExecutions()) {
            FlowNode node = execution.getContext().get(FlowNode.class);
            if (node != null && node.equals(atomNode)) {
              inputStep = execution.getInput();
              break;
            }
          }
        } catch (IOException | InterruptedException | TimeoutException e) {
          logger.error("Error getting FlowNode from execution context: " + e.getMessage(), e);
        }
      } else {
        status = new NodeRunStatus(atomNode);
      }

      FlowNodeWrapper stepNode = new FlowNodeWrapper(atomNode, status, times, inputStep, run);
      stepMap.put(stepNode.getId(), stepNode);
      if (logger.isDebugEnabled()) {
        logger.debug(
            "Pushing step: "
                + stepNode.getId()
                + "("
                + stepNode.getArgumentsAsString()
                + ") to stack.");
      }

      stageSteps.push(stepNode);
      if (logger.isDebugEnabled()) {
        logger.debug("Steps in stack:");
        for (FlowNodeWrapper step : stageSteps) {
          logger.debug(" - " + step.getArgumentsAsString());
        }
      }
    }
  }

  public List<FlowNodeWrapper> getStageSteps(String startNodeId) {
    return stageStepMap.getOrDefault(startNodeId, new ArrayList<>());
  }

  public Map<String, List<FlowNodeWrapper>> getAllSteps() {
    return stageStepMap;
  }

  public FlowNodeWrapper getStep(String id) {
    return stepMap.get(id);
  }

  public boolean isDeclarative() {
    return declarative;
  }

  private void pushStageStepsToMap(FlowNode stage) {
    List<FlowNodeWrapper> stageStepsList =
        stageStepMap.getOrDefault(stage.getId(), new ArrayList<>());
    for (FlowNodeWrapper step : stageSteps) {
      if (logger.isDebugEnabled()) {
        logger.debug(
            "Adding step '"
                + step.getArgumentsAsString()
                + "' to '"
                + stage.getId()
                + "' "
                + "("
                + stage.getDisplayName()
                + ") .");
      }

      stageStepsList.add(step);
    }
    if (logger.isDebugEnabled()) {
      logger.debug("Assigning parent stage for " + stageSteps.size() + " steps.");
    }

    stageSteps.clear();
    stageStepMap.put(stage.getId(), stageStepsList);
  }

  static class LocalAtomNode extends AtomNode {
    private final String cause;

    public LocalAtomNode(MemoryFlowChunk chunk, String cause) {
      super(
          chunk.getFirstNode().getExecution(), UUID.randomUUID().toString(), chunk.getFirstNode());
      this.cause = cause;
    }

    @Override
    protected String getTypeDisplayName() {
      return cause;
    }
  }
}
