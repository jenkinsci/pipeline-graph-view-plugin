package io.jenkins.plugins.pipelinegraphview.cards.items;

import io.jenkins.plugins.pipelinegraphview.Messages;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem.Icon.Ionicon;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem.ItemContent;
import java.util.Optional;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

public class ChangesRunDetailsItem {

    public static Optional<RunDetailsItem> get(WorkflowRun run) {
        boolean hasChanges = !run.getChangeSets().isEmpty();

        if (!hasChanges) {
            return Optional.empty();
        }
        RunDetailsItem changes = new RunDetailsItem.RunDetail(
                new Ionicon("code-slash-outline"), ItemContent.of("../changes", Messages.changes()));
        return Optional.of(changes);
    }
}
