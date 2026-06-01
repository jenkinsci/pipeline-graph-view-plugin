package io.jenkins.plugins.pipelinegraphview.buildflow;

import edu.umd.cs.findbugs.annotations.NonNull;
import edu.umd.cs.findbugs.annotations.Nullable;
import java.util.List;

/**
 * DTO representing a single node (build) in the build flow graph.
 */
public record BuildFlowNode(
        @NonNull String id,
        @NonNull String jobName,
        @NonNull String jobFullName,
        int buildNumber,
        @NonNull String displayName,
        @NonNull String url,
        @NonNull String status,
        @Nullable Long durationMs,
        @Nullable Long startTimeMs,
        @Nullable String description,
        boolean isCurrentBuild,
        @Nullable List<String> recentResults) {}
