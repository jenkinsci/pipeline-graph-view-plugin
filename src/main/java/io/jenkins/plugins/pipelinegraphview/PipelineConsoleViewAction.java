package io.jenkins.plugins.pipelinegraphview;

import org.jenkinsci.plugins.workflow.job.WorkflowRun;

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

public class PipelineConsoleViewAction extends AbstractPipelineViewAction {
    private static final Logger LOGGER = Logger.getLogger(PipelineConsoleViewAction.class.getName());
    
    public PipelineConsoleViewAction(WorkflowRun target) {
        super(target);
    }

    @Override
    public String getDisplayName() {
        LOGGER.log(Level.INFO, "PipelineConsoleViewAction getDisplayName called.");
        return "Pipeline Console";
    }

    @Override
    public String getUrlName() {
        LOGGER.log(Level.INFO, "PipelineConsoleViewAction getUrlName called.");
        return "pipeline-console";
    }

    @WebMethod(name = "consoleOutput")
    public void getConsoleOutput(StaplerRequest req, StaplerResponse rsp) throws IOException {
        LOGGER.log(Level.INFO, "PipelineConsoleViewAction getConsoleOutput called.");
        String nodeIds = req.getParameter("nodeIds");
        if (nodeIds != null) {
            LOGGER.log(Level.INFO, "PipelineConsoleViewAction getConsoleOutput passed nodeIds.");
            rsp.getWriter().append("{\"text\": \"Selected node: " + nodeIds + "\"}");
        } else {
            LOGGER.log(Level.INFO, "PipelineConsoleViewAction getConsoleOutput not passed nodeIds.");
            rsp.getWriter().append("{\"text\": \"Error getting console text\"}");
        }
        
    }
}
