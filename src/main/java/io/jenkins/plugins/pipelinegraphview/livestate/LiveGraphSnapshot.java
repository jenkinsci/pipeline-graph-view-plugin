package io.jenkins.plugins.pipelinegraphview.livestate;

import java.util.List;
import org.jenkinsci.plugins.workflow.graph.FlowNode;

/**
 * Immutable projection of a {@link LiveGraphState} at a point in time.
 * Held briefly outside the state's monitor so HTTP callers can construct DTOs without
 * blocking the CPS VM thread that's feeding the live state.
 *
 * <p>{@code version} is a monotonically-increasing counter that bumps on every new flow
 * node. It lets HTTP callers key the output cache so repeat polls between node arrivals
 * return the cached {@code PipelineGraph} / {@code PipelineStepList} without rebuilding.
 */
public record LiveGraphSnapshot(List<FlowNode> nodes, List<FlowNode> workspaceNodes, long version) {}
