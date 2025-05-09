package io.jenkins.plugins.pipelinegraphview.playwright;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineState;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.function.Function;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Assertions;

public class PipelineConsolePage extends JenkinsPage<PipelineConsolePage> {
    private final String buildName;
    private final PipelineGraph graph;
    private final ConsoleTree tree;
    private final ConsoleLogs logs;

    public PipelineConsolePage(Page page, String pageUrl, String buildName) {
        super(page, pageUrl);
        this.buildName = buildName;
        graph = new PipelineGraph(page.locator(".PWGx-PipelineGraph-container"));
        tree = new ConsoleTree(page.locator("#tree-view-pane"));
        logs = new ConsoleLogs(page.locator("#stage-view-pane"));
    }

    @Override
    PipelineConsolePage waitForLoaded() {
        super.waitForLoaded();

        Locator heading = page.getByRole(AriaRole.HEADING, new Page.GetByRoleOptions().setLevel(1).setName(buildName));
        assertThat(heading).isVisible();
        assertThat(page.locator("#console-pipeline-root")).isVisible();
        graph.isVisible();
        tree.isVisible();
        logs.isVisible();

        return this;
    }

    public PipelineConsolePage hasStagesInGraph(int count, String... stages) {
        graph.hasStages(count, stages);
        return this;
    }

    public PipelineConsolePage stageIsSelected(String stage) {
        return stageIsSelectedInGraph(stage)
            .selectStageInTree(stage)
            .stageIsSelectedInLogs(stage);
    }

    public PipelineConsolePage stageIsSelectedInGraph(String stage) {
        assertThat(graph.selectedStage()).hasText(stage);

        return this;
    }
    public PipelineConsolePage stageIsSelectedInTree(String stage) {
        assertThat(tree.selectedStage()).hasText(stage);

        return this;
    }
    public PipelineConsolePage stageIsSelectedInLogs(String stage) {
        assertThat(logs.selectedStage()).hasText(stage);

        return this;
    }

    public PipelineConsolePage selectStageInGraph(String stage) {
        graph.selectStage(stage);
        return this;
    }

    public PipelineConsolePage selectStageInTree(String stage, String... nested) {
        tree.selectStage(stage, nested);
        return this;
    }

    public PipelineConsolePage searchForStage(String stage) {
        tree.searchForStage(stage);
        return this;
    }

    public PipelineConsolePage stepContainsText(String stepName, String textToFind) {
        logs.stepContainsText(stepName, textToFind);
        return this;
    }

    public PipelineConsolePage stageHasSteps(String step, String... additional) {
        logs.stageHasSteps(step, additional);
        return this;
    }

    public PipelineConsolePage stageHasState(String stage, PipelineState state) {
        return stageHasStateInGraph(stage, state)
            .stageHasStateInTree(stage, state)
            .stageHasStateInLogs(stage, state);
    }

    public PipelineConsolePage stageHasStateInGraph(String stage, PipelineState state) {
        graph.stageHasState(stage, state);
        return this;
    }

    public PipelineConsolePage stageHasStateInTree(String stage, PipelineState state) {
        tree.searchForStage(stage);
        tree.stageHasState(stage, state);
        return this;
    }

    public PipelineConsolePage stageHasStateInLogs(String stage, PipelineState state) {
        logs.stageHasState(stage, state);
        return this;
    }

    static class ConsoleTree {

        private static final String TASK_LINK_TEXT_CLASS = ".task-link-text";

        private final Locator tree;
        private final Page page;

        public ConsoleTree(Locator tree) {
            this.tree = tree;
            this.page = tree.page();
        }

        public void isVisible() {
            assertThat(tree).isVisible();
        }

        public Locator selectedStage() {
            return tree.locator(".task-link--active " + TASK_LINK_TEXT_CLASS);
        }

        public void searchForStage(String stage) {
            tree.getByRole(AriaRole.SEARCHBOX).fill(stage);
        }

        public void stageHasState(String name, PipelineState state) {
            Locator stage = getStageByName(name);
            System.out.println(stage);
        }

        public void selectStage(String name, String... nested) {
            getStageByName(name, nested).click();
        }

        private Locator getStageByName(String name, String... nested) {
            Function<String, Locator.FilterOptions> filter = text -> new Locator.FilterOptions().setHas(
                page.locator(
                    TASK_LINK_TEXT_CLASS,
                    new Page.LocatorOptions().setHasText(Pattern.compile("^" + text + "$"))
                )
            );

            Locator parent = getStages(tree);
            Locator stage = parent.filter(filter.apply(name)).first();

            for (String nestedName : nested) {
                Locator children = stage.locator("xpath=./following-sibling::div[@class='pgv-tree-children']");
                stage = getStages(children)
                    .filter(filter.apply(nestedName))
                    .first();
            }
            return stage;
        }

        private Locator getStages(Locator root) {
            return root.locator(".pgv-tree-node-header");
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

        public Locator selectedStage() {
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
            // Get the step
            Locator stepContainer = steps().filter(
                new Locator.FilterOptions().setHas(page.locator(
                    STEP_NAME_CLASS,
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

            List<String> foundSteps = steps().locator(STEP_NAME_CLASS).allTextContents();

            expectedSteps.removeAll(foundSteps);

            if (!expectedSteps.isEmpty()) {
                Assertions.fail("Could not find steps with the names:\n  " + String.join("\n  ",expectedSteps));
            }
        }

        public void stageHasState(String stage, PipelineState state) {

        }
    }
}
