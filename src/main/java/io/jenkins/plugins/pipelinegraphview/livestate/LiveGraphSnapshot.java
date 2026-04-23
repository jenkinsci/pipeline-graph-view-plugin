package io.jenkins.plugins.pipelinegraphview.livestate;

import java.util.List;
import org.jenkinsci.plugins.workflow.graph.FlowNode;

/**
 * Immutable projection of a {@link LiveGraphState} at a point in time. {@code version} is
 * a monotonic counter that bumps on every new flow node, so callers can use it as a cache
 * key for computed DTOs.
 */
public record LiveGraphSnapshot(List<FlowNode> nodes, List<FlowNode> workspaceNodes, long version) {}
