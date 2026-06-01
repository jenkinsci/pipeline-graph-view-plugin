package io.jenkins.plugins.pipelinegraphview.cards.items;

import hudson.model.Run;
import io.jenkins.plugins.pipelinegraphview.buildflow.BuildFlowGraph;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem.Icon.Ionicon;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem.ItemContent;
import java.util.Optional;

public class BuildFlowRunDetailsItem {

    public static Optional<RunDetailsItem> get(Run<?, ?> run) {
        if (!BuildFlowGraph.hasUpstreamOrDownstream(run)) {
            return Optional.empty();
        }

        RunDetailsItem item = new RunDetailsItem.RunDetail(
                new Ionicon("git-network-outline"), ItemContent.of("build-flow", "Build Flow"), "View build chain");
        return Optional.of(item);
    }
}
