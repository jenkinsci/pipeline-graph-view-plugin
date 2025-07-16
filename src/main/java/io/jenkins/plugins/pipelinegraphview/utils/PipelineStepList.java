package io.jenkins.plugins.pipelinegraphview.utils;

import java.util.ArrayList;
import java.util.List;
import net.sf.json.JSONObject;
import net.sf.json.JsonConfig;
import net.sf.json.processors.JsonBeanProcessor;

public class PipelineStepList {

    public final List<PipelineStep> steps;

    public PipelineStepList() {
        this.steps = new ArrayList<>();
    }

    public PipelineStepList(List<PipelineStep> steps) {
        this.steps = steps;
    }

    /* Sorts the list of PipelineSteps by stageId and Id. */
    public void sort() {
        this.steps.sort((lhs, rhs) -> {
            if (!lhs.stageId.equals(rhs.stageId)) {
                return FlowNodeWrapper.compareIds(lhs.stageId, rhs.stageId);
            }
            return FlowNodeWrapper.compareIds(lhs.id, rhs.id);
        });
    }

    public void addAll(List<PipelineStep> steps) {
        this.steps.addAll(steps);
    }

    public static class PipelineStepListJsonProcessor implements JsonBeanProcessor {

        public static void configure(JsonConfig config) {
            config.registerJsonBeanProcessor(PipelineStepList.class, new PipelineStepListJsonProcessor());
            PipelineStep.PipelineStepJsonProcessor.configure(config);
        }

        @Override
        public JSONObject processBean(Object bean, JsonConfig jsonConfig) {
            if (!(bean instanceof PipelineStepList stepList)) {
                return null;
            }
            JSONObject json = new JSONObject();
            json.element("steps", stepList.steps, jsonConfig);
            return json;
        }
    }
}
