package io.jenkins.plugins.pipelinegraphview.utils;

import static java.util.Collections.emptyList;

import edu.umd.cs.findbugs.annotations.CheckForNull;
import io.jenkins.plugins.pipelinegraphview.livestate.LiveGraphRegistry;
import io.jenkins.plugins.pipelinegraphview.livestate.LiveGraphSnapshot;
import io.jenkins.plugins.pipelinegraphview.treescanner.PipelineNodeGraphAdapter;
import java.io.IOException;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.jenkinsci.plugins.workflow.actions.WorkspaceAction;
import org.jenkinsci.plugins.workflow.flow.FlowExecution;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.graphanalysis.DepthFirstScanner;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.support.steps.input.InputAction;
import org.kohsuke.accmod.Restricted;
import org.kohsuke.accmod.restrictions.NoExternalUse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class PipelineGraphApi {
    private static final Logger logger = LoggerFactory.getLogger(PipelineGraphApi.class);
    private final transient WorkflowRun run;

    public PipelineGraphApi(WorkflowRun run) {
        this.run = run;
    }

    private List<PipelineStageInternal> getPipelineNodes(
            PipelineGraphBuilderApi builder, @CheckForNull List<FlowNode> workspaceNodes) {
        return builder.getPipelineNodes().stream()
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
                        getStageNode(flowNodeWrapper, workspaceNodes)))
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

    private PipelineGraph createTree(PipelineGraphBuilderApi builder, @CheckForNull List<FlowNode> workspaceNodes) {
        FlowExecution execution = run.getExecution();
        if (execution == null) {
            // If we don't have an execution - e.g. if the Pipeline has a syntax error -
            // then return an
            // empty graph.
            return new PipelineGraph(new ArrayList<>(), false);
        }
        // Look up completed state before computing tree.
        boolean complete = execution.isComplete();

        // We want to remap children here, so we don't update the parents of the
        // original objects - as
        // these are completely new representations.
        List<PipelineStageInternal> stages = getPipelineNodes(builder, workspaceNodes);

        // Get InputAction once for all stages
        InputAction inputAction = run.getAction(InputAction.class);

        // Set the builder and inputAction on each stage so they can check for paused steps
        if (builder instanceof PipelineStepBuilderApi stepBuilder) {
            stages.forEach(stage -> {
                stage.setBuilder(stepBuilder);
                stage.setInputAction(inputAction);
            });
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

    private static String getStageNode(FlowNodeWrapper flowNodeWrapper, @CheckForNull List<FlowNode> workspaceNodes) {
        FlowNode flowNode = flowNodeWrapper.getNode();
        logger.debug("Checking node {}", flowNode);
        FlowExecution execution = flowNode.getExecution();
        Iterable<FlowNode> candidates =
                workspaceNodes != null ? workspaceNodes : new DepthFirstScanner().allNodes(execution);
        for (FlowNode n : candidates) {
            WorkspaceAction ws = n.getAction(WorkspaceAction.class);
            if (ws != null) {
                logger.debug("Found workspace node: {}", n);
                boolean isWorkspaceNode = Objects.equals(n.getId(), flowNode.getId())
                        || Objects.equals(n.getEnclosingId(), flowNode.getId())
                        || flowNode.getAllEnclosingIds().contains(n.getId());

                // Parallel stages have a sub-stage, so we need to check the 3rd parent for a match
                if (flowNodeWrapper.getType() == FlowNodeWrapper.NodeType.PARALLEL) {
                    try {
                        if (n.getEnclosingId() != null) {
                            FlowNode p = execution.getNode(n.getEnclosingId());
                            if (p != null && p.getEnclosingId() != null) {
                                p = execution.getNode(p.getEnclosingId());
                                if (p != null && p.getEnclosingId() != null) {
                                    isWorkspaceNode = Objects.equals(flowNode.getId(), p.getEnclosingId());
                                }
                            }
                        }
                    } catch (IOException e) {
                        throw new RuntimeException(e);
                    }
                }

                if (isWorkspaceNode) {
                    logger.debug("Found correct stage node: {}", n.getId());
                    String node = ws.getNode();
                    if (node.isEmpty()) {
                        node = "built-in";
                    }
                    return node;
                }
            }
        }
        return null;
    }

    public PipelineGraph createTree() {
        return PipelineGraphViewCache.get().getGraph(run, this::computeTree);
    }

    /** Uncached compute path; callers are responsible for any caching. */
    @Restricted(NoExternalUse.class)
    public PipelineGraph computeTree() {
        // Check the cache first using the cheap version read — if we already have a graph
        // for the current state, we can skip the O(N) snapshot copy entirely.
        Long currentVersion = LiveGraphRegistry.get().currentVersion(run);
        if (currentVersion != null) {
            PipelineGraph cached = LiveGraphRegistry.get().cachedGraph(run, currentVersion);
            if (cached != null) {
                return cached;
            }
            LiveGraphSnapshot snapshot = LiveGraphRegistry.get().snapshot(run);
            if (snapshot != null) {
                PipelineGraph computed =
                        createTree(new PipelineNodeGraphAdapter(run, snapshot.nodes()), snapshot.workspaceNodes());
                LiveGraphRegistry.get().cacheGraph(run, snapshot.version(), computed);
                return computed;
            }
        }
        return createTree(CachedPipelineNodeGraphAdaptor.instance.getFor(run), null);
    }

    /**
     * Builds a {@link PipelineGraph} from a caller-supplied adapter and workspace-node list.
     * Doesn't touch the live-state DTO cache — caller owns caching.
     */
    @Restricted(NoExternalUse.class)
    public PipelineGraph createTreeFrom(PipelineGraphBuilderApi builder, @CheckForNull List<FlowNode> workspaceNodes) {
        return createTree(builder, workspaceNodes);
    }
}
