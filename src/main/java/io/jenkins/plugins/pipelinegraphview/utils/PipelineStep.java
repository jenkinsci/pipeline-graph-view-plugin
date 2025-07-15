package io.jenkins.plugins.pipelinegraphview.utils;

import io.jenkins.plugins.pipelinegraphview.analysis.TimingInfo;
import net.sf.json.JSONObject;
import net.sf.json.JsonConfig;

public class PipelineStep extends AbstractPipelineNode {
    private final String stageId;
    private final PipelineInputStep inputStep;

    public PipelineStep(
            String id,
            String name,
            PipelineState state,
            String type,
            String title,
            String stageId,
            PipelineInputStep inputStep,
            TimingInfo timingInfo) {
        super(id, name, state, type, title, timingInfo);
        this.stageId = stageId;
        this.inputStep = inputStep;
    }

    public String getStageId() {
        return stageId;
    }

    public PipelineInputStep getInputStep() {
        return inputStep;
    }

    public static class PipelineStepJsonProcessor extends AbstractPipelineNodeJsonProcessor {

        public static void configure(JsonConfig config) {
            config.registerJsonBeanProcessor(PipelineStep.class, new PipelineStepJsonProcessor());
            AbstractPipelineNodeJsonProcessor.configure(config);
            PipelineInputStep.PipelineInputStepJsonProcessor.configure(config);
        }

        @Override
        public JSONObject processBean(Object bean, JsonConfig jsonConfig) {
            if (!(bean instanceof PipelineStep step)) {
                return null;
            }
            JSONObject json = create(step, jsonConfig);

            json.element("stageId", step.getStageId());
            if (step.getInputStep() != null) {
                json.element("inputStep", step.getInputStep(), jsonConfig);
            }
            return json;
        }
    }
}
