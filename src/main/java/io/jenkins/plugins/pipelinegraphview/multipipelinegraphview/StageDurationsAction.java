package io.jenkins.plugins.pipelinegraphview.multipipelinegraphview;

import hudson.model.Action;
import io.jenkins.plugins.pipelinegraphview.Messages;
import org.jenkins.ui.icon.IconSpec;

/**
 * Opens a table of how long each stage took in recent builds, from the new job page's overflow menu.
 * The page itself is served by {@link MultiPipelineGraphViewAction}.
 */
public class StageDurationsAction implements Action, IconSpec {

    private static final String ICON = "symbol-stopwatch-outline plugin-ionicons-api";

    @Override
    public String getIconFileName() {
        return ICON;
    }

    @Override
    public String getIconClassName() {
        return ICON;
    }

    @Override
    public String getDisplayName() {
        return Messages.stageDurations();
    }

    @Override
    public String getUrlName() {
        return "multi-pipeline-graph/durations";
    }
}
