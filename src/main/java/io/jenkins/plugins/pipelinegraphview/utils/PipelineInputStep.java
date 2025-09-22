package io.jenkins.plugins.pipelinegraphview.utils;

import net.sf.json.JSONObject;
import net.sf.json.JsonConfig;
import net.sf.json.processors.JsonBeanProcessor;

public record PipelineInputStep(String message, String cancel, String id, String ok, boolean parameters) {
    public static class PipelineInputStepJsonProcessor implements JsonBeanProcessor {
        @Override
        public JSONObject processBean(Object bean, JsonConfig jsonConfig) {
            if (!(bean instanceof PipelineInputStep input)) {
                return null;
            }
            JSONObject json = new JSONObject();
            json.element("message", input.message());
            json.element("cancel", input.cancel());
            json.element("id", input.id());
            json.element("ok", input.ok());
            json.element("parameters", input.parameters());
            return json;
        }

        public static void configure(JsonConfig config) {
            config.registerJsonBeanProcessor(PipelineInputStep.class, new PipelineInputStepJsonProcessor());
        }
    }
}
