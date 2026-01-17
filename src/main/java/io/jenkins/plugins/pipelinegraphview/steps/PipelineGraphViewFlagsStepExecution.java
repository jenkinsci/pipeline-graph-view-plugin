package io.jenkins.plugins.pipelinegraphview.steps;

import org.jenkinsci.plugins.workflow.steps.BodyExecutionCallback;
import org.jenkinsci.plugins.workflow.steps.StepContext;
import org.jenkinsci.plugins.workflow.steps.StepExecution;

/**
 * Execution for {@link PipelineGraphViewFlagsStep}.
 *
 * <p>This execution simply runs the body block without any additional logic.
 * The feature flags are automatically stored in the ArgumentsAction by Jenkins
 * and can be retrieved later by FlowNodeWrapper.
 */
public class PipelineGraphViewFlagsStepExecution extends StepExecution {

    private static final long serialVersionUID = 1L;

    public PipelineGraphViewFlagsStepExecution(StepContext context) {
        super(context);
    }

    @Override
    public boolean start() throws Exception {
        // Simply execute the body block
        // The flags are stored in ArgumentsAction automatically by Jenkins
        getContext().newBodyInvoker().withCallback(BodyExecutionCallback.wrap(getContext())).start();
        return false; // Async execution
    }

    @Override
    public void stop(Throwable cause) throws Exception {
        // No special cleanup needed
        getContext().onFailure(cause);
    }
}
