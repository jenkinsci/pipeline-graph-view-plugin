package io.jenkins.plugins.pipelinegraphview.playwright;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import java.io.IOException;
import java.io.UncheckedIOException;
import org.jvnet.hudson.test.JenkinsRule;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

abstract class JenkinsPage<T extends JenkinsPage<T>> {
    private static final Logger log = LoggerFactory.getLogger(JenkinsPage.class);
    protected final String baseUrl;
    protected final JenkinsRule rule;
    protected final Page page;

    protected JenkinsPage(Page page, JenkinsRule rule) {
        this.page = page;
        try {
            this.rule = rule;
            this.baseUrl = rule.getURL().toString();
        } catch (IOException e) {
            throw new UncheckedIOException("Could not get base url of jenkins", e);
        }
    }

    abstract T waitForLoaded();

    @SuppressWarnings("unchecked")
    T goTo(String url) {
        log.info("Navigating to {}", url);
        page.navigate(url);
        return (T) this;
    }

    void clickButton(String name) {
        Locator button = page.getByRole(
            AriaRole.BUTTON,
            new Page.GetByRoleOptions()
            .setExact(true)
            .setName(name)
        );
        assertThat(button).isEnabled();
        button.click();
    }

    void isAtUrl(String url) {
        log.info("Waiting for url to be {}", url);
        page.waitForURL(url);
    }

}
