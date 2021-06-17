package io.jenkins.plugins.pipelinegraphview;

import io.jenkins.plugins.pipelinegraphview.utils.AbstractPipelineViewAction;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

import java.util.logging.Level;
import java.util.logging.Logger;
public class PipelineGraphViewAction extends AbstractPipelineViewAction {
    private static final Logger LOGGER = Logger.getLogger(PipelineGraphViewAction.class.getName());

    public PipelineGraphViewAction(WorkflowRun target) {
        super(target);
    }

    @Override
    public String getDisplayName() {
        LOGGER.log(Level.INFO, "PipelineGraphViewAction getDisplayName called.");
        return "Pipeline Graph";
    }

    @Override
    public String getUrlName() {
        LOGGER.log(Level.INFO, "PipelineGraphViewAction getUrlName called.");
        return "pipeline-graph";
    }
}
