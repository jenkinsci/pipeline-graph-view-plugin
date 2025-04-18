package io.jenkins.plugins.pipelinegraphview;

import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsCard;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem;
import io.jenkins.plugins.pipelinegraphview.cards.items.SCMRunDetailsItems;
import io.jenkins.plugins.pipelinegraphview.cards.items.TimingRunDetailsItems;
import io.jenkins.plugins.pipelinegraphview.cards.items.UpstreamCauseRunDetailsItem;
import io.jenkins.plugins.pipelinegraphview.cards.items.UserIdCauseRunDetailsItem;
import io.jenkins.plugins.pipelinegraphview.utils.AbstractPipelineViewAction;
import java.util.ArrayList;
import java.util.List;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

public class PipelineGraphViewAction extends AbstractPipelineViewAction {
    public PipelineGraphViewAction(WorkflowRun target) {
        super(target);
    }

    @Override
    public String getDisplayName() {
        return "Pipeline Overview";
    }

    @Override
    public String getUrlName() {
        return "pipeline-graph";
    }

    public String getUrl() {
        return run.getUrl();
    }

    @SuppressWarnings("unused")
    public RunDetailsCard getRunDetailsCard() {

        List<RunDetailsItem> runDetailsItems = new ArrayList<>();

        runDetailsItems.addAll(SCMRunDetailsItems.get(run));

        if (!runDetailsItems.isEmpty()) {
            runDetailsItems.add(new RunDetailsItem.Builder().separator().build());
        }

        UpstreamCauseRunDetailsItem.get(run).ifPresent(runDetailsItems::add);
        UserIdCauseRunDetailsItem.get(run).ifPresent(runDetailsItems::add);

        runDetailsItems.addAll(TimingRunDetailsItems.get(run));

        return new RunDetailsCard(runDetailsItems);
    }

    public boolean isShowGraphOnBuildPage() {
        return PipelineGraphViewConfiguration.get().isShowGraphOnBuildPage();
    }
}
