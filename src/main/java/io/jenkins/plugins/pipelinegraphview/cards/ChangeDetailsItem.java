package io.jenkins.plugins.pipelinegraphview.cards;

public class ChangeDetailsItem {

    private final String commitId;
    private final String commitHref;
    private final String author;
    private final String message;

    public ChangeDetailsItem(String commitId, String commitHref, String author, String message) {
        this.commitId = commitId;
        this.commitHref = commitHref;
        this.author = author;
        this.message = message;
    }

    public String getCommitId() {
        return commitId;
    }

    public String getCommitHref() {
        return commitHref;
    }

    public String getAuthor() {
        return author;
    }

    public String getMessage() {
        return message;
    }
}
