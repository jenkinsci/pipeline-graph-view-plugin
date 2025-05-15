package io.jenkins.plugins.pipelinegraphview.cards.items;

import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem.Icon.Ionicon;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem.ItemContent;
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
        PullRequestSCMRevision revision = (PullRequestSCMRevision) scmRevisionAction.getRevision();

        // TODO see if there's a way to get this for branch builds, may need to make changes to
        // github-branch-source-plugin
        PullRequestSCMHead head = (PullRequestSCMHead) revision.getHead();
        String sourceOwner = head.getSourceOwner();
        String sourceRepo = head.getSourceRepo();
        String sourceBranch = head.getSourceBranch();

        RunDetailsItem gitRepositoryItem = new RunDetailsItem.RunDetail(
                new Ionicon("logo-github"), ItemContent.of(sourceOwner + "/" + sourceRepo));

        RunDetailsItem gitBranchItem =
                new RunDetailsItem.RunDetail(new Ionicon("git-branch-outline"), ItemContent.of(sourceBranch));

        return List.of(gitRepositoryItem, gitBranchItem);
    }

    public static Optional<RunDetailsItem> getGitHubLink(WorkflowRun run) {
        GitHubLink gitHubLink = run.getParent().getAction(GitHubLink.class);
        if (gitHubLink == null) {
            return Optional.empty();
        }
        ObjectMetadataAction action = run.getParent().getAction(ObjectMetadataAction.class);
        String name = action.getObjectDisplayName();
        if (name == null) {
            return Optional.empty();
        }
        return Optional.of(new RunDetailsItem.RunDetail(
                new Ionicon("git-pull-request-outline"), ItemContent.of(gitHubLink.getUrl(), name)));
    }
}
