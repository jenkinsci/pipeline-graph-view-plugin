package io.jenkins.plugins.pipelinegraphview.playwright;

import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;

public class InputPage extends JenkinsPage<InputPage> {

    protected InputPage(Page page, String baseUrl) {
        super(page, baseUrl + "input/");
    }

    public InputPage enterText(String input) {
        page.getByRole(AriaRole.TEXTBOX).fill(input);
        return this;
    }

    public void proceed() {
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("proceed"))
                .click();
    }

    public void abort() {
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("abort"))
                .click();
    }
}
