package io.jenkins.plugins.pipelinegraphview.utils;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.io.OutputStream;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

/**
 * Serialises {@link PipelineStepList} to JSON via Jackson. The DTO classes carry Jackson
 * annotations so the wire format matches {@link PipelineStepList.PipelineStepListJsonProcessor}
 * used by the net.sf.json path — notably, fields whose value is {@code null} are omitted rather
 * than written as {@code null}.
 */
public final class PipelineStepListJsonWriter {

    private static final ObjectMapper MAPPER = JsonMapper.builder()
            .changeDefaultPropertyInclusion(inc -> inc.withValueInclusion(JsonInclude.Include.NON_NULL))
            .changeDefaultVisibility(v -> v.withFieldVisibility(JsonAutoDetect.Visibility.ANY))
            .build();

    private PipelineStepListJsonWriter() {}

    public static void write(PipelineStepList list, OutputStream out) {
        MAPPER.writeValue(out, list);
    }
}
