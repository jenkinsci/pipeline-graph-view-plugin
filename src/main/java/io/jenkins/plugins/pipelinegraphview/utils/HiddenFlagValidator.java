package io.jenkins.plugins.pipelinegraphview.utils;

import edu.umd.cs.findbugs.annotations.CheckForNull;
import edu.umd.cs.findbugs.annotations.NonNull;

/**
 * Validator for the "hidden" feature flag.
 * Only accepts the value "true" - all other values are rejected.
 */
public class HiddenFlagValidator implements FeatureFlagValidator {

    @Override
    @NonNull
    public String getFlagName() {
        return "hidden";
    }

    @Override
    @CheckForNull
    public Object validate(@NonNull String rawValue) {
        // Only "true" is valid, all other values are rejected (return null)
        return "true".equals(rawValue) ? Boolean.TRUE : null;
    }

    @Override
    @NonNull
    public String getDescription() {
        return "Boolean flag: only 'true' is accepted. When set, marks the step as hidden.";
    }
}
