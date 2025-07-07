package io.jenkins.plugins.pipelinegraphview.consoleview;

import com.microsoft.playwright.Page;
import com.microsoft.playwright.junit.UsePlaywright;
import hudson.model.Result;
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
class PipelineConsoleViewInputTest {

    @Test
    @ConfiguredWithCode("../configure-appearance.yml")
    void inputWithParametersSucceeds(Page p, JenkinsConfiguredWithCodeRule j) throws Exception {
        WorkflowRun run = TestUtils.createAndRunJobNoWait(
                        j, "input-with-parameters", "input-with-parameters.jenkinsfile")
                .waitForStart();
        new PipelineJobPage(p, run.getParent())
                .goTo()
                .hasBuilds(1)
                .nthBuild(0)
                .goToBuild()
                .goToPipelineOverview()
                .clickInputWithParameters()
                .enterText("Hi there!")
                .proceed();
        j.assertBuildStatus(Result.SUCCESS, j.waitForCompletion(run));
    }

    @Test
    @ConfiguredWithCode("../configure-appearance.yml")
    void inputSucceeds(Page p, JenkinsConfiguredWithCodeRule j) throws Exception {
        WorkflowRun run =
                TestUtils.createAndRunJobNoWait(j, "input", "input.jenkinsfile").waitForStart();

        new PipelineJobPage(p, run.getParent())
                .goTo()
                .hasBuilds(1)
                .nthBuild(0)
                .goToBuild()
                .goToPipelineOverview()
                .clickProceed();

        j.assertBuildStatus(Result.SUCCESS, j.waitForCompletion(run));
    }
}
