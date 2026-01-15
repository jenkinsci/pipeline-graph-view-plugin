package io.jenkins.plugins.pipelinegraphview.utils;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class HiddenFlagValidatorTest {

    private final HiddenFlagValidator validator = new HiddenFlagValidator();

    @Test
    @DisplayName("getFlagName returns 'hidden'")
    void getFlagName() {
        assertThat(validator.getFlagName(), equalTo("hidden"));
    }

    @Test
    @DisplayName("validate accepts 'true'")
    void validateTrue() {
        assertThat(validator.validate("true"), equalTo(Boolean.TRUE));
    }

    @Test
    @DisplayName("validate rejects 'false'")
    void validateFalse() {
        assertThat(validator.validate("false"), is(nullValue()));
    }

    @Test
    @DisplayName("validate rejects empty string")
    void validateEmpty() {
        assertThat(validator.validate(""), is(nullValue()));
    }

    @Test
    @DisplayName("validate rejects arbitrary values")
    void validateArbitrary() {
        assertThat(validator.validate("yes"), is(nullValue()));
        assertThat(validator.validate("1"), is(nullValue()));
        assertThat(validator.validate("TRUE"), is(nullValue()));
        assertThat(validator.validate("True"), is(nullValue()));
    }

    @Test
    @DisplayName("getDescription returns non-empty string")
    void getDescription() {
        assertThat(validator.getDescription().isEmpty(), is(false));
    }
}
