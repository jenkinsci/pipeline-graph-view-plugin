package io.jenkins.plugins.pipelinegraphview.cards.items;

import io.jenkins.plugins.pipelinegraphview.Messages;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem.Icon;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem.ItemContent;
import java.util.Optional;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

public class ArtifactRunDetailsItem {

    public static Optional<RunDetailsItem> get(WorkflowRun run) {
        boolean hasArtifacts = run.getHasArtifacts();

        if (!hasArtifacts) {
            return Optional.empty();
        }
        RunDetailsItem artifacts = new RunDetailsItem.RunDetail(
                new Icon.IonIcon("cube-outline"), new ItemContent.LinkContent("../artifact", Messages.artifacts()));
        return Optional.of(artifacts);
    }
}
