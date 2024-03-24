package io.jenkins.plugins.pipelinegraphview;

import hudson.scm.ChangeLogSet;
import hudson.scm.ChangeLogSet.Entry;
import hudson.scm.RepositoryBrowser;
import io.jenkins.plugins.pipelinegraphview.cards.ChangeDetailsCard;
import io.jenkins.plugins.pipelinegraphview.cards.ChangeDetailsItem;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsCard;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem;
import io.jenkins.plugins.pipelinegraphview.cards.items.CauseRunDetailsItem;
import io.jenkins.plugins.pipelinegraphview.cards.items.SCMRunDetailsItems;
import io.jenkins.plugins.pipelinegraphview.cards.items.TimingRunDetailsItems;
import io.jenkins.plugins.pipelinegraphview.utils.AbstractPipelineViewAction;
import java.io.IOException;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class PipelineGraphViewAction extends AbstractPipelineViewAction {

    private static final Logger logger = LoggerFactory.getLogger(PipelineGraphViewAction.class);

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

    @SuppressWarnings("unused")
    public RunDetailsCard getRunDetailsCard() {

        List<RunDetailsItem> runDetailsItems = new ArrayList<>();

        runDetailsItems.addAll(SCMRunDetailsItems.get(run));

        if (!runDetailsItems.isEmpty()) {
            runDetailsItems.add(new RunDetailsItem.Builder().separator().build());
        }

        CauseRunDetailsItem.get(run).ifPresent(runDetailsItems::add);

        runDetailsItems.addAll(TimingRunDetailsItems.get(run));

        return new RunDetailsCard(runDetailsItems);
    }

    @SuppressWarnings("unchecked")
    private static <E extends Entry> String getCommitHref(RepositoryBrowser<? extends Entry> browser, E entry) {
        if (browser != null) {
            URL commitUrl = null;
            try {
                commitUrl = ((RepositoryBrowser<E>) browser).getChangeSetLink(entry);
            } catch (IOException e) {
                logger.debug("Failed to get change set link: " + e.getStackTrace());
            }

            if (commitUrl != null) {
                return commitUrl.toString();
            }
        }
        return null;
    }

    private static List<ChangeDetailsItem> getChangeDetailsItems(List<ChangeLogSet<? extends Entry>> changeSets) {
        List<ChangeDetailsItem> changeDetailsItems = new ArrayList<>();
        for (ChangeLogSet<? extends Entry> changeSet : changeSets) {
            for (Entry entry : changeSet) {
                changeDetailsItems.add(new ChangeDetailsItem(
                        entry.getCommitId(),
                        getCommitHref(changeSet.getBrowser(), entry),
                        entry.getAuthor().getFullName(),
                        entry.getMsg(),
                        entry.getTimestamp()));
            }
        }

        return changeDetailsItems;
    }

    @SuppressWarnings("unused")
    public ChangeDetailsCard getChangeDetailsCard() {
        return new ChangeDetailsCard(getChangeDetailsItems(run.getChangeSets()));
    }

    public boolean isShowGraphOnBuildPage() {
        return PipelineGraphViewConfiguration.get().isShowGraphOnBuildPage();
    }
}
