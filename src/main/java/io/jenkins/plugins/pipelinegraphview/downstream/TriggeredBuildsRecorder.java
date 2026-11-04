package io.jenkins.plugins.pipelinegraphview.downstream;

import hudson.Extension;
import hudson.model.Cause;
import hudson.model.Run;
import hudson.model.TaskListener;
import hudson.model.listeners.RunListener;
import java.io.IOException;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.support.steps.build.BuildUpstreamCause;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Extension
public class TriggeredBuildsRecorder extends RunListener<Run<?, ?>> {

    private static final Logger logger = LoggerFactory.getLogger(TriggeredBuildsRecorder.class);

    @Override
    public void onStarted(Run<?, ?> run, TaskListener listener) {
        for (Cause cause : run.getCauses()) {
            if (cause instanceof Cause.UpstreamCause upstreamCause
                    && !(cause instanceof BuildUpstreamCause)
                    && upstreamCause.getUpstreamRun() instanceof WorkflowRun upstream) {
                TriggeredBuildsAction.record(upstream, run);
                try {
                    upstream.save();
                } catch (IOException e) {
                    logger.warn("Unable to record triggered build {} on {}", run, upstream, e);
                }
            }
        }
    }
}
