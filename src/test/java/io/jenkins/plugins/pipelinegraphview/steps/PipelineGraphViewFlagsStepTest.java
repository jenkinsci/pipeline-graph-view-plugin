package io.jenkins.plugins.pipelinegraphview.steps;

import static io.jenkins.plugins.pipelinegraphview.utils.FeatureFlagNames.HIDDEN;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

import hudson.model.TaskListener;
import org.junit.jupiter.api.Test;

class PipelineGraphViewFlagsStepTest {

    @Test
    void testStepInstantiation() {
        PipelineGraphViewFlagsStep step = new PipelineGraphViewFlagsStep();
        assertThat(step, notNullValue());
        assertThat(step.getHidden(), nullValue()); // No flags set by default
    }

    @Test
    void testHiddenFlagSetter() {
        PipelineGraphViewFlagsStep step = new PipelineGraphViewFlagsStep();

        // Test setting hidden to true
        step.setHidden(true);
        assertThat(step.getHidden(), equalTo(Boolean.TRUE));

        // Test setting hidden to false
        step.setHidden(false);
        assertThat(step.getHidden(), equalTo(Boolean.FALSE));
    }

    @Test
    void testHiddenFlagNull() {
        PipelineGraphViewFlagsStep step = new PipelineGraphViewFlagsStep();
        step.setHidden(true);
        assertThat(step.getHidden(), equalTo(Boolean.TRUE));

        // Setting null should not change the value
        step.setHidden(null);
        assertThat(step.getHidden(), equalTo(Boolean.TRUE));
    }

    @Test
    void testGetFlags() {
        PipelineGraphViewFlagsStep step = new PipelineGraphViewFlagsStep();

        // Initially empty
        assertThat(step.getFlags().isEmpty(), is(true));

        // After setting hidden flag
        step.setHidden(true);
        assertThat(step.getFlags().entrySet(), hasSize(1));
        assertThat(step.getFlags().get(HIDDEN), equalTo(Boolean.TRUE));
    }

    @Test
    void testDescriptorFunctionName() {
        PipelineGraphViewFlagsStep.DescriptorImpl descriptor = new PipelineGraphViewFlagsStep.DescriptorImpl();
        assertThat(descriptor.getFunctionName(), equalTo("pipelineGraphViewFlags"));
    }

    @Test
    void testDescriptorDisplayName() {
        PipelineGraphViewFlagsStep.DescriptorImpl descriptor = new PipelineGraphViewFlagsStep.DescriptorImpl();
        assertThat(descriptor.getDisplayName(), equalTo("Pipeline Graph View Flags"));
    }

    @Test
    void testDescriptorTakesImplicitBlockArgument() {
        PipelineGraphViewFlagsStep.DescriptorImpl descriptor = new PipelineGraphViewFlagsStep.DescriptorImpl();
        assertThat(descriptor.takesImplicitBlockArgument(), is(true));
    }

    @Test
    void testDescriptorRequiredContext() {
        PipelineGraphViewFlagsStep.DescriptorImpl descriptor = new PipelineGraphViewFlagsStep.DescriptorImpl();
        assertThat(descriptor.getRequiredContext().contains(TaskListener.class), is(true));
    }
}
