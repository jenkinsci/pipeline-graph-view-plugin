package io.jenkins.plugins.pipelinegraphview.utils;

import edu.umd.cs.findbugs.annotations.CheckForNull;
import edu.umd.cs.findbugs.annotations.NonNull;
import edu.umd.cs.findbugs.annotations.Nullable;
import io.jenkins.plugins.pipelinegraphview.utils.BlueRun.BlueRunResult;
import java.io.IOException;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeoutException;
import org.jenkinsci.plugins.workflow.cps.nodes.StepAtomNode;
import org.jenkinsci.plugins.workflow.cps.nodes.StepEndNode;
import org.jenkinsci.plugins.workflow.cps.nodes.StepStartNode;
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
 * Gives steps inside
 *
 * <p>- Stage boundary: Stage boundary ends where another stage start or this stage block ends -
 * branch boundary: branch block boundary
 *
 * <p>Original source:
 * https://github.com/jenkinsci/blueocean-plugin/blob/master/blueocean-pipeline-api-impl/src/main/java/io/jenkins/blueocean/rest/impl/pipeline/PipelineStepVisitor.java
 *
 * @author Vivek Pandey
 */
public class PipelineStepVisitor extends StandardChunkVisitor {
  private final FlowNode node;
  private final WorkflowRun run;

  private final ArrayDeque<FlowNodeWrapper> steps = new ArrayDeque<>();
  private final ArrayDeque<FlowNodeWrapper> stageSteps = new ArrayDeque<>();
  private final ArrayDeque<FlowNodeWrapper> preSteps = new ArrayDeque<>();
  private final ArrayDeque<FlowNodeWrapper> postSteps = new ArrayDeque<>();

  private final Map<String, FlowNodeWrapper> stepMap = new HashMap<>();
  private final Map<String, List<FlowNodeWrapper>> stageStepMap = new HashMap<>();

  private final ArrayDeque<FlowNode> pendingBlocks = new ArrayDeque<>();

  private boolean stageStepsCollectionCompleted = false;

  private boolean inStageScope;

  private FlowNode currentStage;

  private ArrayDeque<FlowNode> stages = new ArrayDeque<>();
  private InputAction inputAction;
  private StepEndNode closestEndNode;
  private StepStartNode agentNode = null;

  private static final Logger logger = LoggerFactory.getLogger(PipelineStepVisitor.class);

