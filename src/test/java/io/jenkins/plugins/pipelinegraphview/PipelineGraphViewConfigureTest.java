package io.jenkins.plugins.pipelinegraphview;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.microsoft.playwright.Page;
import com.microsoft.playwright.junit.UsePlaywright;
import com.microsoft.playwright.options.AriaRole;
import hudson.model.Result;
import hudson.security.FullControlOnceLoggedInAuthorizationStrategy;
import io.jenkins.plugins.casc.misc.ConfiguredWithCode;
import io.jenkins.plugins.casc.misc.JenkinsConfiguredWithCodeRule;
import io.jenkins.plugins.casc.misc.junit.jupiter.WithJenkinsConfiguredWithCode;
import io.jenkins.plugins.pipelinegraphview.playwright.PipelineJobPage;
import io.jenkins.plugins.pipelinegraphview.playwright.PlaywrightConfig;
import io.jenkins.plugins.pipelinegraphview.utils.TestUtils;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.junit.jupiter.api.Test;

@WithJenkinsConfiguredWithCode
@UsePlaywright(PlaywrightConfig.class)
class PipelineGraphViewConfigureTest {

    @Test
    @ConfiguredWithCode("configure-appearance.yml")
    void configureButtonRedirects(Page p, JenkinsConfiguredWithCodeRule j) throws Exception {
        WorkflowRun run =
                TestUtils.createAndRunJob(j, "hello_world", "helloWorldScriptedPipeline.jenkinsfile", Result.SUCCESS);
        new PipelineJobPage(p, run.getParent())
                .goTo()
                .hasBuilds(1)
                .nthBuild(0)
                .goToBuild()
                .goToPipelineOverview()
                .configure();

        String newUrl = p.url();
        String targetUrl = j.getURL() + run.getParent().getUrl() + "configure";
        assertEquals(targetUrl, newUrl);
    }

    @Test
    @ConfiguredWithCode("configure-appearance.yml")
    void noConfigurePermissions(Page p, JenkinsConfiguredWithCodeRule j) throws Exception {
        // Set authorizations strategy to 'Logged-in users can do anything' so anonymous users only have read access
        j.jenkins.setAuthorizationStrategy(new FullControlOnceLoggedInAuthorizationStrategy());
        WorkflowRun run =
                TestUtils.createAndRunJob(j, "hello_world", "helloWorldScriptedPipeline.jenkinsfile", Result.SUCCESS);
        new PipelineJobPage(p, run.getParent())
                .goTo()
                .hasBuilds(1)
                .nthBuild(0)
                .goToBuild()
                .goToPipelineOverview();

        p.click("#console-pipeline-overflow-root");
        assertTrue(p.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Configure"))
                .isHidden());
    }
}
