package io.jenkins.plugins.pipelinegraphview.multipipelinegraphview;

import io.jenkins.plugins.pipelinegraphview.utils.PipelineState;
import java.time.Clock;

public class PipelineRunFactory {

    private final Clock clock;

    public PipelineRunFactory(Clock clock) {
        this.clock = clock;
    }

    public PipelineRun succeeded(String id) {
        return new PipelineRun(id, "Build " + id, currentTimeMillis(), 5_000, 3, PipelineState.SUCCESS);
    }

    public PipelineRun inProgress(String id) {
        return new PipelineRun(id, "Build " + id, currentTimeMillis(), 0, 0, PipelineState.RUNNING);
    }

    private long currentTimeMillis() {
        return clock.millis();
    }
}
