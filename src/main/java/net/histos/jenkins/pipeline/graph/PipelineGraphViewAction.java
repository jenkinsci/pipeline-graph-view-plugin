package net.histos.jenkins.pipeline.graph;

import hudson.model.Action;
import org.jenkins.ui.icon.Icon;
import org.jenkins.ui.icon.IconSet;
import org.jenkins.ui.icon.IconSpec;

public class PipelineGraphViewAction implements Action, IconSpec {

    static {
        IconSet.icons.addIcon(new Icon("icon-pipeline-graph icon-md", "plugin/pipeline-graph-view/images/24x24/blueocean.png", Icon.ICON_MEDIUM_STYLE));
        IconSet.icons.addIcon(new Icon("icon-pipeline-graph icon-xl", "plugin/pipeline-graph-view/images/48x48/blueocean.png", Icon.ICON_XLARGE_STYLE));
    }

    @Override
    public String getIconFileName() {
        String iconClassName = getIconClassName();
        Icon icon = IconSet.icons.getIconByClassSpec(iconClassName + " icon-md");
        return "/plugin/" + icon.getUrl();
    }

    @Override
    public String getDisplayName() {
        return "Pipeline Graph";
    }

    @Override
    public String getUrlName() {
        return "pipelineGraph";
    }

    @Override
    public String getIconClassName() {
        return "icon-pipeline-graph";
    }
}
