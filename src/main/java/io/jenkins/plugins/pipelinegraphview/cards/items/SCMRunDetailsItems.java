package io.jenkins.plugins.pipelinegraphview.cards.items;

import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem.Icon.Ionicon;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem.ItemContent;
import java.util.ArrayList;
import java.util.List;
import jenkins.model.Jenkins;
import jenkins.plugins.git.AbstractGitSCMSource;
import jenkins.scm.api.SCMRevisionAction;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

public class SCMRunDetailsItems {

    public static List<RunDetailsItem> get(WorkflowRun run) {
        SCMRevisionAction scmRevisionAction = run.getAction(SCMRevisionAction.class);
        if (scmRevisionAction == null) {
            return List.of();
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
            runDetailsItems.add(
                    new RunDetailsItem.RunDetail(new Ionicon("git-commit-outline"), ItemContent.of(commit)));
        }

        return runDetailsItems;
    }
}
