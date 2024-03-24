package io.jenkins.plugins.pipelinegraphview.cards;

import java.util.List;

public class ChangeDetailsCard extends Card {

    private List<ChangeDetailsItem> items;

    public ChangeDetailsCard(List<ChangeDetailsItem> items) {
        this.items = items;
    }

    public List<ChangeDetailsItem> getItems() {
        return items;
    }

    @Override
    public String getTitle() {
        return "Changes";
    }
}
