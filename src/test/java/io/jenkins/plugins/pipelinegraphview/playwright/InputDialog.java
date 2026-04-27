package io.jenkins.plugins.pipelinegraphview.playwright;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;

public class InputDialog {

    private final Page page;
    private final Locator dialog;

    public InputDialog(Page page) {
        this.page = page;
        this.dialog = page.locator("dialog.jenkins-dialog");
    }

    public InputDialog waitForLoaded() {
        assertThat(dialog).isVisible();
        return this;
    }

    public InputDialog enterText(String value) {
        dialog.getByRole(AriaRole.TEXTBOX).first().fill(value);
        return this;
    }

    public InputDialog selectChoice(String value) {
        dialog.locator("select").first().selectOption(value);
        return this;
    }

    public void proceed() {
        dialog.locator("button[name='proceed']").click();
        assertThat(dialog).not().isVisible();
    }

    public void abort() {
        dialog.locator("button[name='abort']").click();
        assertThat(dialog).not().isVisible();
    }
}
