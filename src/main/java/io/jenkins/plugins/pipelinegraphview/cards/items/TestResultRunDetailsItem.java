package io.jenkins.plugins.pipelinegraphview.cards.items;

import hudson.tasks.test.AbstractTestResultAction;
import io.jenkins.plugins.pipelinegraphview.Messages;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem;
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

        if (action != null) {
            RunDetailsItem testResult = new RunDetailsItem.Builder()
                    .ionicon("clipboard-outline")
                    .text(Messages.testResults())
                    .href("../%s".formatted(action.getUrlName()))
                    .tooltip("Passed: %s%nFailed: %s%nSkipped: %s%nTotal: %s"
                            .formatted(
                                    action.getTotalCount() - action.getFailCount() - action.getSkipCount(),
                                    action.getFailCount(),
                                    action.getSkipCount(),
                                    action.getTotalCount()))
                    .build();
            return Optional.of(testResult);
        }

        return Optional.empty();
    }
}
