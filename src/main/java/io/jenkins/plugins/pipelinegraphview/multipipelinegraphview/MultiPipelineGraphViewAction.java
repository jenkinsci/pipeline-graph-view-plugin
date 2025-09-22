package io.jenkins.plugins.pipelinegraphview.multipipelinegraphview;

import hudson.model.Action;
import hudson.model.Item;
import hudson.security.Permission;
import hudson.util.HttpResponses;
import hudson.util.RunList;
import io.jenkins.plugins.pipelinegraphview.PipelineGraphViewConfiguration;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import net.sf.json.JSONArray;
import net.sf.json.JsonConfig;
import org.jenkins.ui.icon.IconSpec;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.kohsuke.stapler.HttpResponse;
import org.kohsuke.stapler.StaplerRequest2;
import org.kohsuke.stapler.StaplerResponse2;
import org.kohsuke.stapler.WebMethod;
import org.kohsuke.stapler.verb.GET;

public class MultiPipelineGraphViewAction implements Action, IconSpec {
    private static final int MaxNumberOfElements = 10;

    private final WorkflowJob target;

    public MultiPipelineGraphViewAction(WorkflowJob target) {
        this.target = target;
    }

    public String getJobDisplayName() {
        return target.getDisplayName();
    }

    public boolean isBuildable() {
        return target.isBuildable();
    }

    public Permission getPermission() {
        return Item.BUILD;
    }

    public Permission getConfigurePermission() {
        return Item.CONFIGURE;
    }

    @SuppressWarnings("unused")
    public boolean isShowGraphOnJobPage() {
        return PipelineGraphViewConfiguration.get().isShowGraphOnJobPage();
    }

    @SuppressWarnings("unused")
    public boolean isShowStageNames() {
        return PipelineGraphViewConfiguration.get().isShowStageNames();
    }

    @SuppressWarnings("unused")
    public boolean isShowStageDurations() {
        return PipelineGraphViewConfiguration.get().isShowStageDurations();
    }

    private static final JsonConfig jsonConfig = new JsonConfig();

    static {
        PipelineRun.PipelineRunJsonProcessor.configure(jsonConfig);
    }

    @GET
    @WebMethod(name = "runs")
    public void getRuns(StaplerRequest2 req, StaplerResponse2 rsp) throws ServletException, IOException {
        target.checkPermission(Item.READ);
        RunList<WorkflowRun> runs = target.getBuilds();
        List<PipelineRun> pipelineRuns = new ArrayList<>();

        EtagBuilder etagBuilder = new EtagBuilder();
        for (WorkflowRun run : runs) {
            PipelineRun r = new PipelineRun(run);
            etagBuilder.add(r);
            pipelineRuns.add(r);
            if (pipelineRuns.size() >= MaxNumberOfElements) {
                break;
            }
        }

        String etag = etagBuilder.getEtag();
        String header = req.getHeader("If-None-Match");
        if (etag != null && etag.equals(header)) {
            rsp.setStatus(HttpServletResponse.SC_NOT_MODIFIED);
            return;
        }

        HttpResponse response = HttpResponses.okJSON(JSONArray.fromObject(pipelineRuns, jsonConfig));

        if (etag != null) {
            rsp.setHeader("ETag", etag);
        }
        rsp.setHeader("Cache-Control", "no-cache");
        rsp.setStatus(200);
        response.generateResponse(req, rsp, null);
    }

    public String getJobUrl() {
        return target.getUrl();
    }

    @Override
    public String getIconFileName() {
        return null;
    }

    @Override
    public String getDisplayName() {
        return "Stages";
    }

    @Override
    public String getUrlName() {
        return "multi-pipeline-graph";
    }

    @Override
    public String getIconClassName() {
        return "symbol-layers-outline plugin-ionicons-api";
    }
}
