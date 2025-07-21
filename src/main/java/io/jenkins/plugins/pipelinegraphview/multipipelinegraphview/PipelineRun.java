package io.jenkins.plugins.pipelinegraphview.multipipelinegraphview;

import static io.jenkins.plugins.pipelinegraphview.utils.ChangesUtil.getChanges;

import edu.umd.cs.findbugs.annotations.NonNull;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineState;
import net.sf.json.JSONObject;
import net.sf.json.JsonConfig;
import net.sf.json.processors.JsonBeanProcessor;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

public class PipelineRun {

    @NonNull
    private final String id;

    @NonNull
    private final String displayName;

    private final long timestamp;
    private final long duration;
    private final int changesCount;

    @NonNull
    final PipelineState result;

    public PipelineRun(WorkflowRun run) {
        this(
                run.getId(),
                run.getDisplayName(),
                run.getTimeInMillis(),
                run.getDuration(),
                getChanges(run).size(),
                PipelineState.of(run));
    }

    PipelineRun(
            @NonNull String id,
            @NonNull String displayName,
            long timestamp,
            long duration,
            int changesCount,
            @NonNull PipelineState result) {
        this.id = id;
        this.displayName = displayName;
        this.timestamp = timestamp;
        this.duration = duration;
        this.changesCount = changesCount;
        this.result = result;
    }

    public String etag() {
        return this.id
                + '|'
                + this.displayName
                + '|'
                + this.timestamp
                + '|'
                + this.duration
                + '|'
                + this.changesCount
                + '|'
                + this.result.name();
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
            json.element("id", run.id);
            json.element("displayName", run.displayName);
            json.element("timestamp", run.timestamp);
            json.element("duration", run.duration);
            json.element("changesCount", run.changesCount);
            json.element("result", run.result, jsonConfig);
            return json;
        }
    }
}
