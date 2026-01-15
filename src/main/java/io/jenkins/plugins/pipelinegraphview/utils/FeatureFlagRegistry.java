package io.jenkins.plugins.pipelinegraphview.utils;

import edu.umd.cs.findbugs.annotations.CheckForNull;
import edu.umd.cs.findbugs.annotations.NonNull;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * Central registry for all feature flag validators.
 * Provides lookup and validation services for feature flags.
 */
public class FeatureFlagRegistry {

    private static final Map<String, FeatureFlagValidator> VALIDATORS = new HashMap<>();

    static {
        // Register all known feature flag validators
        register(new HiddenFlagValidator());
        // Future flags can be added here:
        // register(new AnotherFlagValidator());
    }

    /**
     * Registers a feature flag validator.
     */
    private static void register(@NonNull FeatureFlagValidator validator) {
        VALIDATORS.put(validator.getFlagName(), validator);
    }

    /**
     * Gets the validator for a specific flag name.
     *
     * @param flagName The name of the flag (without prefix)
     * @return The validator, or null if the flag is not registered
     */
    @CheckForNull
    public static FeatureFlagValidator getValidator(@NonNull String flagName) {
        return VALIDATORS.get(flagName);
    }

    /**
     * Validates a flag value using the registered validator.
     *
     * @param flagName The name of the flag (without prefix)
     * @param rawValue The raw value to validate
     * @return The validated/normalized value, or null if invalid or flag not registered
     */
    @CheckForNull
    public static Object validateFlag(@NonNull String flagName, @NonNull String rawValue) {
        FeatureFlagValidator validator = getValidator(flagName);
        if (validator == null) {
            // Unknown flag - reject it
            return null;
        }
        return validator.validate(rawValue);
    }

    /**
     * Gets all registered flag names.
     */
    @NonNull
    public static Set<String> getRegisteredFlags() {
        return Collections.unmodifiableSet(VALIDATORS.keySet());
    }

    /**
     * Checks if a flag is registered.
     */
    public static boolean isRegistered(@NonNull String flagName) {
        return VALIDATORS.containsKey(flagName);
    }
}
