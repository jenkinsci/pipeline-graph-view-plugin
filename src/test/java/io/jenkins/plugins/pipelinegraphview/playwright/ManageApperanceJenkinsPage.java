package io.jenkins.plugins.pipelinegraphview.playwright;

import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;

public class ManageApperanceJenkinsPage extends JenkinsPage<ManageApperanceJenkinsPage> {

    private final String baseUrl;

    public ManageApperanceJenkinsPage(Page page, String baseUrl) {
        super(page, baseUrl + "manage/appearance/");
        this.baseUrl = baseUrl;
    }

    @Override
    void waitForLoaded() {
        isAtUrl(this.pageUrl);
    }

    public ManageApperanceJenkinsPage displayPipelineOnJobPage() {
        page.getByText("Show pipeline graph on job").click();
        return this;
    }

    public ManageApperanceJenkinsPage displayPipelineOnBuildPage() {
        page.getByText("Show pipeline graph on build").click();
        return this;
    }

    public ManageApperanceJenkinsPage setPipelineGraphAsConsoleProvider() {
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Add"))
                .click();
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Pipeline Graph View"))
                .click();
        return this;
    }

    public void save() {
        clickButton("Save");
        isAtUrl(this.baseUrl + "manage/");
    }
}
