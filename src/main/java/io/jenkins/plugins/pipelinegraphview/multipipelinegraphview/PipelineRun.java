package io.jenkins.plugins.pipelinegraphview.multipipelinegraphview;

import static io.jenkins.plugins.pipelinegraphview.utils.ChangesUtil.getChanges;

import io.jenkins.plugins.pipelinegraphview.utils.PipelineState;
import net.sf.json.JSONObject;
import net.sf.json.JsonConfig;
import net.sf.json.processors.JsonBeanProcessor;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

public class PipelineRun {

    private final String id;
    private final String displayName;
    private final long timestamp;
    private final long duration;
    private final int changesCount;
    private final PipelineState result;

    public PipelineRun(WorkflowRun run) {
        this.id = run.getId();
        this.displayName = run.getDisplayName();
        this.timestamp = run.getTimeInMillis();
        this.duration = run.getDuration();
        this.changesCount = getChanges(run).size();
        this.result = PipelineState.of(run);
    }

    public String getId() {
        return id;
    }

    public String getDisplayName() {
        return displayName;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public long getDuration() {
        return duration;
    }

    public int getChangesCount() {
        return changesCount;
    }

    public PipelineState getResult() {
        return result;
    }

    public static class PipelineRunJsonProcessor implements JsonBeanProcessor {

        public static void configure(JsonConfig config) {
            config.registerJsonBeanProcessor(PipelineRun.class, new PipelineRunJsonProcessor());
            PipelineState.PipelineStateJsonProcessor.configure(config);
        }

        @Override
        public JSONObject processBean(Object bean, JsonConfig jsonConfig) {
            if (!(bean instanceof PipelineRun run)) {
                return null;
            }
            JSONObject json = new JSONObject();
            json.element("id", run.getId());
            json.element("displayName", run.getDisplayName());
            json.element("timestamp", run.getTimestamp());
            json.element("duration", run.getDuration());
            json.element("changesCount", run.getChangesCount());
            json.element("result", run.getResult(), jsonConfig);
            return json;
        }
    }
}
