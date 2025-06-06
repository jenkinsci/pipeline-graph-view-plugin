package io.jenkins.plugins.pipelinegraphview.cards;

import java.util.List;

public class RunDetailsCard extends Card {

    private final List<RunDetailsItem> items;

    public RunDetailsCard(List<RunDetailsItem> items) {
        this.items = items;
    }

    public List<RunDetailsItem> getItems() {
        return items;
    }

    @Override
    public String getTitle() {
        return "Details";
    }
}
