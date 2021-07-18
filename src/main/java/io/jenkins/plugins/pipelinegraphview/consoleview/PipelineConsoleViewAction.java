package io.jenkins.plugins.pipelinegraphview.consoleview;


import io.jenkins.plugins.pipelinegraphview.utils.AbstractPipelineViewAction;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineStepApi;

import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.actions.LogAction;

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
    public PipelineConsoleViewAction(WorkflowRun target) {
        super(target);
        this.target = target;
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
        LOGGER.log(Level.FINE, "PipelineConsoleViewAction getSteps called.");
        String nodeId = req.getParameter("nodeId");
        if (nodeId != null) {
            LOGGER.log(Level.FINE, "PipelineConsoleViewAction getSteps passed nodeId '" + nodeId + "'.");
            PipelineStepApi stepApi = new PipelineStepApi(target, nodeId);
            ObjectMapper mapper = new ObjectMapper();
            LOGGER.log(Level.FINE, "Steps: '" + mapper.writeValueAsString(stepApi.getSteps()) + "'.");
            rsp.getWriter().append(mapper.writeValueAsString(stepApi.getSteps()));
        } else {
            LOGGER.log(Level.FINE, "PipelineConsoleViewAction getSteps not passed nodeId.");
            rsp.getWriter().append("Error getting console text");
        }
    }

    @WebMethod(name = "consoleOutput")
    public void getConsoleOutput(StaplerRequest req, StaplerResponse rsp) throws IOException {
        LOGGER.log(Level.FINE, "PipelineConsoleViewAction getConsoleOutput called.");
        String nodeId = req.getParameter("nodeId");
        if (nodeId != null) {
            LOGGER.log(Level.FINE, "PipelineConsoleViewAction getConsoleOutput passed nodeId.");
            String nodeConsoleText = getLogForNode(nodeId);
            if (nodeConsoleText != null) {
                rsp.getWriter().append(nodeConsoleText);
            } else {
                rsp.getWriter().append("No console output for node: ").append(nodeId);
            }
        } else {
            LOGGER.log(Level.FINE, "PipelineConsoleViewAction getConsoleOutput not passed nodeId.");
            rsp.getWriter().append("Error getting console text");
        }
    }

    private String getLogForNode(String nodeId) throws IOException {
        FlowExecution execution = target.getExecution();
        if (execution != null) {
            LOGGER.log(Level.FINE, "PipelineConsoleViewAction getConsoleOutput found execution.");
            FlowNode node = execution.getNode(nodeId);
            if (node != null) {
                LOGGER.log(Level.FINE, "PipelineConsoleViewAction getConsoleOutput found node.");
                LogAction log = node.getAction(LogAction.class);
                if (log != null) {
                    ByteArrayOutputStream oututStream = new ByteArrayOutputStream();
                    log.getLogText().writeLogTo(0, oututStream);
                    String consoleText = oututStream.toString().trim();
                    int maxLength = 120;
                    if (consoleText.length() > maxLength) {
                        LOGGER.log(
                            Level.FINE,
                            "PipelineConsoleViewAction found log text '" + consoleText.substring(0, maxLength) + "...'."
                        );
                    } else {
                        LOGGER.log(
                            Level.FINE,
                            "PipelineConsoleViewAction found log text '" + consoleText + "'."
                        );
                    }
                    return consoleText;
                }
            }
        }
        return null;
    }
}
