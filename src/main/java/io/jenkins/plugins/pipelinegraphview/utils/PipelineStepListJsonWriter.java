package io.jenkins.plugins.pipelinegraphview.utils;

import java.io.OutputStream;
import tools.jackson.core.JsonGenerator;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.SerializationContext;
import tools.jackson.databind.ValueSerializer;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.module.SimpleModule;

/**
 * Serialises {@link PipelineStepList} to JSON via Jackson. The wire format matches
 * {@link PipelineStepList.PipelineStepListJsonProcessor} exactly — notably, fields whose value
 * is {@code null} are omitted entirely rather than written as {@code null}.
 */
public final class PipelineStepListJsonWriter {

    private static final ObjectMapper MAPPER = buildMapper();

    private PipelineStepListJsonWriter() {}

    public static void write(PipelineStepList list, OutputStream out) {
        MAPPER.writeValue(out, list);
    }

    private static ObjectMapper buildMapper() {
        SimpleModule module = new SimpleModule("PipelineStepList");
        module.addSerializer(PipelineStepList.class, new StepListSerializer());
        module.addSerializer(PipelineStep.class, new StepSerializer());
        module.addSerializer(PipelineInputStep.class, new InputStepSerializer());
        module.addSerializer(PipelineState.class, new StateSerializer());
        return JsonMapper.builder().addModule(module).build();
    }

    private static final class StepListSerializer extends ValueSerializer<PipelineStepList> {
        @Override
        public void serialize(PipelineStepList list, JsonGenerator g, SerializationContext ctx) {
            g.writeStartObject();
            g.writeArrayPropertyStart("steps");
            for (PipelineStep step : list.steps) {
                ctx.writeValue(g, step);
            }
            g.writeEndArray();
            g.writeBooleanProperty("runIsComplete", list.runIsComplete);
            g.writeEndObject();
        }
    }

    private static final class StepSerializer extends ValueSerializer<PipelineStep> {
        @Override
        public void serialize(PipelineStep step, JsonGenerator g, SerializationContext ctx) {
            g.writeStartObject();
            g.writeStringProperty("id", step.id);
            g.writeStringProperty("name", step.name);
            g.writeName("state");
            ctx.writeValue(g, step.state);
            g.writeStringProperty("type", step.type);
            g.writeStringProperty("title", step.title);
            g.writeNumberProperty("pauseDurationMillis", step.timingInfo.getPauseDurationMillis());
            g.writeNumberProperty("startTimeMillis", step.getStartTimeMillis());
            Long total = step.getTotalDurationMillis();
            if (total != null) {
                g.writeNumberProperty("totalDurationMillis", total.longValue());
            }
            g.writeStringProperty("stageId", step.stageId);
            if (step.inputStep != null) {
                g.writeName("inputStep");
                ctx.writeValue(g, step.inputStep);
            }
            g.writePOJOProperty("flags", step.getFlags());
            g.writeEndObject();
        }
    }

    private static final class InputStepSerializer extends ValueSerializer<PipelineInputStep> {
        @Override
        public void serialize(PipelineInputStep input, JsonGenerator g, SerializationContext ctx) {
            g.writeStartObject();
            g.writeStringProperty("message", input.message());
            g.writeStringProperty("cancel", input.cancel());
            g.writeStringProperty("id", input.id());
            g.writeStringProperty("ok", input.ok());
            g.writeBooleanProperty("parameters", input.parameters());
            g.writeEndObject();
        }
    }

    private static final class StateSerializer extends ValueSerializer<PipelineState> {
        @Override
        public void serialize(PipelineState state, JsonGenerator g, SerializationContext ctx) {
            g.writeString(state.toString());
        }
    }
}
