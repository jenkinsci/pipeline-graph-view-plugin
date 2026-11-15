package io.jenkins.plugins.pipelinegraphview.playwright;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import java.net.URI;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class PipelineJobPage extends JenkinsPage<PipelineJobPage> {

    private static final Logger log = LoggerFactory.getLogger(PipelineJobPage.class);
    private final String jobName;

    public PipelineJobPage(Page page, WorkflowJob job) {
        super(page, job.getAbsoluteUrl());
        jobName = job.getDisplayName();
    }

    @Override
    PipelineJobPage waitForLoaded() {
        super.waitForLoaded();
        Locator heading = page.getByRole(
                AriaRole.HEADING, new Page.GetByRoleOptions().setName(jobName).setLevel(1));
        assertThat(heading).isVisible();
        // The new job page lists builds with their stages instead of showing the stages card
        assertThat(getPipelineSection().or(getBuildsList()).first()).isVisible();
        return this;
    }

    public PipelineJobPage hasBuilds(int count) {
        log.info("Checking that {} builds are visible for the job {}", count, jobName);
        assertThat(getBuilds()).hasCount(count);
        log.info("Verified {} builds are visible", count);
        return this;
    }

    private boolean isNewJobPage() {
        return getPipelineSection().count() == 0;
    }

    private Locator getPipelineSection() {
        return page.locator("#multiple-pipeline-root");
    }

    private Locator getBuildsList() {
        return page.locator("#jenkins-build-history");
    }

    private Locator getBuilds() {
        if (isNewJobPage()) {
            return getBuildsList().locator(".app-temporary-list__item");
        }
        return getPipelineSection().locator(".pgv-single-run");
    }

    public PipelineBuild nthBuild(int index) {
        log.info("Getting the {} build for the job {}", index, jobName);
        Locator build = getBuilds().nth(index);
        assertThat(build).isVisible();

        return new PipelineBuild(this, build, isNewJobPage());
    }

    public static class PipelineBuild {

        private final PipelineJobPage parent;
        private final Locator wrapper;
        private final boolean newJobPage;

        PipelineBuild(PipelineJobPage parent, Locator wrapper, boolean newJobPage) {
            this.parent = parent;
            this.wrapper = wrapper;
            this.newJobPage = newJobPage;
        }

        /**
         * Checks the stages shown in the stages card's graph. The new job page has no stages card, so this does
         * nothing there, see {@link #hasStagesInBuildsList} instead.
         */
        public PipelineBuild hasStages(int count, String... names) {
            if (newJobPage) {
                log.info("Skipping the stages card graph check as the new job page doesn't show it");
                return this;
            }
            new PipelineGraph(wrapper.locator(".PWGx-PipelineGraph-container")).hasStages(count, names);
            return this;
        }

        /**
         * Checks the top-level stages the new job page's builds list shows for the build. The old job page shows
         * the stages card instead, so this does nothing there, see {@link #hasStages} instead.
         */
        public PipelineBuild hasStagesInBuildsList(int count, String... names) {
            if (!newJobPage) {
                log.info("Skipping the builds list stages check as the old job page doesn't show them");
                return this;
            }
            log.info("Checking that {} stages are listed for the build", count);
            assertThat(wrapper.locator(".pgv-run-snippet__summary"))
                    .containsText(count + " stage" + (count == 1 ? "" : "s"));

            Locator stages = wrapper.locator(".pgv-run-snippet").getByRole(AriaRole.LINK);
            for (int i = 0; i < names.length; i++) {
                stages.nth(i).hover();
                assertThat(parent.page.locator(".tippy-box")).containsText(names[i]);
            }
            return this;
        }

        public PipelineBuildPage goToBuild() {
            Locator link = newJobPage
                    ? wrapper.locator(".app-temporary-list__item__label")
                    : wrapper.getByRole(AriaRole.LINK).nth(0);
            String relativeBuildUrl = link.getAttribute("href");
            String buildName = newJobPage
                    ? link.textContent().trim()
                    : link.textContent()
                            .replace(link.locator("span").textContent(), "") // remove timing info
                            .trim();

            link.click();

            String pageUrl =
                    URI.create(parent.pageUrl).resolve(relativeBuildUrl).toString();

            pageUrl = pageUrl.endsWith("/") ? pageUrl : pageUrl + "/";

            return new PipelineBuildPage(parent.page, pageUrl, buildName).waitForLoaded();
        }
    }
}
