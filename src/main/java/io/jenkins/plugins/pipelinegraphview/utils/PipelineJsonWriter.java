package io.jenkins.plugins.pipelinegraphview.utils;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.io.OutputStream;
import java.util.Map;
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
}