  public PipelineStepVisitor(WorkflowRun run, @Nullable final FlowNode node) {
    this.node = node;
    this.run = run;
    this.inputAction = run.getAction(InputAction.class);
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

  //@Override
  public void xxxparallelBranchStart(
      @NonNull FlowNode parallelStartNode,
      @NonNull FlowNode branchStartNode,
      @NonNull ForkScanner scanner) {
    if (!pendingBlocks.isEmpty()) {
      // Finished processing atom nodes in this block
      FlowNode finishedBlock = pendingBlocks.pop();
      if (logger.isDebugEnabled()) {
        logger.debug("parallelBranchStart. Removed Node ID: " + finishedBlock.getId() + "(" + finishedBlock.getDisplayName() + "-" + ") from pendingBlocks.");
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

    if (stageStepsCollectionCompleted) { // skip
      return;
    }
    if (branchStartNode.equals(node)) {
      stageStepsCollectionCompleted = true;
    } else if (PipelineNodeUtil.isParallelBranch(node) && !branchStartNode.equals(node)) {
      resetSteps();
    }
  }

  @Override
  public void chunkStart(
      @NonNull FlowNode startNode,
      @CheckForNull FlowNode beforeBlock,
      @NonNull ForkScanner scanner) {
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
    super.chunkStart(startNode, beforeBlock, scanner);
    if (PipelineNodeUtil.isStage(startNode)) {
      stages.push(startNode);
    }
    if (logger.isDebugEnabled()) {
      logger.debug("Pushing steps to stage in chunkStart.");
    }
    // Record which stage the steps belong to.
    pushStageStepsToMap(startNode);
  }

  @Override
  public void chunkEnd(
      @NonNull FlowNode endNode, @CheckForNull FlowNode afterChunk, @NonNull ForkScanner scanner) {
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

    super.chunkEnd(endNode, afterChunk, scanner);
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
    if (node != null
        && endNode instanceof StepEndNode
        && ((StepEndNode) endNode).getStartNode().equals(node)) {
      this.stageStepsCollectionCompleted = false;
      this.inStageScope = true;
    }
    if (endNode instanceof StepStartNode && PipelineNodeUtil.isAgentStart(endNode)) {
      agentNode = (StepStartNode) endNode;
    }

    // if we're using marker-based (and not block-scoped) stages, add the last node as part of its
    // contents
    if (!(endNode instanceof BlockEndNode)) {
      atomNode(null, endNode, afterChunk, scanner);
    }
  }

  @Override
  protected void handleChunkDone(@NonNull MemoryFlowChunk chunk) {
    if (!pendingBlocks.isEmpty()) {
      // Finished processing atom nodes in this block
      FlowNode finishedBlock = pendingBlocks.pop();
      if (logger.isDebugEnabled()) {
        logger.debug("handleChunkDone. Removed Node ID: " + finishedBlock.getId() + "(" + finishedBlock.getDisplayName() + "} from pendingBlocks.");
      }
    }
    if (stageStepsCollectionCompleted) { // if its completed no further action
      return;
    }

    if (node != null && chunk.getFirstNode().equals(node)) {
      stageStepsCollectionCompleted = true;
      inStageScope = false;
      final String cause = PipelineNodeUtil.getCauseOfBlockage(chunk.getFirstNode(), agentNode);
      if (cause != null) {
        // TODO: This should probably be changed (elsewhere?) to instead just render this directly,
        // not via a fake step.
        // Now add a step that indicates blockage cause
        FlowNode step = new LocalAtomNode(chunk, cause);

        FlowNodeWrapper stepNode =
            new FlowNodeWrapper(
                step,
                new NodeRunStatus(BlueRun.BlueRunResult.UNKNOWN, BlueRun.BlueRunState.QUEUED),
                // This is a fake AtomNode to help track the cause of a blockage, timing info is
                // not meaningful.
                new TimingInfo(0, 0, 0),
                run);
        steps.push(stepNode);
        stepMap.put(step.getId(), stepNode);
      }
    }

    // Do not add steps to this stage if it's parent is a parallel block (it should get addded to
    // that instead).
    if (!PipelineNodeUtil.isParallelBranch(pendingBlocks.peek())) {
      if (logger.isDebugEnabled()) {
        logger.debug("Pushing step to stage in handleChunkDone.");
      }
      // Record which stage the steps belong to.
      pushStageStepsToMap(chunk.getFirstNode());
    } else {
      if (logger.isDebugEnabled()) {
        logger.debug("Not pushing steps to stage '" + pendingBlocks.peek().getDisplayName() + "' in handleChunkDone as parent is parallel block.");
      }
    }
    if (PipelineNodeUtil.isStage(node) && !inStageScope && !chunk.getFirstNode().equals(node)) {
      resetSteps();
    }
  }

  @Override
  public void atomNode(
      @CheckForNull FlowNode before,
      @NonNull FlowNode atomNode,
      @CheckForNull FlowNode after,
      @NonNull ForkScanner scan) {
    if (stageStepsCollectionCompleted) {
      return;
    }

    if (atomNode instanceof StepEndNode) {
      this.closestEndNode = (StepEndNode) atomNode;
    }

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
      if (PipelineNodeUtil.isPreSyntheticStage(currentStage)) {
        preSteps.push(stepNode);
      } else if (PipelineNodeUtil.isPostSyntheticStage(currentStage)) {
        postSteps.push(stepNode);
      } else {
        if (!steps.contains(stepNode)) {
          steps.push(stepNode);
        }
      }
      stepMap.put(stepNode.getId(), stepNode);
      if (logger.isDebugEnabled()) {
        logger.debug("Pushing step: " + stepNode.getId() + "(" + stepNode.getArgumentsAsString() + ") to stack.");
      }

      stageSteps.push(stepNode);
      if (logger.isDebugEnabled()) {
        logger.debug("Steps in stack:");
        for(FlowNodeWrapper step : stageSteps) {
          logger.debug(" - " + step.getArgumentsAsString());
        }
      }

      // If there is closest block boundary, we capture it's error to the last step encountered and
      // prepare for next block.
      // but only if the previous node did not fail
      if (closestEndNode != null
          && closestEndNode.getError() != null
          && new NodeRunStatus(before).result != BlueRunResult.FAILURE) {
        stepNode.setBlockErrorAction(closestEndNode.getError());
        closestEndNode = null; // prepare for next block
      }
    }
  }

  public List<FlowNodeWrapper> getSteps() {
    List<FlowNodeWrapper> s = new ArrayList<>();
    if (node != null) {
      if (PipelineNodeUtil.isSkippedStage(node)) {
        return Collections.emptyList();
      }
      FlowNode first = null;
      FlowNode last = null;
      if (!stages.isEmpty()) {
        first = stages.getFirst();
        last = stages.getLast();
      }

      if (node.equals(first)) {
        s.addAll(preSteps);
      }
      s.addAll(steps);
      if ((node.equals(last) || PipelineNodeUtil.isSkippedStage(last))) {
        s.addAll(postSteps);
      }

    } else {
      s.addAll(preSteps);
      s.addAll(steps);
      s.addAll(postSteps);
    }
    return s;
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

  private void resetSteps() {
    steps.clear();
    stepMap.clear();
    stageSteps.clear();
  }

  private void pushStageStepsToMap(FlowNode stage) {
    List<FlowNodeWrapper> stageStepsList =
        stageStepMap.getOrDefault(stage.getId(), new ArrayList<>());
    for (FlowNodeWrapper step : stageSteps) {
      if (logger.isDebugEnabled()) {
        logger.debug("Adding step '" + step.getArgumentsAsString() + "' to '" + stage.getId() + "' " + "(" + stage.getDisplayName() + ") .");
      }

      stageStepsList.add(step);
    }
    if (logger.isDebugEnabled()) {
      logger.debug("Clearing " + stageSteps.size() + ".");
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
