package io.jenkins.plugins.pipelinegraphview.utils;

import static java.util.Collections.emptyList;

import hudson.model.Cause;
import hudson.model.CauseAction;
import hudson.model.Item;
import hudson.model.Queue;
import io.jenkins.plugins.pipelinegraphview.treescanner.PipelineNodeGraphAdapter;
import io.jenkins.plugins.pipelinegraphview.utils.legacy.PipelineNodeGraphVisitor;
import java.io.IOException;
import java.util.*;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeoutException;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.jenkinsci.plugins.workflow.actions.WorkspaceAction;
import org.jenkinsci.plugins.workflow.flow.FlowExecution;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.graphanalysis.DepthFirstScanner;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class PipelineGraphApi {
    private static final Logger logger = LoggerFactory.getLogger(PipelineGraphApi.class);
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

        Queue.Item item =
                Queue.getInstance().schedule2(run.getParent(), 0, causeAction).getItem();
        if (item == null) {
            return null;
        }

        return run.getParent().getNextBuildNumber();
    }

    private List<PipelineStageInternal> getPipelineNodes(PipelineGraphBuilderApi builder) {
        return builder.getPipelineNodes().stream()
                .map(flowNodeWrapper -> new PipelineStageInternal(
                        flowNodeWrapper.getId(), // TODO no need to parse it BO returns a string even though the
                        // datatype is number on the frontend
                        flowNodeWrapper.getDisplayName(),
                        flowNodeWrapper.getParents().stream()
                                .map(FlowNodeWrapper::getId)
                                .collect(Collectors.toList()),
                        PipelineStatus.of(flowNodeWrapper.getStatus()),
                        flowNodeWrapper.getType().name(),
                        flowNodeWrapper.getDisplayName(), // TODO blue ocean uses timing information: "Passed in 0s"
                        flowNodeWrapper.isSynthetic(),
                        flowNodeWrapper.getTiming(),
                        getStageNode(flowNodeWrapper)))
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

    private PipelineGraph createTree(PipelineGraphBuilderApi builder) {
        // We want to remap children here, so we don't update the parents of the
        // original objects - as
        // these are completely new representations.
        List<PipelineStageInternal> stages = getPipelineNodes(builder);

        // id => stage
        Map<String, PipelineStageInternal> stageMap = stages.stream()
                .collect(Collectors.toMap(
                        PipelineStageInternal::getId, stage -> stage, (u, v) -> u, LinkedHashMap::new));

        Map<String, List<String>> stageToChildrenMap = new HashMap<>();
        List<String> childNodes = new ArrayList<>();

        FlowExecution execution = run.getExecution();
        if (execution == null) {
            // If we don't have an execution - e.g. if the Pipeline has a syntax error -
            // then return an
            // empty graph.
            return new PipelineGraph(new ArrayList<>(), false);
        }
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
                .filter(stage -> !childNodes.contains(stage.getId()))
                .collect(Collectors.toList());
        return new PipelineGraph(stageResults, execution.isComplete());
    }

    /*
     * Create a shallow Tree from the GraphVisitor.
     * This creates a shallower representation of the DAG - similar to . Here
     * children stages will become siblings of the parent.
     * Parent -> ChildA -> ChildB
     * instead of:
     * Parent
     * |-> ChildA -> ChildC
     * Parallel branches will still appear as children ther parent stage.
     * Original source:
     * https://github.com/jenkinsci/workflow-support-plugin/blob/master/src/main/
     * java/org/jenkinsci/plugins/workflow/support/visualization/table/
     * FlowGraphTable.java#L126
     */
    private PipelineGraph createShallowTree(PipelineGraphBuilderApi builder) {
        List<PipelineStageInternal> stages = getPipelineNodes(builder);
        List<String> topLevelStageIds = new ArrayList<>();

        // id => stage
        Map<String, PipelineStageInternal> stageMap = stages.stream()
                .collect(Collectors.toMap(
                        PipelineStageInternal::getId, stage -> stage, (u, v) -> u, LinkedHashMap::new));

        Map<String, List<String>> stageToChildrenMap = new HashMap<>();

        FlowExecution execution = run.getExecution();
        if (execution == null) {
            // If we don't have an execution - e.g. if the Pipeline has a syntax error -
            // then return an
            // empty graph.
            return new PipelineGraph(new ArrayList<>(), false);
        }
        stages.forEach(stage -> {
            try {
                FlowNode stageNode = execution.getNode(stage.getId());
                if (stageNode == null) {
                    return;
                }
                List<String> ancestors = getAncestors(stage, stageMap);
                String treeParentId = null;
                // Compare the list of GraphVistor ancestors to the IDs of the enclosing node in
                // the
                // execution.
                // If a node encloses another node, it means it's a tree parent, so the first
                // ancestor
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
                    List<String> childrenOfParent = stageToChildrenMap.getOrDefault(treeParentId, new ArrayList<>());
                    childrenOfParent.add(stage.getId());
                    stageToChildrenMap.put(treeParentId, childrenOfParent);
                } else {
                    // If we can't find a matching parent in the execution and GraphVistor then this
                    // is a
                    // top level node.
                    stageToChildrenMap.put(stage.getId(), new ArrayList<>());
                    topLevelStageIds.add(stage.getId());
                }
            } catch (IOException ex) {
                logger.error("Caught a "
                        + ex.getClass().getSimpleName()
                        + " when trying to find parent of stage '"
                        + stage.getName()
                        + "'");
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
                .filter(stage -> topLevelStageIds.contains(stage.getId()))
                .collect(Collectors.toList());
        return new PipelineGraph(stageResults, execution.isComplete());
    }

    private List<String> getAncestors(PipelineStageInternal stage, Map<String, PipelineStageInternal> stageMap) {
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

    private static String getStageNode(FlowNodeWrapper flowNodeWrapper) {
        FlowNode flowNode = flowNodeWrapper.getNode();
        DepthFirstScanner scan = new DepthFirstScanner();
        logger.debug("Checking node {}", flowNode);
        FlowExecution execution = flowNode.getExecution();
        for (FlowNode n : scan.allNodes(execution)) {
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
        return createTree(new PipelineNodeGraphAdapter(run));
    }

    /*
     * Get a shallower (less nested) representation of the DAG.
     * This might miss some information, but looks more like the previous
     * implementation.
     * Currently used for the legacy tests that check the adapter output looks like
     * the legacy one.
     */
    protected PipelineGraph createShallowTree() {
        // Make add non-parallel branches siblings to their parents (remove nesting of
        // regular stages).
        return createShallowTree(new PipelineNodeGraphAdapter(run));
    }

    /**
     * Creates the tree using the legacy PipelineNodeGraphVisitor class.
     * This is useful for testing and could be useful for bridging the gap between
     * representations.
     */
    protected PipelineGraph createLegacyTree() {
        return createShallowTree(new PipelineNodeGraphVisitor(run));
    }
}
