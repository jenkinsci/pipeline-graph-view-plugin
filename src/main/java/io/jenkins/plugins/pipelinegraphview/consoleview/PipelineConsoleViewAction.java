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

  @GET
  @WebMethod(name = "consoleOutput")
  public HttpResponse getConsoleOutput(StaplerRequest req) throws IOException {
    String nodeId = req.getParameter("nodeId");
    if (nodeId != null) {
      logger.debug("getConsoleOutput was passed node id '" + nodeId + "'.");
      Writer stringWriter = new StringBuilderWriter();
      // ByteArrayOutputStream stream = new ByteArrayOutputStream();
      AnnotatedLargeText<? extends FlowNode> logText = getLogForNode(nodeId);
      HashMap<String, String> response = new HashMap<String, String>();
      if (logText != null) {
        long offset;
        if (logText.length() > LOG_THRESHOLD) {
          offset = logText.length() - LOG_THRESHOLD;
        } else {
          offset = 0;
        }
        long receivedBytes = logText.writeHtmlTo(offset, stringWriter);
        logger.debug("Received " + receivedBytes + " of console output.");
        String text = stringWriter.toString();
        if (offset > 0) {
          text =
              text
                  + "Output is truncated for performance, only showing the last 150KB of logs for this step...\n";
        }
        response.put("text", text);
      } else {
        response.put("text", "");
      }
      return HttpResponses.okJSON(JSONObject.fromObject(response));
    } else {
      logger.debug("getConsoleOutput was not passed nodeId.");
      return HttpResponses.errorJSON("Error getting console text");
    }
  }

  private AnnotatedLargeText<? extends FlowNode> getLogForNode(String nodeId) throws IOException {
    FlowExecution execution = target.getExecution();
    if (execution != null) {
      logger.debug("getConsoleOutput found execution.");
      FlowNode node = execution.getNode(nodeId);
      if (node != null) {
        logger.debug("getConsoleOutput found node.");
        LogAction log = node.getAction(LogAction.class);
        if (log != null) {
          return log.getLogText();
        }
      }
    }
    return null;
  }
}
