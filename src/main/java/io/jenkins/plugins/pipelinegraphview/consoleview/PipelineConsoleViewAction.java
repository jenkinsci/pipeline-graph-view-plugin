package io.jenkins.plugins.pipelinegraphview.consoleview;

import edu.umd.cs.findbugs.annotations.CheckForNull;
import edu.umd.cs.findbugs.annotations.SuppressFBWarnings;
import hudson.Plugin;
import hudson.console.AnnotatedLargeText;
import hudson.model.Action;
import hudson.model.BallColor;
import hudson.model.Item;
import hudson.model.ParametersDefinitionProperty;
import hudson.model.Queue;
import hudson.model.Result;
import hudson.security.Permission;
import hudson.util.HttpResponses;
import io.jenkins.plugins.pipelinegraphview.Messages;
import io.jenkins.plugins.pipelinegraphview.PipelineGraphViewConfiguration;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsCard;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem;
import io.jenkins.plugins.pipelinegraphview.cards.items.ArtifactRunDetailsItem;
import io.jenkins.plugins.pipelinegraphview.cards.items.ChangesRunDetailsItem;
import io.jenkins.plugins.pipelinegraphview.cards.items.SCMRunDetailsItems;
import io.jenkins.plugins.pipelinegraphview.cards.items.TestResultRunDetailsItem;
import io.jenkins.plugins.pipelinegraphview.cards.items.TimingRunDetailsItems;
import io.jenkins.plugins.pipelinegraphview.cards.items.UpstreamCauseRunDetailsItem;
import io.jenkins.plugins.pipelinegraphview.cards.items.UserIdCauseRunDetailsItem;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineGraph;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineGraphApi;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineNodeUtil;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineStep;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineStepApi;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineStepList;
import jakarta.servlet.ServletException;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import jenkins.model.Jenkins;
import net.sf.json.JSONObject;
import net.sf.json.JsonConfig;
import org.jenkins.ui.icon.IconSpec;
import org.jenkinsci.plugins.pipeline.modeldefinition.actions.RestartDeclarativePipelineAction;
import org.jenkinsci.plugins.workflow.cps.replay.ReplayAction;
import org.jenkinsci.plugins.workflow.flow.FlowExecution;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.kohsuke.stapler.HttpResponse;
import org.kohsuke.stapler.StaplerRequest2;
import org.kohsuke.stapler.StaplerResponse2;
import org.kohsuke.stapler.WebMethod;
import org.kohsuke.stapler.bind.JavaScriptMethod;
import org.kohsuke.stapler.interceptor.RequirePOST;
import org.kohsuke.stapler.verb.GET;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class PipelineConsoleViewAction implements Action, IconSpec {
    public static final long LOG_THRESHOLD = 150 * 1024; // 150KB
    public static final String URL_NAME = "pipeline-overview";
    public static final int CACHE_AGE = (int) TimeUnit.DAYS.toSeconds(1);

    private static final Logger logger = LoggerFactory.getLogger(PipelineConsoleViewAction.class);
    private static final JsonConfig jsonConfig = new JsonConfig();

    static {
        PipelineStepList.PipelineStepListJsonProcessor.configure(jsonConfig);
        PipelineGraph.PipelineGraphJsonProcessor.configure(jsonConfig);
    }

    private final PipelineGraphApi graphApi;
    private final WorkflowRun run;
    private final PipelineStepApi stepApi;

    public PipelineConsoleViewAction(WorkflowRun target) {
        this.run = target;
        this.graphApi = new PipelineGraphApi(this.run);
        this.stepApi = new PipelineStepApi(this.run);
    }

    @Override
    public String getDisplayName() {
        return "Pipeline Overview";
    }

    @Override
    public String getUrlName() {
        return URL_NAME;
    }

    // Legacy - leave in case we want to update a sub section of steps (e.g. if a stage is still
    // running).
    @GET
    @WebMethod(name = "steps")
    public HttpResponse getSteps(StaplerRequest2 req) {
        run.checkPermission(Item.READ);
        String nodeId = req.getParameter("nodeId");
        if (nodeId != null) {
            return HttpResponses.okJSON(getSteps(nodeId));
        } else {
            return HttpResponses.errorJSON("Error getting console text");
        }
    }

    private JSONObject getSteps(String nodeId) {
        logger.debug("getSteps was passed nodeId '{}'.", nodeId);
        PipelineStepList steps = stepApi.getSteps(nodeId);
        JSONObject json = JSONObject.fromObject(steps, jsonConfig);
        logger.debug("Steps for {}: '{}'.", nodeId, json);
        return json;
    }

    // Return all steps to:
    // - reduce number of API calls
    // - remove dependency of getting list of stages in frontend.
    @GET
    @WebMethod(name = "allSteps")
    public void getAllSteps(StaplerRequest2 req, StaplerResponse2 rsp) throws IOException, ServletException {
        run.checkPermission(Item.READ);
        PipelineStepList steps = stepApi.getAllSteps();
        JSONObject json = JSONObject.fromObject(steps, jsonConfig);
        logger.debug("Steps: '{}'.", json);
        HttpResponse response = HttpResponses.okJSON(json);

        rsp.setStatus(200);
        setCache(rsp, steps.runIsComplete);
        response.generateResponse(req, rsp, null);
    }

    private void setCache(StaplerResponse2 rsp, boolean complete) {
        if (complete) {
            rsp.setHeader("Cache-Control", "private, immutable, max-age=" + CACHE_AGE);
        } else {
            rsp.setHeader("Cache-Control", "private, no-store");
        }
    }

    @WebMethod(name = "log")
    @SuppressWarnings("ResultOfMethodCallIgnored")
    @SuppressFBWarnings(
            value = "RV_RETURN_VALUE_IGNORED",
            justification =
                    "Doesn't seem to matter in practice, docs aren't clear on how to handle and most places ignore it")
    public void getConsoleText(StaplerRequest2 req, StaplerResponse2 rsp) throws IOException {
        run.checkPermission(Item.READ);
        String nodeId = req.getParameter("nodeId");

        rsp.setContentType("text/plain;charset=UTF-8");

        if (nodeId == null) {
            logger.error("'consoleText' was not passed 'nodeId'.");
            rsp.getWriter().write("Error getting console text\n");
            return;
        }
        logger.debug("getConsoleText was passed node id '{}'.", nodeId);
        // This will be a step, so return its log output.
        AnnotatedLargeText<? extends FlowNode> logText = getLogForNode(nodeId);
        if (logText != null) {
            logText.writeLogTo(0L, rsp.getOutputStream());
            return;
        }

        // Potentially a stage, so get the log text for the stage.
        boolean foundLogs = false;
        PipelineStepList steps = stepApi.getSteps(nodeId);
        for (PipelineStep step : steps.steps) {
            logText = getLogForNode(step.id);
            if (logText != null) {
                foundLogs = true;
                logText.writeLogTo(0L, rsp.getOutputStream());
            }
        }
        if (!foundLogs) {
            rsp.getWriter().write("No logs found\n");
        }
    }

    @GET
    @WebMethod(name = "consoleBuildOutput")
    @SuppressWarnings("ResultOfMethodCallIgnored")
    @SuppressFBWarnings(
            value = "RV_RETURN_VALUE_IGNORED",
            justification =
                    "Doesn't seem to matter in practice, docs aren't clear on how to handle and most places ignore it")
    public void getBuildConsole(StaplerRequest2 req, StaplerResponse2 rsp) throws IOException {
        run.checkPermission(Item.READ);
        run.getLogText().writeHtmlTo(0L, rsp.getWriter());
    }

    @GET
    @WebMethod(name = "exceptionText")
    public HttpResponse getExceptionText(StaplerRequest2 req, StaplerResponse2 rsp) throws IOException {
        run.checkPermission(Item.READ);
        String nodeId = req.getParameter("nodeId");
        if (nodeId == null) return HttpResponses.error(400, "missing ?nodeId");
        return HttpResponses.text(getNodeExceptionText(nodeId));
    }

    /*
     * The default behavior of this functions differs from 'getConsoleOutput' in that it will use LOG_THRESHOLD from the end of the string.
     * Note: if 'startByte' is negative and falls outside of the console text then we will start from byte 0.
     *
     * FIXME: This is not performant and needs to be re-written to not buffer in memory. Avoiding JSON for log text.
     *
     * Example:
     * {
     *   "startByte": 0,
     *   "endByte": 13,
     *   "text": "Hello, world!"
     * }
     */
    @GET
    @WebMethod(name = "consoleOutput")
    public HttpResponse getConsoleOutput(StaplerRequest2 req) throws IOException {
        run.checkPermission(Item.READ);
        String nodeId = req.getParameter("nodeId");
        if (nodeId == null) {
            logger.error("'consoleJson' was not passed 'nodeId'.");
            return HttpResponses.errorJSON("Error getting console json");
        }
        logger.debug("getConsoleOutput was passed node id '{}'.", nodeId);
        // This will be a step, so return it's log output.
        // startByte to start getting data from. If negative will startByte from end of string with
        // LOG_THRESHOLD.
        Long startByte = parseIntWithDefault(req.getParameter("startByte"), -LOG_THRESHOLD);
        JSONObject data = getConsoleOutputJson(nodeId, startByte);
        if (data == null) {
            return HttpResponses.errorJSON("Something went wrong - check Jenkins logs.");
        }
        return HttpResponses.okJSON(data);
    }

    protected JSONObject getConsoleOutputJson(String nodeId, Long requestStartByte) throws IOException {
        long startByte = 0L;
        long endByte = 0L;
        long textLength;
        String text = "";
        AnnotatedLargeText<? extends FlowNode> logText = null;
        boolean nodeIsActive = false;
        {
            FlowExecution execution = run.getExecution();
            if (execution != null) {
                logger.debug("getConsoleOutputJson found execution.");
                FlowNode node = execution.getNode(nodeId);
                if (node != null) {
                    // Look up active state before getting the logText.
                    nodeIsActive = node.isActive();
                    logText = PipelineNodeUtil.getLogText(node);
                }
            }
        }

        if (logText != null) {
            textLength = logText.length();
            // positive startByte
            if (requestStartByte > textLength) {
                // Avoid resource leak.
                logger.error("consoleJson - user requested startByte larger than console output.");
                return null;
            }
            // if startByte is negative make sure we don't try and get a byte before 0.
            if (requestStartByte < 0L) {
                logger.debug("consoleJson - requested negative startByte '{}'.", requestStartByte);
                startByte = textLength + requestStartByte;
                if (startByte < 0L) {
                    logger.debug(
                            "consoleJson - requested negative startByte '{}' out of bounds, starting at 0.",
                            requestStartByte);
                    startByte = 0L;
                }
            } else {
                startByte = requestStartByte;
            }
            logger.debug("Returning '{}' bytes from 'getConsoleOutput'.", textLength - startByte);
            text = PipelineNodeUtil.convertLogToString(logText, startByte);
            endByte = textLength;
        }
        JSONObject json = new JSONObject();
        json.element("text", text);
        json.element("startByte", startByte);
        json.element("endByte", endByte);
        json.element("nodeIsActive", nodeIsActive);
        return json;
    }

    private AnnotatedLargeText<? extends FlowNode> getLogForNode(String nodeId) throws IOException {
        FlowExecution execution = run.getExecution();
        if (execution != null) {
            logger.debug("getLogForNode found execution.");
            return PipelineNodeUtil.getLogText(execution.getNode(nodeId));
        }
        return null;
    }

    protected String getNodeExceptionText(String nodeId) throws IOException {
        FlowExecution execution = run.getExecution();
        if (execution != null) {
            logger.debug("getNodeException found execution.");
            return PipelineNodeUtil.getExceptionText(execution.getNode(nodeId));
        }
        return null;
    }

    private boolean isUnhandledException(String nodeId) throws IOException {
        FlowExecution execution = run.getExecution();
        if (execution != null) {
            return PipelineNodeUtil.isUnhandledException(execution.getNode(nodeId));
        }
        return false;
    }

    private static long parseIntWithDefault(String s, long defaultValue) {
        try {
            logger.debug("Parsing user provided value of '{}'", s);
            return Long.parseLong(s);
        } catch (NumberFormatException e) {
            logger.debug("Using default value of '{}'", defaultValue);
            return defaultValue;
        }
    }

    @SuppressWarnings("unused")
    public RunDetailsCard getRunDetailsCard() {

        List<RunDetailsItem> runDetailsItems = new ArrayList<>(SCMRunDetailsItems.get(run));

        if (!runDetailsItems.isEmpty()) {
            runDetailsItems.add(RunDetailsItem.SEPARATOR);
        }

        UpstreamCauseRunDetailsItem.get(run).ifPresent(runDetailsItems::add);
        UserIdCauseRunDetailsItem.get(run).ifPresent(runDetailsItems::add);

        runDetailsItems.addAll(TimingRunDetailsItems.get(run));

        ChangesRunDetailsItem.get(run).ifPresent(runDetailsItems::add);
        TestResultRunDetailsItem.get(run).ifPresent(runDetailsItems::add);
        ArtifactRunDetailsItem.get(run).ifPresent(runDetailsItems::add);

        return new RunDetailsCard(runDetailsItems);
    }

    public boolean isShowGraphOnBuildPage() {
        return PipelineGraphViewConfiguration.get().isShowGraphOnBuildPage();
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

    public WorkflowRun getRun() {
        return run;
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
    public HttpResponse doRerun() {
        run.checkPermission(Item.BUILD);

        if (!run.getParent().isBuildable()) {
            return HttpResponses.errorJSON(Messages.scheduled_failure());
        }
        ReplayAction replayAction = run.getAction(ReplayAction.class);
        Queue.Item item = replayAction.run2(replayAction.getOriginalScript(), replayAction.getOriginalLoadedScripts());

        if (item == null) {
            return HttpResponses.errorJSON(Messages.scheduled_failure());
        }

        JSONObject obj = new JSONObject();
        obj.put("message", Messages.scheduled_success());
        obj.put("queueId", item.getId());
        return HttpResponses.okJSON(obj);
    }

    @SuppressWarnings("unused")
    @GET
    @WebMethod(name = "nextBuild")
    public HttpResponse hasNextBuild(StaplerRequest2 req) {
        run.checkPermission(Item.READ);
        String queueId = req.getParameter("queueId");
        if (queueId == null || queueId.isBlank()) {
            return HttpResponses.errorJSON("No queueId provided");
        }
        long id = Long.parseLong(queueId);
        logger.debug("Searching for build with queueId: {}", id);
        WorkflowRun nextRun = findBuildByQueueId(id);
        if (nextRun == null) {
            return HttpResponses.okJSON();
        }

        JSONObject obj = new JSONObject();
        obj.put("nextBuildUrl", nextRun.getUrl() + URL_NAME + "/");
        return HttpResponses.okJSON(obj);
    }

    private @CheckForNull WorkflowRun findBuildByQueueId(long queueId) {
        for (WorkflowRun build : run.getParent().getBuilds()) {
            if (build.getNumber() <= this.run.getNumber()) {
                break;
            }
            if (build.getQueueId() == queueId) {
                return build;
            }
        }
        return null;
    }

    /**
     * Handles the cancel request.
     */
    @RequirePOST
    @JavaScriptMethod
    public HttpResponse doCancel() {
        run.checkPermission(getCancelPermission());
        if (run.isBuilding()) {
            run.doStop();
            return HttpResponses.okJSON();
        }
        String message =
                Result.ABORTED.equals(run.getResult()) ? Messages.run_alreadyCancelled() : Messages.run_isFinished();
        return HttpResponses.errorJSON(message);
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

    @GET
    @WebMethod(name = "tree")
    public void getTree(StaplerRequest2 req, StaplerResponse2 rsp) throws IOException, ServletException {
        run.checkPermission(Item.READ);

        PipelineGraph tree = graphApi.createTree();
        HttpResponse response = HttpResponses.okJSON(JSONObject.fromObject(tree, jsonConfig));

        rsp.setStatus(200);
        setCache(rsp, tree.complete);
        response.generateResponse(req, rsp, null);
    }

    // Icon related methods these may appear as unused but are used by /lib/hudson/buildCaption.jelly
    @SuppressWarnings("unused")
    public String getUrl() {
        return run.getUrl();
    }

    @SuppressWarnings("unused")
    public BallColor getIconColor() {
        return run.getIconColor();
    }

    @Override
    public String getIconClassName() {
        return "symbol-git-network-outline plugin-ionicons-api";
    }

    @Override
    public String getIconFileName() {
        return null;
    }
}
