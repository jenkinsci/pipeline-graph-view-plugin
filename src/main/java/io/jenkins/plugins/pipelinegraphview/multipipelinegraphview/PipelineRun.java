package io.jenkins.plugins.pipelinegraphview.multipipelinegraphview;

import static io.jenkins.plugins.pipelinegraphview.utils.ChangesUtil.getChanges;

import edu.umd.cs.findbugs.annotations.NonNull;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineState;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

public class PipelineRun {

    @NonNull
    private final String id;

    @NonNull
    private final String displayName;

    private final long timestamp;
    private final long duration;
    private final int changesCount;

    // A run can have a result while it's still building, such as once it's marked unstable, so
    // this says whether its duration is final
    private final boolean building;

    @NonNull
    final PipelineState result;

    public PipelineRun(WorkflowRun run) {
        this(
                run.getId(),
                run.getDisplayName(),
                run.getTimeInMillis(),
                run.getDuration(),
                getChanges(run).size(),
                PipelineState.of(run),
                run.isBuilding());
    }

    PipelineRun(
            @NonNull String id,
            @NonNull String displayName,
            long timestamp,
            long duration,
            int changesCount,
            @NonNull PipelineState result,
            boolean building) {
        this.id = id;
        this.displayName = displayName;
        this.timestamp = timestamp;
        this.duration = duration;
        this.changesCount = changesCount;
        this.result = result;
        this.building = building;
    }

    public boolean isBuilding() {
        return building;
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
}
