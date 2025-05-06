package io.jenkins.plugins.pipelinegraphview.playwright;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

abstract class JenkinsPage<T extends JenkinsPage<T>> {
    private static final Logger log = LoggerFactory.getLogger(JenkinsPage.class);
    protected final String pageUrl;
    protected final Page page;

    protected JenkinsPage(Page page, String pageUrl) {
        this.page = page;
        this.pageUrl = pageUrl;
    }

    abstract void waitForLoaded();

    @SuppressWarnings("unchecked")
    public T goTo() {
        log.info("Navigating to {}", pageUrl);
        page.navigate(pageUrl);
        waitForLoaded();
        return (T) this;
    }

    void clickButton(String name) {
        Locator button = page.getByRole(
                AriaRole.BUTTON, new Page.GetByRoleOptions().setExact(true).setName(name));
        assertThat(button).isEnabled();
        button.click();
    }

    void isAtUrl(String url) {
        log.info("Waiting for url to be {}", url);
        page.waitForURL(url);
    }
}
