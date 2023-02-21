package io.jenkins.plugins.pipelinegraphview.consoleview;

import com.fasterxml.jackson.databind.ObjectMapper;
import hudson.console.AnnotatedLargeText;
import hudson.util.HttpResponses;
import io.jenkins.plugins.pipelinegraphview.utils.AbstractPipelineViewAction;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineStepApi;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineStepList;
import java.io.IOException;
import java.io.Writer;
import java.util.HashMap;
import net.sf.json.JSONObject;
import org.apache.commons.io.output.StringBuilderWriter;
import org.jenkinsci.plugins.workflow.actions.ErrorAction;
import org.jenkinsci.plugins.workflow.actions.LogAction;
import org.jenkinsci.plugins.workflow.flow.FlowExecution;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.kohsuke.stapler.HttpResponse;
import org.kohsuke.stapler.StaplerRequest;
import org.kohsuke.stapler.WebMethod;
import org.kohsuke.stapler.verb.GET;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Arrays;
import java.util.stream.Collectors;

public class PipelineConsoleViewAction extends AbstractPipelineViewAction {
  public static final long LOG_THRESHOLD = 150 * 1024; // 150KB

  private static final Logger logger = LoggerFactory.getLogger(PipelineConsoleViewAction.class);
  private final WorkflowRun target;
  private final PipelineStepApi stepApi;

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
      logger.debug("getSteps was passed nodeId '" + nodeId + "'.");
      ObjectMapper mapper = new ObjectMapper();
      PipelineStepList steps = stepApi.getSteps(nodeId);
      String stepsJson = mapper.writeValueAsString(steps);
      if (logger.isDebugEnabled()) {
        logger.debug("Steps: '" + stepsJson + "'.");
      }
      return HttpResponses.okJSON(JSONObject.fromObject(stepsJson));
    } else {
      return HttpResponses.errorJSON("Error getting console text");
    }
  }

  // Return all steps to:
  // - reduce number of API calls
  // - remove dependency of getting list of stages in frontend.
  @GET
  @WebMethod(name = "allSteps")
  public HttpResponse getAllSteps(StaplerRequest req) throws IOException {
    ObjectMapper mapper = new ObjectMapper();
    PipelineStepList steps = stepApi.getAllSteps();
    String stepsJson = mapper.writeValueAsString(steps);
    if (logger.isDebugEnabled()) {
      logger.debug("Steps: '" + stepsJson + "'.");
    }
    return HttpResponses.okJSON(JSONObject.fromObject(stepsJson));
  }

  /* Get pre-parsed console output in json format.
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
  public HttpResponse getConsolOutput(StaplerRequest req) throws IOException {
    String nodeId = req.getParameter("nodeId");
    if (nodeId == null) {
      logger.error("'consoleJson' was not passed 'nodeId'.");
      return HttpResponses.errorJSON("Error getting console json");
    }
    // startByte to start getting data from. If negative will startByte from end of string with
    // LOG_THRESHOLD.
    Long startByte = parseIntWithDefault(req.getParameter("startByte"), -LOG_THRESHOLD);
    logger.debug("getConsoleOutput was passed node id '" + nodeId + "'.");
    Writer stringWriter = new StringBuilderWriter();
    AnnotatedLargeText<? extends FlowNode> logText = getLogForNode(nodeId);
    HashMap<String, Object> response = new HashMap<String, Object>();
    long endByte = 0L;
    long textLength = 0L;
    String text = "";

    if (logText != null) {
      textLength = logText.length();
      // postitive startByte
      if (startByte > textLength) {
        // Avoid resource leak.
        stringWriter.close();
        logger.error("consoleJson - user requested startByte larger than console output.");
        return HttpResponses.errorJSON("startByte too large.");
      }
      // if startByte is negative make sure we don't try and get a byte before 0.
      if (startByte < 0) {
        logger.info(
            "consoleJson - requested negative startByte '" + Long.toString(startByte) + "'.");
        startByte = textLength + startByte;
        if (startByte < 0) {
          logger.info(
              "consoleJson - requested negative startByte '"
                  + Long.toString(startByte)
                  + "' out of bounds, setting to 0.");
          startByte = 0L;
        }
      }
      // NOTE: This returns the total length of the console log, not the received bytes.
      endByte = logText.writeHtmlTo(startByte, stringWriter);
      text = stringWriter.toString();
      logger.info(
          "Returning '"
              + Long.toString(textLength - startByte)
              + "' bytes from 'getConsolOutput'.");
    } else {
      // If there is no text then set set startByte to 0 - as we have read from the start, there is just nothing there.
      startByte = 0L;
    }
    // Append any exception text to the end of the log.
    String exceptionText = getNodeExceptionText(nodeId);
    if (exceptionText != null) {
      text += exceptionText;
    }
    response.put("text", text);
    response.put("startByte", startByte);
    response.put("endByte", endByte);
    return HttpResponses.okJSON(JSONObject.fromObject(response));
  }

  private AnnotatedLargeText<? extends FlowNode> getLogForNode(String nodeId) throws IOException {
    FlowExecution execution = target.getExecution();
    if (execution != null) {
      logger.debug("getLogForNode found execution.");
      FlowNode node = execution.getNode(nodeId);
      if (node != null) {
        logger.debug("getLogForNode found node.");
        LogAction log = node.getAction(LogAction.class);
        if (log != null) {
          return log.getLogText();
        }
      }
    }
    return null;
  }

  private String getNodeExceptionText(String nodeId) throws IOException {
    FlowExecution execution = target.getExecution();
    if (execution != null) {
      logger.debug("getNodeException found execution.");
      FlowNode node = execution.getNode(nodeId);
      if (node != null) {
        logger.debug("getNodeException found node.");
        String log = null;
        ErrorAction error = node.getAction(ErrorAction.class);
        if (error != null) {
          Throwable exception = error.getError();
          log = exception.getMessage() + "\n\t";
          log += Arrays.stream(exception.getStackTrace())
            .map(s->s.toString())
            .collect(Collectors.joining("\n\t"));
        }
        return log;
      }
    }
    return null;
  }

  private static long parseIntWithDefault(String s, long default_value) {
    try {
      logger.info("Parsing user provided value of '" + s + "'");
      return Long.parseLong(s);
    } catch (NumberFormatException e) {
      logger.info("Using default value of '" + default_value + "'");
      return default_value;
    }
  }
}
