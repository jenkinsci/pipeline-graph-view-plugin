package io.jenkins.plugins.pipelinegraphview.cards.items;

import hudson.tasks.test.AbstractTestResultAction;
import io.jenkins.plugins.pipelinegraphview.Messages;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem.Icon.Ionicon;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem.ItemContent;
import java.util.Optional;
import jenkins.model.Jenkins;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

public class TestResultRunDetailsItem {

    public static Optional<RunDetailsItem> get(WorkflowRun run) {
        boolean junitInstalled = Jenkins.get().getPlugin("junit") != null;
        if (!junitInstalled) {
            return Optional.empty();
        }

        AbstractTestResultAction<?> action = run.getAction(AbstractTestResultAction.class);

        if (action == null) {
            return Optional.empty();
        }

        String passed =
                Messages.testResults_passed(action.getTotalCount() - action.getFailCount() - action.getSkipCount());
        String failed = Messages.testResults_failed(action.getFailCount());
        String skipped = Messages.testResults_skipped(action.getSkipCount());
        String total = Messages.testResults_total(action.getTotalCount());
        RunDetailsItem testResult = new RunDetailsItem.RunDetail(
                new Ionicon("flask-outline"),
                ItemContent.of("../" + action.getUrlName(), Messages.testResults()),
                passed + "\n" + failed + "\n" + skipped + "\n" + total);
        return Optional.of(testResult);
    }
}
