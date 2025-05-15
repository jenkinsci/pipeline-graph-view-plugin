package io.jenkins.plugins.pipelinegraphview.playwright;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class ManageAppearancePage extends JenkinsPage<ManageAppearancePage> {

    private static final Logger log = LoggerFactory.getLogger(ManageAppearancePage.class);
    private final String baseUrl;

    public ManageAppearancePage(Page page, String baseUrl) {
        super(page, baseUrl + "manage/appearance/");
        this.baseUrl = baseUrl;
    }

    public ManageAppearancePage displayPipelineOnJobPage() {
        log.info("Clicking on the 'Show pipeline graph on job' checkbox");
        page.getByText("Show pipeline graph on job").click();
        return this;
    }

    public ManageAppearancePage displayPipelineOnBuildPage() {
        log.info("Clicking on the 'Show pipeline graph on build' checkbox");
        page.getByText("Show pipeline graph on build").click();
        return this;
    }

    public ManageAppearancePage setPipelineGraphAsConsoleProvider() {
        log.info("Setting pipeline graph as console provider");
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Add"))
                .click();
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Pipeline Graph View"))
                .click();
        return this;
    }

    public void save() {
        log.info("Saving the changes");
        Locator button = page.getByRole(
                AriaRole.BUTTON, new Page.GetByRoleOptions().setExact(true).setName("Save"));
        assertThat(button).isEnabled();
        button.click();
        isAtUrl(this.baseUrl + "manage/");
    }
}
