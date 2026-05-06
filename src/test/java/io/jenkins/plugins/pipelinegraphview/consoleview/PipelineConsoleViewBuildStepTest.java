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
class PipelineConsoleViewBuildStepTest {

    @Test
    @ConfiguredWithCode("../configure-appearance.yml")
    void buildStepLinkHasStagesSuffix(Page p, JenkinsConfiguredWithCodeRule j) throws Exception {
        TestUtils.createJob(j, "downstream", "helloWorldScriptedPipeline.jenkinsfile");
        WorkflowRun run = TestUtils.createAndRunJob(j, "upstream", "buildStep.jenkinsfile", Result.SUCCESS);

        new PipelineJobPage(p, run.getParent())
                .goTo()
                .hasBuilds(1)
                .nthBuild(0)
                .goToBuild()
                .goToPipelineOverview()
                .selectStageInGraph("Trigger")
                .buildStepLinkHasStagesSuffix();
    }

    @Test
    @ConfiguredWithCode("../configure-appearance.yml")
    void waitForBuildStepLinkHasStagesSuffix(Page p, JenkinsConfiguredWithCodeRule j) throws Exception {
        TestUtils.createJob(j, "downstream", "helloWorldScriptedPipeline.jenkinsfile");
        WorkflowRun run = TestUtils.createAndRunJob(j, "upstream", "waitForBuildStep.jenkinsfile", Result.SUCCESS);

        new PipelineJobPage(p, run.getParent())
                .goTo()
                .hasBuilds(1)
                .nthBuild(0)
                .goToBuild()
                .goToPipelineOverview()
                .selectStageInGraph("Trigger")
                .buildStepLinkHasStagesSuffix();
    }
}
