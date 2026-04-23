package io.jenkins.plugins.pipelinegraphview.livestate;

import java.util.List;
import java.util.Map;
import java.util.Set;
import org.jenkinsci.plugins.workflow.graph.FlowNode;

/**
 * Immutable projection of a {@link LiveGraphState} at a point in time.
 *
 * <p>{@code enclosingIdsByNodeId} carries each captured node's ancestor chain so graph
 * construction can resolve parentage without touching the execution's FlowNode storage
 * (and its read lock, which contends with the running build's writes).
 *
 * <p>{@code hideFromViewBlockStartIds} is the set of {@code hideFromView} block-start IDs,
 * so callers can derive a step's "hidden" flag by intersecting with the step's enclosing
 * IDs — no per-step storage walk required.
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
