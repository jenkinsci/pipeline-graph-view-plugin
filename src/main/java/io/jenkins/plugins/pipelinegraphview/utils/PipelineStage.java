package io.jenkins.plugins.pipelinegraphview.utils;

import static io.jenkins.plugins.pipelinegraphview.consoleview.PipelineConsoleViewAction.URL_NAME;

import io.jenkins.plugins.pipelinegraphview.analysis.TimingInfo;
import java.util.List;
import net.sf.json.JSONObject;
import net.sf.json.JsonConfig;

public class PipelineStage extends AbstractPipelineNode {

    final List<PipelineStage> children;
    private final String seqContainerName;
    private final PipelineStage nextSibling;
    private final boolean sequential;
    final boolean synthetic;
    private final boolean placeholder;
    final String agent;
    private final String url;

    public PipelineStage(
            String id,
            String name,
            List<PipelineStage> children,
            PipelineState state,
            String type,
            String title,
            String seqContainerName,
            PipelineStage nextSibling,
            boolean sequential,
            boolean synthetic,
            boolean placeholder,
            TimingInfo timingInfo,
            String agent,
            String runUrl) {
        super(id, name, state, type, title, timingInfo);
        this.children = children;
        this.seqContainerName = seqContainerName;
        this.nextSibling = nextSibling;
        this.sequential = sequential;
        this.synthetic = synthetic;
        this.placeholder = placeholder;
        this.agent = agent;
        this.url = "/" + runUrl + URL_NAME + "?selected-node=" + id;
    }

    public static class PipelineStageJsonProcessor extends AbstractPipelineNodeJsonProcessor {
        public static void configure(JsonConfig config) {
            baseConfigure(config);
            config.registerJsonBeanProcessor(PipelineStage.class, new PipelineStageJsonProcessor());
        }

        @Override
        public JSONObject processBean(Object bean, JsonConfig config) {
            if (!(bean instanceof PipelineStage stage)) {
                return null;
            }
            JSONObject json = create(stage, config);
            json.element("children", stage.children, config);
            json.element("seqContainerName", stage.seqContainerName);
            json.element("nextSibling", stage.nextSibling, config);
            json.element("isSequential", stage.sequential);
            json.element("synthetic", stage.synthetic);
            json.element("placeholder", stage.placeholder);
            json.element("agent", stage.agent);
            json.element("url", stage.url);
            return json;
        }
    }
}
