package io.jenkins.plugins.pipelinegraphview.cards.items;

import static io.jenkins.plugins.pipelinegraphview.utils.ChangesUtil.getChanges;

import hudson.scm.ChangeLogSet;
import io.jenkins.plugins.pipelinegraphview.Messages;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem.Icon.Ionicon;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem.ItemContent;
import java.util.List;
import java.util.Optional;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

public class ChangesRunDetailsItem {

    public static Optional<RunDetailsItem> get(WorkflowRun run) {
        List<ChangeLogSet.Entry> changeEntries = getChanges(run);

        if (changeEntries.isEmpty()) {
            return Optional.empty();
        }

        ChangeLogSet.Entry changeEntry = changeEntries.get(0);

        StringBuilder toolTipBuilder = new StringBuilder();
        String commitId = changeEntry.getCommitId();
        if (commitId != null) {
            String author = changeEntry.getAuthor().getDisplayName();
            toolTipBuilder.append("%s by %s".formatted(commitId, author));
            toolTipBuilder.append(System.lineSeparator());
        }
        toolTipBuilder.append(changeEntry.getMsgEscaped());

        int numEntries = changeEntries.size();
        if (numEntries > 1) {
            toolTipBuilder.append(System.lineSeparator()).append(System.lineSeparator());
            toolTipBuilder.append(Messages.changes_other(numEntries - 1));
        }

        RunDetailsItem changes = new RunDetailsItem.RunDetail(
                new Ionicon("code-slash-outline"),
                ItemContent.of("../changes", Messages.changes()),
                toolTipBuilder.toString());
        return Optional.of(changes);
    }
}
