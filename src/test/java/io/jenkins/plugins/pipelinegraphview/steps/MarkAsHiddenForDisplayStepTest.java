package io.jenkins.plugins.pipelinegraphview.steps;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/**
 * Unit tests for {@link MarkAsHiddenForDisplayStep}.
 */
public class MarkAsHiddenForDisplayStepTest {

    @Test
    public void testStepInstantiation() {
        MarkAsHiddenForDisplayStep step = new MarkAsHiddenForDisplayStep();
        assertNotNull(step, "Step should be instantiated");
    }

    @Test
    public void testDescriptorFunctionName() {
        MarkAsHiddenForDisplayStep.DescriptorImpl descriptor = new MarkAsHiddenForDisplayStep.DescriptorImpl();
        assertEquals(
                "markAsHiddenForDisplay",
                descriptor.getFunctionName(),
                "Function name should be 'markAsHiddenForDisplay'");
    }

    @Test
    public void testDescriptorDisplayName() {
        MarkAsHiddenForDisplayStep.DescriptorImpl descriptor = new MarkAsHiddenForDisplayStep.DescriptorImpl();
        assertEquals(
                "Mark as Hidden for Display",
                descriptor.getDisplayName(),
                "Display name should be 'Mark as Hidden for Display'");
    }

    @Test
    public void testDescriptorTakesImplicitBlockArgument() {
        MarkAsHiddenForDisplayStep.DescriptorImpl descriptor = new MarkAsHiddenForDisplayStep.DescriptorImpl();
        assertTrue(descriptor.takesImplicitBlockArgument(), "Descriptor should take implicit block argument");
    }
}
