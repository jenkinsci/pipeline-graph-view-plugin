package io.jenkins.plugins.pipelinegraphview.buildflow;

import edu.umd.cs.findbugs.annotations.NonNull;
import hudson.model.Action;
import hudson.model.Item;
import hudson.model.Job;
import hudson.model.Run;
import jakarta.servlet.ServletException;
import java.io.IOException;
import org.kohsuke.stapler.StaplerRequest2;
import org.kohsuke.stapler.StaplerResponse2;
import org.kohsuke.stapler.WebMethod;
import org.kohsuke.stapler.verb.GET;

/**
 * Action on a {@link Job} that provides the Build Flow card on the job page.
 * Shows the upstream/downstream chain of the most recent build as an embedded card,
 * similar to how the Stages card appears on the job page.
 */
public class BuildFlowJobAction implements Action {

    public static final String URL_NAME = "build-flow";

    private final Job<?, ?> job;

    public BuildFlowJobAction(@NonNull Job<?, ?> job) {
        this.job = job;
    }

    @Override
    public String getDisplayName() {
        return "Build Flow";
    }

    @Override
    public String getUrlName() {
        return URL_NAME;
    }

    @Override
    public String getIconFileName() {
        return null;
    }

    public Job<?, ?> getJob() {
        return job;
    }

    /**
     * Returns the latest build for use in Jelly views.
     */
    public Run<?, ?> getLatestBuild() {
        return job.getLastBuild();
    }

    public boolean shouldDisplay() {
        Run<?, ?> latest = job.getLastBuild();
        return latest != null && BuildFlowGraph.hasUpstreamOrDownstream(latest);
    }

    @GET
    @WebMethod(name = "api")
    public void getApi(StaplerRequest2 req, StaplerResponse2 rsp) throws IOException, ServletException {
        job.checkPermission(Item.READ);

        Run<?, ?> latest = job.getLastBuild();
        if (latest == null) {
            new BuildFlowResponse(java.util.List.of(), java.util.List.of(), false, false).writeTo(rsp);
            return;
        }

        boolean showUpstream = !"false".equals(req.getParameter("showUpstream"));
        boolean showDownstream = !"false".equals(req.getParameter("showDownstream"));
        BuildFlowGraph graph = new BuildFlowGraph(latest, showUpstream, showDownstream);
        BuildFlowResponse response = graph.build();
        response.writeTo(rsp);
    }
}
