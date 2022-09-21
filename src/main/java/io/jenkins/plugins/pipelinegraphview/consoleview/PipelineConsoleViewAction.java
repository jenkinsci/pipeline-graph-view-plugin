package io.jenkins.plugins.pipelinegraphview.consoleview;

import com.fasterxml.jackson.databind.ObjectMapper;
import hudson.console.AnnotatedLargeText;
import io.jenkins.plugins.pipelinegraphview.utils.AbstractPipelineViewAction;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineStepApi;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineStepList;
import java.io.IOException;
import java.io.Writer;
import org.jenkinsci.plugins.workflow.actions.LogAction;
import org.jenkinsci.plugins.workflow.flow.FlowExecution;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.kohsuke.stapler.StaplerRequest;
import org.kohsuke.stapler.StaplerResponse;
import org.kohsuke.stapler.WebMethod;
import org.kohsuke.stapler.framework.io.CharSpool;
import org.kohsuke.stapler.framework.io.LineEndNormalizingWriter;
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
      CharSpool spool = new CharSpool();
      AnnotatedLargeText<? extends FlowNode> logText = getLogForNode(nodeId);

      if (logText != null) {
        long offset;
        if (logText.length() > LOG_THRESHOLD) {
          offset = logText.length() - LOG_THRESHOLD;
        } else {
          offset = 0;
        }

        long receivedBytes = logText.writeLogTo(offset, spool);
        logger.debug("Received " + receivedBytes + " of console output.");

        logText.length();
        Writer writer = rsp.getWriter();

        if (offset > 0) {
          writer
              .append(
                  "Output is truncated for performance, only showing the last 150KB of logs for this step...")
              .append("\n");
        }

        spool.writeTo(new LineEndNormalizingWriter(writer));
      } else {
        rsp.getWriter().append("No console output for node: ").append(nodeId);
      }
    } else {
      logger.debug("getConsoleOutput was not passed nodeId.");
      rsp.getWriter().append("Error getting console text");
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
