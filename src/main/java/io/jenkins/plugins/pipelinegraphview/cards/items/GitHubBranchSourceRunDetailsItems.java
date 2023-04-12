package io.jenkins.plugins.pipelinegraphview.cards.items;

import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import jenkins.scm.api.SCMRevisionAction;
import jenkins.scm.api.metadata.ObjectMetadataAction;
import org.jenkinsci.plugins.github_branch_source.GitHubLink;
import org.jenkinsci.plugins.github_branch_source.PullRequestSCMHead;
import org.jenkinsci.plugins.github_branch_source.PullRequestSCMRevision;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

public class GitHubBranchSourceRunDetailsItems {

    public static String getGitCommit(SCMRevisionAction scmRevisionAction) {
        PullRequestSCMRevision revision = (PullRequestSCMRevision) scmRevisionAction.getRevision();
        return revision.getPullHash().substring(0, 7);
    }

    public static List<RunDetailsItem> getGitInformation(SCMRevisionAction scmRevisionAction) {
        List<RunDetailsItem> runDetailsItems = new ArrayList<>();

        PullRequestSCMRevision revision = (PullRequestSCMRevision) scmRevisionAction.getRevision();

        // TODO see if there's a way to get this for branch builds, may need to make changes to
        // github-branch-source-plugin
        PullRequestSCMHead head = (PullRequestSCMHead) revision.getHead();
        String sourceOwner = head.getSourceOwner();
        String sourceRepo = head.getSourceRepo();
        String sourceBranch = head.getSourceBranch();

        RunDetailsItem gitRepositoryItem = new RunDetailsItem.Builder()
                .ionicon("logo-github")
                .text(sourceOwner + "/" + sourceRepo)
                .build();
        runDetailsItems.add(gitRepositoryItem);

        RunDetailsItem gitBranchItem = new RunDetailsItem.Builder()
                .ionicon("git-branch-outline")
                .text(sourceBranch)
                .build();
        runDetailsItems.add(gitBranchItem);

        return runDetailsItems;
    }

    public static Optional<RunDetailsItem> getGitHubLink(WorkflowRun run) {
        GitHubLink gitHubLink = run.getParent().getAction(GitHubLink.class);
        if (gitHubLink != null) {
            ObjectMetadataAction action = run.getParent().getAction(ObjectMetadataAction.class);
            RunDetailsItem build = new RunDetailsItem.Builder()
                    .ionicon("git-pull-request-outline")
                    .text(action.getObjectDisplayName())
                    .href(gitHubLink.getUrl())
                    .build();
            return Optional.of(build);
        }
        return Optional.empty();
    }
}
