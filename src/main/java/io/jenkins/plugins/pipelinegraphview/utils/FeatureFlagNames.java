package io.jenkins.plugins.pipelinegraphview.utils;

/**
 * Constants for feature flag names used in pipelineGraphViewFlags step.
 * These constants prevent typos and provide a single source of truth.
 */
public final class FeatureFlagNames {

    private FeatureFlagNames() {
        // Utility class - prevent instantiation
    }

    /**
     * Flag to control visibility of pipeline steps.
     * When set to true, the step will be marked as hidden in the UI.
     */
    public static final String HIDDEN = "hidden";
}
