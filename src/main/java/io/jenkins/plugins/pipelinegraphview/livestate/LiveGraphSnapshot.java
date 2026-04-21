package io.jenkins.plugins.pipelinegraphview.livestate;

import java.util.List;
import org.jenkinsci.plugins.workflow.graph.FlowNode;

/**
 * Immutable projection of a {@link LiveGraphState} at a point in time.
 * Held briefly outside the state's monitor so HTTP callers can construct DTOs without
 * blocking the CPS VM thread that's feeding the live state.
 */
public record LiveGraphSnapshot(List<FlowNode> nodes, List<FlowNode> workspaceNodes) {}
