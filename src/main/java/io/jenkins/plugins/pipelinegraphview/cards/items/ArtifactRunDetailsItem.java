package io.jenkins.plugins.pipelinegraphview.cards.items;

import io.jenkins.plugins.pipelinegraphview.Messages;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem.Icon.Ionicon;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem.ItemContent;
import java.util.Optional;
import jenkins.model.experimentalflags.NewBuildPageUserExperimentalFlag;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

public class ArtifactRunDetailsItem {

    public static Optional<RunDetailsItem> get(WorkflowRun run) {
        boolean hasArtifacts = run.getHasArtifacts();
        boolean isExperimentalUiEnabled = new NewBuildPageUserExperimentalFlag().getFlagValue();

        if (!hasArtifacts || isExperimentalUiEnabled) {
            return Optional.empty();
        }

        RunDetailsItem artifacts = new RunDetailsItem.RunDetail(
                new Ionicon("cube-outline"), ItemContent.of("../artifact", Messages.artifacts()));
        return Optional.of(artifacts);
    }
}
