package io.jenkins.plugins.pipelinegraphview.cards.items;

import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem;
import java.util.ArrayList;
import java.util.List;
import jenkins.model.Jenkins;
import jenkins.plugins.git.AbstractGitSCMSource;
import jenkins.scm.api.SCMRevisionAction;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

public class SCMRunDetailsItems {

    public static List<RunDetailsItem> get(WorkflowRun run) {
        List<RunDetailsItem> runDetailsItems = new ArrayList<>();
        SCMRevisionAction scmRevisionAction = run.getAction(SCMRevisionAction.class);

        boolean githubBranchSourceInstalled = Jenkins.get().getPlugin("github-branch-source") != null;

        if (scmRevisionAction != null) {
            String commit = null;
            if (scmRevisionAction
                            .getRevision()
                            .getClass()
                            .getName()
                            .equals("org.jenkinsci.plugins.github_branch_source.PullRequestSCMRevision")
                    && githubBranchSourceInstalled) {

                runDetailsItems.addAll(GitHubBranchSourceRunDetailsItems.getGitInformation(scmRevisionAction));
                commit = GitHubBranchSourceRunDetailsItems.getGitCommit(scmRevisionAction);

            } else if (scmRevisionAction.getRevision() instanceof AbstractGitSCMSource.SCMRevisionImpl) {
                AbstractGitSCMSource.SCMRevisionImpl revision =
                        (AbstractGitSCMSource.SCMRevisionImpl) scmRevisionAction.getRevision();
                commit = revision.getHash().substring(0, 7);
            }

            if (githubBranchSourceInstalled) {
                GitHubBranchSourceRunDetailsItems.getGitHubLink(run).ifPresent(runDetailsItems::add);
            }

            if (commit != null) {
                RunDetailsItem gitCommitItem = new RunDetailsItem.Builder()
                        .ionicon("git-commit-outline")
                        .text(commit)
                        .build();

                runDetailsItems.add(gitCommitItem);
            }
        }

        return runDetailsItems;
    }
}
