package io.jenkins.plugins.pipelinegraphview.downstream;

import edu.umd.cs.findbugs.annotations.NonNull;
import hudson.model.InvisibleAction;
import hudson.model.Run;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Builds started with an {@link hudson.model.Cause.UpstreamCause} pointing at this run, such as from
 * {@code triggers { upstream(...) }}. Core keeps no record of these on the upstream run, so they are added when the
 * downstream build starts. Builds from the {@code build} step are tracked by {@code DownstreamBuildAction}.
 */
public final class TriggeredBuildsAction extends InvisibleAction {

    // externalizable ids; copy-on-write so the run can be saved while another downstream build is being added
    private final CopyOnWriteArrayList<String> builds = new CopyOnWriteArrayList<>();

    static void record(@NonNull Run<?, ?> upstream, @NonNull Run<?, ?> downstream) {
        TriggeredBuildsAction action;
        synchronized (TriggeredBuildsAction.class) {
            action = upstream.getAction(TriggeredBuildsAction.class);
            if (action == null) {
                action = new TriggeredBuildsAction();
                upstream.addAction(action);
            }
        }
        action.builds.addIfAbsent(downstream.getExternalizableId());
    }

    public @NonNull List<String> getBuilds() {
        return List.copyOf(builds);
    }
}
