package io.jenkins.plugins.pipelinegraphview.livestate;

import java.util.List;
import java.util.Map;
import java.util.Set;
import org.jenkinsci.plugins.workflow.graph.FlowNode;

/**
 * Projection of a {@link LiveGraphState} at a point in time.
 *
 * <p><strong>Consumers must treat every collection here as read-only.</strong>
 * {@code enclosingIdsByNodeId} and {@code hideFromViewBlockStartIds} are the live concurrent
 * structures from the underlying state — the CPS VM thread continues to write to them while
 * the snapshot is in use. Iteration is safe (weakly consistent), mutation is not.
 *
 * <p>{@code enclosingIdsByNodeId} carries each captured node's ancestor chain so graph
 * construction can resolve parentage without touching the execution's FlowNode storage.
 *
 * <p>{@code hideFromViewBlockStartIds} is the set of {@code hideFromView} block-start IDs,
 * so callers can derive a step's "hidden" flag by intersecting with the step's enclosing IDs.
 *
 * <p>{@code activeNodeIds} contains the IDs of all nodes considered "active" at snapshot
 * time: the execution's current heads plus every enclosing block start. Status resolution
 * reads liveness from this set.
 *
 * <p>{@code pausedHeadIds} contains the IDs of the current heads that were paused (an
 * {@code input} waiting for an answer) at snapshot time, or {@code null} if they couldn't be
 * read.
 *
 * <p>{@code version} is a monotonic counter that bumps on every new flow node. A step pauses
 * after its node became a head, which adds no node, so callers key computed DTOs on
 * {@code version} and {@code pausedHeadIds} together.
 */
public record LiveGraphSnapshot(
        List<FlowNode> nodes,
        List<FlowNode> workspaceNodes,
        Map<String, List<String>> enclosingIdsByNodeId,
        Set<String> hideFromViewBlockStartIds,
        Set<String> activeNodeIds,
        Set<String> pausedHeadIds,
        long version) {}
