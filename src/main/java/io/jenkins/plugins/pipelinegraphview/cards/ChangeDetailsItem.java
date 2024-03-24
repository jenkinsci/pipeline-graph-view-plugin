package io.jenkins.plugins.pipelinegraphview.cards;

import java.util.Date;

public class ChangeDetailsItem {

    private final String commitId;
    private final String commitHref;
    private final String author;
    private final String message;
    private final Date timestamp;

    public ChangeDetailsItem(String commitId, String commitHref, String author, String message, long timestamp) {
        this.commitId = commitId;
        this.commitHref = commitHref;
        this.author = author;
        this.message = message;
        this.timestamp = new Date(timestamp);
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

    public Date getTimestamp() {
        return timestamp;
    }
}
