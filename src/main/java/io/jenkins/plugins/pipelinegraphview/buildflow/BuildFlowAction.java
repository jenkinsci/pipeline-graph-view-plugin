package io.jenkins.plugins.pipelinegraphview.buildflow;

import edu.umd.cs.findbugs.annotations.NonNull;
import hudson.model.Item;
import hudson.model.Run;
import jakarta.servlet.ServletException;
import java.io.IOException;
import jenkins.model.Tab;
import org.kohsuke.stapler.StaplerRequest2;
import org.kohsuke.stapler.StaplerResponse2;
import org.kohsuke.stapler.WebMethod;
import org.kohsuke.stapler.verb.GET;

/**
 * Tab on a {@link Run} build page that provides the Build Flow view.
 * Displays the full upstream/downstream build chain as a navigable DAG.
 * Only appears as a tab capsule when the build has upstream or downstream relationships.
 */
public class BuildFlowAction extends Tab {

    public static final String URL_NAME = "build-flow";

    private final Run<?, ?> run;

    public BuildFlowAction(@NonNull Run<?, ?> run) {
        super(run);
        this.run = run;
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
        return "symbol-git-network-outline plugin-ionicons-api";
    }

    public Run<?, ?> getRun() {
        return run;
    }

    public boolean shouldDisplayBuildFlow() {
        return BuildFlowGraph.hasUpstreamOrDownstream(run);
    }

    @GET
    @WebMethod(name = "api")
    public void getApi(StaplerRequest2 req, StaplerResponse2 rsp) throws IOException, ServletException {
        run.getParent().checkPermission(Item.READ);

        boolean showUpstream = !"false".equals(req.getParameter("showUpstream"));
        boolean showDownstream = !"false".equals(req.getParameter("showDownstream"));

        BuildFlowGraph graph = new BuildFlowGraph(run, showUpstream, showDownstream);
        BuildFlowResponse response = graph.build();
        response.writeTo(rsp);
    }
}
