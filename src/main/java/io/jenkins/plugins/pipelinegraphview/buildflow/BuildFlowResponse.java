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
    void writeTo(@NonNull StaplerResponse2 response) throws IOException {
        response.setStatus(200);
        response.setContentType("application/json;charset=UTF-8");
        if (!isAnyBuildOngoing) {
            response.setHeader("Cache-Control", "private, max-age=60");
        } else {
            response.setHeader("Cache-Control", "private, no-store");
        }
        PipelineJsonWriter.write(this, response.getOutputStream());
    }
}
