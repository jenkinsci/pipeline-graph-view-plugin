package io.jenkins.plugins.pipelinegraphview;

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
class PipelineGraphViewScrollTest {

    @Test
    @ConfiguredWithCode("configure-appearance.yml")
    void wheelScrollsWideGraphWithoutZooming(Page p, JenkinsConfiguredWithCodeRule j) throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(j, "wide", "gh240_widePipeline.jenkinsfile", Result.SUCCESS);
        new PipelineJobPage(p, run.getParent())
                .goTo()
                .hasBuilds(1)
                .nthBuild(0)
                .goToBuild()
                .goToPipelineOverview()
                .stageIsSelected("Last")
                .selectStageInTree("First")
                .graphHasTransform("0px", "0.8")
                .scrollGraph(400, 0)
                .graphHasTransform("-400px", "0.8");
    }

    @Test
    @ConfiguredWithCode("configure-appearance.yml")
    void wideGraphOpensAtSelectedStage(Page p, JenkinsConfiguredWithCodeRule j) throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(j, "wide", "gh240_widePipeline.jenkinsfile", Result.SUCCESS);
        new PipelineJobPage(p, run.getParent())
                .goTo()
                .hasBuilds(1)
                .nthBuild(0)
                .goToBuild()
                .goToPipelineOverview()
                .stageIsSelected("Last")
                .stageIsInViewInGraph("Last")
                .stageIsInViewInTree("Last");
    }

    @Test
    @ConfiguredWithCode("configure-appearance.yml")
    void resetResumesFollowingAfterPickingAStageInTheGraph(Page p, JenkinsConfiguredWithCodeRule j) throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(j, "fits", "smokeTest.jenkinsfile", Result.FAILURE);
        new PipelineJobPage(p, run.getParent())
                .goTo()
                .hasBuilds(1)
                .nthBuild(0)
                .goToBuild()
                .goToPipelineOverview()
                .graphResetIsEnabled(false)
                // The whole graph fits, so picking a stage doesn't move it.
                .selectStageInGraph("Checkout")
                .graphResetIsEnabled(true)
                .resetGraph()
                .graphResetIsEnabled(false);
    }
}
