package io.jenkins.plugins.pipelinegraphview.utils;

import edu.umd.cs.findbugs.annotations.CheckForNull;
import edu.umd.cs.findbugs.annotations.NonNull;
import edu.umd.cs.findbugs.annotations.Nullable;
import edu.umd.cs.findbugs.annotations.SuppressFBWarnings;
import hudson.model.Action;
import java.io.IOException;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import java.util.concurrent.TimeoutException;
import org.jenkinsci.plugins.pipeline.modeldefinition.actions.ExecutionModelAction;
import org.jenkinsci.plugins.workflow.actions.ErrorAction;
import org.jenkinsci.plugins.workflow.actions.NotExecutedNodeAction;
import org.jenkinsci.plugins.workflow.cps.nodes.StepAtomNode;
import org.jenkinsci.plugins.workflow.flow.FlowExecution;
import org.jenkinsci.plugins.workflow.graph.AtomNode;
import org.jenkinsci.plugins.workflow.graph.BlockEndNode;
import org.jenkinsci.plugins.workflow.graph.BlockStartNode;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.graphanalysis.ForkScanner;
import org.jenkinsci.plugins.workflow.graphanalysis.MemoryFlowChunk;
import org.jenkinsci.plugins.workflow.graphanalysis.StandardChunkVisitor;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.pipelinegraphanalysis.GenericStatus;
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
 * @author Tim Brown
 * @author Vivek Pandey Records the Stages and steps for a given FlowNodeGraph. The records the
 *     actual structure of the FlowGraph, including all ParallelBlock, ParallelBranch, Stage, and
 *     Step nodes (steps are recorded in a separate map). This means it's more verbose that the
 *     original PipelineNodeGraphVisitor, but is also less esoteric. If you want something more akin
 *     to the behavior of PipelineNodeGraphVisitor, then call PipelineNodeGraphAdapter.
 */
public class PipelineNodeTreeVisitor extends StandardChunkVisitor {
  private final WorkflowRun run;

  // Maps a node ID to a given node wrapper.
  public Map<String, FlowNodeWrapper> nodeMap = new TreeMap<String, FlowNodeWrapper>();

  // We need to determine the status of nodes in handleChunkDone, so store these until we find the
  // start node, then move to nodeMap.
  public Map<String, FlowNodeWrapper> handledChunkMap =
      new TreeMap<String, FlowNodeWrapper>();

  // Stores the id(s) of all the steps currently being processed.
  private ArrayDeque<String> currentBlockStepIds = new ArrayDeque<>();
  
  // Stores the IDs steps blocking to nodes that we have hit the end of but are still waiting for the start.
  // Switched to this method as it wasn't always possible to get a start node from an end node.
  private ArrayDeque<ArrayDeque<String>> pendingStepIdStacks = new ArrayDeque<>();

  // Store the IDs of any found children for the block being processed. Each time we hit an end node we push this ack
  // to 'pendingBlockIdStacks' as start with an new empty stack.
  // This is not guaranteed to have a stack for each parent block of the current node - this is because running
  // sections of Pipeline might not have EndNodes for each StartNode.
  // Instead we retrieve this stack if available, and if not we 
  private ArrayDeque<String> currentBlockChildIds = new ArrayDeque<>();

  // Stores the IDs any blocks (non-steps) that we have hit the end of but are still waiting for the start.
  // Switched to this method as it wasn't always possible to get a start node from an end node.
  private ArrayDeque<ArrayDeque<String>> pendingBlockIdStacks = new ArrayDeque<>();

  // Store any parallel branch who we haven't found a parent for.
  private ArrayDeque<String> currentParallelBranches = new ArrayDeque<String>();

  // Stores the IDs any blocks (non-steps) that we have hit the end of but are still waiting for the start.
  // Switched to this method as it wasn't always possible to get a start node from an end node.
  private ArrayDeque<ArrayDeque<String>> pendingParallelBranches = new ArrayDeque<>();

  // Stores the child node that was first to execute in this block (or null).
  private FlowNode firstExecuted = null;


