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

class PipelineConsole {
    private static final Logger log = LoggerFactory.getLogger(PipelineConsole.class);

    private static final String STEP_NAME_CLASS = ".pgv-step-detail-header__content";

    private final Locator logs;
    private final Page page;

    public PipelineConsole(Locator logs) {
        this.logs = logs;
        this.page = logs.page();
    }

    public void isVisible() {
        assertThat(logs).isVisible();
    }

    public void stageIsSelected(String name) {
        assertThat(selectedStage()).hasText(name);
    }

    private Locator selectedStage() {
        log.info("Getting selected stage from the logs");
        return logs.getByRole(AriaRole.HEADING, new Locator.GetByRoleOptions().setLevel(2));
    }

    private Locator steps() {
        return logs.locator(".pgv-step-detail-group");
    }

    private boolean isOpenStep(Locator step) {
        String[] classes =
                step.locator(".pgv-step-detail-header").getAttribute("class").split(" ");
        for (String clazz : classes) {
            if (clazz.equals("jenkins-button--tertiary")) {
                return false;
            }
        }
        return true;
    }

    public void stepContainsText(String stepName, String textToFind) {
        log.info("Checking that the step {} contains a log with the text {}", stepName, textToFind);

        Locator stepContainer = steps().filter(new Locator.FilterOptions()
                        .setHas(page.locator(
                                STEP_NAME_CLASS,
                                new Page.LocatorOptions().setHasText(Pattern.compile("^" + stepName + "$")))))
                .first();

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

        List<String> foundSteps = steps().locator(STEP_NAME_CLASS).allTextContents();

        expectedSteps.removeAll(foundSteps);

        if (!expectedSteps.isEmpty()) {
            Assertions.fail("Could not find steps with the names:\n  " + String.join("\n  ", expectedSteps)
                    + "\nFound steps:\n" + String.join("\n  ", foundSteps));
        }
    }

    public void stageHasState(String stage, PipelineState state) {
        this.stageIsSelected(stage);

        log.info("Checking if stage {} has state {} in the logs", stage, state);
        Locator stateSVG = selectedStage().locator("..").getByRole(AriaRole.IMG);
        assertThat(stateSVG).hasAccessibleName(state.toString());
    }
}
