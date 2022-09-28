package io.jenkins.plugins.pipelinegraphview;

import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsCard;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem;
import io.jenkins.plugins.pipelinegraphview.cards.items.CauseRunDetailsItem;
import io.jenkins.plugins.pipelinegraphview.cards.items.SCMRunDetailsItems;
import io.jenkins.plugins.pipelinegraphview.cards.items.TimingRunDetailsItems;
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
    return "Pipeline Graph";
  }

  @Override
  public String getUrlName() {
    return "pipeline-graph";
  }

  @SuppressWarnings("unused")
  public RunDetailsCard getRunDetailsCard() {

    List<RunDetailsItem> runDetailsItems = new ArrayList<>();

    CauseRunDetailsItem.get(run).ifPresent(runDetailsItems::add);

    runDetailsItems.addAll(TimingRunDetailsItems.get(run));
    runDetailsItems.addAll(SCMRunDetailsItems.get(run));

    return new RunDetailsCard(runDetailsItems);
  }
}
