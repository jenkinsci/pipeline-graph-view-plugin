package io.jenkins.plugins.pipelinegraphview.buildflow;

import edu.umd.cs.findbugs.annotations.NonNull;

/**
 * DTO representing an edge (trigger relationship) between two builds in the flow graph.
 */
public record BuildFlowEdge(@NonNull String from, @NonNull String to) {}
