package io.jenkins.plugins.pipelinegraphview.buildflow;

import edu.umd.cs.findbugs.annotations.NonNull;
import hudson.Extension;
import hudson.model.Action;
import hudson.model.Run;
import java.util.Collection;
import java.util.Collections;
import jenkins.model.TransientActionFactory;

/**
 * Registers {@link BuildFlowAction} on every {@link Run} to provide the build-flow API endpoint.
 * The Build Flow UI is integrated into the Stages tab; no separate tab capsule is shown.
 */
@Extension
public class BuildFlowActionFactory extends TransientActionFactory<Run> {

    @Override
    public Class<Run> type() {
        return Run.class;
    }

    @NonNull
    @Override
    public Collection<? extends Action> createFor(@NonNull Run target) {
        return Collections.singleton(new BuildFlowAction(target));
    }
}
