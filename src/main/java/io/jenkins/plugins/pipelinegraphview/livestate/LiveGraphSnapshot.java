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
 * <p>{@code version} is a monotonic counter that bumps on every new flow node, so callers
 * can use it as a cache key for computed DTOs.
 */
public record LiveGraphSnapshot(
        List<FlowNode> nodes,
        List<FlowNode> workspaceNodes,
        Map<String, List<String>> enclosingIdsByNodeId,
        Set<String> hideFromViewBlockStartIds,
        long version) {}
