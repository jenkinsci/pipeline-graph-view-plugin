package io.jenkins.plugins.pipelinegraphview.consoleview;


import io.jenkins.plugins.pipelinegraphview.utils.AbstractPipelineViewAction;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineStepApi;
import io.jenkins.plugins.pipelinegraphview.utils.FlowNodeWrapper;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineStepList;

import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.actions.LogAction;

import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.kohsuke.stapler.HttpResponse;
import hudson.util.HttpResponses;
import net.sf.json.JSONObject;
import org.kohsuke.stapler.WebMethod;
import org.kohsuke.stapler.verb.GET;
import org.kohsuke.stapler.interceptor.RequirePOST;
import org.kohsuke.stapler.StaplerRequest;
import org.kohsuke.stapler.StaplerResponse;
import java.io.IOException;

import org.jenkinsci.plugins.workflow.support.visualization.table.FlowGraphTable;
import org.jenkinsci.plugins.workflow.support.visualization.table.FlowGraphTable.Row;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.jenkinsci.plugins.workflow.flow.FlowExecution;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import java.io.ByteArrayOutputStream;

public class PipelineConsoleViewAction extends AbstractPipelineViewAction {
    private static final Logger LOGGER = Logger.getLogger(PipelineConsoleViewAction.class.getName());
    private final WorkflowRun target;
    private final PipelineStepApi stepApi;

    public PipelineConsoleViewAction(WorkflowRun target) {
        super(target);
        this.target = target;
        this.stepApi = new PipelineStepApi(target, null);
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
    // If the steps include the parent ID (or be indexed by it), then I can save a list of steps to the 
    // React component state. Then I can cross-reference this when adding the child nodes instead of
    // making a fetch call - which seems impossible to wait for the result of (maybe fetch is the wrong thing to use?)
    @WebMethod(name = "steps")
    public void getSteps(StaplerRequest req, StaplerResponse rsp) throws IOException {
        String nodeId = req.getParameter("nodeId");
        if (nodeId != null) {
            LOGGER.log(Level.FINE, "getSteps was passed nodeId '" + nodeId + "'.");
            ObjectMapper mapper = new ObjectMapper();
            PipelineStepList steps = stepApi.getSteps(nodeId);
            LOGGER.log(Level.FINE, "Steps: '" + mapper.writeValueAsString(steps) + "'.");
            rsp.getWriter().append(mapper.writeValueAsString(steps));
        } else {
            LOGGER.log(Level.FINE, "getSteps was not passed nodeId.");
            // Consider returning the full map in one go here - the frontend will need to be updated to handle this.
            rsp.getWriter().append("Error getting console text");
        }
    }

    @WebMethod(name = "consoleOutput")
    public void getConsoleOutput(StaplerRequest req, StaplerResponse rsp) throws IOException {
        String nodeId = req.getParameter("nodeId");
        if (nodeId != null) {
            LOGGER.log(Level.FINE, "getConsoleOutput was passed node id '" + nodeId + "'.");
            String nodeConsoleText = getLogForNode(nodeId);
            if (nodeConsoleText != null) {
                rsp.getWriter().append(nodeConsoleText);
            } else {
                rsp.getWriter().append("No console output for node: ").append(nodeId);
            }
        } else {
            LOGGER.log(Level.FINE, "getConsoleOutput was ot passed nodeId.");
            rsp.getWriter().append("Error getting console text");
        }
    }

    private String getLogForNode(String nodeId) throws IOException {
        FlowExecution execution = target.getExecution();
        if (execution != null) {
            LOGGER.log(Level.FINE, "getConsoleOutput found execution.");
            FlowNode node = execution.getNode(nodeId);
            if (node != null) {
                LOGGER.log(Level.FINE, "getConsoleOutput found node.");
                LogAction log = node.getAction(LogAction.class);
                if (log != null) {
                    ByteArrayOutputStream oututStream = new ByteArrayOutputStream();
                    Long receivedBytes = log.getLogText().writeLogTo(0, oututStream);
                    LOGGER.log(Level.FINE, "Received " + receivedBytes + " of console output.");
                    // Assuming logs are is UFT-8. This seems to be what LogStorage does.
                    return oututStream.toString("UTF-8").trim();
                }
            }
        }
        return null;
    }
}
