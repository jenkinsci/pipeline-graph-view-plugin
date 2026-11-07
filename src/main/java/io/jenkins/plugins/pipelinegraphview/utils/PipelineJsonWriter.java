package io.jenkins.plugins.pipelinegraphview.utils;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.io.OutputStream;
import java.util.Map;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

/**
 * Writes plugin DTOs to JSON via Jackson, wrapped in the Stapler {@code okJSON} envelope
 * ({@code {"status":"ok","data":...}}) that the frontend expects.
 *
 * <p>DTOs carry Jackson annotations to control the wire format — null values are omitted
 * (matching the historical bean-processor output) and fields are read regardless of visibility
 * so DTOs can keep package-private fields.
 */
public final class PipelineJsonWriter {

    private static final ObjectMapper MAPPER = JsonMapper.builder()
            .changeDefaultPropertyInclusion(inc -> inc.withValueInclusion(JsonInclude.Include.NON_NULL))
            .changeDefaultVisibility(v -> v.withFieldVisibility(JsonAutoDetect.Visibility.ANY))
            .build();

    private PipelineJsonWriter() {}

    public static void write(Object data, OutputStream out) {
        MAPPER.writeValue(out, Map.of("status", "ok", "data", data));
    }

    /**
     * Writes a run's graph or steps, adding what the current user can do with the inputs it's
     * waiting on. See {@link InputPermissions}.
     */
    public static void writeWithInputPermissions(Object data, WorkflowRun run, OutputStream out) {
        Map<String, InputPermissions> permissions = InputPermissions.forCurrentUser(run);
        if (permissions.isEmpty()) {
            write(data, out);
            return;
        }
        JsonNode json = MAPPER.valueToTree(data);
        InputPermissions.apply(json, permissions);
        write(json, out);
    }
}
