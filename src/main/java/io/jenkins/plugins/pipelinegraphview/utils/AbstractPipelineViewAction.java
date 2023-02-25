package io.jenkins.plugins.pipelinegraphview.utils;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import hudson.model.Action;
import hudson.model.BallColor;
import hudson.security.Permission;
import hudson.util.HttpResponses;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeoutException;
import java.util.logging.Level;
import java.util.logging.Logger;
import net.sf.json.JSONObject;
import org.jenkins.ui.icon.IconSpec;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.kohsuke.stapler.HttpResponse;
import org.kohsuke.stapler.StaplerRequest;
import org.kohsuke.stapler.WebMethod;

public abstract class AbstractPipelineViewAction implements Action, IconSpec {
  private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
  private static final Logger LOGGER = Logger.getLogger(AbstractPipelineViewAction.class.getName());

  protected final transient PipelineGraphApi api;
  protected final transient WorkflowRun run;

  public AbstractPipelineViewAction(WorkflowRun target) {
    this.api = new PipelineGraphApi(target);
    this.run = target;
  }

  public boolean isBuildable() {
    return run.getParent().isBuildable();
  }

  public Permission getPermission() {
    return run.getParent().BUILD;
  }

  public Permission getConfigurePermission() {
    return run.getParent().CONFIGURE;
  }

  public String getBuildDisplayName() {
    return run.getDisplayName();
  }

  public String getFullBuildDisplayName() {
    return run.getFullDisplayName();
  }

  public String getFullProjectDisplayName() {
    return run.getParent().getFullDisplayName();
  }

  private String getBuildNumber(WorkflowRun run) {
    if (run != null) {
      return String.valueOf(run.getNumber());
    }
    return null;
  }

  public String getPreviousBuildNumber() {
    return getBuildNumber(run.getPreviousBuild());
  }

  public String getNextBuildNumber() {
    return getBuildNumber(run.getNextBuild());
  }

  public BallColor getIconColor() {
    return run.getIconColor();
  }

  public String getBuildStatusIconClassName() {
    return run.getBuildStatusIconClassName();
  }

  protected JSONObject createJson(PipelineGraph pipelineGraph) throws JsonProcessingException {
    String graph = OBJECT_MAPPER.writeValueAsString(pipelineGraph);
    return JSONObject.fromObject(graph);
  }

  @WebMethod(name = "tree")
  public HttpResponse getTree() throws JsonProcessingException {
    // TODO: This need to be updated to return a tree representation of the graph, not the graph.
    // Here is how FlowGraphTree does it:
    // https://github.com/jenkinsci/workflow-support-plugin/blob/master/src/main/java/org/jenkinsci/plugins/workflow/support/visualization/table/FlowGraphTable.java#L126
    JSONObject graph = createJson(api.createTree());

    return HttpResponses.okJSON(graph);
  }

  @WebMethod(name = "replay")
  public HttpResponse replayRun(StaplerRequest req) {

    JSONObject result = new JSONObject();

    Integer estimatedNextBuildNumber;
    try {
      estimatedNextBuildNumber = api.replay();
    } catch (ExecutionException | InterruptedException | TimeoutException e) {
      LOGGER.log(Level.SEVERE, "Failed to queue item", e);
      return HttpResponses.errorJSON("failed to queue item: " + e.getMessage());
    }

    if (estimatedNextBuildNumber == null) {
      return HttpResponses.errorJSON("failed to get next build number");
    }

    result.put(
        "url",
        appendTrailingSlashIfRequired(req.getContextPath())
            + run.getUrl()
                .replace("/" + run.getNumber() + "/", "/" + estimatedNextBuildNumber + "/")
            + "pipeline-graph/");

    result.put("success", true);
    return HttpResponses.okJSON(result);
  }

  private static String appendTrailingSlashIfRequired(String string) {
    if (string.endsWith("/")) {
      return string;
    }

    return string + "/";
  }

  @Override
  public String getIconFileName() {
    return null;
  }

  @Override
  public String getIconClassName() {
    return "symbol-file-tray-stacked-outline plugin-ionicons-api";
  }
}
