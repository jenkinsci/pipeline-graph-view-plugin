package io.jenkins.plugins.pipelinegraphview.utils;

import java.util.List;
import net.sf.json.JSONObject;
import net.sf.json.JsonConfig;
import net.sf.json.processors.JsonBeanProcessor;

public class PipelineGraph {

    final List<PipelineStage> stages;
    private final boolean complete;

    public PipelineGraph(List<PipelineStage> stages, boolean complete) {
        this.stages = stages;
        this.complete = complete;
    }

    public static class PipelineGraphJsonProcessor implements JsonBeanProcessor {
        public static void configure(JsonConfig config) {
            config.registerJsonBeanProcessor(PipelineGraph.class, new PipelineGraphJsonProcessor());
            PipelineStage.PipelineStageJsonProcessor.configure(config);
        }

        @Override
        public JSONObject processBean(Object bean, JsonConfig jsonConfig) {
            if (!(bean instanceof PipelineGraph graph)) {
                return null;
            }
            JSONObject json = new JSONObject();
            json.element("complete", graph.complete);
            json.element("stages", graph.stages, jsonConfig);
            return json;
        }
    }
}
