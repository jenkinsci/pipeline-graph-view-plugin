package io.jenkins.plugins.pipelinegraphview.cards.items;

import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem.Icon;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem.ItemContent;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import jenkins.model.Jenkins;
import jenkins.plugins.git.AbstractGitSCMSource;
import jenkins.scm.api.SCMRevisionAction;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

public class SCMRunDetailsItems {

    public static List<RunDetailsItem> get(WorkflowRun run) {
        SCMRevisionAction scmRevisionAction = run.getAction(SCMRevisionAction.class);
        if (scmRevisionAction == null) {
            return Collections.emptyList();
        }

        List<RunDetailsItem> runDetailsItems = new ArrayList<>();
        boolean githubBranchSourceInstalled = Jenkins.get().getPlugin("github-branch-source") != null;
        String commit = null;

        if (githubBranchSourceInstalled
                && scmRevisionAction
                        .getRevision()
                        .getClass()
                        .getName()
                        .equals("org.jenkinsci.plugins.github_branch_source.PullRequestSCMRevision")) {

            runDetailsItems.addAll(GitHubBranchSourceRunDetailsItems.getGitInformation(scmRevisionAction));
            commit = GitHubBranchSourceRunDetailsItems.getGitCommit(scmRevisionAction);

        } else if (scmRevisionAction.getRevision() instanceof AbstractGitSCMSource.SCMRevisionImpl revision) {
            commit = revision.getHash().substring(0, 7);
        }

        if (githubBranchSourceInstalled) {
            GitHubBranchSourceRunDetailsItems.getGitHubLink(run).ifPresent(runDetailsItems::add);
        }

        if (commit != null) {
            runDetailsItems.add(new RunDetailsItem.Item(
                    new Icon.IonIcon("git-commit-outline"), new ItemContent.PlainContent(commit)));
        }

        return runDetailsItems;
    }
}
