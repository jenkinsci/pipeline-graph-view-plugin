package io.jenkins.plugins.pipelinegraphview.steps;

import hudson.Extension;
import hudson.model.TaskListener;
import java.io.Serializable;
import java.util.Collections;
import java.util.Set;
import org.jenkinsci.plugins.workflow.steps.Step;
import org.jenkinsci.plugins.workflow.steps.StepContext;
import org.jenkinsci.plugins.workflow.steps.StepDescriptor;
import org.jenkinsci.plugins.workflow.steps.StepExecution;
import org.kohsuke.stapler.DataBoundConstructor;

/**
 * Pipeline step that marks enclosed steps as hidden for display purposes.
 *
 * <p>Usage:</p>
 * <pre>
 * markAsHiddenForDisplay {
 *     echo "This step will be hidden"
 * }
 * </pre>
 *
 * <p>This step takes no parameters - its presence in the flow graph serves as a marker
 * that the enclosed steps should be treated as hidden by the Pipeline Graph View plugin.</p>
 */
public class MarkAsHiddenForDisplayStep extends Step implements Serializable {

    private static final long serialVersionUID = 1L;

    @DataBoundConstructor
    public MarkAsHiddenForDisplayStep() {
        // No parameters needed - the step itself is the marker
    }

    @Override
    public StepExecution start(StepContext context) throws Exception {
        return new MarkAsHiddenForDisplayStepExecution(context);
    }

    @Extension
    public static class DescriptorImpl extends StepDescriptor {

        @Override
        public String getFunctionName() {
            return "markAsHiddenForDisplay";
        }

        @Override
        public String getDisplayName() {
            return "Mark as Hidden for Display";
        }

        @Override
        public boolean takesImplicitBlockArgument() {
            return true;
        }

        @Override
        public Set<? extends Class<?>> getRequiredContext() {
            return Collections.singleton(TaskListener.class);
        }
    }
}
