package io.jenkins.plugins.pipelinegraphview.steps;

import org.jenkinsci.plugins.workflow.steps.BodyExecutionCallback;
import org.jenkinsci.plugins.workflow.steps.StepContext;
import org.jenkinsci.plugins.workflow.steps.StepExecution;

/**
 * Execution for {@link MarkAsHiddenForDisplayStep}.
 *
 * <p>This execution simply runs the enclosed body block. The step's presence in the
 * flow graph serves as a marker for the Pipeline Graph View plugin to identify
 * hidden steps.</p>
 */
public class MarkAsHiddenForDisplayStepExecution extends StepExecution {

    private static final long serialVersionUID = 1L;

    protected MarkAsHiddenForDisplayStepExecution(StepContext context) {
        super(context);
    }

    @Override
    public boolean start() throws Exception {
        getContext()
                .newBodyInvoker()
                .withCallback(BodyExecutionCallback.wrap(getContext()))
                .start();
        return false;
    }
}
