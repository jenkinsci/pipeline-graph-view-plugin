package io.jenkins.plugins.pipelinegraphview.cards;

public class ChangeDetailsItem {

    private final String commitId;
    private final String commitHref;
    private final String author;
    private final String message;
    private final long timestamp;

    public ChangeDetailsItem(String commitId, String commitHref, String author, String message, long timestamp) {
        this.commitId = commitId;
        this.commitHref = commitHref;
        this.author = author;
        this.message = message;
        this.timestamp = timestamp;
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

    public long getTimestamp() {
        return timestamp;
    }
}