  // We can remove these is we handle all children the same.
  // Maps a node ID to a given step node wrapper.
  public Map<String, FlowNodeWrapper> stepMap = new TreeMap<String, FlowNodeWrapper>();

  // Maps stageId to a list of child steps.
  private Map<String, List<String>> stageStepIdMap = new TreeMap<>();

  // Used to store the originating node of an unhandled exception.
  private FlowNode nodeThatThrewException;

  private Boolean declarative;
  private InputAction inputAction;
  private boolean isLastNode;
  private FlowExecution execution;
  private static final Logger logger = LoggerFactory.getLogger(PipelineNodeTreeVisitor.class);

  private boolean isDebugEnabled = logger.isDebugEnabled();

  public PipelineNodeTreeVisitor(WorkflowRun run) {
    this.run = run;
    this.inputAction = run.getAction(InputAction.class);
    this.isLastNode = true;
    this.execution = run.getExecution();
    this.declarative = run.getAction(ExecutionModelAction.class) != null;
    if (this.execution != null) {
      try {
        ForkScanner.visitSimpleChunks(execution.getCurrentHeads(), this, new StageChunkFinder());
      } catch (final Throwable t) {
        // Log run ID, because the eventual exception handler (probably Stapler) isn't specific
        // enough to do so.
        dump(
            String.format(
                "constructor => Caught a '%s' traversing the graph for run %s",
                t.getClass().getSimpleName(), run.getExternalizableId()));
        throw t;
      }
    } else {
      dump(
          String.format(
              "constructor => Could not find execution for run %s", run.getExternalizableId()));
    }
  }

  // Print debug message if 'isDebugEnabled' is true.
  private void dump(String message) {
    if (isDebugEnabled) {
      String prefix = "-".repeat(pendingBlockIdStacks.size());
      logger.debug(prefix + " " + message);
    }
  }

  private FlowNodeWrapper wrapFlowNode(@Nullable FlowNode nodeToWrap) {
    return wrapFlowNode(nodeToWrap, null, null);
  }

  private FlowNodeWrapper wrapFlowNode(@Nullable FlowNode nodeToWrap, @Nullable FlowNode after) {
    return wrapFlowNode(nodeToWrap, after, null);
  }

