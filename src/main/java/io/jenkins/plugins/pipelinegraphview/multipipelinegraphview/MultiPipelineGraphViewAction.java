package io.jenkins.plugins.pipelinegraphview.multipipelinegraphview;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import hudson.model.Action;
import hudson.util.HttpResponses;
import hudson.util.RunList;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineGraph;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineGraphApi;
import java.util.ArrayList;
import java.util.List;
import net.sf.json.JSONArray;
import net.sf.json.JSONObject;
import org.jenkins.ui.icon.Icon;
import org.jenkins.ui.icon.IconSet;
import org.jenkins.ui.icon.IconSpec;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.kohsuke.stapler.HttpResponse;
import org.kohsuke.stapler.StaplerRequest;
import org.kohsuke.stapler.WebMethod;
import org.kohsuke.stapler.verb.GET;

public class MultiPipelineGraphViewAction implements Action, IconSpec {
  private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
  private static final int MaxNumberOfElements = 10;

  static {
    IconSet.icons.addIcon(
        new Icon(
            "icon-pipeline-graph icon-md",
            "plugin/pipeline-graph-view/images/24x24/blueocean.png",
            Icon.ICON_MEDIUM_STYLE));
    IconSet.icons.addIcon(
        new Icon(
            "icon-pipeline-graph icon-xl",
            "plugin/pipeline-graph-view/images/48x48/blueocean.png",
            Icon.ICON_XLARGE_STYLE));
  }

  private final WorkflowJob target;

  public MultiPipelineGraphViewAction(WorkflowJob target) {
    this.target = target;
  }

  @GET
  @WebMethod(name = "graph")
  public HttpResponse getGraph(StaplerRequest req) throws JsonProcessingException {
    String runId = req.getParameter("runId");
    WorkflowRun run = target.getBuildByNumber(Integer.parseInt(runId));
    PipelineGraphApi api = new PipelineGraphApi(run);
    JSONObject graph = createGraphJson(api.createGraph());
    return HttpResponses.okJSON(graph);
  }

  protected JSONObject createGraphJson(PipelineGraph pipelineGraph) throws JsonProcessingException {
    String graph = OBJECT_MAPPER.writeValueAsString(pipelineGraph);
    return JSONObject.fromObject(graph);
  }

  @GET
  @WebMethod(name = "runs")
  public HttpResponse getRuns() throws JsonProcessingException {
    RunList<WorkflowRun> runs = target.getBuilds();
    List<PipelineRun> pipelineRuns = new ArrayList<>();
    for (WorkflowRun run : runs) {
      pipelineRuns.add(new PipelineRun(run));
      if (pipelineRuns.size() >= MaxNumberOfElements) break;
    }
    JSONArray graph = createJson(pipelineRuns);
    return HttpResponses.okJSON(graph);
  }

  protected JSONArray createJson(List<PipelineRun> pipelineRuns) throws JsonProcessingException {
    String graph = OBJECT_MAPPER.writeValueAsString(pipelineRuns);
    return JSONArray.fromObject(graph);
  }

  @Override
  public String getIconFileName() {
    String iconClassName = getIconClassName();
    Icon icon = IconSet.icons.getIconByClassSpec(iconClassName + " icon-md");
    return "/plugin/" + icon.getUrl();
  }

  @Override
  public String getDisplayName() {
    return "Multi Pipeline Graph";
  }

  @Override
  public String getUrlName() {
    return "multi-pipeline-graph";
  }

  @Override
  public String getIconClassName() {
    return "icon-pipeline-graph";
  }
}
