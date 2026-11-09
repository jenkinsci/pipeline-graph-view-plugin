package io.jenkins.plugins.pipelinegraphview.utils;

import static java.util.Collections.emptyList;

import edu.umd.cs.findbugs.annotations.CheckForNull;
import io.jenkins.plugins.pipelinegraphview.Messages;
import io.jenkins.plugins.pipelinegraphview.livestate.LiveGraphCacheKey;
import io.jenkins.plugins.pipelinegraphview.livestate.LiveGraphRegistry;
import io.jenkins.plugins.pipelinegraphview.livestate.LiveGraphSnapshot;
import io.jenkins.plugins.pipelinegraphview.treescanner.PipelineNodeGraphAdapter;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.jenkinsci.plugins.workflow.actions.WorkspaceAction;
import org.jenkinsci.plugins.workflow.cps.nodes.StepStartNode;
import org.jenkinsci.plugins.workflow.flow.FlowExecution;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.graphanalysis.DepthFirstScanner;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.steps.StepDescriptor;
import org.jenkinsci.plugins.workflow.support.steps.input.InputStep;
import org.kohsuke.accmod.Restricted;
import org.kohsuke.accmod.restrictions.NoExternalUse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class PipelineGraphApi {
    private static final Logger logger = LoggerFactory.getLogger(PipelineGraphApi.class);
    private static final String EXECUTOR_STEP = "org.jenkinsci.plugins.workflow.support.steps.ExecutorStep";
    private final transient WorkflowRun run;

    public PipelineGraphApi(WorkflowRun run) {
        this.run = run;
    }

    private List<PipelineStageInternal> getPipelineNodes(
            PipelineGraphBuilderApi builder,
            @CheckForNull List<FlowNode> workspaceNodes,
            @CheckForNull Map<String, List<String>> enclosingIdsByNodeId) {
        List<FlowNodeWrapper> pipelineNodes = builder.getPipelineNodes();
        if (pipelineNodes.isEmpty()) {
            return new ArrayList<>();
        }
        List<FlowNode> resolvedWorkspaceNodes =
                workspaceNodes != null ? workspaceNodes : findWorkspaceNodes(run.getExecution());
        // Each stage is checked against every workspace node, so resolve their ancestry once
        // instead of going to storage for it per stage.
        Map<String, List<String>> resolvedEnclosingIds = enclosingIdsByNodeId;
        if (resolvedEnclosingIds == null) {
            resolvedEnclosingIds = new HashMap<>();
            for (FlowNode n : resolvedWorkspaceNodes) {
                resolvedEnclosingIds.put(n.getId(), n.getAllEnclosingIds());
            }
        }
        Set<String> stageIds =
                pipelineNodes.stream().map(FlowNodeWrapper::getId).collect(Collectors.toSet());
        Map<String, String> agentsWithinStages =
                agentsWithinStages(stageIds, resolvedWorkspaceNodes, resolvedEnclosingIds);
        Set<String> stagesWaitingForAgent =
                stagesWaitingForAgent(run.getExecution(), stageIds, agentsWithinStages, resolvedEnclosingIds);
        Map<String, List<String>> enclosingIds = resolvedEnclosingIds;
        return pipelineNodes.stream()
                .map(flowNodeWrapper -> new PipelineStageInternal(
                        flowNodeWrapper.getId(), // TODO no need to parse it BO returns a string even though the
                        // datatype is number on the frontend
                        flowNodeWrapper.getDisplayName(),
                        flowNodeWrapper.getParents().stream()
                                .map(FlowNodeWrapper::getId)
                                .collect(Collectors.toList()),
                        PipelineState.of(flowNodeWrapper.getStatus()),
                        flowNodeWrapper.getType(),
                        flowNodeWrapper.getDisplayName(), // TODO blue ocean uses timing information: "Passed in 0s"
                        flowNodeWrapper.isSynthetic(),
                        flowNodeWrapper.getTiming(),
                        stagesWaitingForAgent.contains(flowNodeWrapper.getId())
                                ? null
                                : getStageNode(
                                        flowNodeWrapper, agentsWithinStages, resolvedWorkspaceNodes, enclosingIds),
                        flowNodeWrapper.getCauseOfBlockage()))
                .collect(Collectors.toList());
    }

    private Function<String, PipelineStage> mapper(
            Map<String, PipelineStageInternal> stageMap, Map<String, List<String>> stageToChildrenMap) {
        String runUrl = run.getUrl();
        return id -> {
            List<String> orDefault = stageToChildrenMap.getOrDefault(id, emptyList());
            List<PipelineStage> children =
                    orDefault.stream().map(mapper(stageMap, stageToChildrenMap)).collect(Collectors.toList());
            return stageMap.get(id).toPipelineStage(children, runUrl);
        };
    }

    private PipelineGraph createTree(
            PipelineGraphBuilderApi builder,
            @CheckForNull List<FlowNode> workspaceNodes,
            @CheckForNull Map<String, List<String>> enclosingIdsByNodeId,
            boolean complete) {
        FlowExecution execution = run.getExecution();
        if (execution == null) {
            return new PipelineGraph(new ArrayList<>(), complete);
        }

        // We want to remap children here, so we don't update the parents of the
        // original objects - as
        // these are completely new representations.
        List<PipelineStageInternal> stages = getPipelineNodes(builder, workspaceNodes, enclosingIdsByNodeId);

        // Only a running build can be paused; skipping finished builds avoids remapping their steps.
        if (!complete && builder instanceof PipelineStepBuilderApi stepBuilder) {
            Map<String, PipelineStageInternal.PausedStep> pausedSteps = pausedStepsByStage(stepBuilder);
            stages.forEach(stage -> stage.setPausedStep(pausedSteps.get(stage.getId())));
        }

        // id => stage
        Map<String, PipelineStageInternal> stageMap = stages.stream()
                .collect(Collectors.toMap(
                        PipelineStageInternal::getId, stage -> stage, (u, v) -> u, LinkedHashMap::new));

        Map<String, List<String>> stageToChildrenMap = new HashMap<>();
        List<String> childNodes = new ArrayList<>();

        stages.forEach(stage -> {
            if (stage.getParents().isEmpty()) {
                stageToChildrenMap.put(stage.getId(), new ArrayList<>());
            } else {
                List<String> parentChildren =
                        stageToChildrenMap.getOrDefault(stage.getParents().get(0), new ArrayList<String>());
                parentChildren.add(stage.getId());
                childNodes.add(stage.getId());
                stageToChildrenMap.put(stage.getParents().get(0), parentChildren);
            }
        });
        String runUrl = run.getUrl();
        List<PipelineStage> stageResults = stageMap.values().stream()
                .map(pipelineStageInternal -> {
                    List<PipelineStage> children =
                            stageToChildrenMap.getOrDefault(pipelineStageInternal.getId(), emptyList()).stream()
                                    .map(mapper(stageMap, stageToChildrenMap))
                                    .collect(Collectors.toList());

                    return pipelineStageInternal.toPipelineStage(children, runUrl);
                })
                .filter(stage -> !childNodes.contains(stage.id))
                .collect(Collectors.toList());
        return new PipelineGraph(stageResults, complete);
    }

    private static Map<String, PipelineStageInternal.PausedStep> pausedStepsByStage(
            PipelineStepBuilderApi stepBuilder) {
        Map<String, PipelineStageInternal.PausedStep> pausedSteps = new HashMap<>();
        stepBuilder.getAllSteps().forEach((stageId, steps) -> {
            for (FlowNodeWrapper step : steps) {
                if (step.getStatus().state == BlueRun.BlueRunState.PAUSED) {
                    InputStep inputStep = step.getInputStep();
                    pausedSteps.put(
                            stageId,
                            new PipelineStageInternal.PausedStep(
                                    inputStep == null ? waitingFor(step) : null, inputStep));
                    return;
                }
            }
        });
        return pausedSteps;
    }

    private static String waitingFor(FlowNodeWrapper step) {
        String stepName = step.getStepDisplayName();
        String arguments = step.getArgumentsAsString();
        return arguments == null || arguments.isBlank()
                ? Messages.PipelineStage_waitingForStep(stepName)
                : Messages.PipelineStage_waitingForStepWithArguments(stepName, arguments);
    }

    /**
     * The workspace (node step) starts of a run, in depth-first order from the heads so an inner
     * workspace comes before the one enclosing it. Only a {@link StepStartNode} can carry a
     * {@link WorkspaceAction}.
     */
    private static List<FlowNode> findWorkspaceNodes(@CheckForNull FlowExecution execution) {
        if (execution == null) {
            return new ArrayList<>();
        }
        return new DepthFirstScanner()
                .filteredNodes(
                        PipelineNodeUtil.currentHeads(execution),
                        n -> n instanceof StepStartNode && n.getPersistentAction(WorkspaceAction.class) != null);
    }

    /**
     * Maps each stage or parallel branch to the agent allocated inside it, e.g. a node step
     * wrapped in script or timeout. That is where the stage's steps ran, so it wins over an
     * agent the stage inherited from an enclosing block. Each workspace counts only for its
     * nearest enclosing stage or branch, not for that stage's parents.
     */
    private static Map<String, String> agentsWithinStages(
            Set<String> stageIds, List<FlowNode> workspaceNodes, Map<String, List<String>> enclosingIdsByNodeId) {
        Map<String, String> agents = new HashMap<>();
        for (FlowNode n : workspaceNodes) {
            WorkspaceAction ws = n.getPersistentAction(WorkspaceAction.class);
            if (ws == null) {
                continue;
            }
            String stageId = nearestStageId(n, stageIds, enclosingIdsFor(n, enclosingIdsByNodeId));
            if (stageId != null) {
                agents.putIfAbsent(stageId, agentName(ws));
            }
        }
        return agents;
    }

    /**
     * Stages or parallel branches whose own {@code node} step is still in the queue, and that
     * have no agent allocated inside them yet. Until it gets an executor, the step has no
     * workspace, so the stage would otherwise show the agent of an enclosing block, where none
     * of its steps run. A queued {@code node} step is always one of the execution's heads.
     */
    private static Set<String> stagesWaitingForAgent(
            @CheckForNull FlowExecution execution,
            Set<String> stageIds,
            Map<String, String> agentsWithinStages,
            Map<String, List<String>> enclosingIdsByNodeId) {
        if (execution == null || execution.isComplete()) {
            return Set.of();
        }
        Set<String> waiting = new HashSet<>();
        for (FlowNode head : PipelineNodeUtil.currentHeads(execution)) {
            if (isQueuedNodeStep(head)) {
                String stageId = nearestStageId(head, stageIds, enclosingIdsFor(head, enclosingIdsByNodeId));
                if (stageId != null && !agentsWithinStages.containsKey(stageId)) {
                    waiting.add(stageId);
                }
            }
        }
        return waiting;
    }

    /** The start of a {@code node} step whose body hasn't started, as the head has no children. */
    private static boolean isQueuedNodeStep(FlowNode head) {
        if (!(head instanceof StepStartNode start) || start.isBody()) {
            return false;
        }
        StepDescriptor descriptor = start.getDescriptor();
        return descriptor != null && EXECUTOR_STEP.equals(descriptor.getId());
    }

    /** @param enclosingIds the node's enclosing block IDs, innermost first */
    @CheckForNull
    private static String nearestStageId(FlowNode node, Set<String> stageIds, List<String> enclosingIds) {
        if (stageIds.contains(node.getId())) {
            return node.getId();
        }
        for (String enclosingId : enclosingIds) {
            if (stageIds.contains(enclosingId)) {
                return enclosingId;
            }
        }
        return null;
    }

    private static String getStageNode(
            FlowNodeWrapper flowNodeWrapper,
            Map<String, String> agentsWithinStages,
            List<FlowNode> workspaceNodes,
            Map<String, List<String>> enclosingIdsByNodeId) {
        FlowNode flowNode = flowNodeWrapper.getNode();
        logger.debug("Checking node {}", flowNode);
        String agentWithinStage = agentsWithinStages.get(flowNode.getId());
        if (agentWithinStage != null) {
            return agentWithinStage;
        }
        // Prefer pre-computed ancestry: FlowNode#getAllEnclosingIds acquires the storage read
        // lock, which contends with the running build's writes.
        List<String> flowNodeEnclosingIds = enclosingIdsFor(flowNode, enclosingIdsByNodeId);
        for (FlowNode n : workspaceNodes) {
            WorkspaceAction ws = n.getPersistentAction(WorkspaceAction.class);
            if (ws != null) {
                logger.debug("Found workspace node: {}", n);
                List<String> nEnclosingIds = enclosingIdsFor(n, enclosingIdsByNodeId);
                String nDirectEnclosingId = nEnclosingIds.isEmpty() ? null : nEnclosingIds.get(0);
                boolean isWorkspaceNode = Objects.equals(n.getId(), flowNode.getId())
                        || Objects.equals(nDirectEnclosingId, flowNode.getId())
                        || flowNodeEnclosingIds.contains(n.getId());

                // For parallel stages the stage wrapper sits three levels above the workspace
                // node (branch → parallel block → sub-stage → workspace).
                if (flowNodeWrapper.getType() == FlowNodeWrapper.NodeType.PARALLEL && nEnclosingIds.size() >= 3) {
                    isWorkspaceNode = Objects.equals(flowNode.getId(), nEnclosingIds.get(2));
                }

                if (isWorkspaceNode) {
                    logger.debug("Found correct stage node: {}", n.getId());
                    return agentName(ws);
                }
            }
        }
        return null;
    }

    private static String agentName(WorkspaceAction ws) {
        String node = ws.getNode();
        return node.isEmpty() ? "built-in" : node;
    }

    private static List<String> enclosingIdsFor(FlowNode node, Map<String, List<String>> map) {
        List<String> pre = map.get(node.getId());
        return pre != null ? pre : node.getAllEnclosingIds();
    }

    public PipelineGraph createTree() {
        return PipelineGraphViewCache.get().getGraph(run, this::computeTree);
    }

    /**
     * Whether a graph built now would be final. Call this <em>before</em> building the graph's
     * statuses: status resolution reads the nodes' liveness (from a snapshot or
     * {@link FlowNode#isActive()}), so asking after the build can report the run as complete
     * while the stages it just resolved still say "running". A complete response stops the
     * frontend polling, which would leave those stages animating forever.
     */
    private boolean isComplete(FlowExecution execution) {
        if (execution != null) {
            return execution.isComplete();
        }
        // No execution either means the run finished without one (e.g. a syntax error), where
        // the empty graph is final, or the run is still initialising (e.g. checking out the
        // Jenkinsfile) and the execution doesn't exist yet. Only the former may be marked
        // complete: complete=true responses are served with immutable cache headers and stop
        // frontend polling, so marking an initialising run complete freezes its view empty
        // forever.
        return !run.isBuilding();
    }

    /** Uncached compute path; callers are responsible for any caching. */
    @Restricted(NoExternalUse.class)
    public PipelineGraph computeTree() {
        // Fast path: cache hit without locking.
        LiveGraphCacheKey currentKey = LiveGraphRegistry.get().cacheKey(run);
        if (currentKey != null) {
            PipelineGraph cached = LiveGraphRegistry.get().cachedGraph(run, currentKey);
            if (cached != null) {
                return cached;
            }
        }
        // Slow path: serialise concurrent rebuilds for this run. Without this, N concurrent
        // HTTP readers each spend O(nodes) CPU on the same computation.
        Object lock = LiveGraphRegistry.get().graphComputeLock(run);
        if (lock != null) {
            synchronized (lock) {
                // Re-check — another thread likely computed while we waited.
                LiveGraphCacheKey retryKey = LiveGraphRegistry.get().cacheKey(run);
                if (retryKey != null) {
                    PipelineGraph cached = LiveGraphRegistry.get().cachedGraph(run, retryKey);
                    if (cached != null) {
                        return cached;
                    }
                }
                // Read before the snapshot, so a pause that starts while computing makes the next read recompute
                Set<String> pausedNodeIds = LiveGraphRegistry.pausedNodeIds(run);
                LiveGraphSnapshot snapshot = LiveGraphRegistry.get().snapshot(run);
                if (snapshot != null) {
                    // snapshot.complete() was captured together with activeNodeIds, so the
                    // flag cannot contradict the statuses built from that liveness view.
                    PipelineGraph computed = createTree(
                            new PipelineNodeGraphAdapter(
                                    run, snapshot.nodes(), snapshot.enclosingIdsByNodeId(), snapshot.activeNodeIds()),
                            snapshot.workspaceNodes(),
                            snapshot.enclosingIdsByNodeId(),
                            snapshot.complete());
                    LiveGraphRegistry.get()
                            .cacheGraph(run, new LiveGraphCacheKey(snapshot.version(), pausedNodeIds), computed);
                    return computed;
                }
            }
        }
        // Read completion before the adapter is built, for the same reason as above: the
        // adapter resolves statuses from the nodes' liveness as it constructs them.
        FlowExecution execution = run.getExecution();
        boolean complete = isComplete(execution);
        return createTree(CachedPipelineNodeGraphAdaptor.instance.getFor(run), null, null, complete);
    }

    /**
     * Builds a {@link PipelineGraph} from a caller-supplied adapter, workspace-node list,
     * and optional pre-computed ancestry map. Doesn't touch the live-state DTO cache —
     * caller owns caching.
     */
    @Restricted(NoExternalUse.class)
    public PipelineGraph createTreeFrom(
            PipelineGraphBuilderApi builder,
            @CheckForNull List<FlowNode> workspaceNodes,
            @CheckForNull Map<String, List<String>> enclosingIdsByNodeId) {
        return createTree(builder, workspaceNodes, enclosingIdsByNodeId, isComplete(run.getExecution()));
    }

    /**
     * Like {@link #createTreeFrom(PipelineGraphBuilderApi, List, Map)}, but with the completion
     * state to report. Pass the completion flag captured together with the liveness view the
     * adapter was built from (see {@link LiveGraphSnapshot#complete()}), so the flag and the
     * stage statuses cannot disagree.
     */
    @Restricted(NoExternalUse.class)
    public PipelineGraph createTreeFrom(
            PipelineGraphBuilderApi builder,
            @CheckForNull List<FlowNode> workspaceNodes,
            @CheckForNull Map<String, List<String>> enclosingIdsByNodeId,
            boolean complete) {
        return createTree(builder, workspaceNodes, enclosingIdsByNodeId, complete);
    }
}
