package io.jenkins.plugins.pipelinegraphview.utils;

import edu.umd.cs.findbugs.annotations.CheckForNull;
import edu.umd.cs.findbugs.annotations.NonNull;
import edu.umd.cs.findbugs.annotations.Nullable;
import edu.umd.cs.findbugs.annotations.SuppressWarnings;
import java.io.IOException;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeoutException;
import org.jenkinsci.plugins.pipeline.modeldefinition.actions.ExecutionModelAction;
import org.jenkinsci.plugins.workflow.actions.ErrorAction;
import org.jenkinsci.plugins.workflow.actions.LabelAction;
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

  // Stores all the blocks that we have reached the end of but have yet to reach the start of.
  // BEWARE: these could be null values.
  private final ArrayDeque<FlowNodeWrapper> pendingBlocks = new ArrayDeque<>();

  // Stored all the start stage, parallel and parallel block nodes.
  public final ArrayDeque<FlowNodeWrapper> startNodes = new ArrayDeque<>();

  // Stores all the steps of the stage currently being processed.
  private final ArrayDeque<FlowNodeWrapper> stageSteps = new ArrayDeque<>();

  // Stores all the nodes (non-steps) of the node currently being processed.
  private final ArrayDeque<FlowNodeWrapper> childNodes = new ArrayDeque<>();

  // Maps steps to a given stage.
  private final Map<String, List<FlowNodeWrapper>> stageStepMap = new HashMap<>();

  // For Sythetic Stages:
  private static final String PARALLEL_SYNTHETIC_STAGE_NAME = "Parallel";
  // Stores parallel branches in the current scope. These will be added to a Synthetic stage if not
  // wrapped by a stage.
  private final ArrayDeque<FlowNodeWrapper> parallelBranches = new ArrayDeque<>();

  private FlowNodeWrapper currentStage;

  private InputAction inputAction;

  private final boolean declarative;

  private FlowNode nodeThatThrewException;

  private boolean isLastNode;
  private FlowExecution execution;
  private static final Logger logger = LoggerFactory.getLogger(PipelineStepVisitor.class);

  public PipelineStepVisitor(WorkflowRun run) {
    this.run = run;
    this.inputAction = run.getAction(InputAction.class);
    declarative = run.getAction(ExecutionModelAction.class) != null;
    this.isLastNode = true;
    this.execution = run.getExecution();
    if (this.execution != null) {
      try {
        ForkScanner.visitSimpleChunks(execution.getCurrentHeads(), this, new StageChunkFinder());
      } catch (final Throwable t) {
        // Log run ID, because the eventual exception handler (probably Stapler) isn't specific
        // enough to do so
        logger.debug(
            String.format(
                "constructor => Caught a '%s' traversing the graph for run %s",
                t.getClass().getSimpleName(), run.getExternalizableId()));
        throw t;
      }
    } else {
      logger.debug(
          String.format(
              "constructor => Could not find execution for run %s", run.getExternalizableId()));
    }
  }

  private FlowNodeWrapper wrapFlowNode(@Nullable FlowNode nodeToWrap) {
    return wrapFlowNode(nodeToWrap, null);
  }

  private FlowNodeWrapper wrapFlowNode(@Nullable FlowNode nodeToWrap, @Nullable FlowNode after) {
    if (nodeToWrap == null) {
      return null;
    }
    long pause = PauseAction.getPauseDuration(nodeToWrap);
    TimingInfo times =
        StatusAndTiming.computeChunkTiming(run, pause, nodeToWrap, nodeToWrap, after);
    if (times == null) {
      times = new TimingInfo();
    }
    NodeRunStatus status = new NodeRunStatus(nodeToWrap);
    InputStep inputStep = null;
    if (nodeToWrap instanceof StepAtomNode) {
      if (PipelineNodeUtil.isPausedForInputStep((StepAtomNode) nodeToWrap, inputAction)) {
        status = new NodeRunStatus(BlueRun.BlueRunResult.UNKNOWN, BlueRun.BlueRunState.PAUSED);
        try {
          for (InputStepExecution execution : inputAction.getExecutions()) {
            FlowNode node = execution.getContext().get(FlowNode.class);
            if (node != null && node.equals(nodeToWrap)) {
              inputStep = execution.getInput();
              break;
            }
          }
        } catch (IOException | InterruptedException | TimeoutException e) {
          logger.error("Error getting FlowNode from execution context: " + e.getMessage(), e);
        }
      }
    }
    return new FlowNodeWrapper(nodeToWrap, status, times, inputStep, run);
  }

  private void addChildrenToNode(FlowNodeWrapper node, FlowNodeWrapper parent) {
    addChildrenToNode(node, parent, true);
  }

  private void debugLog() {

  }

  private void addChildrenToNode(FlowNodeWrapper node, FlowNodeWrapper parent, Boolean pushSteps) {
    // Add parent to the current node.
    if (parent != null) {
      node.addParent(parent);
    }
    // Add any pending steps to the current node.
    if (pushSteps && stageSteps != null && !stageSteps.isEmpty()) {
      if (logger.isDebugEnabled()) {
        logger.debug(
            String.format(
                "addChildrenToNode => Pushing steps to stage {id: %s, name %s} in addChildrenToNode.",
                node.getId(), node.getDisplayName()));
      }
      pushStageStepsToMap(node);
    }
    // Add any pending child nodes to the current node.
    if (childNodes != null && !childNodes.isEmpty()) {
      for (FlowNodeWrapper childNode : childNodes) {
        childNode.addParent(node);
      }
    }
    startNodes.add(node);
  }

  @Override
  public void parallelStart(
      @NonNull FlowNode parallelStartNode,
      @NonNull FlowNode branchNode,
      @NonNull ForkScanner scanner) {
    super.parallelStart(parallelStartNode, branchNode, scanner);
    FlowNodeWrapper finishedBlock = null;
    if (!pendingBlocks.isEmpty()) {
      finishedBlock = pendingBlocks.pop();
      // Finished processing atom nodes in this block
      if (logger.isDebugEnabled()) {
        logger.debug(
            String.format(
                "parallelStart => Removed Node {id: %s, name: %s}",
                finishedBlock.getId(), finishedBlock.getDisplayName()));
      }
    }
    if (logger.isDebugEnabled()) {
      logger.debug(
          String.format(
              "parallelStart. Node {id: %s, name: %s, isStage: %s, isParallelBranch: %s, isSythetic: %s} ",
              parallelStartNode.getId(),
              parallelStartNode.getDisplayName(),
              PipelineNodeUtil.isStage(parallelStartNode),
              PipelineNodeUtil.isParallelBranch(parallelStartNode),
              PipelineNodeUtil.isSyntheticStage(parallelStartNode)));
    }

    
    for (FlowNodeWrapper branch : parallelBranches) {
      if (logger.isDebugEnabled()) {
        logger.debug("parallelStart => Adding parallel branch {} to stage {}.");
      }
    }
    
    // Add the pending parallel nodes to this start nodes paranet stage (if there is one).
    if (pendingBlocks.peek() != null) {
      addParallelBlocksToNode(pendingBlocks.peek());
    } else {
      captureOrphanParallelBranches();
    }
    // Record which stage the steps belong to this parallel block.
    addChildrenToNode(wrapFlowNode(parallelStartNode), pendingBlocks.peek());
  }

  @Override
  public void parallelEnd(
      @NonNull FlowNode parallelStartNode,
      @NonNull FlowNode parallelEndNode,
      @NonNull ForkScanner scanner) {
    super.parallelEnd(parallelStartNode, parallelEndNode, scanner);
    if (logger.isDebugEnabled()) {
      logger.debug(
          String.format(
              "parallelEnd => Block start Node {id: %s, name: %s, isStage: %s, isParallelBranch: %s, isSythetic: %s} ",
              parallelStartNode.getId(),
              parallelStartNode.getDisplayName(),
              PipelineNodeUtil.isStage(parallelStartNode),
              PipelineNodeUtil.isParallelBranch(parallelStartNode),
              PipelineNodeUtil.isSyntheticStage(parallelStartNode)));
      logger.debug("parallelEnd => Pushing parallelStart Node to stack.");
    }
    pendingBlocks.push(wrapFlowNode(parallelStartNode));
  }

  @Override
  public void parallelBranchStart(
      @NonNull FlowNode parallelStartNode,
      @NonNull FlowNode branchStartNode,
      @NonNull ForkScanner scanner) {
    super.parallelBranchStart(parallelStartNode, branchStartNode, scanner);
    FlowNodeWrapper finishedBlock = null;
    if (!pendingBlocks.isEmpty()) {
      finishedBlock = pendingBlocks.pop();
      // Finished processing atom nodes in this block
      if (logger.isDebugEnabled()) {
        logger.debug(
            String.format(
                "parallelBranchStart => Removed Node {id: %s, name: %s} from pending blocks.",
                finishedBlock.getId(), finishedBlock.getDisplayName()));
      }
    }
    if (logger.isDebugEnabled()) {
      logger.debug(
          String.format(
              "parallelBranchStart => Node {id: %s, name: %s, isStage: %s, isParallelBranch: %s, isSythetic: %s}.",
              branchStartNode.getId(),
              branchStartNode.getDisplayName(),
              PipelineNodeUtil.isStage(branchStartNode),
              PipelineNodeUtil.isParallelBranch(branchStartNode),
              PipelineNodeUtil.isSyntheticStage(branchStartNode)));
      logger.debug("parallelBranchStart => Pushing steps to stage in parallelBranchStart.");
    }
    // Record which stage the steps belong to this parallel block.
    addChildrenToNode(wrapFlowNode(branchStartNode), pendingBlocks.peek());
  }

  @Override
  public void parallelBranchEnd(
      @NonNull FlowNode parallelStartNode,
      @NonNull FlowNode branchEndNode,
      @NonNull ForkScanner scanner) {
    super.parallelBranchEnd(parallelStartNode, branchEndNode, scanner);
    FlowNode branchStartNode = ((StepEndNode) branchEndNode).getStartNode();
    if (logger.isDebugEnabled()) {
      logger.debug(
          String.format(
              "parallelBranchEnd => Storing pendingBlock Node {id: %s, name: %s, isStage: %s, isParallelBranch: %s, isSythetic: %s}.",
              branchStartNode.getId(),
              branchStartNode.getDisplayName(),
              PipelineNodeUtil.isStage(branchStartNode),
              PipelineNodeUtil.isParallelBranch(branchStartNode),
              PipelineNodeUtil.isSyntheticStage(branchStartNode)));
    }
    // Store parallel branches incase we need to add a Synthetic node to wrap them - i.e. they
    // aren't wrapped in a stage.
    if (logger.isDebugEnabled()) {
      logger.debug("parallelBranchEnd => Pushing to parallelBranches in parallelBranchEnd.");
    }
    pendingBlocks.push(wrapFlowNode(branchStartNode));
  }

  @SuppressWarnings("RV_RETURN_VALUE_IGNORED")
  @Override
  public void chunkStart(
      @NonNull FlowNode startNode,
      @CheckForNull FlowNode beforeBlock,
      @NonNull ForkScanner scanner) {
    super.chunkStart(startNode, beforeBlock, scanner);
    // Ignore stepStart nodes as we don't display them in any of the views - we expect steps to
    // belong to one of the other block types.
    if (PipelineNodeUtil.isPipelineBlock(startNode)) {
      logger.debug(
          String.format(
              "chunkStart => Found uninteresting node {id: %s, name: %s, type: %s}, returning.",
              startNode.getId(), startNode.getDisplayName(), startNode.getClass().getSimpleName()));
      return;
    }
    FlowNodeWrapper finishedBlock = null;
    if (!pendingBlocks.isEmpty()) {
      finishedBlock = pendingBlocks.pop();
    } else {
      if (logger.isDebugEnabled()) {
        logger.debug(
            String.format(
                "chunkStart => pendingBlock emptry, returning.",
                finishedBlock.getId(),
                finishedBlock.getDisplayName()));
      }
      return;
    }
    if (logger.isDebugEnabled()) {
      logger.debug(
          String.format(
              "chunkStart => Node ID: {id: %s, name: %s, isStage: %s, isParallelBranch: %s, isSythetic: %s}.",
              startNode.getId(),
              startNode.getDisplayName(),
              PipelineNodeUtil.isStage(startNode),
              PipelineNodeUtil.isParallelBranch(startNode),
              PipelineNodeUtil.isSyntheticStage(startNode)));
    }

    Boolean stepsBelongToBlock = true;
    // Do not add steps to this stage if it's parent is a parallel block and it's a declarative
    // step - (it should get addded to the parent instead).
    if (PipelineNodeUtil.isParallelBranch(pendingBlocks.peek().getNode()) && isDeclarative()) {
      if (logger.isDebugEnabled()) {
        logger.debug(
            String.format(
                "chunkStart => Not pushing steps to stage '%s' as parent is parallel block in declarative pipeline.",
                startNode.getDisplayName()));
      }
      stepsBelongToBlock = false;
    }
    addChildrenToNode(
        wrapFlowNode(startNode), wrapFlowNode(pendingBlocks.peek().getNode()), stepsBelongToBlock);
  }

  @Override
  public void chunkEnd(
      @NonNull FlowNode endNode, @CheckForNull FlowNode afterChunk, @NonNull ForkScanner scanner) {
    super.chunkEnd(endNode, afterChunk, scanner);
    FlowNode startNode = null;
    if (PipelineNodeUtil.isPipelineBlock(endNode)) {
      logger.debug(
          String.format(
              "chunkEnd => Found uninteresting node {id: %s, name: %s, type: %s}, returning.",
              endNode.getId(), endNode.getDisplayName(), endNode.getClass().getSimpleName()));
      return;
    }
    if (endNode instanceof BlockEndNode) {
      startNode = ((BlockEndNode) endNode).getStartNode();
      if (startNode != null) {
        // This can happen with StageEnd nodes in Declarative Pipelines.
        logger.debug(
            String.format(
                "chunkEnd => Could not find startNode for {id: %s, name: %s}.",
                endNode.getId(), endNode.getDisplayName()));
        // Wrap orphaned parallel branches in Syntehtic stage.
        //captureOrphanParallelBranches();
      }
      // This will push null to 'pendingBlocks'.
      pendingBlocks.push(wrapFlowNode(startNode));
    }

    if (PipelineNodeUtil.isStage(startNode)) {
      currentStage = wrapFlowNode(startNode);
      if (logger.isDebugEnabled()) {
        logger.debug(
            String.format(
                "chunkEnd => Node {id: %s, name: %s, isStage: %s, isParallelBranch: %s, isSythetic: %s}.",
                startNode.getId(),
                startNode.getDisplayName(),
                PipelineNodeUtil.isStage(startNode),
                PipelineNodeUtil.isParallelBranch(startNode),
                PipelineNodeUtil.isSyntheticStage(startNode)));
      }
    }

    // Check if the Pipeline exited with an unhandled exception. If so, we will try and attach it to
    // the originating block.
    if (this.isLastNode) {
      this.isLastNode = false;
      // Check for an unhandled exception.
      NodeRunStatus status;
      ErrorAction errorAction = endNode.getAction(ErrorAction.class);
      // If this is a Jenkins failure exception, then we don't need to add a new node - it will come
      // from an existing step.
      if (errorAction != null
          && !PipelineNodeUtil.isJenkinsFailureException(errorAction.getError())) {
        // Store node that threw exception as step so we can find it's parent stage later.
        logger.debug(
            String.format(
                "chunkEnd => Found unhandled exception: %s", errorAction.getError().getMessage()));
        this.nodeThatThrewException =
            errorAction.findOrigin(errorAction.getError(), this.execution);
        if (this.nodeThatThrewException != null) {
          logger.debug(
              String.format(
                  "chunkEnd => Found that node '%s' threw unhandled exception: %s.",
                  this.nodeThatThrewException.getId(),
                  PipelineNodeUtil.getDisplayName(this.nodeThatThrewException)));
        }
      }
    }
    // If this the the node that created the unhandled exception.
    if (this.nodeThatThrewException == endNode) {
      if (logger.isDebugEnabled()) {
        logger.debug("chunkEnd => Found endNode that threw exception.");
      }
      pushExceptionNodeToStepsMap(endNode);
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
    super.atomNode(before, atomNode, after, scan);
    if (atomNode instanceof StepAtomNode
        && currentStage != null
        && !PipelineNodeUtil.isSkippedStage(
            currentStage.getNode())) { // if skipped stage, we don't collect its steps
      FlowNodeWrapper stepNode = wrapFlowNode(atomNode, after);
      if (logger.isDebugEnabled()) {
        logger.debug(
            String.format(
                "atomNode => Pushing step: {id: %s, args: %s} to stack.",
                stepNode.getId(), stepNode.getArgumentsAsString()));
      }
      if (!stageSteps.contains(stepNode)) {
        stageSteps.push(stepNode);
      }
      if (logger.isDebugEnabled()) {
        logger.debug("atomNode => Steps in stack:");
        for (FlowNodeWrapper step : stageSteps) {
          logger.debug(
              String.format(" - {id: %s, args: %s}.", step.getId(), step.getArgumentsAsString()));
        }
      }
    }

    // If we've reached the start of the graph and have orphaned parallel branches, wrap them in a
    // Synthetic node.
    if (PipelineNodeUtil.isPipelineStartNode(atomNode)) {
      if (logger.isDebugEnabled()) {
        logger.debug("atomNode => Reached start of graph and have orphaned parallel branches.");
      }
      captureOrphanParallelBranches();
      return;
    }

    // If this the the node that created the unhandled exception.
    if (this.nodeThatThrewException == atomNode) {
      if (logger.isDebugEnabled()) {
        logger.debug("atomNode => Found atomNode that threw exception.");
      }
      pushExceptionNodeToStepsMap(atomNode);
    }
  }

  public List<FlowNodeWrapper> getStageSteps(String startNodeId) {
    return stageStepMap.getOrDefault(startNodeId, new ArrayList<>());
  }

  public Map<String, List<FlowNodeWrapper>> getAllSteps() {
    return stageStepMap;
  }

  private void captureOrphanParallelBranches() {
    if (!parallelBranches.isEmpty()) {
      FlowNodeWrapper synStage = createParallelSyntheticNode();
      if (synStage != null) {
        startNodes.push(synStage);
        parallelBranches.clear();
        this.currentStage = synStage;
      }
    }
  }

  /**
   * Create synthetic stage that wraps a parallel block at top level, that is not enclosed inside a
   * stage.
   */
  private @Nullable FlowNodeWrapper createParallelSyntheticNode() {

    if (parallelBranches.isEmpty()) {
      return null;
    }

    FlowNodeWrapper firstBranch = parallelBranches.getLast();
    FlowNodeWrapper parallel = firstBranch.getFirstParent();

    if (logger.isDebugEnabled()) {
      logger.debug(
          String.format(
              "createParallelSyntheticNode=> firstBranch: %s, parallel:%s",
              firstBranch.getId(), (parallel == null ? "(none)" : parallel.getId())));
    }

    String syntheticNodeId =
        firstBranch.getNode().getParents().stream()
            .map((node) -> node.getId())
            .findFirst()
            .orElseGet(
                () -> createSyntheticStageId(firstBranch.getId(), PARALLEL_SYNTHETIC_STAGE_NAME));
    List<FlowNode> parents;
    if (parallel != null) {
      parents = parallel.getNode().getParents();
    } else {
      parents = new ArrayList<>();
    }
    FlowNode syntheticNode =
        new FlowNode(firstBranch.getNode().getExecution(), syntheticNodeId, parents) {
          @Override
          public void save() throws IOException {
            // no-op to avoid JENKINS-45892 violations from serializing the synthetic FlowNode.
          }

          @Override
          protected String getTypeDisplayName() {
            return PARALLEL_SYNTHETIC_STAGE_NAME;
          }
        };

    syntheticNode.addAction(new LabelAction(PARALLEL_SYNTHETIC_STAGE_NAME));

    long duration = 0;
    long pauseDuration = 0;
    long startTime = System.currentTimeMillis();
    boolean isCompleted = true;
    boolean isPaused = false;
    boolean isFailure = false;
    boolean isUnknown = false;
    for (FlowNodeWrapper pb : parallelBranches) {
      if (!isPaused && pb.getStatus().getState() == BlueRun.BlueRunState.PAUSED) {
        isPaused = true;
      }
      if (isCompleted && pb.getStatus().getState() != BlueRun.BlueRunState.FINISHED) {
        isCompleted = false;
      }

      if (!isFailure && pb.getStatus().getResult() == BlueRun.BlueRunResult.FAILURE) {
        isFailure = true;
      }
      if (!isUnknown && pb.getStatus().getResult() == BlueRun.BlueRunResult.UNKNOWN) {
        isUnknown = true;
      }
      duration += pb.getTiming().getTotalDurationMillis();
      pauseDuration += pb.getTiming().getPauseDurationMillis();
    }

    BlueRun.BlueRunState state =
        isCompleted
            ? BlueRun.BlueRunState.FINISHED
            : (isPaused ? BlueRun.BlueRunState.PAUSED : BlueRun.BlueRunState.RUNNING);
    BlueRun.BlueRunResult result =
        isFailure
            ? BlueRun.BlueRunResult.FAILURE
            : (isUnknown ? BlueRun.BlueRunResult.UNKNOWN : BlueRun.BlueRunResult.SUCCESS);

    TimingInfo timingInfo = new TimingInfo(duration, pauseDuration, startTime);

    FlowNodeWrapper synStage =
        new FlowNodeWrapper(syntheticNode, new NodeRunStatus(result, state), timingInfo, run);
    addParallelBlocksToNode(synStage);
    return synStage;
  }

  // Add the recorded parallel blocks to a given node.
  private void addParallelBlocksToNode(FlowNodeWrapper node) {
    Iterator<FlowNodeWrapper> sortedBranches = parallelBranches.descendingIterator();
    while (sortedBranches.hasNext()) {
      FlowNodeWrapper p = sortedBranches.next();
      p.addParent(node);
      node.addEdge(p);
    }
    parallelBranches.clear();
  }

  public boolean isDeclarative() {
    return declarative;
  }

  public List<FlowNodeWrapper> getPipelineNodes() {
    return new ArrayList<>(startNodes);
  }

  private void pushStageStepsToMap(FlowNodeWrapper stage) {
    List<FlowNodeWrapper> stageStepsList =
        stageStepMap.getOrDefault(stage.getNode().getId(), new ArrayList<>());
    for (FlowNodeWrapper step : stageSteps) {
      if (logger.isDebugEnabled()) {
        logger.debug(
            String.format(
                "pushStageStepsToMap => Adding step {id: %s, args: %s} to stage {id: %s, name: %s}",
                step.getNode().getId(),
                step.getArgumentsAsString(),
                stage.getNode().getId(),
                stage.getNode().getDisplayName()));
      }

      stageStepsList.add(step);
    }
    if (logger.isDebugEnabled()) {
      logger.debug(
          String.format(
              "pushStageStepsToMap => Assigning parent stage for %s steps.", stageSteps.size()));
    }

    stageSteps.clear();
    stageStepMap.put(stage.getNode().getId(), stageStepsList);
  }

  private void pushExceptionNodeToStepsMap(FlowNode exceptionNode) {
    FlowNodeWrapper erroredStep = wrapFlowNode(exceptionNode);
    if (logger.isDebugEnabled()) {
      logger.debug(
          String.format(
              "pushExceptionNodeToStepsMap => Found step exception from step {id: %s, name: %s} to stack.\nError:\n",
              erroredStep.getId(), erroredStep.getArgumentsAsString(), erroredStep.nodeError()));
    }
    if (!stageSteps.contains(erroredStep)) {
      stageSteps.push(erroredStep);
    }
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

  /**
   * Create id of synthetic stage in a deterministic base.
   *
   * <p>For example, an orphan parallel block with id 12 (appears top level not wrapped inside a
   * stage) gets wrapped in a synthetic stage with id: 12-parallel-synthetic. Later client calls
   * nodes API using this id: /nodes/12-parallel-synthetic/ would correctly pick the synthetic stage
   * wrapping parallel block 12 by doing a lookup nodeMap.get("12-parallel-synthetic")
   */
  private @NonNull String createSyntheticStageId(
      @NonNull String firstNodeId, @NonNull String syntheticStageName) {
    return String.format("%s-%s-synthetic", firstNodeId, syntheticStageName.toLowerCase());
  }
}
