package io.jenkins.plugins.pipelinegraphview.playwright;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineState;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

class OverviewTree {

    private static final Logger log = LoggerFactory.getLogger(OverviewTree.class);

    private final Locator wrapper;
    private final Page page;

    public OverviewTree(Locator wrapper) {
        this.wrapper = wrapper;
        this.page = wrapper.page();
    }

    public void isVisible() {
        assertThat(wrapper).isVisible();
    }

    public void stageIsSelected(String name) {
        assertThat(selectedStage()).hasAccessibleName("Stage " + name);
    }

    private Locator selectedStage() {
        log.info("Getting selected stage from the tree");
        return getTree().getByRole(AriaRole.TREEITEM).and(getTree().locator("[aria-selected=true]"));
    }

    public void searchForStage(String stage) {
        log.info("Searching for stage {}", stage);
        wrapper.getByRole(AriaRole.SEARCHBOX).fill(stage);
    }

    public void stageHasState(String name, PipelineState state) {
        log.info("Checking if stage {} has state {} in the tree", name, state);
        Locator stage = getStageByName(name);
        assertThat(stage.getByRole(AriaRole.IMG)).hasAccessibleName(state.toString());
    }

    public void selectStage(String name) {
        getStageByName(name).click();
    }

    private Locator getStageByName(String name) {
        log.info("Getting stage in tree with the name of {}", name);
        return getTree()
                .getByRole(
                        AriaRole.TREEITEM,
                        new Locator.GetByRoleOptions().setName("Stage " + name).setExact(true));
    }

    private Locator getTree() {
        return wrapper.getByRole(AriaRole.TREE);
    }

    public void clearSearch() {
        log.info("Clearing this search");
        wrapper.getByRole(AriaRole.SEARCHBOX).fill("");
    }

    public void filterBy(PipelineState state) {
        log.info("Filtering the tree by {}", state);
        Locator filter = openFilter();

        filter.getByRole(AriaRole.BUTTON)
                .filter(new Locator.FilterOptions()
                        .setHas(page.getByRole(AriaRole.IMG, new Page.GetByRoleOptions().setName(state.toString()))))
                .click();
    }

    public void resetFilter() {
        log.info("Resetting the filter");
        openFilter()
                .getByRole(AriaRole.BUTTON, new Locator.GetByRoleOptions().setName("Reset"))
                .click();
    }

    private Locator openFilter() {
        Locator dropdown = page.getByTestId("filter-dropdown");

        if (!dropdown.isVisible()) {
            log.info("Opening the filter dropdown");
            wrapper.getByRole(AriaRole.BUTTON, new Locator.GetByRoleOptions().setName("Filter"))
                    .click();
        }

        return dropdown;
    }

    public void stageIsVisible(String stage) {
        log.info("Checking if this stage is visible in the tree {}", stage);
        Locator found = getStageByName(stage);
        assertThat(found).isVisible();
    }
}
