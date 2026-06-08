package io.jenkins.plugins.pipelinegraphview.buildflow;

import edu.umd.cs.findbugs.annotations.NonNull;
import hudson.model.Action;
import hudson.model.Item;
import hudson.model.Run;
import jakarta.servlet.ServletException;
import java.io.IOException;
import org.kohsuke.stapler.StaplerRequest2;
import org.kohsuke.stapler.StaplerResponse2;
import org.kohsuke.stapler.WebMethod;
import org.kohsuke.stapler.verb.GET;

/**
 * Invisible action on a {@link Run} that provides the Build Flow API endpoint.
 * The Build Flow UI is integrated into the Stages tab via the view dropdown.
 */
public class BuildFlowAction implements Action {

    public static final String URL_NAME = "build-flow";

    private final Run<?, ?> run;

    public BuildFlowAction(@NonNull Run<?, ?> run) {
        this.run = run;
    }

    @Override
    public String getDisplayName() {
        return null;
    }

    @Override
    public String getUrlName() {
        return URL_NAME;
    }

    @Override
    public String getIconFileName() {
        return null;
    }

    public Run<?, ?> getRun() {
        return run;
    }

    public boolean shouldDisplayBuildFlow() {
        return BuildFlowGraph.hasUpstreamOrDownstream(run);
    }

    @GET
    @WebMethod(name = "api")
    public void getApi(StaplerRequest2 request, StaplerResponse2 response) throws IOException, ServletException {
        run.getParent().checkPermission(Item.READ);

        boolean showUpstream = !"false".equals(request.getParameter("showUpstream"));
        boolean showDownstream = !"false".equals(request.getParameter("showDownstream"));

        BuildFlowGraph graph = new BuildFlowGraph(run, showUpstream, showDownstream);
        BuildFlowResponse buildFlowResponse = graph.build();
        buildFlowResponse.writeTo(response);
    }
}
