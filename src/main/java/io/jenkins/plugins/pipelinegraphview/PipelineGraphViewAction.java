package io.jenkins.plugins.pipelinegraphview;

import io.jenkins.plugins.pipelinegraphview.utils.AbstractPipelineViewAction;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

import org.slf4j.LoggerFactory;
import org.slf4j.Logger;
public class PipelineGraphViewAction extends AbstractPipelineViewAction {
    private static final Logger logger = LoggerFactory.getLogger(PipelineGraphViewAction.class);

    public PipelineGraphViewAction(WorkflowRun target) {
        super(target);
    }

    @Override
    public String getDisplayName() {
        return "Pipeline Graph";
    }

    @Override
    public String getUrlName() {
        return "pipeline-graph";
    }
}
