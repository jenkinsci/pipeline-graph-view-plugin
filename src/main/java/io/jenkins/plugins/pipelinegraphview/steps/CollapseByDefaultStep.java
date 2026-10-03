package io.jenkins.plugins.pipelinegraphview.steps;

import hudson.Extension;
import io.jenkins.plugins.pipelinegraphview.Messages;
import java.io.Serializable;
import java.util.Collections;
import java.util.Set;
import org.jenkinsci.plugins.workflow.steps.Step;
import org.jenkinsci.plugins.workflow.steps.StepContext;
import org.jenkinsci.plugins.workflow.steps.StepDescriptor;
import org.jenkinsci.plugins.workflow.steps.StepExecution;
import org.kohsuke.stapler.DataBoundConstructor;

/**
 * Pipeline step that marks directly enclosed stages as collapsed by default.
 *
 * <p>Nested stages are unaffected unless they are enclosed by their own
 * {@code collapseByDefault} block.</p>
 */
public class CollapseByDefaultStep extends Step implements Serializable {

    private static final long serialVersionUID = 1L;

    @DataBoundConstructor
    public CollapseByDefaultStep() {
        // No parameters needed - the step itself is the marker
    }

    @Override
    public StepExecution start(StepContext context) throws Exception {
        return new CollapseByDefaultStepExecution(context);
    }

    @Extension
    public static class DescriptorImpl extends StepDescriptor {

        @Override
        public String getFunctionName() {
            return "collapseByDefault";
        }

        @Override
        public String getDisplayName() {
            return Messages.CollapseByDefaultStep_displayName();
        }

        @Override
        public boolean takesImplicitBlockArgument() {
            return true;
        }

        @Override
        public Set<? extends Class<?>> getRequiredContext() {
            return Collections.emptySet();
        }
    }
}
