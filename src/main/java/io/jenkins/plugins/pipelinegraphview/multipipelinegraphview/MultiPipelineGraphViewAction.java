package io.jenkins.plugins.pipelinegraphview.multipipelinegraphview;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import hudson.model.Action;
import hudson.model.User;
import hudson.security.Permission;
import hudson.util.HttpResponses;
import hudson.util.RunList;
import io.jenkins.plugins.pipelinegraphview.PipelineGraphViewConfiguration;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineGraph;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineGraphApi;
import io.jenkins.plugins.pipelinegraphview.utils.UserPreferences;
import java.util.ArrayList;
import java.util.List;
import java.util.TimeZone;
import net.sf.json.JSONArray;
import net.sf.json.JSONObject;
import org.jenkins.ui.icon.IconSpec;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.kohsuke.stapler.HttpResponse;
import org.kohsuke.stapler.StaplerRequest;
import org.kohsuke.stapler.WebMethod;
import org.kohsuke.stapler.verb.GET;

public class MultiPipelineGraphViewAction implements Action, IconSpec {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
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
        return target.BUILD;
    }

    public Permission getConfigurePermission() {
        return target.CONFIGURE;
    }

    public boolean isShowGraphOnJobPage() {
        return PipelineGraphViewConfiguration.get().isShowGraphOnJobPage();
    }

    @GET
    @WebMethod(name = "tree")
    public HttpResponse getTree(StaplerRequest req) throws JsonProcessingException {
        String runId = req.getParameter("runId");
        WorkflowRun run = target.getBuildByNumber(Integer.parseInt(runId));
        PipelineGraphApi api = new PipelineGraphApi(run);
        JSONObject graph = createGraphJson(api.createTree());
        return HttpResponses.okJSON(graph);
    }

    protected JSONObject createGraphJson(PipelineGraph pipelineGraph) throws JsonProcessingException {
        String graph = OBJECT_MAPPER.writeValueAsString(pipelineGraph);
        return JSONObject.fromObject(graph);
    }

    @GET
    @WebMethod(name = "runs")
    public HttpResponse getRuns() throws JsonProcessingException {
        RunList<WorkflowRun> runs = target.getBuilds();
        List<PipelineRun> pipelineRuns = new ArrayList<>();
        for (WorkflowRun run : runs) {
            pipelineRuns.add(new PipelineRun(run));
            if (pipelineRuns.size() >= MaxNumberOfElements) break;
        }
        JSONArray graph = createJson(pipelineRuns);
        return HttpResponses.okJSON(graph);
    }

    protected JSONArray createJson(List<PipelineRun> pipelineRuns) throws JsonProcessingException {
        String graph = OBJECT_MAPPER.writeValueAsString(pipelineRuns);
        return JSONArray.fromObject(graph);
    }

    @GET
    @WebMethod(name = "userPreferences")
    public HttpResponse getUserPreferences() throws JsonProcessingException {
        User user = User.current();
        JSONObject preferencesJson = new JSONObject();
        if (user != null) {
            UserPreferences preferences = user.getProperty(UserPreferences.class);
            if (preferences != null) {
                preferencesJson.put("timezone", preferences.getTimezone());
            } else {
                preferencesJson.put("timezone", TimeZone.getDefault().getID());
            }
        } else {
            // Default tz for anon users
            preferencesJson.put("timezone", TimeZone.getDefault().getID());
        }
        return HttpResponses.okJSON(preferencesJson);
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
