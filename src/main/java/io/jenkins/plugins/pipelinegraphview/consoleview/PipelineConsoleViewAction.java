package io.jenkins.plugins.pipelinegraphview.consoleview;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.jenkins.plugins.pipelinegraphview.utils.AbstractPipelineViewAction;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineStepApi;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineStepList;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import org.jenkinsci.plugins.workflow.actions.LogAction;
import org.jenkinsci.plugins.workflow.flow.FlowExecution;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.kohsuke.stapler.StaplerRequest;
import org.kohsuke.stapler.StaplerResponse;
import org.kohsuke.stapler.WebMethod;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class PipelineConsoleViewAction extends AbstractPipelineViewAction {
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

  // Consider making this return all steps (don't accept the node)
  // If the steps include the parent ID (or be indexed by it), then I can save a list of steps to
  // the
  // React component state. Then I can cross-reference this when adding the child nodes instead of
  // making a fetch call - which seems impossible to wait for the result of (maybe fetch is the
  // wrong thing to use?)
  @WebMethod(name = "steps")
  public void getSteps(StaplerRequest req, StaplerResponse rsp) throws IOException {
    String nodeId = req.getParameter("nodeId");
    if (nodeId != null) {
      logger.debug("getSteps was passed nodeId '" + nodeId + "'.");
      ObjectMapper mapper = new ObjectMapper();
      PipelineStepList steps = stepApi.getSteps(nodeId);
      String stepsJson = mapper.writeValueAsString(steps);
      if (logger.isDebugEnabled()) {
        logger.debug("Steps: '" + stepsJson + "'.");
      }
      rsp.getWriter().append(stepsJson);
    } else {
      logger.debug("getSteps was not passed nodeId.");
      // Consider returning the full map in one go here - the frontend will need to be updated to
      // handle this.
      rsp.getWriter().append("Error getting console text");
    }
  }

  @WebMethod(name = "consoleOutput")
  public void getConsoleOutput(StaplerRequest req, StaplerResponse rsp) throws IOException {
    String nodeId = req.getParameter("nodeId");
    if (nodeId != null) {
      logger.debug("getConsoleOutput was passed node id '" + nodeId + "'.");
      String nodeConsoleText = getLogForNode(nodeId);
      if (nodeConsoleText != null) {
        rsp.getWriter().append(nodeConsoleText);
      } else {
        rsp.getWriter().append("No console output for node: ").append(nodeId);
      }
    } else {
      logger.debug("getConsoleOutput was ot passed nodeId.");
      rsp.getWriter().append("Error getting console text");
    }
  }

  private String getLogForNode(String nodeId) throws IOException {
    FlowExecution execution = target.getExecution();
    if (execution != null) {
      logger.debug("getConsoleOutput found execution.");
      FlowNode node = execution.getNode(nodeId);
      if (node != null) {
        logger.debug("getConsoleOutput found node.");
        LogAction log = node.getAction(LogAction.class);
        if (log != null) {
          ByteArrayOutputStream oututStream = new ByteArrayOutputStream();
          Long receivedBytes = log.getLogText().writeLogTo(0, oututStream);
          logger.debug("Received " + receivedBytes + " of console output.");
          // Assuming logs are is UFT-8. This seems to be what LogStorage does.
          return oututStream.toString("UTF-8").trim();
        }
      }
    }
    return null;
  }
}
