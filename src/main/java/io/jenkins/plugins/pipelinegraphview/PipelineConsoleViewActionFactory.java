package io.jenkins.plugins.pipelinegraphview;

import java.util.Collection;
import java.util.Collections;

import org.jenkinsci.plugins.workflow.job.WorkflowRun;

import hudson.Extension;
import hudson.model.Action;
import jenkins.model.TransientActionFactory;

@Extension
public class PipelineConsoleViewActionFactory extends TransientActionFactory<WorkflowRun> {

    @Override
    public Class<WorkflowRun> type() {
        return WorkflowRun.class;
    }

    @Override
    public Collection<? extends Action> createFor(WorkflowRun target) {
        PipelineConsoleViewAction a = new PipelineConsoleViewAction(target);
        return Collections.singleton(a);
    }
    
}
