package io.jenkins.plugins.pipelinegraphview.playwright;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineState;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Assertions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class PipelineOverviewPage extends JenkinsPage<PipelineOverviewPage> {
    private static final Logger log = LoggerFactory.getLogger(PipelineOverviewPage.class);
    private final String buildName;
    private final PipelineGraph graph;
    private final ConsoleTree tree;
    private final ConsoleLogs logs;

    public PipelineOverviewPage(Page page, String jobUrl, String buildName) {
        super(page, jobUrl + "pipeline-overview/");
        this.buildName = buildName;
        graph = new PipelineGraph(page.locator(".PWGx-PipelineGraph-container"));
        tree = new ConsoleTree(page.locator("#tree-view-pane"));
        logs = new ConsoleLogs(page.locator("#stage-view-pane"));
    }

    @Override
    PipelineOverviewPage waitForLoaded() {
        super.waitForLoaded();

        Locator heading = page.getByRole(AriaRole.HEADING, new Page.GetByRoleOptions().setLevel(1).setName(buildName));
        assertThat(heading).isVisible();
        assertThat(page.locator("#console-pipeline-root")).isVisible();
        graph.isVisible();
        tree.isVisible();
        logs.isVisible();

        return this;
    }

    public PipelineOverviewPage hasStagesInGraph(int count, String... stages) {
        graph.hasStages(count, stages);
        return this;
    }

    public PipelineOverviewPage stageIsSelected(String stage) {
        return stageIsSelectedInGraph(stage)
            .stageIsSelectedInTree(stage)
            .stageIsSelectedInLogs(stage);
    }

    public PipelineOverviewPage stageIsSelectedInGraph(String stage) {
        graph.stageIsSelected(stage);
        return this;
    }
    public PipelineOverviewPage stageIsSelectedInTree(String stage) {
        tree.stageIsSelected(stage);
        return this;
    }

    public PipelineOverviewPage stageIsSelectedInLogs(String stage) {
        logs.stageIsSelected(stage);
        return this;
    }

    public PipelineOverviewPage selectStageInGraph(String stage) {
        graph.selectStage(stage);
        return this;
    }

    public PipelineOverviewPage selectStageInTree(String stage) {
        tree.selectStage(stage);
        return this;
    }

    public PipelineOverviewPage searchForStage(String stage) {
        tree.searchForStage(stage);
        return this;
    }

    public PipelineOverviewPage stepContainsText(String stepName, String textToFind) {
        logs.stepContainsText(stepName, textToFind);
        return this;
    }

    public PipelineOverviewPage stageHasSteps(String step, String... additional) {
        logs.stageHasSteps(step, additional);
        return this;
    }

    public PipelineOverviewPage stageHasState(String stage, PipelineState state) {
        return stageHasStateInGraph(stage, state)
            .stageHasStateInTree(stage, state)
            .stageHasStateInLogs(stage, state);
    }

    public PipelineOverviewPage stageHasStateInGraph(String stage, PipelineState state) {
        graph.stageHasState(stage, state);
        return this;
    }

    public PipelineOverviewPage stageHasStateInTree(String stage, PipelineState state) {
        tree.searchForStage(stage);
        tree.stageHasState(stage, state);
        return this;
    }

    public PipelineOverviewPage stageHasStateInLogs(String stage, PipelineState state) {
        // ensure that it is selected
        tree.searchForStage(stage);
        tree.selectStage(stage);
        logs.stageHasState(stage, state);
        return this;
    }

    public PipelineOverviewPage clearSearch() {
        tree.clearSearch();
        return this;
    }

    public PipelineOverviewPage filterBy(PipelineState filter) {
        tree.filterBy(filter);
        return this;
    }

    public PipelineOverviewPage resetFilter() {
        tree.resetFilter();
        return this;
    }

    public PipelineOverviewPage stageIsInTree(String stage) {
        tree.stagIsVisible(stage);
        return this;
    }

    static class ConsoleTree {

        private final Locator pipelineTree;
        private final Page page;

        public ConsoleTree(Locator pipelineTree) {
            this.pipelineTree = pipelineTree;
            this.page = pipelineTree.page();
        }

        public void isVisible() {
            assertThat(pipelineTree).isVisible();
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
            pipelineTree.getByRole(AriaRole.SEARCHBOX).fill(stage);
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
            return getTree().getByRole(AriaRole.TREEITEM, new Locator.GetByRoleOptions().setName("Stage " + name).setExact(true));
        }

        private Locator getTree() {
            return pipelineTree.getByRole(AriaRole.TREE);
        }

        public void clearSearch() {
            log.info("Clearing this search");
            pipelineTree.getByRole(AriaRole.SEARCHBOX).fill("");
        }

        public void filterBy(PipelineState filter) {
            log.info("Filtering the tree by {}", filter);
            Locator dropdown = openDropdown();

            dropdown.getByRole(AriaRole.BUTTON)
                .filter(new Locator.FilterOptions()
                    .setHas(page.getByRole(AriaRole.IMG, new Page.GetByRoleOptions().setName(filter.toString())))
                ).click();
        }

        private Locator openDropdown() {
            Locator dropdown = page.getByTestId("filter-dropdown");

            if (!dropdown.isVisible()) {
                log.info("Opening the filter dropdown");
                pipelineTree.getByRole(AriaRole.BUTTON, new Locator.GetByRoleOptions().setName("Filter")).click();
            }

            return dropdown;
        }

        public void resetFilter() {
            log.info("Resetting the filter");
            openDropdown().getByRole(AriaRole.BUTTON, new Locator.GetByRoleOptions().setName("Reset")).click();
        }

        private void openFilter() {

        }

        public void stagIsVisible(String stage) {
            log.info("Checking if this stage is visible in the tree {}", stage);
            Locator found = getStageByName(stage);
            assertThat(found).isVisible();
        }
    }

    static class ConsoleLogs {
        private static final String STEP_NAME_CLASS = ".pgv-step-detail-header__content";
        private final Locator logs;
        private final Page page;

        public ConsoleLogs(Locator logs) {
            this.logs = logs;
            this.page = logs.page();
        }

        public void isVisible() {
            assertThat(logs).isVisible();
        }

        public void stageIsSelected(String name) {
            assertThat(selectedStage()).hasText(name);
        }

        public Locator selectedStage() {
            log.info("Getting selected stage from the logs");
            return logs.getByRole(AriaRole.HEADING, new Locator.GetByRoleOptions().setLevel(2));
        }

        private Locator steps() {
            return logs.locator(".pgv-step-detail-group");
        }

        private boolean isOpenStep(Locator step) {
            String[] classes = step.locator(".pgv-step-detail-header").getAttribute("class").split(" ");
            for (String clazz : classes) {
                if (clazz.equals("jenkins-button--tertiary")) {
                    return false;
                }
            }
            return true;
        }

        public void stepContainsText(String stepName, String textToFind) {
            log.info("Checking that the step {} contains a log with the text {}", stepName, textToFind);
            // Get the step
            Locator stepContainer = steps().filter(
                new Locator.FilterOptions().setHas(page.locator(
                    STEP_NAME_CLASS + " > span",
                    new Page.LocatorOptions().setHasText(Pattern.compile("^" + stepName + "$"))
                ))
            ).first();

            if (!isOpenStep(stepContainer)) {
                stepContainer.click();
            }
            Locator stepLogs = stepContainer.getByRole(AriaRole.LOG);
            assertThat(stepLogs).containsText(textToFind);
        }

        public void stageHasSteps(String step, String... additional) {
            List<String> expectedSteps = new ArrayList<>();
            expectedSteps.add(step);
            Collections.addAll(expectedSteps, additional);
            log.info("Checking that the stage has the steps {}", expectedSteps);

            List<String> foundSteps = steps().locator(STEP_NAME_CLASS + " > span").allTextContents();

            expectedSteps.removeAll(foundSteps);

            if (!expectedSteps.isEmpty()) {
                Assertions.fail(
                    "Could not find steps with the names:\n  " + String.join("\n  ",expectedSteps) +
                    "\nFound steps:\n" + String.join("\n  ", foundSteps)
                );
            }
        }

        public void stageHasState(String stage, PipelineState state) {
            this.stageIsSelected(stage);

            log.info("Checking if stage {} has state {} in the logs", stage, state);
            Locator stateSVG = selectedStage().locator("..").getByRole(AriaRole.IMG);
            assertThat(stateSVG).hasAccessibleName(state.toString());
        }
    }
}
