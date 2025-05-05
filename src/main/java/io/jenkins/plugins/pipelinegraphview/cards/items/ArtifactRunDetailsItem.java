package io.jenkins.plugins.pipelinegraphview.cards.items;

import io.jenkins.plugins.pipelinegraphview.Messages;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem;
import java.util.Optional;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

public class ArtifactRunDetailsItem {

    public static Optional<RunDetailsItem> get(WorkflowRun run) {
        boolean hasArtifacts = run.getHasArtifacts();

        if (hasArtifacts) {
            RunDetailsItem artifacts = new RunDetailsItem.Builder()
                    .ionicon("cube-outline")
                    .text(Messages.artifacts())
                    .href("../artifact")
                    .build();
            return Optional.of(artifacts);
        }

        return Optional.empty();
    }
}