  private FlowNodeWrapper wrapFlowNode(
      @Nullable FlowNode nodeToWrap,
      @Nullable FlowNode after,
      @Nullable FlowNodeWrapper.NodeType nodeType) {
    if (nodeToWrap == null) {
      return null;
    }
    // If we created this node in handleChunkDone, then return that value.
    if (handledChunkMap.containsKey(nodeToWrap.getId())) {
      dump(
          String.format(
              "Found we have parsed this node {id: %s, name: %s} in handleChunkDone, so returning that.",
              nodeToWrap.getId(), nodeToWrap.getDisplayName()));
      return handledChunkMap.get(nodeToWrap.getId());
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
    // Set node status is FlowNode errored.
    // Do we need to manually handle Unstable as well??
    ErrorAction error = nodeToWrap.getError();
    FlowNodeWrapper wrappedNode =
        new FlowNodeWrapper(nodeToWrap, status, times, inputStep, run, nodeType);
    if (error != null) {
      wrappedNode.setBlockErrorAction(error);
    }
    return wrappedNode;
  }

  private void addChildrenToNode(
      FlowNodeWrapper node, ArrayDeque<String> childNodeIds, ArrayDeque<String> childSteps) {
    nodeMap.put(node.getId(), node);
    // Add any pending steps to the current node.
    if (childSteps != null && !childSteps.isEmpty()) {
      dump(
          String.format(
              "addChildrenToNode => Pushing steps to stage {id: %s, name %s} in addChildrenToNode.",
              node.getId(), node.getDisplayName()));
      assignStepsToParent(node, childSteps);
    }
    // Add any pending child nodes to the current node.
    if (childNodeIds != null && !childNodeIds.isEmpty()) {
      for (String childNodeId : childNodeIds) {
        FlowNodeWrapper childNode = nodeMap.get(childNodeId);
        dump(
            String.format(
                "addChildrenToNode => Assigning parent {id: %s, name: %s} to node {id: %s, name: %s}.",
                node.getId(),
                node.getDisplayName(),
                childNode.getId(),
                childNode.getDisplayName()));
        childNode.addParent(node);
        childNode.addEdge(node);
      }
    }
  }

  // Call when we get to an end block.
  // Note: it appears that this block end node will only exist in the Pipeline stage has finished.
  private void handleBlockEndNode(FlowNode endNode) {
    // Push current stack of child nodes onto the stack of stacks.
    pendingBlockIdStacks.addLast(currentBlockChildIds);
    currentBlockChildIds = new ArrayDeque<String>();
    // Push current stack of child steps onto the stack of stacks.
    pendingStepIdStacks.addLast(currentBlockStepIds);
    currentBlockStepIds = new ArrayDeque<String>();
    dump(
        String.format(
            "handleBlockEndNode => Found BlockEndNode {{id: %s, name: %s}, pushed new childStack to stack {size: %s}.",
            endNode.getId(), endNode.getDisplayName(), pendingBlockIdStacks.size()));
  }

  // Call when we get to a start block.
  private void handleBlockStartNode(FlowNode startNode) {
    ArrayDeque<String> startNodeChildIds = currentBlockChildIds;
    // Push start node to parent node's childStack. We do this here as we can't always get the
    // start node from the endNode in chunkEnd.
    if (pendingBlockIdStacks.isEmpty()) {
      currentBlockChildIds = new ArrayDeque<String>();
    } else {
      currentBlockChildIds = pendingBlockIdStacks.removeLast();
    }
    // Reset steps stack.
    ArrayDeque<String> startNodeSteps = currentBlockStepIds;
    if (pendingStepIdStacks.isEmpty()) {
      currentBlockStepIds = new ArrayDeque<String>();
    } else {
      currentBlockStepIds = pendingStepIdStacks.removeLast();
    }
    FlowNodeWrapper wrappedNode = wrapFlowNode(startNode);
    if (wrappedNode != null) {
      addChildrenToNode(wrappedNode, startNodeChildIds, startNodeSteps);
    } else {
      logger.error("'wrapFlowNode' returned null object.");
    }
  }

  // Updates the step map to map all steps in 'stepIds' to the given stage.
  private void assignStepsToParent(FlowNodeWrapper stage, ArrayDeque<String> stepIds) {
    List<String> stageStepsIdList = stageStepIdMap.getOrDefault(stage.getId(), new ArrayList<>());
    // Add check outside to reduce the number of checks isDebugEnabled checks - we don't want to
    // check on each loop iteration.
    for (String stepId : stepIds) {
      FlowNodeWrapper step = stepMap.get(stepId);
      dump(
          String.format(
              "assignStepsToParent => Adding step {id: %s, args: %s} to stage {id: %s, name: %s}",
              step.getNode().getId(),
              step.getArgumentsAsString(),
              stage.getNode().getId(),
              stage.getNode().getDisplayName()));
      stageStepsIdList.add(step.getId());
    }
    dump(
        String.format(
            "assignStepsToParent => Assigning parent stage for %s steps.", stepIds.size()));
    stageStepIdMap.put(stage.getNode().getId(), stageStepsIdList);
  }

  // Call this when we have reached the node that caused an unhandled exception. This will add the
  // node to the list of pending steps so it can be displayed in the console view.
  private void pushExceptionNodeToStepsMap(FlowNode exceptionNode) {
    FlowNodeWrapper erroredStep = wrapFlowNode(exceptionNode);
    dump(
        String.format(
            "pushExceptionNodeToStepsMap => Found step exception from step {id: %s, name: %s} to stack.%nError:%n",
            erroredStep.getId(), erroredStep.getArgumentsAsString(), erroredStep.nodeError()));
    if (!currentBlockStepIds.contains(erroredStep.getId())) {
      currentBlockStepIds.addLast(erroredStep.getId());
      stepMap.put(erroredStep.getId(), erroredStep);
    }
  }

  @Override
  public void parallelStart(
      @NonNull FlowNode parallelStartNode,
      @NonNull FlowNode branchNode,
      @NonNull ForkScanner scanner) {
    super.parallelStart(parallelStartNode, branchNode, scanner);
    dump(
        String.format(
            "parallelStart => Node {id: %s, name: %s, isStage: %s, isParallelBranch: %s, isSynthetic: %s} ",
            parallelStartNode.getId(),
            parallelStartNode.getDisplayName(),
            PipelineNodeUtil.isStage(parallelStartNode),
            PipelineNodeUtil.isParallelBranch(parallelStartNode),
            PipelineNodeUtil.isSyntheticStage(parallelStartNode),
            parallelStartNode.getClass()));
    // Add any current branches to this parallel start block and reset stack.
    // Set the node type when calling as running Parallel blocks can be 'StepStartNode' - which would throw exception. 
    FlowNodeWrapper wrappedParallelStart = wrapFlowNode(parallelStartNode, null, FlowNodeWrapper.NodeType.PARALLEL_BLOCK);
    addChildrenToNode(wrappedParallelStart, currentParallelBranches, null);
    if(pendingParallelBranches.isEmpty()) {
      currentParallelBranches = new ArrayDeque<String>();
    } else {
      currentParallelBranches = pendingParallelBranches.removeLast();
    }
    currentBlockChildIds.addLast(wrappedParallelStart.getId());
  }

  @Override
  public void parallelEnd(
      @NonNull FlowNode parallelStartNode,
      @NonNull FlowNode parallelEndNode,
      @NonNull ForkScanner scanner) {
    super.parallelEnd(parallelStartNode, parallelEndNode, scanner);
    dump(
        String.format(
            "parallelEnd => Node {id: %s, name: %s, isStage: %s, isParallelBranch: %s, isSynthetic: %s, class: %s}.",
            parallelEndNode.getId(),
            parallelEndNode.getDisplayName(),
            PipelineNodeUtil.isStage(parallelEndNode),
            PipelineNodeUtil.isParallelBranch(parallelEndNode),
            PipelineNodeUtil.isSyntheticStage(parallelEndNode),
            parallelStartNode.getClass()));
    // Do nothing as we assign the parent node for branches in 'parallelStart'.
    // This avoids issues in running Pipelines where 'parallelEnd' is not called.
    pendingParallelBranches.addLast(currentParallelBranches);
    currentParallelBranches = new ArrayDeque<String>();
  }

  @Override
  public void parallelBranchStart(
      @NonNull FlowNode parallelStartNode,
      @NonNull FlowNode branchStartNode,
      @NonNull ForkScanner scanner) {
    super.parallelBranchStart(parallelStartNode, branchStartNode, scanner);
    dump(
        String.format(
            "parallelBranchStart => Node {id: %s, name: %s, isStage: %s, isParallelBranch: %s, isSynthetic: %s, class: %s}.",
            branchStartNode.getId(),
            branchStartNode.getDisplayName(),
            PipelineNodeUtil.isStage(branchStartNode),
            PipelineNodeUtil.isParallelBranch(branchStartNode),
            PipelineNodeUtil.isSyntheticStage(branchStartNode),
            parallelStartNode.getClass()));
    handleBlockStartNode(branchStartNode);
    currentParallelBranches.add(branchStartNode.getId());
  }

  @Override
  public void parallelBranchEnd(
      @NonNull FlowNode parallelStartNode,
      @NonNull FlowNode branchEndNode,
      @NonNull ForkScanner scanner) {
    super.parallelBranchEnd(parallelStartNode, branchEndNode, scanner);
    dump(
        String.format(
            "parallelBranchEnd => Node {id: %s, name: %s, isStage: %s, isParallelBranch: %s, isSynthetic: %s, class: %s}.",
            branchEndNode.getId(),
            branchEndNode.getDisplayName(),
            PipelineNodeUtil.isStage(branchEndNode),
            PipelineNodeUtil.isParallelBranch(branchEndNode),
            PipelineNodeUtil.isSyntheticStage(branchEndNode),
            parallelStartNode.getClass()));
    handleBlockEndNode(branchEndNode);
  }

  @SuppressFBWarnings("RV_RETURN_VALUE_IGNORED")
  @Override
  public void chunkStart(
      @NonNull FlowNode startNode,
      @CheckForNull FlowNode beforeBlock,
      @NonNull ForkScanner scanner) {
    super.chunkStart(startNode, beforeBlock, scanner);
    dump(
        String.format(
            "chunkStart => Node ID: {id: %s, name: %s, isStage: %s, isParallelBranch: %s, isSynthetic: %s, class: %s}.",
            startNode.getId(),
            startNode.getDisplayName(),
            PipelineNodeUtil.isStage(startNode),
            PipelineNodeUtil.isParallelBranch(startNode),
            PipelineNodeUtil.isSyntheticStage(startNode),
            startNode.getClass()));
    handleBlockStartNode(startNode);
    currentBlockChildIds.addLast(startNode.getId());
  }

  @Override
  public void chunkEnd(
      @NonNull FlowNode chunkNode, @CheckForNull FlowNode afterChunk, @NonNull ForkScanner scanner) {
    super.chunkEnd(chunkNode, afterChunk, scanner);
    dump(
        String.format(
            "chunkEnd => Node {id: %s, name: %s, isStage: %s, isParallelBranch: %s, isSynthetic: %s, class: %s}.",
            chunkNode.getId(),
            chunkNode.getDisplayName(),
            PipelineNodeUtil.isStage(chunkNode),
            PipelineNodeUtil.isParallelBranch(chunkNode),
            PipelineNodeUtil.isSyntheticStage(chunkNode),
            chunkNode.getClass()));
    firstExecuted = null;
    // if we're using marker-based (and not block-scoped) stages, add the last node as part of its
    // contents
    if ((chunkNode instanceof BlockEndNode)) {
      handleBlockEndNode(chunkNode);
    } else {
      atomNode(null, chunkNode, afterChunk, scanner);
    }
    // Check if the Pipeline exited with an unhandled exception. If so, we will try and attach it to
    // the originating block.
    if (this.isLastNode) {
      this.isLastNode = false;
      // Check for an unhandled exception.
      ErrorAction errorAction = chunkNode.getAction(ErrorAction.class);
      // If this is a Jenkins failure exception, then we don't need to add a new node - it will come
      // from an existing step.
      if (errorAction != null
          && !PipelineNodeUtil.isJenkinsFailureException(errorAction.getError())) {
        // Store node that threw exception as step so we can find it's parent stage later.
        dump(
            String.format(
                "chunkEnd => Found unhandled exception: %s", errorAction.getError().getMessage()));
        this.nodeThatThrewException =
            errorAction.findOrigin(errorAction.getError(), this.execution);
        if (this.nodeThatThrewException != null) {
          dump(
              String.format(
                  "chunkEnd => Found that node '%s' threw unhandled exception: %s.",
                  this.nodeThatThrewException.getId(),
                  PipelineNodeUtil.getDisplayName(this.nodeThatThrewException)));
        }
      }
    }
    // If this the the node that created the unhandled exception.
    if (this.nodeThatThrewException == chunkNode) {
      dump("chunkEnd => Found chunkNode that threw exception.");
      pushExceptionNodeToStepsMap(chunkNode);
    }
  }

  @Override
  protected void resetChunk(@NonNull MemoryFlowChunk chunk) {
    dump("resetChunk.");
    super.resetChunk(chunk);
    firstExecuted = null;
  }

  // This gets triggered on encountering a new chunk (stage or branch)
  @SuppressFBWarnings(
      value = "RCN_REDUNDANT_NULLCHECK_OF_NONNULL_VALUE",
      justification =
          "chunk.getLastNode() is marked non null but is null sometimes, when JENKINS-40200 is fixed we will remove this check ")
  @Override
  protected void handleChunkDone(@NonNull MemoryFlowChunk chunk) {
    // Create nodes here so we can more accurately get the status.
    dump(
        String.format(
            "handleChunkDone=> id: %s, name: %s, function: %s",
            chunk.getFirstNode().getId(),
            chunk.getFirstNode().getDisplayName(),
            chunk.getFirstNode().getDisplayFunctionName()));

    TimingInfo times = null;

    // TODO: remove chunk.getLastNode() != null check based on how JENKINS-40200 gets resolved
    if (firstExecuted != null && chunk.getLastNode() != null) {
      times =
          StatusAndTiming.computeChunkTiming(
              run,
              chunk.getPauseTimeMillis(),
              firstExecuted,
              chunk.getLastNode(),
              chunk.getNodeAfter());
    }

    if (times == null) {
      times = new TimingInfo();
    }

    NodeRunStatus status;
    boolean skippedStage = PipelineNodeUtil.isSkippedStage(chunk.getFirstNode());
    if (skippedStage) {
      status = new NodeRunStatus(BlueRun.BlueRunResult.NOT_BUILT, BlueRun.BlueRunState.SKIPPED);
    } else if (chunk.getLastNode() != null) {
      status = new NodeRunStatus(StatusAndTiming.computeChunkStatus2(run, chunk));
    } else if (firstExecuted == null) {
      status = new NodeRunStatus(GenericStatus.NOT_EXECUTED);
    } else {
      status = new NodeRunStatus(firstExecuted);
    }
    if (PipelineNodeUtil.isPaused(chunk.getFirstNode())) {
      status = new NodeRunStatus(BlueRun.BlueRunResult.UNKNOWN, BlueRun.BlueRunState.PAUSED);
    }
    handledChunkMap.put(
        chunk.getFirstNode().getId(),
        new FlowNodeWrapper(chunk.getFirstNode(), status, times, run));
  }

  @Override
  public void atomNode(
      @CheckForNull FlowNode before,
      @NonNull FlowNode atomNode,
      @CheckForNull FlowNode after,
      @NonNull ForkScanner scan) {
    super.atomNode(before, atomNode, after, scan);
    if (atomNode instanceof StepAtomNode) {
      if (NotExecutedNodeAction.isExecuted(atomNode)) {
        firstExecuted = atomNode;
      }
      for (Action action : atomNode.getActions()) {
        logger.trace(
            String.format(
                "atomNode => step action: %s - %s", action.getDisplayName(), action.getClass()));
      }
      FlowNodeWrapper stepNode = wrapFlowNode(atomNode, after);
      stepMap.put(atomNode.getId(), stepNode);
      dump(
          String.format(
              "atomNode => Pushing step: {id: %s, args: %s} to stack.",
              stepNode.getId(), stepNode.getArgumentsAsString()));
      if (!currentBlockStepIds.contains(stepNode.getId())) {
        currentBlockStepIds.addLast(stepNode.getId());
      }
    }

    // If this the the node that created the unhandled exception.
    if (this.nodeThatThrewException == atomNode) {
      dump("atomNode => Found atomNode that threw exception.");
      pushExceptionNodeToStepsMap(atomNode);
    }
  }

  public List<FlowNodeWrapper> getStageSteps(String startNodeId) {
    List<FlowNodeWrapper> stageSteps = new ArrayList<FlowNodeWrapper>();
    for (String stepId : stageStepIdMap.getOrDefault(startNodeId, new ArrayList<>())) {
      stageSteps.add(stepMap.get(stepId));
    }
    Collections.sort(stageSteps, new FlowNodeWrapper.NodeComparator());
    dump(String.format("Returning %s steps for node '%s'", stageSteps.size(), startNodeId));
    return stageSteps;
  }

  public Map<String, List<FlowNodeWrapper>> getAllSteps() {
    Map<String, List<FlowNodeWrapper>> stageNodeStepMap =
        new TreeMap<String, List<FlowNodeWrapper>>();
    for (String stageId : stageStepIdMap.keySet()) {
      stageNodeStepMap.put(stageId, getStageSteps(stageId));
    }
    dump(String.format("Returning %s steps in total", stageNodeStepMap.values().size()));
    return stageNodeStepMap;
  }

  public List<FlowNodeWrapper> getPipelineNodes() {
    List<FlowNodeWrapper> stageNodes = new ArrayList<FlowNodeWrapper>(nodeMap.values());
    Collections.sort(stageNodes, new FlowNodeWrapper.NodeComparator());
    return stageNodes;
  }

  public Map<String, FlowNodeWrapper> getPipelineNodeMap() {
    return nodeMap;
  }

  public Boolean isDeclarative() {
    return this.declarative;
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
