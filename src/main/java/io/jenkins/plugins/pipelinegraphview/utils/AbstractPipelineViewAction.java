package io.jenkins.plugins.pipelinegraphview.utils;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import hudson.model.Action;
import hudson.util.HttpResponses;
import net.sf.json.JSONObject;
import org.jenkins.ui.icon.Icon;
import org.jenkins.ui.icon.IconSet;
import org.jenkins.ui.icon.IconSpec;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.kohsuke.stapler.HttpResponse;
import org.kohsuke.stapler.WebMethod;
import org.kohsuke.stapler.verb.GET;

import java.util.logging.Level;
import java.util.logging.Logger;
public abstract class AbstractPipelineViewAction implements Action, IconSpec {
    private static final Logger LOGGER = Logger.getLogger(AbstractPipelineViewAction.class.getName());
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    static {
        IconSet.icons.addIcon(new Icon("icon-pipeline-graph icon-md", "plugin/pipeline-graph-view/images/24x24/blueocean.png", Icon.ICON_MEDIUM_STYLE));
        IconSet.icons.addIcon(new Icon("icon-pipeline-graph icon-xl", "plugin/pipeline-graph-view/images/48x48/blueocean.png", Icon.ICON_XLARGE_STYLE));
    }

    protected final transient PipelineGraphApi api;

    public AbstractPipelineViewAction(WorkflowRun target) {
        this.api = new PipelineGraphApi(target);
    }

    protected JSONObject createJson(PipelineGraph pipelineGraph) throws JsonProcessingException {
        String graph = OBJECT_MAPPER.writeValueAsString(pipelineGraph);
        return JSONObject.fromObject(graph);
    }

    @GET
    @WebMethod(name = "graph")
    public HttpResponse getGraph() throws JsonProcessingException {
        // TODO for automatic json serialisation look at:
        // https://github.com/jenkinsci/blueocean-plugin/blob/4f2aa260fca22604a087629dc0da5c80735e0548/blueocean-commons/src/main/java/io/jenkins/blueocean/commons/stapler/Export.java#L101
        // https://github.com/jenkinsci/blueocean-plugin/blob/4f2aa260fca22604a087629dc0da5c80735e0548/blueocean-commons/src/main/java/io/jenkins/blueocean/commons/stapler/TreeResponse.java#L48
        JSONObject graph = createJson(api.createGraph());
        return HttpResponses.okJSON(graph);
    }

    @WebMethod(name = "tree")
    public HttpResponse getTree() throws JsonProcessingException {
        // TODO: This need to be updated to return a tree representation of the graph, not the graph.
        // Here is how FlowGraphTree does it: https://github.com/jenkinsci/workflow-support-plugin/blob/master/src/main/java/org/jenkinsci/plugins/workflow/support/visualization/table/FlowGraphTable.java#L126
        JSONObject graph = createJson(api.createTree());

        return HttpResponses.okJSON(graph);
    }

    @Override
    public String getIconFileName() {
        String iconClassName = getIconClassName();
        Icon icon = IconSet.icons.getIconByClassSpec(iconClassName + " icon-md");
        return "/plugin/" + icon.getUrl();
    }

    @Override
    public String getIconClassName() {
        return "icon-pipeline-graph";
    }
}
