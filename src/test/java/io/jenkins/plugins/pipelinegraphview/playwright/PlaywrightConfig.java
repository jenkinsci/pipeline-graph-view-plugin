package io.jenkins.plugins.pipelinegraphview.playwright;

import com.microsoft.playwright.junit.Options;
import com.microsoft.playwright.junit.OptionsFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class PlaywrightConfig implements OptionsFactory {

    private static final Logger log = LoggerFactory.getLogger(PlaywrightConfig.class);

    @Override
    public Options getOptions() {
        boolean headless = Boolean.parseBoolean(System.getProperty("playwright.headless", "true"));
        log.info("Running Playwright in {} mode", headless ? "headless" : "headed");
        return new Options().setBrowserName("chromium").setHeadless(headless);
    }
}
