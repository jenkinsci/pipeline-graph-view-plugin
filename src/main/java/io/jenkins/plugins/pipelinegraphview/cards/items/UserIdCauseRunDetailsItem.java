package io.jenkins.plugins.pipelinegraphview.cards.items;

import hudson.model.Cause;
import hudson.model.CauseAction;
import hudson.model.User;
import io.jenkins.plugins.pipelinegraphview.Messages;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem.Icon.Ionicon;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem.ItemContent;
import java.util.HashMap;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

public class UserIdCauseRunDetailsItem {

    public static Optional<RunDetailsItem> get(WorkflowRun run) {
        CauseAction causeAction = run.getAction(CauseAction.class);
        if (causeAction == null) {
            return Optional.empty();
        }
        List<Cause> causes = causeAction.getCauses();
        return causes.stream()
                .filter(cause -> cause instanceof Cause.UserIdCause)
                .map(userIdCause -> (Cause.UserIdCause) userIdCause)
                .map(userIdCause -> User.get(userIdCause.getUserId(), false, new HashMap<>()))
                .filter(Objects::nonNull)
                .map(user -> ItemContent.of(Messages.cause_user(user.getDisplayName())))
                .<RunDetailsItem>map(content -> new RunDetailsItem.RunDetail(new Ionicon("person-outline"), content))
                .findAny();
    }
}
