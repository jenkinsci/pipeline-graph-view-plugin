package io.jenkins.plugins.pipelinegraphview.cards.items;

import hudson.model.Cause;
import hudson.model.CauseAction;
import io.jenkins.plugins.pipelinegraphview.Messages;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem.Icon;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem.ItemContent;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import org.jenkinsci.plugins.displayurlapi.DisplayURLProvider;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

public class UpstreamCauseRunDetailsItem {

    public static Optional<RunDetailsItem> get(WorkflowRun run) {
        CauseAction causeAction = run.getAction(CauseAction.class);
        List<Cause> causes = causeAction.getCauses();
        return causes.stream()
                .filter(cause -> cause instanceof Cause.UpstreamCause)
                .map(upstreamCause -> (Cause.UpstreamCause) upstreamCause)
                .map(Cause.UpstreamCause::getUpstreamRun)
                .filter(Objects::nonNull)
                .map(upstreamRun -> ItemContent.of(
                        DisplayURLProvider.getDefault().getRunURL(upstreamRun),
                        Messages.cause_upstream(upstreamRun.getDisplayName())))
                .<RunDetailsItem>map(
                        content -> new RunDetailsItem.RunDetail(new Icon.IonIcon("play-circle-outline"), content))
                .findAny();
    }
}
