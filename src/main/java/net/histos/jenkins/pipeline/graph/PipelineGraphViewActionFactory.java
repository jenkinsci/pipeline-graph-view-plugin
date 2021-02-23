package net.histos.jenkins.pipeline.graph;

import java.util.Collection;
import java.util.Collections;

import org.jenkinsci.plugins.workflow.job.WorkflowRun;

import hudson.Extension;
import hudson.model.Action;
import jenkins.model.TransientActionFactory;

@Extension
public class PipelineGraphViewActionFactory extends TransientActionFactory<WorkflowRun> {

    @Override
    public Class<WorkflowRun> type() {
        return WorkflowRun.class;
    }

    @Override
    public Collection<? extends Action> createFor(WorkflowRun target) {
        PipelineGraphViewAction a = new PipelineGraphViewAction(target);
        return Collections.singleton(a);
    }
    
}