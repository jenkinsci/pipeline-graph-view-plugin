package io.jenkins.plugins.pipelinegraphview.buildflow;

import edu.umd.cs.findbugs.annotations.NonNull;
import hudson.Extension;
import hudson.model.Action;
import hudson.model.Job;
import java.util.Collection;
import java.util.Collections;
import jenkins.model.TransientActionFactory;

/**
 * Registers {@link BuildFlowJobAction} on every {@link Job}.
 */
@Extension
public class BuildFlowJobActionFactory extends TransientActionFactory<Job> {

    @Override
    public Class<Job> type() {
        return Job.class;
    }

    @NonNull
    @Override
    public Collection<? extends Action> createFor(@NonNull Job target) {
        return Collections.singleton(new BuildFlowJobAction(target));
    }
}
