package io.jenkins.plugins.pipelinegraphview.buildflow;

import edu.umd.cs.findbugs.annotations.NonNull;
import edu.umd.cs.findbugs.annotations.Nullable;
import hudson.model.Cause;
import hudson.model.CauseAction;
import hudson.model.Job;
import hudson.model.Queue;
import hudson.model.Result;
import hudson.model.Run;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import jenkins.model.Jenkins;
import org.jenkinsci.plugins.workflow.support.steps.build.DownstreamBuildAction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Builds the full upstream/downstream build flow graph for a given run.
 *
 * <p>Upstream traversal uses {@link CauseAction} / {@link Cause.UpstreamCause}.
 * Downstream traversal uses {@link DownstreamBuildAction} (from pipeline-build-step-plugin).
 */
public class BuildFlowGraph {

    private static final Logger logger = LoggerFactory.getLogger(BuildFlowGraph.class);

    /** Maximum number of nodes in the graph to prevent runaway traversal. */
    static final int MAX_NODES = 200;

    /** Maximum depth to traverse in either direction. */
    static final int MAX_DEPTH = 50;

    private final Run<?, ?> target;
    private final boolean showUpstream;
    private final boolean showDownstream;

    public BuildFlowGraph(@NonNull Run<?, ?> target, boolean showUpstream, boolean showDownstream) {
        this.target = target;
        this.showUpstream = showUpstream;
        this.showDownstream = showDownstream;
    }

    /**
     * Builds the full flow graph response.
     */
    public BuildFlowResponse build() {
        Map<String, BuildFlowNode> nodeMap = new LinkedHashMap<>();
        List<BuildFlowEdge> edges = new ArrayList<>();
        boolean anyOngoing = false;

        // Find the root of the chain
        Run<?, ?> root = showUpstream ? findRootUpstream(target) : target;
        if (root == null) {
            root = target;
        }

        // BFS downstream from root
        Deque<Run<?, ?>> queue = new ArrayDeque<>();
        Set<String> visited = new HashSet<>();
        queue.add(root);

        while (!queue.isEmpty() && nodeMap.size() < MAX_NODES) {
            Run<?, ?> current = queue.poll();
            String nodeId = toNodeId(current);
            if (visited.contains(nodeId)) {
                continue;
            }
            visited.add(nodeId);

            boolean isCurrent = current.equals(target);
            BuildFlowNode node = toNode(current, isCurrent);
            nodeMap.put(nodeId, node);

            if (current.isBuilding()) {
                anyOngoing = true;
            }

            // Find downstream builds.
            // When showDownstream=false, still traverse downstream to reach the target,
            // but don't go beyond the target node (hide its children).
            if (showDownstream || !isCurrent) {
                List<Run<?, ?>> downstreamBuilds = getDownstreamBuilds(current);
                for (Run<?, ?> downstream : downstreamBuilds) {
                    String downId = toNodeId(downstream);
                    edges.add(new BuildFlowEdge(nodeId, downId));
                    if (!visited.contains(downId)) {
                        queue.add(downstream);
                    }
                }
            }
        }

        // Check for queued downstream items (skip items triggered by target when hiding downstream)
        String targetNodeId = toNodeId(target);
        {
            Queue.Item[] queueItems = Queue.getInstance().getItems();
            for (Queue.Item item : queueItems) {
                if (nodeMap.size() >= MAX_NODES) {
                    break;
                }
                CauseAction causeAction = item.getAction(CauseAction.class);
                if (causeAction == null) {
                    continue;
                }
                for (Cause cause : causeAction.getCauses()) {
                    if (cause instanceof Cause.UpstreamCause upstreamCause) {
                        String upstreamId = toNodeId(upstreamCause);
                        // Skip queued items triggered by the target when hiding downstream
                        if (!showDownstream && upstreamId.equals(targetNodeId)) {
                            continue;
                        }
                        if (nodeMap.containsKey(upstreamId)) {
                            String queuedId = "queued-" + item.getId();
                            if (!nodeMap.containsKey(queuedId)) {
                                String jobName = item.task.getDisplayName();
                                nodeMap.put(
                                        queuedId,
                                        new BuildFlowNode(
                                                queuedId, jobName, jobName, 0, jobName, "", "QUEUED", null, null,
                                                null, false, null));
                                edges.add(new BuildFlowEdge(upstreamId, queuedId));
                                anyOngoing = true;
                            }
                        }
                    }
                }
            }
        }

        return new BuildFlowResponse(
                new ArrayList<>(nodeMap.values()), edges, anyOngoing, nodeMap.size() >= MAX_NODES);
    }

