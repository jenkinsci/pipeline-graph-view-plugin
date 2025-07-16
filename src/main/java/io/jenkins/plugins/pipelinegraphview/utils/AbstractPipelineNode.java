package io.jenkins.plugins.pipelinegraphview.utils;

import io.jenkins.plugins.pipelinegraphview.analysis.TimingInfo;
import net.sf.json.JSONObject;
import net.sf.json.JsonConfig;
import net.sf.json.processors.JsonBeanProcessor;

public class AbstractPipelineNode {
    final String name;
    final PipelineState state;
    final String type; // TODO enum
    final String title;
    public final String id;
    private final long pauseDurationMillis;
    private final long totalDurationMillis;
    final TimingInfo timingInfo;

    public AbstractPipelineNode(
            String id, String name, PipelineState state, String type, String title, TimingInfo timingInfo) {
        this.id = id;
        this.name = name;
        this.state = state;
        this.type = type;
        this.title = title;
        this.timingInfo = timingInfo;
        // These values won't change for a given TimingInfo.
        this.pauseDurationMillis = timingInfo.getPauseDurationMillis();
        this.totalDurationMillis = timingInfo.getTotalDurationMillis();
    }

    public long getStartTimeMillis() {
        return timingInfo.getStartTimeMillis();
    }

    public Long getTotalDurationMillis() {
        return state.isInProgress() ? null : totalDurationMillis;
    }

    abstract static class AbstractPipelineNodeJsonProcessor implements JsonBeanProcessor {

        protected static void baseConfigure(JsonConfig config) {
            config.registerJsonValueProcessor(PipelineState.class, new PipelineState.PipelineStateJsonProcessor());
        }

        protected JSONObject create(AbstractPipelineNode node, JsonConfig config) {
            JSONObject json = new JSONObject();
            json.element("id", node.id);
            json.element("name", node.name);
            json.element("state", node.state, config);
            json.element("type", node.type);
            json.element("title", node.title);
            json.element("pauseDurationMillis", node.pauseDurationMillis);
            json.element("startTimeMillis", node.getStartTimeMillis());
            json.element("totalDurationMillis", node.getTotalDurationMillis());
            return json;
        }
    }
}
