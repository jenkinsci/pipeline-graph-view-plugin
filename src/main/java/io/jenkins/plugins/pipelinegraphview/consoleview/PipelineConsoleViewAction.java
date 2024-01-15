package io.jenkins.plugins.pipelinegraphview.consoleview;

import com.fasterxml.jackson.databind.ObjectMapper;
import hudson.console.AnnotatedLargeText;
import hudson.util.HttpResponses;
import io.jenkins.plugins.pipelinegraphview.utils.AbstractPipelineViewAction;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineNodeUtil;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineStep;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineStepApi;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineStepList;
import java.io.IOException;
import java.io.Writer;
import java.util.HashMap;
import net.sf.json.JSONObject;
import org.jenkinsci.plugins.workflow.flow.FlowExecution;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.kohsuke.stapler.HttpResponse;
import org.kohsuke.stapler.StaplerRequest;
import org.kohsuke.stapler.StaplerResponse;
import org.kohsuke.stapler.WebMethod;
import org.kohsuke.stapler.framework.io.CharSpool;
import org.kohsuke.stapler.framework.io.LineEndNormalizingWriter;
import org.kohsuke.stapler.verb.GET;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class PipelineConsoleViewAction extends AbstractPipelineViewAction {
    public static final long LOG_THRESHOLD = 150 * 1024; // 150KB

    private static final Logger logger = LoggerFactory.getLogger(PipelineConsoleViewAction.class);
    private final WorkflowRun target;
    private final PipelineStepApi stepApi;

    private static final ObjectMapper MAPPER = new ObjectMapper();

    public PipelineConsoleViewAction(WorkflowRun target) {
        super(target);
        this.target = target;
        this.stepApi = new PipelineStepApi(target);
    }

    @Override
    public String getDisplayName() {
        return "Pipeline Console";
    }

    @Override
    public String getUrlName() {
        return "pipeline-console";
    }

    @Override
    public String getIconClassName() {
        return "symbol-terminal-outline plugin-ionicons-api";
    }

    // Legacy - leave in case we want to update a sub section of steps (e.g. if a stage is still
    // running).
    @GET
    @WebMethod(name = "steps")
    public HttpResponse getSteps(StaplerRequest req) throws IOException {
        String nodeId = req.getParameter("nodeId");
        if (nodeId != null) {
            return HttpResponses.okJSON(getSteps(nodeId));
        } else {
            return HttpResponses.errorJSON("Error getting console text");
        }
    }

    private JSONObject getSteps(String nodeId) throws IOException {
        logger.debug("getSteps was passed nodeId '" + nodeId + "'.");
        PipelineStepList steps = stepApi.getSteps(nodeId);
        String stepsJson = MAPPER.writeValueAsString(steps);
        if (logger.isDebugEnabled()) {
            logger.debug("Steps: '" + stepsJson + "'.");
        }
        return JSONObject.fromObject(stepsJson);
    }

    // Return all steps to:
    // - reduce number of API calls
    // - remove dependency of getting list of stages in frontend.
    @GET
    @WebMethod(name = "allSteps")
    public HttpResponse getAllSteps(StaplerRequest req) throws IOException {
        return HttpResponses.okJSON(getAllSteps());
    }

    // Private method for testing.
    protected JSONObject getAllSteps() throws IOException {
        PipelineStepList steps = stepApi.getAllSteps();
        String stepsJson = MAPPER.writeValueAsString(steps);
        if (logger.isDebugEnabled()) {
            logger.debug("Steps: '" + stepsJson + "'.");
        }
        return JSONObject.fromObject(stepsJson);
    }

    @WebMethod(name = "log")
    public HttpResponse getConsoleText(StaplerRequest req, StaplerResponse rsp) throws IOException {
        String nodeId = req.getParameter("nodeId");
        if (nodeId == null) {
            logger.error("'consoleText' was not passed 'nodeId'.");
            return HttpResponses.errorJSON("Error getting console text");
        }
        logger.debug("getConsoleText was passed node id '" + nodeId + "'.");
        // This will be a step, so return its log output.
        AnnotatedLargeText<? extends FlowNode> logText = getLogForNode(nodeId);

        long count = 0;
        PipelineStepList steps = stepApi.getSteps(nodeId);
        try (CharSpool spool = new CharSpool()) {

            for (PipelineStep step : steps.getSteps()) {
                AnnotatedLargeText<? extends FlowNode> logForNode = getLogForNode(String.valueOf(step.getId()));
                if (logForNode != null) {
                    count += logForNode.writeLogTo(0, spool);
                }
            }

            Writer writer;
            if (count > 0) {
                writer = (count > 4096) ? rsp.getCompressedWriter(req) : rsp.getWriter();
                spool.flush();
                spool.writeTo(new LineEndNormalizingWriter(writer));
                writer.close();
            }
        }

        return HttpResponses.text(PipelineNodeUtil.convertLogToString(logText));
    }

    /*
     * The default behavior of this functions differs from 'getConsoleOutput' in that it will use LOG_THRESHOLD from the end of the string.
     * Note: if 'startByte' is negative and falls outside of the console text then we will start from byte 0.
     * Example:
     * {
     *   "startByte": 0,
     *   "endByte": 13,
     *   "text": "Hello, world!"
     * }
     */
    @GET
    @WebMethod(name = "consoleOutput")
    public HttpResponse getConsoleOutput(StaplerRequest req) throws IOException {
        String nodeId = req.getParameter("nodeId");
        if (nodeId == null) {
            logger.error("'consoleJson' was not passed 'nodeId'.");
            return HttpResponses.errorJSON("Error getting console json");
        }
        logger.debug("getConsoleOutput was passed node id '" + nodeId + "'.");
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
        Long startByte = 0L;
        long endByte = 0L;
        long textLength;
        String text = "";
        AnnotatedLargeText<? extends FlowNode> logText = getLogForNode(nodeId);

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
                logger.debug("consoleJson - requested negative startByte '" + requestStartByte + "'.");
                startByte = textLength + requestStartByte;
                if (startByte < 0L) {
                    logger.debug("consoleJson - requested negative startByte '"
                            + requestStartByte
                            + "' out of bounds, starting at 0.");
                    startByte = 0L;
                }
            } else {
                startByte = requestStartByte;
            }
            logger.debug("Returning '" + (textLength - startByte) + "' bytes from 'getConsoleOutput'.");
            text = PipelineNodeUtil.convertLogToString(logText, startByte);
            endByte = textLength;
        }
        // If has an exception, return the exception text (inc. stacktrace).
        if (isUnhandledException(nodeId)) {
            // Set logText to exception text. This is a little hacky - maybe it would be better update the
            // frontend to handle steps and exceptions differently?
            String nodeExceptionText = getNodeExceptionText(nodeId);
            if (nodeExceptionText != null) {
                text += nodeExceptionText;
            }
            endByte += text.length();
        }
        HashMap<String, Object> response = new HashMap<>();
        response.put("text", text);
        response.put("startByte", startByte);
        response.put("endByte", endByte);
        return JSONObject.fromObject(response);
    }

    private AnnotatedLargeText<? extends FlowNode> getLogForNode(String nodeId) throws IOException {
        FlowExecution execution = target.getExecution();
        if (execution != null) {
            logger.debug("getLogForNode found execution.");
            return PipelineNodeUtil.getLogText(execution.getNode(nodeId));
        }
        return null;
    }

    private String getNodeExceptionText(String nodeId) throws IOException {
        FlowExecution execution = target.getExecution();
        if (execution != null) {
            logger.debug("getNodeException found execution.");
            return PipelineNodeUtil.getExceptionText(execution.getNode(nodeId));
        }
        return null;
    }

    private boolean isUnhandledException(String nodeId) throws IOException {
        FlowExecution execution = target.getExecution();
        if (execution != null) {
            return PipelineNodeUtil.isUnhandledException(execution.getNode(nodeId));
        }
        return false;
    }

    private static long parseIntWithDefault(String s, long defaultValue) {
        try {
            logger.debug("Parsing user provided value of '" + s + "'");
            return Long.parseLong(s);
        } catch (NumberFormatException e) {
            logger.debug("Using default value of '" + defaultValue + "'");
            return defaultValue;
        }
    }
}
