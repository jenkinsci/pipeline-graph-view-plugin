package io.jenkins.plugins.pipelinegraphview.playwright;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import java.util.function.Function;
import java.util.regex.Pattern;

public class PipelineConsolePage extends JenkinsPage<PipelineConsolePage> {
    private final String buildName;
    private final ConsoleGraph graph;
    private final ConsoleTree tree;
    private final ConsoleLogs logs;

    public PipelineConsolePage(Page page, String pageUrl, String buildName) {
        super(page, pageUrl);
        this.buildName = buildName;
        graph = new ConsoleGraph(page.locator(".PWGx-PipelineGraph-container"));
        tree = new ConsoleTree(page.locator("#tree-view-pane"));
        logs = new ConsoleLogs(page.locator("#stage-view-pane"));
    }

    @Override
    PipelineConsolePage waitForLoaded() {
        super.waitForLoaded();

        Locator heading = page.getByRole(AriaRole.HEADING, new Page.GetByRoleOptions().setLevel(1).setName(buildName));
        assertThat(heading).isVisible();
        assertThat(page.locator("#console-pipeline-root")).isVisible();
        assertThat(graph.element).isVisible();
        assertThat(tree.tree).isVisible();
        assertThat(logs.logs).isVisible();

        return this;
    }

    public PipelineConsolePage hasStagesInGraph(int count, String... names) {
        graph.hasStages(count, names);
        return this;
    }

    public PipelineConsolePage stageIsSelected(String name) {
        assertThat(graph.selectedStage()).hasText(name);
        assertThat(tree.selectedStage()).hasText(name);
        assertThat(logs.selectedStage()).hasText(name);

        return this;
    }

    public PipelineConsolePage selectStageInGraph(String name) {
        graph.selectStage(name);
        return this;
    }

    public PipelineConsolePage selectStageInTree(String name, String... nested) {
        tree.selectStage(name, nested);
        return this;
    }

    static class ConsoleGraph {

        private final Locator element;
        private final PipelineGraph graph;

        public ConsoleGraph(Locator element) {
            this.element = element;
            graph = new PipelineGraph(element);
        }

        public Locator selectedStage() {
            return graph.selectedStage();
        }

        public void selectStage(String name) {
            graph.selectStage(name);
        }

        public void hasStages(int count, String... names) {
            graph.hasStages(count, names);
        }
    }

    static class ConsoleTree {

        private static final String TASK_LINK_TEXT_CLASS = ".task-link-text";

        private final Locator tree;
        private final Page page;

        public ConsoleTree(Locator tree) {
            this.tree = tree;
            this.page = tree.page();
        }

        public Locator selectedStage() {
            return tree.locator(".task-link--active " + TASK_LINK_TEXT_CLASS);
        }

        public void selectStage(String name, String... nested) {
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

            stage.click();
        }

        private Locator getStages(Locator root) {
            return root.locator(".pgv-tree-node-header");
        }
    }

    static class ConsoleLogs {
        private final Locator logs;

        public ConsoleLogs(Locator logs) {
            this.logs = logs;
        }

        public Locator selectedStage() {
            return logs.locator(".pgv-stage-details h2");
        }
    }
}
