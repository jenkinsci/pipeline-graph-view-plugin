package io.jenkins.plugins.pipelinegraphview.steps;

import edu.umd.cs.findbugs.annotations.NonNull;
import hudson.Extension;
import hudson.model.TaskListener;
import io.jenkins.plugins.pipelinegraphview.utils.FeatureFlagNames;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import org.jenkinsci.plugins.workflow.steps.Step;
import org.jenkinsci.plugins.workflow.steps.StepContext;
import org.jenkinsci.plugins.workflow.steps.StepDescriptor;
import org.jenkinsci.plugins.workflow.steps.StepExecution;
import org.kohsuke.stapler.DataBoundConstructor;
import org.kohsuke.stapler.DataBoundSetter;

/**
 * Pipeline step for setting feature flags that control the behavior and visibility
 * of pipeline steps in the Pipeline Graph View.
 *
 * <p>Usage example:
 * <pre>{@code
 * pipelineGraphViewFlags(hidden: true) {
 *     echo "This step will be marked as hidden"
 * }
 * }</pre>
 *
 * <p>Supported flags:
 * <ul>
 *   <li><b>hidden</b> (Boolean): Controls visibility of the step</li>
 * </ul>
 */
public class PipelineGraphViewFlagsStep extends Step {

    private final Map<String, Object> flags = new HashMap<>();

    @DataBoundConstructor
    public PipelineGraphViewFlagsStep() {
        // No required parameters
    }

    /**
     * Sets the hidden flag for the step.
     *
     * @param value true to mark the step as hidden, false otherwise
     */
    @DataBoundSetter
    public void setHidden(Boolean value) {
        if (value != null) {
            flags.put(FeatureFlagNames.HIDDEN, value);
        }
    }

    /**
     * Gets the hidden flag value.
     *
     * @return the hidden flag value, or null if not set
     */
    public Boolean getHidden() {
        Object value = flags.get(FeatureFlagNames.HIDDEN);
        return value instanceof Boolean ? (Boolean) value : null;
    }

    /**
     * Gets all configured flags.
     *
     * @return map of flag names to their values
     */
    public Map<String, Object> getFlags() {
        return Collections.unmodifiableMap(flags);
    }

    @Override
    public StepExecution start(StepContext context) throws Exception {
        return new PipelineGraphViewFlagsStepExecution(context);
    }

    @Extension
    public static class DescriptorImpl extends StepDescriptor {

        @Override
        public String getFunctionName() {
            return "pipelineGraphViewFlags";
        }

        @Override
        @NonNull
        public String getDisplayName() {
            return "Pipeline Graph View Flags";
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
