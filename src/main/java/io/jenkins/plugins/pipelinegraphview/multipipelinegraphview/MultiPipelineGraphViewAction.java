package io.jenkins.plugins.pipelinegraphview.multipipelinegraphview;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import hudson.model.Action;
import hudson.model.Item;
import hudson.security.Permission;
import hudson.util.HttpResponses;
import hudson.util.RunList;
import io.jenkins.plugins.pipelinegraphview.PipelineGraphViewConfiguration;
import java.util.ArrayList;
import java.util.List;
import net.sf.json.JSONArray;
import org.jenkins.ui.icon.IconSpec;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.kohsuke.stapler.HttpResponse;
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