    /**
     * Returns true if this build has any upstream or downstream relationships.
     */
    public static boolean hasUpstreamOrDownstream(@Nullable Run<?, ?> run) {
        if (run == null) {
            return false;
        }
        // Check upstream
        if (getUpstreamBuild(run) != null) {
            return true;
        }
        // Check downstream
        return !getDownstreamBuilds(run).isEmpty();
    }

    private static Run<?, ?> findRootUpstream(@NonNull Run<?, ?> build) {
        Run<?, ?> current = build;
        int depth = 0;
        Run<?, ?> parent;
        while ((parent = getUpstreamBuild(current)) != null && depth < MAX_DEPTH) {
            current = parent;
            depth++;
        }
        return current;
    }

    @Nullable
    static Run<?, ?> getUpstreamBuild(@NonNull Run<?, ?> build) {
        CauseAction causeAction = build.getAction(CauseAction.class);
        if (causeAction == null) {
            return null;
        }
        for (Cause cause : causeAction.getCauses()) {
            if (cause instanceof Cause.UpstreamCause upstreamCause) {
                Jenkins jenkins = Jenkins.getInstanceOrNull();
                if (jenkins == null) {
                    return null;
                }
                Job<?, ?> upstreamJob = jenkins.getItemByFullName(upstreamCause.getUpstreamProject(), Job.class);
                if (upstreamJob == null) {
                    continue;
                }
                // Skip rebuilds (same job as parent)
                if (build.getParent().equals(upstreamJob)) {
                    continue;
                }
                Run<?, ?> upstreamRun = upstreamJob.getBuildByNumber(upstreamCause.getUpstreamBuild());
                if (upstreamRun != null) {
                    return upstreamRun;
                }
            }
        }
        return null;
    }

    @NonNull
    static List<Run<?, ?>> getDownstreamBuilds(@NonNull Run<?, ?> run) {
        List<Run<?, ?>> result = new ArrayList<>();
        DownstreamBuildAction action = run.getAction(DownstreamBuildAction.class);
        if (action != null) {
            for (DownstreamBuildAction.DownstreamBuild db : action.getDownstreamBuilds()) {
                try {
                    Run<?, ?> downstream = db.getBuild();
                    if (downstream != null) {
                        result.add(downstream);
                    }
                } catch (Exception e) {
                    logger.warn("Could not resolve downstream build: {}", e.getMessage());
                }
            }
        }
        return result;
    }

    private BuildFlowNode toNode(@NonNull Run<?, ?> run, boolean isCurrent) {
        String nodeId = toNodeId(run);
        String jobName = run.getParent().getDisplayName();
        String jobFullName = run.getParent().getFullName();
        int buildNumber = run.getNumber();
        String displayName = run.getFullDisplayName();
        String url = run.getUrl();
        String status = mapStatus(run);
        Long durationMs = run.isBuilding() ? null : run.getDuration();
        Long startTimeMs = run.isBuilding() ? run.getStartTimeInMillis() : null;
        String description = run.getDescription();
        List<String> recentResults = getRecentResults(run);

        return new BuildFlowNode(
                nodeId,
                jobName,
                jobFullName,
                buildNumber,
                displayName,
                url,
                status,
                durationMs,
                startTimeMs,
                description,
                isCurrent,
                recentResults);
    }

    private static String toNodeId(@NonNull Run<?, ?> run) {
        return run.getParent().getFullName() + "#" + run.getNumber();
    }

    private static String toNodeId(@NonNull Cause.UpstreamCause cause) {
        return cause.getUpstreamProject() + "#" + cause.getUpstreamBuild();
    }

    private static String mapStatus(@NonNull Run<?, ?> run) {
        if (run.isBuilding()) {
            return "IN_PROGRESS";
        }
        Result result = run.getResult();
        if (result == null) {
            return "IN_PROGRESS";
        }
        if (result.equals(Result.SUCCESS)) {
            return "SUCCESS";
        }
        if (result.equals(Result.FAILURE)) {
            return "FAILURE";
        }
        if (result.equals(Result.UNSTABLE)) {
            return "UNSTABLE";
        }
        if (result.equals(Result.ABORTED)) {
            return "ABORTED";
        }
        return "NOT_BUILT";
    }

    private static List<String> getRecentResults(@NonNull Run<?, ?> run) {
        List<String> results = new ArrayList<>(6);
        // Include the current build's result as the most recent entry
        results.add(mapStatus(run));
        Run<?, ?> previous = run.getPreviousBuild();
        int count = 0;
        while (previous != null && count < 5) {
            results.add(mapStatus(previous));
            previous = previous.getPreviousBuild();
            count++;
        }
        return results;
    }
}
