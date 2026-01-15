package io.jenkins.plugins.pipelinegraphview.utils;

import edu.umd.cs.findbugs.annotations.CheckForNull;
import edu.umd.cs.findbugs.annotations.NonNull;

/**
 * Validates and normalizes feature flag values.
 * Each feature flag has its own validator that determines what values are valid.
 */
public interface FeatureFlagValidator {

    /**
     * Gets the name of the flag this validator handles (without prefix).
     * Example: "hidden"
     */
    @NonNull
    String getFlagName();

    /**
     * Validates and normalizes a raw value string.
     *
     * @param rawValue The raw string value from the environment variable
     * @return The normalized/validated value to include in the flags map,
     *         or null if the value is invalid and should be excluded
     */
    @CheckForNull
    Object validate(@NonNull String rawValue);

    /**
     * Gets a description of valid values for documentation.
     * Example: "Boolean flag: only 'true' is accepted"
     */
    @NonNull
    String getDescription();
}
