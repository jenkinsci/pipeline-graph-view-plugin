package io.jenkins.plugins.pipelinegraphview.utils;

import static io.jenkins.plugins.pipelinegraphview.consoleview.PipelineConsoleViewAction.URL_NAME;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import hudson.Plugin;
import hudson.model.Action;
import hudson.model.BallColor;
import hudson.model.Item;
import hudson.model.ParametersDefinitionProperty;
import hudson.model.Queue;
import hudson.model.Result;
import hudson.security.Permission;
import hudson.util.HttpResponses;
import io.jenkins.plugins.pipelinegraphview.Messages;
import java.io.IOException;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeoutException;
import java.util.logging.Level;
import java.util.logging.Logger;
import jenkins.model.Jenkins;
import net.sf.json.JSONObject;
import org.jenkins.ui.icon.IconSpec;
import org.jenkinsci.plugins.pipeline.modeldefinition.actions.RestartDeclarativePipelineAction;
import org.jenkinsci.plugins.workflow.cps.replay.ReplayAction;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.kohsuke.stapler.HttpResponse;
import org.kohsuke.stapler.StaplerRequest2;
import org.kohsuke.stapler.WebMethod;
import org.kohsuke.stapler.bind.JavaScriptMethod;
import org.kohsuke.stapler.interceptor.RequirePOST;

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

    public boolean isBuildInProgress() {
        return run.isBuilding();
    }

    public Permission getPermission() {
        return Item.BUILD;
    }

    public Permission getCancelPermission() {
        return Item.CANCEL;
    }

    public Permission getConfigurePermission() {
        return Item.CONFIGURE;
    }

    public String getBuildDisplayName() {
        return run.getDisplayName();
    }

    public String getBuildFullDisplayName() {
        return run.getFullDisplayName();
    }

    public boolean isRebuildAvailable() {
        Plugin rebuildPlugin = Jenkins.get().getPlugin("rebuild");
        if (rebuildPlugin != null && rebuildPlugin.getWrapper().isEnabled()) {
            // limit rebuild to parameterized jobs otherwise it duplicates rerun's behaviour
            return run.getParent().getProperty(ParametersDefinitionProperty.class) != null;
        }
        return false;
    }

    public boolean isRestartFromStageAvailable() {
        RestartDeclarativePipelineAction action = run.getAction(RestartDeclarativePipelineAction.class);
        if (action != null) {
            return action.isRestartEnabled();
        }
        return false;
    }

    /**
     * Handles the rerun request using ReplayAction feature
     */
    @RequirePOST
    @JavaScriptMethod
    public boolean doRerun() throws IOException, ExecutionException {
        if (run != null) {
            run.checkAnyPermission(Item.BUILD);
            ReplayAction replayAction = run.getAction(ReplayAction.class);
            Queue.Item item =
                    replayAction.run2(replayAction.getOriginalScript(), replayAction.getOriginalLoadedScripts());

            if (item == null) {
                return false;
            }
            return true;
        }
        return false;
    }

    /**
     * Handles the cancel request.
     */
    @RequirePOST
    @JavaScriptMethod
    public HttpResponse doCancel() throws IOException, ExecutionException {
        if (run != null) {
            run.checkPermission(getCancelPermission());
            if (run.isBuilding()) {
                run.doStop();
                return HttpResponses.okJSON();
            } else {
                String message = Result.ABORTED.equals(run.getResult())
                        ? Messages.run_alreadyCancelled()
                        : Messages.run_isFinished();
                return HttpResponses.errorJSON(message);
            }
        }
        return HttpResponses.errorJSON("No run to cancel");
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

    public String getBuildUrl() {
        return run.getUrl();
    }

    public String getPreviousBuildNumber() {
        return getBuildNumber(run.getPreviousBuild());
    }

    public String getPreviousBuildUrl() {
        WorkflowRun previousBuild = run.getPreviousBuild();
        return previousBuild == null ? null : previousBuild.getUrl();
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
        JSONObject graph = createJson(api.createTree());

        return HttpResponses.okJSON(graph);
    }

    @WebMethod(name = "replay")
    public HttpResponse replayRun(StaplerRequest2 req) {

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
                        + run.getUrl().replace("/" + run.getNumber() + "/", "/" + estimatedNextBuildNumber + "/")
                        + URL_NAME);

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
        return null;
    }
}
