package io.jenkins.plugins.pipelinegraphview.buildflow;

import edu.umd.cs.findbugs.annotations.NonNull;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineJsonWriter;
import java.io.IOException;
import java.util.List;
import org.kohsuke.stapler.StaplerResponse2;

/**
 * Response envelope for the build flow API endpoint.
 */
public record BuildFlowResponse(
        @NonNull List<BuildFlowNode> nodes,
        @NonNull List<BuildFlowEdge> edges,
        boolean isAnyBuildOngoing,
        boolean isTruncated) {

    /** Writes this response as JSON with appropriate cache headers. */
    void writeTo(@NonNull StaplerResponse2 rsp) throws IOException {
        rsp.setStatus(200);
        rsp.setContentType("application/json;charset=UTF-8");
        if (!isAnyBuildOngoing) {
            rsp.setHeader("Cache-Control", "private, max-age=60");
        } else {
            rsp.setHeader("Cache-Control", "private, no-store");
        }
        PipelineJsonWriter.write(this, rsp.getOutputStream());
    }
}
