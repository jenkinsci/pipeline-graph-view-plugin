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
import java.util.stream.Collectors;
import org.jenkinsci.plugins.pipeline.modeldefinition.actions.ExecutionModelAction;
import org.jenkinsci.plugins.workflow.actions.ErrorAction;
import org.jenkinsci.plugins.workflow.actions.LabelAction;
import org.jenkinsci.plugins.workflow.cps.nodes.StepAtomNode;
import org.jenkinsci.plugins.workflow.flow.FlowExecution;
import org.jenkinsci.plugins.workflow.graph.AtomNode;
import org.jenkinsci.plugins.workflow.graph.BlockEndNode;
import org.jenkinsci.plugins.workflow.graph.BlockStartNode;
import org.jenkinsci.plugins.workflow.graph.FlowEndNode;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.graph.FlowStartNode;
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
    private static final String PARALLEL_SYNTHETIC_STAGE_NAME = "Parallel";

    // Maps a node ID to a given node wrapper. Stores Stages and parallel blocks - not steps.
    private Map<String, FlowNodeWrapper> nodeMap = new TreeMap<>();

    // Determining the status of nodes in handleChunkDone allows us to use whole chunks as a reference, as seems a lot
    // more reliable for determining state. This is a store for those nodes until we find where they come in the graph.
    private final Map<String, FlowNodeWrapper> handledChunkMap = new TreeMap<String, FlowNodeWrapper>();

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
    private ArrayDeque<String> currentParallelBranches = new ArrayDeque<>();

    // Stores the stacks of any parallel branches that we were processing before we hit the last parallelEnd.
    // The size of this will tell use how many nester parallel blocks there are.
    private ArrayDeque<ArrayDeque<String>> pendingBranchStartStacks = new ArrayDeque<>();

    // Maps a node ID to a given step node wrapper.
    private Map<String, FlowNodeWrapper> stepMap = new TreeMap<>();

    // Maps stageId to a list of child steps.
    private Map<String, List<String>> stageStepIdMap = new TreeMap<>();

    // Flag to indicate if we have assigned the steps in stepMap to their parent stages.
    // We do this after processing the stages so we know we are assigning steps to known stages nodes.
    private boolean assignedStepsToParents = false;

    // Used to store the originating node of an unhandled exception.
    private FlowNode nodeThatThrewException;

    // Structures to track end nodes. We use FlowNode as the values (instead of a FlowNodeWrapper id) as we don't return
    // these to the user
    // - so don't need to wrap these in a FlowNodeWrapper.
    // Store any parallel branch ends who we haven't found a parent for.
    private ArrayDeque<FlowNode> currentParallelBranchEnds = new ArrayDeque<>();

    // Used to track the end node for the parallel branches that we have hit the end of but not the start
    // (those we are still processing). This allows us to check when an end node isn't of
    // org.jenkinsci.plugins.workflow.cps.nodes.StepEndNode - and so is still running.
    private ArrayDeque<FlowNode> pendingBranchEndNodes = new ArrayDeque<>();

    // Used to track the end node for the parallel blocks that we have hit the end of but not the start
    // (those we are still processing).
    private ArrayDeque<FlowNode> pendingParallelEndNodes = new ArrayDeque<>();

    // When a parallel branch is running there might be a `parallelBranchStart` call without a prior
    // `parallelBranchEnd`.
    // In this case we use the last chunk end node as the branch end node.
    private ArrayDeque<FlowNode> pendingChunkNodes = new ArrayDeque<>();

    // Record parallel end nodes. We use a stack of stacks to simplify handling parallel block nesting.
    private ArrayDeque<ArrayDeque<FlowNode>> pendingBranchEndStacks = new ArrayDeque<>();

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
                dump(String.format(
                        "constructor => Caught a '%s' traversing the graph for run %s",
                        t.getClass().getSimpleName(), run.getExternalizableId()));
                throw t;
            }
        } else {
            dump(String.format("constructor => Could not find execution for run %s", run.getExternalizableId()));
        }
    }

    // Print debug message if 'isDebugEnabled' is true.
    private void dump(String message) {
        if (isDebugEnabled) {
            String prefix = "-".repeat(pendingBlockIdStacks.size());
            logger.trace(prefix + " " + message);
        }
    }

    @NonNull
    private FlowNodeWrapper wrapFlowNode(
            @NonNull FlowNode nodeToWrap, @NonNull TimingInfo times, @NonNull NodeRunStatus status) {
        return wrapFlowNode(nodeToWrap, times, status, null);
    }

    @NonNull
    private FlowNodeWrapper wrapFlowNode(
            @NonNull FlowNode nodeToWrap,
            @NonNull TimingInfo times,
            @NonNull NodeRunStatus status,
            @Nullable FlowNodeWrapper.NodeType nodeType) {
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
        if (times == null) {
            times = new TimingInfo();
        }
        FlowNodeWrapper wrappedNode = new FlowNodeWrapper(nodeToWrap, status, times, inputStep, run, nodeType);
        if (error != null) {
            wrappedNode.setBlockErrorAction(error);
        }
        return wrappedNode;
    }

    @NonNull
    private NodeRunStatus getFlowNodeStatus(@NonNull FlowNode endNode) {
        boolean skippedStage = PipelineNodeUtil.isSkippedStage(endNode);
        if (skippedStage) {
            return new NodeRunStatus(BlueRun.BlueRunResult.NOT_BUILT, BlueRun.BlueRunState.SKIPPED);
        } else if (PipelineNodeUtil.isPaused(endNode)) {
            return new NodeRunStatus(BlueRun.BlueRunResult.UNKNOWN, BlueRun.BlueRunState.PAUSED);
        }
        // Catch-all if none of the above are applicable.
        return new NodeRunStatus(endNode);
    }

    @NonNull
    private TimingInfo getNodeTiming(@NonNull FlowNode nodeToWrap, @Nullable FlowNode after) {
        long pause = PauseAction.getPauseDuration(nodeToWrap);
        FlowNode endNode = getEndNode(nodeToWrap);
        if (endNode == null) {
            endNode = nodeToWrap;
        }
        TimingInfo times = StatusAndTiming.computeChunkTiming(run, pause, nodeToWrap, endNode, after);
        if (times == null) {
            times = new TimingInfo();
        }
        return times;
    }

    @NonNull
    private NodeRunStatus getParallelBranchStatus(
            @NonNull FlowNode parallelStart,
            @NonNull FlowNode parallelBranchStart,
            @NonNull FlowNode parallelBranchEnd,
            @NonNull FlowNode parallelEnd) {

        List<BlockStartNode> branchStarts = new ArrayList<>();
        branchStarts.add((BlockStartNode) parallelBranchStart);
        List<FlowNode> branchEnds = new ArrayList<>();
        branchEnds.add(parallelBranchEnd);
        Map<String, GenericStatus> branchStatuses =
                StatusAndTiming.computeBranchStatuses2(run, parallelStart, branchStarts, branchEnds, parallelEnd);
        GenericStatus nodeStatus = branchStatuses.get(parallelBranchStart.getDisplayName());
        if (nodeStatus != null) {
            return new NodeRunStatus(nodeStatus);
        }
        return new NodeRunStatus(parallelStart);
    }

    @NonNull
    private TimingInfo getParallelBranchTiming(
            @NonNull FlowNode parallelStart,
            @NonNull FlowNode parallelBranchStart,
            @NonNull FlowNode parallelBranchEnd,
            @NonNull FlowNode parallelEnd) {

        List<Long> branchPauses = new ArrayList<>();
        branchPauses.add(PauseAction.getPauseDuration(parallelBranchStart));
        // Only pass one start and end node to avoid calculating timings that we aren't interested in.
        // Can switch to passing all the branch start and ends if result.
        List<BlockStartNode> branchStarts = new ArrayList<>();
        branchStarts.add((BlockStartNode) parallelBranchStart);
        List<FlowNode> branchEnds = new ArrayList<>();
        branchEnds.add(parallelBranchEnd);
        Map<String, TimingInfo> branchTimes = StatusAndTiming.computeParallelBranchTimings(
                run,
                parallelStart,
                branchStarts,
                branchEnds,
                parallelEnd,
                branchPauses.stream().mapToLong(l -> l).toArray());
        TimingInfo times = branchTimes.getOrDefault(parallelBranchStart.getDisplayName(), null);
        if (times == null) {
            times = new TimingInfo();
        }
        return times;
    }

    @NonNull
    private NodeRunStatus getParallelStatus(
            @NonNull FlowNode parallelStart,
            @NonNull List<BlockStartNode> parallelBranchStarts,
            @NonNull List<FlowNode> parallelBranchEnds,
            @NonNull FlowNode parallelEnd) {

        Map<String, GenericStatus> branchStatuses = StatusAndTiming.computeBranchStatuses2(
                run, parallelStart, parallelBranchStarts, parallelBranchEnds, parallelEnd);
        GenericStatus parallelStatus = StatusAndTiming.condenseStatus(branchStatuses.values());
        if (parallelStatus != null) {
            return new NodeRunStatus(parallelStatus);
        }
        return new NodeRunStatus(parallelStart);
    }

    @NonNull
    private TimingInfo getParallelTiming(
            @NonNull FlowNode parallelStart,
            @NonNull List<BlockStartNode> parallelBranchStarts,
            @NonNull List<FlowNode> parallelBranchEnds,
            @NonNull FlowNode parallelEnd) {

        long[] branchPauses = parallelBranchStarts.stream()
                .mapToLong(n -> PauseAction.getPauseDuration(n))
                .toArray();
        Map<String, TimingInfo> branchTimes = StatusAndTiming.computeParallelBranchTimings(
                run, parallelStart, parallelBranchStarts, parallelBranchEnds, parallelEnd, branchPauses);
        TimingInfo times = StatusAndTiming.computeOverallParallelTiming(run, branchTimes, parallelStart, parallelEnd);
        if (times == null) {
            times = new TimingInfo();
        }
        return times;
    }

    @CheckForNull
    private BlockEndNode getEndNode(@NonNull FlowNode flowNode) {
        if (flowNode instanceof BlockStartNode) {
            // The status is stored in the end node, so try and get that.
            BlockStartNode startNode = (BlockStartNode) flowNode;
            if (startNode != null) {
                return startNode.getEndNode();
            }
        }
        return null;
    }

    private void addChildrenToNode(@NonNull FlowNodeWrapper node, @NonNull ArrayDeque<String> childNodeIds) {
        nodeMap.put(node.getId(), node);
        // Add any pending child nodes to the current node.
        if (childNodeIds != null && !childNodeIds.isEmpty()) {
            for (String childNodeId : childNodeIds) {
                FlowNodeWrapper childNode = nodeMap.get(childNodeId);
                dump(String.format(
                        "addChildrenToNode => Assigning parent {id: %s, name: %s} to node {id: %s, name: %s}.",
                        node.getId(), node.getDisplayName(), childNode.getId(), childNode.getDisplayName()));
                childNode.addParent(node);
                childNode.addEdge(node);
            }
        }
    }

    // Call when we get to an end block.
    // Note: it appears that this block end node will only exist in the Pipeline stage has finished.
    private void handleBlockEndNode(@NonNull FlowNode endNode) {
        // Push current stack of child nodes onto the stack of stacks.
        pendingBlockIdStacks.addLast(currentBlockChildIds);
        currentBlockChildIds = new ArrayDeque<>();
        dump(String.format(
                "handleBlockEndNode => Found Block EndNode {id: %s, name: %s, enclosingId: %s}, pushed new childStack to stack {size: %s}.",
                endNode.getId(), endNode.getDisplayName(), endNode.getEnclosingId(), pendingBlockIdStacks.size()));
    }

    // Call when we get to a start block.
    private void handleBlockStartNode(@NonNull FlowNodeWrapper wrappedNode) {
        ArrayDeque<String> startNodeChildIds = currentBlockChildIds;
        // Push start node to parent node's childStack. We do this here as we can't always get the
        // start node from the endNode in chunkEnd.
        if (pendingBlockIdStacks.isEmpty()) {
            currentBlockChildIds = new ArrayDeque<>();
        } else {
            currentBlockChildIds = pendingBlockIdStacks.removeLast();
        }
        addChildrenToNode(wrappedNode, startNodeChildIds);
    }

    // Call when we get to a start block.
    private void handleBlockStartNode(
            @NonNull FlowNode startNode, @NonNull TimingInfo times, @NonNull NodeRunStatus status) {
        FlowNodeWrapper wrappedNode = wrapFlowNode(startNode, times, status);
        handleBlockStartNode(wrappedNode);
    }

    // Call this when we have reached the node that caused an unhandled exception. This will add the
    // node to the list of pending steps so it can be displayed in the console view.
    private void pushExceptionNodeToStepsMap(@NonNull FlowNode exceptionNode) {
        TimingInfo times = getNodeTiming(exceptionNode, null);
        NodeRunStatus status = getFlowNodeStatus(exceptionNode);
        FlowNodeWrapper erroredStep = wrapFlowNode(exceptionNode, times, status);
        dump(String.format(
                "pushExceptionNodeToStepsMap => Found step exception from step {id: %s, name: %s} to stack.%nError:%n",
                erroredStep.getId(), erroredStep.getArgumentsAsString(), erroredStep.nodeError()));
        stepMap.put(erroredStep.getId(), erroredStep);
    }

    private boolean isCorrectEndNode(FlowNode end, FlowNode start) {
        if (end instanceof BlockEndNode && start == ((BlockEndNode)end).getStartNode()) {
            return true;
        }
        return false;
    }

    @Override
    public void parallelStart(
            @NonNull FlowNode parallelStartNode, @NonNull FlowNode branchNode, @NonNull ForkScanner scanner) {
        super.parallelStart(parallelStartNode, branchNode, scanner);
        dump(String.format(
                "parallelStart => Node {id: %s, name: %s, isStage: %s, isParallelBranch: %s, isSynthetic: %s, parents: %s (%s)} ",
                parallelStartNode.getId(),
                parallelStartNode.getDisplayName(),
                PipelineNodeUtil.isStage(parallelStartNode),
                PipelineNodeUtil.isParallelBranch(parallelStartNode),
                PipelineNodeUtil.isSyntheticStage(parallelStartNode),
                parallelStartNode.getClass(),
                parallelStartNode.getParents().get(0).getId(),
                parallelStartNode.getParents().get(0).getDisplayName()));

        // Add any current branches to this parallel start block and reset stack.
        // Set the node type when calling as running Parallel blocks can be 'StepStartNode' - which would throw
        // exception.
        dump(String.format(
                "parallelStart => Adding children '%s' to Node {id: %s, name: %s, isStage: %s, isParallelBranch: %s, isSynthetic: %s, class: %s}.",
                String.join(",", currentParallelBranches),
                parallelStartNode.getId(),
                parallelStartNode.getDisplayName(),
                PipelineNodeUtil.isStage(parallelStartNode),
                PipelineNodeUtil.isParallelBranch(parallelStartNode),
                PipelineNodeUtil.isSyntheticStage(parallelStartNode),
                parallelStartNode.getClass()));

        // Get Timing and Status info for Parallel block.
        FlowNode parallelEndNode;
        // Check if there is a end node on the stack - there might not be one if the branch is running.
        if (pendingParallelEndNodes.size() > 0) {
            parallelEndNode = pendingParallelEndNodes.pop();
        } else {
            parallelEndNode = getEndNode(parallelStartNode);
        }
        // Fall back - if we cannot get the branch end node, use the last chunk node.
        if (parallelEndNode == null) {
            parallelEndNode = pendingChunkNodes.pop();
        }
        List<BlockStartNode> branchStartNodes = currentParallelBranches.stream()
                .map(n -> (BlockStartNode) nodeMap.get(n).getNode())
                .collect(Collectors.toList());
        List<FlowNode> branchEndNodes = new ArrayList<>();
        // When there are running branches we can have start node with no end nodes.
        // We need these to have a matching set, so find the missing end nodes - or use start nodes if none found.
        if (currentParallelBranchEnds.size() == branchStartNodes.size()) {
            // This is the regular case - when this set of branches isn't running.
            branchEndNodes.addAll(currentParallelBranchEnds);
        } else {
            // We can't know which branches are are missing end nodes (still running), so go and find all end nodes ourselves.
            for (int i = 0; i < branchStartNodes.size(); i++) {
                FlowNode startNode = branchStartNodes.get(i);
                // If we can't find an end node, then use the start node (it's still running).
                FlowNode endNode = startNode;
                for(FlowNode possibleEndNode : currentParallelBranchEnds) {
                    if (isCorrectEndNode(possibleEndNode, startNode)) {
                        endNode = possibleEndNode;
                        continue;
                    }
                }
                branchEndNodes.add(endNode);
            }
            // Reset currentParallelBranchEnds to one with a matching number of nodes to start nodes.
            currentParallelBranchEnds.clear();
            currentParallelBranchEnds.addAll(branchEndNodes);
        }
        TimingInfo times = getParallelTiming(parallelStartNode, branchStartNodes, branchEndNodes, parallelEndNode);
        NodeRunStatus status = getParallelStatus(parallelStartNode, branchStartNodes, branchEndNodes, parallelEndNode);

        FlowNodeWrapper wrappedParallelStart =
                wrapFlowNode(parallelStartNode, times, status, FlowNodeWrapper.NodeType.PARALLEL_BLOCK);
        addChildrenToNode(wrappedParallelStart, currentParallelBranches);

        // Remove parent's parallel branch start node from stack.
        if (pendingBranchStartStacks.isEmpty()) {
            currentParallelBranches = new ArrayDeque<>();
        } else {
            currentParallelBranches = pendingBranchStartStacks.removeLast();
        }
        // Remove parent's parallel branch end nodes from stack.
        if (pendingBranchEndStacks.isEmpty()) {
            currentParallelBranchEnds = new ArrayDeque<>();
        } else {
            currentParallelBranchEnds = pendingBranchEndStacks.removeLast();
        }
        currentBlockChildIds.addLast(wrappedParallelStart.getId());
    }

    @Override
    public void parallelEnd(
            @NonNull FlowNode parallelStartNode, @NonNull FlowNode parallelEndNode, @NonNull ForkScanner scanner) {
        super.parallelEnd(parallelStartNode, parallelEndNode, scanner);
        dump(String.format(
                "parallelEnd => Node {id: %s, name: %s, isStage: %s, isParallelBranch: %s, isSynthetic: %s, class: %s}.",
                parallelEndNode.getId(),
                parallelEndNode.getDisplayName(),
                PipelineNodeUtil.isStage(parallelEndNode),
                PipelineNodeUtil.isParallelBranch(parallelEndNode),
                PipelineNodeUtil.isSyntheticStage(parallelEndNode),
                parallelEndNode.getClass()));
        // Push the list of current parallel branch start/end nodes to the a stack so we can get them again later.
        // This makes handling nested parallels and orphaned branches easier.
        pendingBranchStartStacks.addLast(currentParallelBranches);
        currentParallelBranches = new ArrayDeque<>();
        pendingBranchEndStacks.addLast(currentParallelBranchEnds);
        currentParallelBranchEnds = new ArrayDeque<>();
        pendingParallelEndNodes.push(parallelEndNode);
    }

    @Override
    public void parallelBranchStart(
            @NonNull FlowNode parallelStartNode, @NonNull FlowNode branchStartNode, @NonNull ForkScanner scanner) {
        super.parallelBranchStart(parallelStartNode, branchStartNode, scanner);
        dump(String.format(
                "parallelBranchStart => Node {id: %s, name: %s, isStage: %s, isParallelBranch: %s, isSynthetic: %s, class: %s, orphaned: %s}.",
                branchStartNode.getId(),
                branchStartNode.getDisplayName(),
                PipelineNodeUtil.isStage(branchStartNode),
                PipelineNodeUtil.isParallelBranch(branchStartNode),
                PipelineNodeUtil.isSyntheticStage(branchStartNode),
                branchStartNode.getClass(),
                PipelineNodeUtil.isStage(parallelStartNode)));
        FlowNode branchEndNode;
        // Check if there is a end node on the stack - there might not be one if the branch is running.
        if (pendingBranchEndNodes.size() > 0) {
            branchEndNode = pendingBranchEndNodes.pop();
        } else {
            branchEndNode = getEndNode(branchStartNode);
        }
        // Fall back - if we cannot get the branch end node, use the last chunk node.
        if (branchEndNode == null) {
            branchEndNode = pendingChunkNodes.pop();
        }
        dump(String.format(
                "parallelBranchStart parallelStartNode => Node {id: %s, name: %s, isStage: %s, isParallelBranch: %s, isSynthetic: %s, class: %s, orphaned: %s}.",
                branchEndNode.getId(),
                branchEndNode.getDisplayName(),
                PipelineNodeUtil.isStage(branchEndNode),
                PipelineNodeUtil.isParallelBranch(branchEndNode),
                PipelineNodeUtil.isSyntheticStage(branchEndNode),
                branchEndNode.getClass(),
                PipelineNodeUtil.isStage(branchEndNode.getParents().get(0))));
        FlowNode parallelEndNode = pendingParallelEndNodes.peek();
        TimingInfo branchTimes =
                getParallelBranchTiming(parallelStartNode, branchStartNode, branchEndNode, parallelEndNode);
        NodeRunStatus branchStatus =
                getParallelBranchStatus(parallelStartNode, branchStartNode, branchEndNode, parallelEndNode);
        // When there is a single running parallel branch, the graph the doesn't enclose it in a parallel block - it in
        // it's grandparent.
        // In this case we need to add a syntheic one.
        // To check this we can check if the endNode is still running (instance of StepAtomNode) and there are any other
        // pending parallel branches.
        if (false) {
            if (branchEndNode instanceof StepAtomNode && pendingBranchEndNodes.size() == 0) {
                dump(String.format(
                        "parallelBranchStart => Found orphaned parallel branch {ID: %s, name: %s}.",
                        parallelStartNode.getId(), parallelStartNode.getDisplayName()));
                captureOrphanParallelBranches();
            }
        } else {
            dump("Skipping 'captureOrphanParallelBranches' test...");
        }
        handleBlockStartNode(branchStartNode, branchTimes, branchStatus);
        currentParallelBranches.add(branchStartNode.getId());
    }

    @Override
    public void parallelBranchEnd(
            @NonNull FlowNode parallelStartNode, @NonNull FlowNode branchEndNode, @NonNull ForkScanner scanner) {
        super.parallelBranchEnd(parallelStartNode, branchEndNode, scanner);
        dump(String.format(
                "parallelBranchEnd => Node {id: %s, name: %s, isStage: %s, isParallelBranch: %s, isSynthetic: %s, class: %s}.",
                branchEndNode.getId(),
                branchEndNode.getDisplayName(),
                PipelineNodeUtil.isStage(branchEndNode),
                PipelineNodeUtil.isParallelBranch(branchEndNode),
                PipelineNodeUtil.isSyntheticStage(branchEndNode),
                branchEndNode.getClass()));
        // Record the end node so we can do logic on it later if required.
        pendingBranchEndNodes.push(branchEndNode);
        currentParallelBranchEnds.add(branchEndNode);
        dump(String.format(
                "Add node {id: %s, name: %s, isStage: %s, isParallelBranch: %s, isSynthetic: %s, class: %s} to currentParallelBranchEnds, size: %s ",
                branchEndNode.getId(),
                branchEndNode.getDisplayName(),
                PipelineNodeUtil.isStage(branchEndNode),
                PipelineNodeUtil.isParallelBranch(branchEndNode),
                PipelineNodeUtil.isSyntheticStage(branchEndNode),
                branchEndNode.getClass(),
                currentParallelBranchEnds.size()));
        handleBlockEndNode(branchEndNode);
    }

    @SuppressFBWarnings("RV_RETURN_VALUE_IGNORED")
    @Override
    public void chunkStart(
            @NonNull FlowNode startNode, @CheckForNull FlowNode beforeBlock, @NonNull ForkScanner scanner) {
        super.chunkStart(startNode, beforeBlock, scanner);
        dump(String.format(
                "chunkStart => Node ID: {id: %s, name: %s, isStage: %s, isParallelBranch: %s, isSynthetic: %s, class: %s}.",
                startNode.getId(),
                startNode.getDisplayName(),
                PipelineNodeUtil.isStage(startNode),
                PipelineNodeUtil.isParallelBranch(startNode),
                PipelineNodeUtil.isSyntheticStage(startNode),
                startNode.getClass()));
        // Get node from map fo already handled nodes. These nodes were created by working on the chunk, which seems a
        // more reliable way to determine the state of a stage.
        FlowNodeWrapper alreadyHandledNode = handledChunkMap.getOrDefault(startNode.getId(), null);
        if (alreadyHandledNode != null) {
            handleBlockStartNode(alreadyHandledNode);
        } else {
            TimingInfo times = getNodeTiming(startNode, null);
            NodeRunStatus status = getFlowNodeStatus(startNode);
            handleBlockStartNode(startNode, times, status);
        }
        currentBlockChildIds.addLast(startNode.getId());
    }

    @Override
    public void chunkEnd(@NonNull FlowNode chunkNode, @CheckForNull FlowNode afterChunk, @NonNull ForkScanner scanner) {
        pendingChunkNodes.push(chunkNode);
        super.chunkEnd(chunkNode, afterChunk, scanner);
        if (chunkNode instanceof FlowEndNode) {
            dump(String.format(
                    "chunkEnd => Skipping FlowEndNode {id: %s, name: %s, isStage: %s, isParallelBranch: %s, isSynthetic: %s, class: %s}.",
                    chunkNode.getId(),
                    chunkNode.getDisplayName(),
                    PipelineNodeUtil.isStage(chunkNode),
                    PipelineNodeUtil.isParallelBranch(chunkNode),
                    PipelineNodeUtil.isSyntheticStage(chunkNode),
                    chunkNode.getClass()));
            return;
        }
        dump(String.format(
                "chunkEnd => Node {id: %s, name: %s, isStage: %s, isParallelBranch: %s, isSynthetic: %s, class: %s}.",
                chunkNode.getId(),
                chunkNode.getDisplayName(),
                PipelineNodeUtil.isStage(chunkNode),
                PipelineNodeUtil.isParallelBranch(chunkNode),
                PipelineNodeUtil.isSyntheticStage(chunkNode),
                chunkNode.getClass()));
        // Check if the Pipeline exited with an unhandled exception. If so, we will try and attach it to
        // the originating block.
        if (this.isLastNode) {
            this.isLastNode = false;
            // Check for an unhandled exception.
            ErrorAction errorAction = chunkNode.getAction(ErrorAction.class);
            // If this is a Jenkins failure exception, then we don't need to add a new node - it will come
            // from an existing step.
            if (errorAction != null && !PipelineNodeUtil.isJenkinsFailureException(errorAction.getError())) {
                // Store node that threw exception as step so we can find it's parent stage later.
                dump(String.format(
                        "chunkEnd => Found unhandled exception: %s",
                        errorAction.getError().getMessage()));
                this.nodeThatThrewException = errorAction.findOrigin(errorAction.getError(), this.execution);
                if (this.nodeThatThrewException != null) {
                    dump(String.format(
                            "chunkEnd => Found that node '%s' threw unhandled exception: %s.",
                            this.nodeThatThrewException.getId(),
                            PipelineNodeUtil.getDisplayName(this.nodeThatThrewException)));
                }
            }
        }
        // if we're using marker-based (and not block-scoped) stages, add the last node as part of its
        // contents
        if ((chunkNode instanceof BlockEndNode)) {
            handleBlockEndNode(chunkNode);
        } else {
            atomNode(null, chunkNode, afterChunk, scanner);
        }
        // If this the the node that created the unhandled exception.
        if (this.nodeThatThrewException == chunkNode) {
            dump("chunkEnd => Found chunkNode that threw exception.");
            pushExceptionNodeToStepsMap(chunkNode);
        }
    }

    // This gets triggered on encountering a new chunk (stage or branch)
    // This seems a reliable way to get the finished state of a node.
    @SuppressFBWarnings(
            value = "RCN_REDUNDANT_NULLCHECK_OF_NONNULL_VALUE",
            justification =
                    "chunk.getLastNode() is marked non null but is null sometimes, when JENKINS-40200 is fixed we will remove this check ")
    @Override
    protected void handleChunkDone(@NonNull MemoryFlowChunk chunk) {
        // Create nodes here so we can more accurately get the status.
        dump(String.format(
                "handleChunkDone=> id: %s, name: %s, function: %s",
                chunk.getFirstNode().getId(),
                chunk.getFirstNode().getDisplayName(),
                chunk.getFirstNode().getDisplayFunctionName()));

        TimingInfo times = null;

        // TODO: remove chunk.getLastNode() != null check based on how JENKINS-40200 gets resolved
        if (chunk.getLastNode() != null) {
            times = StatusAndTiming.computeChunkTiming(
                    run, chunk.getPauseTimeMillis(), chunk.getFirstNode(), chunk.getLastNode(), chunk.getNodeAfter());
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
        } else {
            status = new NodeRunStatus(chunk.getLastNode());
        }
        if (PipelineNodeUtil.isPaused(chunk.getFirstNode())) {
            status = new NodeRunStatus(BlueRun.BlueRunResult.UNKNOWN, BlueRun.BlueRunState.PAUSED);
        }
        handledChunkMap.put(
                chunk.getFirstNode().getId(), new FlowNodeWrapper(chunk.getFirstNode(), status, times, run));
    }

    private void assignStepToParent(@NonNull FlowNodeWrapper step, @NonNull String parentId) {
        if (parentId == null) {
            logger.error("assignStepToParent => was passed null parent id");
        } else {
            List<String> parentStepList = stageStepIdMap.getOrDefault(parentId, new ArrayList<>());
            if (parentStepList.contains(step.getId())) {
                dump(String.format(
                        "assignStepToParent => Skipping already assign step: {id: %s, args: %s} - parent {id: %s}.",
                        step.getId(), step.getArgumentsAsString(), parentId));
            } else {
                dump(String.format(
                        "assignStepToParent => Assigning step: {id: %s, args: %s} to enclosing block {id: %s}.",
                        step.getId(), step.getArgumentsAsString(), parentId));
                parentStepList.add(step.getId());
                stageStepIdMap.put(parentId, parentStepList);
            }
        }
    }

    private void findStepParents() {
        if (assignedStepsToParents) {
            // early return as this has already been run.
            return;
        }
        for (FlowNodeWrapper step : stepMap.values()) {
            FlowNode stepNode = step.getNode();
            if (stepNode instanceof BlockEndNode) {
                // This should be the node that threw an exception.
                dump(String.format(
                        "findStepParents => Found BlockEndNode {id: %s, name: %s, isStage: %s, isParallelBranch: %s, isSynthetic: %s, class: %s}.",
                        stepNode.getId(),
                        stepNode.getDisplayName(),
                        PipelineNodeUtil.isStage(stepNode),
                        PipelineNodeUtil.isParallelBranch(stepNode),
                        PipelineNodeUtil.isSyntheticStage(stepNode),
                        stepNode.getClass()));
                // If we are a block end node then
                BlockEndNode stepEndNode = (BlockEndNode) stepNode;
                BlockStartNode stepStartNode = stepEndNode.getStartNode();
                if (stepStartNode != null) {
                    assignStepToParent(step, stepStartNode.getId());
                    continue;
                }
            }
            // Fall back to searching for the enclosing/parent stage node for the step.
            FlowNode parent = findClosestParentStage(step.getNode());
            if (parent != null) {
                assignStepToParent(step, parent.getId());
            } else {
                logger.error(String.format(
                        "findStepParents => Could not find suitable parent for step {id: %s, args: %s}.",
                        step.getId(), step.getArgumentsAsString()));
            }
        }
        assignedStepsToParents = true;
    }

    /* Recursively looks to try and find a stage that encloses this node.
     */
    private FlowNode findClosestParentStage(@NonNull FlowNode node) {
        // Arbitrary limit - I think there will be much less than 25 non-stage nodes between a step and s stage.
        return findClosestParentStage(node, 25, 0);
    }

    private FlowNode findClosestParentStage(@NonNull FlowNode node, @NonNull int limit, @NonNull int attempt) {
        if (attempt >= limit) {
            logger.error("findClosestParentStage => Recursion limit reached, returning null.");
        }
        dump(String.format(
                "#".repeat(attempt)
                        + " findClosestParentStage => Trying to find parent stage for {id: %s, name: %s, isStage: %s, isParallelBranch: %s, isSynthetic: %s, class: %s}.",
                node.getId(),
                node.getDisplayName(),
                PipelineNodeUtil.isStage(node),
                PipelineNodeUtil.isParallelBranch(node),
                PipelineNodeUtil.isSyntheticStage(node),
                node.getClass()));
        // Prefer the enclosing ID as most nodes will be wrapped in a stage.
        String parentNodeId = node.getEnclosingId();
        if (parentNodeId == null) {
            dump(String.format(
                    "#".repeat(attempt)
                            + " findClosestParentStage => Could not find enclosing ID for node  {id: %s, name: %s, isStage: %s, isParallelBranch: %s, isSynthetic: %s, class: %s}.",
                    node.getId(),
                    node.getDisplayName(),
                    PipelineNodeUtil.isStage(node),
                    PipelineNodeUtil.isParallelBranch(node),
                    PipelineNodeUtil.isSyntheticStage(node),
                    node.getClass()));
            List<FlowNode> parentNodeIds = node.getParents();
            if (parentNodeIds.isEmpty()) {
                logger.error(String.format(
                        "#".repeat(attempt)
                                + " findClosestParentStage => Could not find enclosing ID or parent ID for node  {id: %s, name: %s, isStage: %s, isParallelBranch: %s, isSynthetic: %s, class: %s}.",
                        node.getId(),
                        node.getDisplayName(),
                        PipelineNodeUtil.isStage(node),
                        PipelineNodeUtil.isParallelBranch(node),
                        PipelineNodeUtil.isSyntheticStage(node),
                        node.getClass()));
                return null;
            }
            parentNodeId = parentNodeIds.get(0).getId();
        }
        FlowNodeWrapper parent = nodeMap.getOrDefault(parentNodeId, null);
        if (parent != null) {
            // This is a known block so return this.
            return parent.getNode();
        }
        try {
            // Try finding the enclosing block and seem if that is a known block.
            FlowNode parentNode = execution.getNode(parentNodeId);
            if (parentNode != null) {
                return findClosestParentStage(parentNode, limit, attempt + 1);
            } else {
                logger.error("findClosestParentStage => Error getting parent node from execution.");
            }
        } catch (java.io.IOException e) {
            logger.error(String.format("Caught IOException:%n%s", e.getMessage()));
        }
        return null;
    }

    @Override
    public void atomNode(
            @CheckForNull FlowNode before,
            @NonNull FlowNode atomNode,
            @CheckForNull FlowNode after,
            @NonNull ForkScanner scan) {
        super.atomNode(before, atomNode, after, scan);
        // If we got to the start of the Graph and still have unprocessed parallel branches, then they are orphaned.
        if (atomNode instanceof FlowStartNode && currentParallelBranches.isEmpty()) {
            captureOrphanParallelBranches();
            return;
        }
        if (atomNode instanceof StepAtomNode) {
            for (Action action : atomNode.getActions()) {
                logger.trace(
                        String.format("atomNode => step action: %s - %s", action.getDisplayName(), action.getClass()));
            }

            TimingInfo times = getNodeTiming(atomNode, after);
            NodeRunStatus status = getFlowNodeStatus(atomNode);
            FlowNodeWrapper stepNode = wrapFlowNode(atomNode, times, status);
            stepMap.put(stepNode.getId(), stepNode);
        }

        // If this the the node that created the unhandled exception.
        if (this.nodeThatThrewException == atomNode) {
            dump("atomNode => Found atomNode that threw exception.");
            pushExceptionNodeToStepsMap(atomNode);
        }
    }

    @NonNull
    public List<FlowNodeWrapper> getStageSteps(String startNodeId) {
        findStepParents();
        List<FlowNodeWrapper> stageSteps = new ArrayList<>();
        for (String stepId : stageStepIdMap.getOrDefault(startNodeId, new ArrayList<>())) {
            stageSteps.add(stepMap.get(stepId));
        }
        Collections.sort(stageSteps, new FlowNodeWrapper.NodeComparator());
        dump(String.format("Returning %s steps for node '%s'", stageSteps.size(), startNodeId));
        return stageSteps;
    }

    @NonNull
    public Map<String, List<FlowNodeWrapper>> getAllSteps() {
        findStepParents();
        Map<String, List<FlowNodeWrapper>> stageNodeStepMap = new TreeMap<>();
        for (String stageId : stageStepIdMap.keySet()) {
            stageNodeStepMap.put(stageId, getStageSteps(stageId));
        }
        dump(String.format(
                "Returning %s steps in total", stageNodeStepMap.values().size()));
        return stageNodeStepMap;
    }

    @NonNull
    public List<FlowNodeWrapper> getPipelineNodes() {
        List<FlowNodeWrapper> stageNodes = new ArrayList<>(nodeMap.values());
        Collections.sort(stageNodes, new FlowNodeWrapper.NodeComparator());
        return stageNodes;
    }

    @NonNull
    public Map<String, FlowNodeWrapper> getPipelineNodeMap() {
        return nodeMap;
    }

    @NonNull
    public Boolean isDeclarative() {
        return this.declarative;
    }

    /**
     * Add all pending parallel branches to a syntethic node (one that doesn't exist in the real DAG).
     * This is needed for instanced where parallel branches aren't enclosed in a parallel block - for instance,
     * when a parallel block has a single, running branch.
     */
    private void captureOrphanParallelBranches() {
        if (!currentParallelBranches.isEmpty()) {
            FlowNodeWrapper synStage = createParallelSyntheticNode();
            if (synStage != null) {
                nodeMap.put(synStage.getId(), synStage);
            }
        }
    }

    /**
     * Create synthetic stage that wraps a parallel block at top level, that is not enclosed inside a stage.
     */
    private @Nullable FlowNodeWrapper createParallelSyntheticNode() {

        if (currentParallelBranches.isEmpty()) {
            return null;
        }

        FlowNodeWrapper firstBranch = nodeMap.get(currentParallelBranches.getLast());
        FlowNodeWrapper parallel = firstBranch.getFirstParent();

        dump(String.format(
                "createParallelSyntheticNode=> firstBranch: %s, parallel:%s",
                firstBranch.getId(), (parallel == null ? "(none)" : parallel.getId())));

        String firstNodeId = firstBranch.getId();
        List<FlowNode> parents;
        if (parallel != null) {
            parents = parallel.getNode().getParents();
        } else {
            parents = new ArrayList<>();
        }
        FlowNode syntheticNode =
                new FlowNode(
                        firstBranch.getNode().getExecution(),
                        createSyntheticStageId(firstNodeId, PARALLEL_SYNTHETIC_STAGE_NAME),
                        parents) {
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
        for (String nodeId : currentParallelBranches) {
            FlowNodeWrapper pb = nodeMap.get(nodeId);
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

        BlueRun.BlueRunState state = isCompleted
                ? BlueRun.BlueRunState.FINISHED
                : (isPaused ? BlueRun.BlueRunState.PAUSED : BlueRun.BlueRunState.RUNNING);
        BlueRun.BlueRunResult result = isFailure
                ? BlueRun.BlueRunResult.FAILURE
                : (isUnknown ? BlueRun.BlueRunResult.UNKNOWN : BlueRun.BlueRunResult.SUCCESS);

        TimingInfo timingInfo = new TimingInfo(duration, pauseDuration, startTime);

        FlowNodeWrapper synStage =
                new FlowNodeWrapper(syntheticNode, new NodeRunStatus(result, state), timingInfo, run);

        // Reverse list of branches
        addChildrenToNode(synStage, currentParallelBranches);
        return synStage;
    }

    static class LocalAtomNode extends AtomNode {
        private final String cause;

        public LocalAtomNode(MemoryFlowChunk chunk, String cause) {
            super(chunk.getFirstNode().getExecution(), UUID.randomUUID().toString(), chunk.getFirstNode());
            this.cause = cause;
        }

        @Override
        protected String getTypeDisplayName() {
            return cause;
        }
    }

    /**
     * Create id of synthetic stage in a deterministic base.
     * <p>
     * For example, an orphan parallel block with id 12 (appears top level not wrapped inside a stage) gets wrapped in a synthetic
     * stage with id: 12-parallel-synthetic. Later client calls nodes API using this id: /nodes/12-parallel-synthetic/ would
     * correctly pick the synthetic stage wrapping parallel block 12 by doing a lookup nodeMap.get("12-parallel-synthetic")
     */
    private @NonNull String createSyntheticStageId(@NonNull String firstNodeId, @NonNull String syntheticStageName) {
        return String.format("%s-%s-synthetic", firstNodeId, syntheticStageName.toLowerCase());
    }
}
