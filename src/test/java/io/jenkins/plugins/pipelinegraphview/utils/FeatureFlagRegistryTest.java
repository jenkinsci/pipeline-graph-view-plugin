package io.jenkins.plugins.pipelinegraphview.utils;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class FeatureFlagRegistryTest {

    @Test
    @DisplayName("hidden flag is registered")
    void hiddenFlagRegistered() {
        assertThat(FeatureFlagRegistry.isRegistered("hidden"), is(true));
        assertThat(FeatureFlagRegistry.getValidator("hidden"), is(notNullValue()));
    }

    @Test
    @DisplayName("getRegisteredFlags includes hidden")
    void getRegisteredFlags() {
        assertThat(FeatureFlagRegistry.getRegisteredFlags(), hasItem("hidden"));
    }

    @Test
    @DisplayName("unknown flags are not registered")
    void unknownFlagNotRegistered() {
        assertThat(FeatureFlagRegistry.isRegistered("unknown"), is(false));
        assertThat(FeatureFlagRegistry.getValidator("unknown"), is(nullValue()));
    }

    @Test
    @DisplayName("validateFlag delegates to validator for hidden=true")
    void validateFlagHiddenTrue() {
        assertThat(FeatureFlagRegistry.validateFlag("hidden", "true"), equalTo(Boolean.TRUE));
    }

    @Test
    @DisplayName("validateFlag rejects hidden=false")
    void validateFlagHiddenFalse() {
        assertThat(FeatureFlagRegistry.validateFlag("hidden", "false"), is(nullValue()));
    }

    @Test
    @DisplayName("validateFlag rejects unknown flags")
    void validateFlagUnknown() {
        assertThat(FeatureFlagRegistry.validateFlag("unknown", "value"), is(nullValue()));
    }
}
