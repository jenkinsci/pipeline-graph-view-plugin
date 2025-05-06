package io.jenkins.plugins.pipelinegraphview.playwright;

import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import org.jvnet.hudson.test.JenkinsRule;

public class ManageApperanceJenkinsPage extends JenkinsPage<ManageApperanceJenkinsPage> {

    private final String pageUrl;

    public ManageApperanceJenkinsPage(Page page, JenkinsRule rule) {
        super(page, rule);
        pageUrl = this.baseUrl + "manage/appearance/";
    }

    @Override
    ManageApperanceJenkinsPage waitForLoaded() {
        isAtUrl(pageUrl);
        return this;
    }


    public ManageApperanceJenkinsPage goTo() {
        return goTo(pageUrl).waitForLoaded();
    }

    public ManageApperanceJenkinsPage displayPipelineOnJobPage() {
        page.getByText("Show pipeline graph on job").click();
        return this;
    }

    public ManageApperanceJenkinsPage displayPipelineOnBuildPage() {
        page.getByText("Show pipeline graph on build").click();
        return this;
    }

    public ManageApperanceJenkinsPage addPipelineAsConsoleProvider() {
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Add")).click();
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Pipeline Graph View")).click();
        return this;
    }

    public void save() {
        clickButton("Save");
        isAtUrl(this.baseUrl + "manage/");
    }
}
