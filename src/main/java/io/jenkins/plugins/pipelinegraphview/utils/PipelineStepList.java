package io.jenkins.plugins.pipelinegraphview.utils;

import java.util.ArrayList;
import java.util.List;
import net.sf.json.JSONObject;
import net.sf.json.JsonConfig;
import net.sf.json.processors.JsonBeanProcessor;

public class PipelineStepList {

    private List<PipelineStep> steps;

    public PipelineStepList() {
        this.steps = new ArrayList<>();
    }

    public PipelineStepList(List<PipelineStep> steps) {
        this.steps = steps;
    }

    public List<PipelineStep> getSteps() {
        return steps;
    }

    /* Sorts the list of PipelineSteps by stageId and Id. */
    public void sort() {
        this.steps.sort((lhs, rhs) -> {
            if (!lhs.getStageId().equals(rhs.getStageId())) {
                return FlowNodeWrapper.compareIds(lhs.getStageId(), rhs.getStageId());
            } else {
                return FlowNodeWrapper.compareIds(lhs.getId(), rhs.getId());
            }
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
            json.element("steps", stepList.getSteps(), jsonConfig);
            return json;
        }
    }
}
