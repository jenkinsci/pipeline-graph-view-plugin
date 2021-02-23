package net.histos.jenkins.pipeline.graph;

import com.fasterxml.jackson.core.JsonProcessingException;
import hudson.model.Action;
import hudson.util.HttpResponses;
import io.jenkins.plugins.pipelinegraphview.PipelineGraph;
import io.jenkins.plugins.pipelinegraphview.PipelineGraphApi;
import org.jenkins.ui.icon.Icon;
import org.jenkins.ui.icon.IconSet;
import org.jenkins.ui.icon.IconSpec;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.kohsuke.stapler.HttpResponse;
import org.kohsuke.stapler.WebMethod;
import org.kohsuke.stapler.verb.GET;

import java.util.Collections;

public class PipelineGraphViewAction implements Action, IconSpec {

    static {
        IconSet.icons.addIcon(new Icon("icon-pipeline-graph icon-md", "plugin/pipeline-graph-view/images/24x24/blueocean.png", Icon.ICON_MEDIUM_STYLE));
        IconSet.icons.addIcon(new Icon("icon-pipeline-graph icon-xl", "plugin/pipeline-graph-view/images/48x48/blueocean.png", Icon.ICON_XLARGE_STYLE));
    }

    private final transient PipelineGraphApi api;

    public PipelineGraphViewAction(WorkflowRun target) {
        this.api = new PipelineGraphApi(target);
    }

    @GET
    @WebMethod(name = "graph")
    public HttpResponse getGraph() throws JsonProcessingException {
        // TODO for automatic json serialisation look at:
        // https://github.com/jenkinsci/blueocean-plugin/blob/4f2aa260fca22604a087629dc0da5c80735e0548/blueocean-commons/src/main/java/io/jenkins/blueocean/commons/stapler/Export.java#L101
        // https://github.com/jenkinsci/blueocean-plugin/blob/4f2aa260fca22604a087629dc0da5c80735e0548/blueocean-commons/src/main/java/io/jenkins/blueocean/commons/stapler/TreeResponse.java#L48
        return HttpResponses.okJSON(api.createGraph());
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
        return "pipeline-graph";
    }

    @Override
    public String getIconClassName() {
        return "icon-pipeline-graph";
    }
}
