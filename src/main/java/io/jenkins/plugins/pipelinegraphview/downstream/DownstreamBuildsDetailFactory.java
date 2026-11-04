package io.jenkins.plugins.pipelinegraphview.downstream;

import edu.umd.cs.findbugs.annotations.NonNull;
import hudson.Extension;
import java.util.List;
import jenkins.model.details.Detail;
import jenkins.model.details.DetailFactory;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.support.steps.build.DownstreamBuildAction;

@Extension
public class DownstreamBuildsDetailFactory extends DetailFactory<WorkflowRun> {

    @Override
    public Class<WorkflowRun> type() {
        return WorkflowRun.class;
    }

    @NonNull
    @Override
    public List<? extends Detail> createFor(@NonNull WorkflowRun target) {
        // core calls this for every build history row, so resolving the builds is deferred until rendered
        if (target.getAction(DownstreamBuildAction.class) == null
                && target.getAction(TriggeredBuildsAction.class) == null) {
            return List.of();
        }
        return List.of(new DownstreamBuildsDetail(target));
    }
}
