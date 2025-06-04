package io.jenkins.plugins.pipelinegraphview;

import com.microsoft.playwright.Page;
import com.microsoft.playwright.junit.UsePlaywright;
import hudson.model.Result;
import io.jenkins.plugins.casc.misc.ConfiguredWithCode;
import io.jenkins.plugins.casc.misc.JenkinsConfiguredWithCodeRule;
import io.jenkins.plugins.casc.misc.junit.jupiter.WithJenkinsConfiguredWithCode;
import io.jenkins.plugins.pipelinegraphview.playwright.PipelineJobPage;
import io.jenkins.plugins.pipelinegraphview.playwright.PlaywrightConfig;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineState;
import io.jenkins.plugins.pipelinegraphview.utils.TestUtils;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.test.steps.SemaphoreStep;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.Issue;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@WithJenkinsConfiguredWithCode
@UsePlaywright(PlaywrightConfig.class)
class PipelineGraphViewTest {
    private static final Logger log = LoggerFactory.getLogger(PipelineGraphViewTest.class);

    // Code generation can be generated against local using to give an idea of what commands to use
    // mvn exec:java -e -D exec.mainClass="com.microsoft.playwright.CLI" -Dexec.classpathScope=test -Dexec.args="codegen
    // http://localhost:8080/jenkins

    @Test
    @ConfiguredWithCode("configure-appearance.yml")
    void smokeTest(Page p, JenkinsConfiguredWithCodeRule j) throws Exception {
        String name = "Integration Tests";
        WorkflowRun run = TestUtils.createAndRunJob(j, name, "smokeTest.jenkinsfile", Result.FAILURE);

        new PipelineJobPage(p, run.getParent())
                .goTo()
                .hasBuilds(1)
                .nthBuild(0)
                .hasStages(7, "Checkout", "Test", "A1", "A2", "Build", "B1", "B2")
                .goToBuild()
                .hasStagesInGraph(4, /*A*/ "Checkout", "Test", /*B*/ "Build", "Parallel")
                .goToPipelineOverview()
                .hasStagesInGraph(4, /*A*/ "Checkout", "Test", /*B*/ "Build", "Parallel")
                .selectStageInGraph("Test")
                .stageIsSelected("Test")
                .searchForStage("B1")
                .selectStageInTree("B1")
                .stageIsSelectedInLogs("B1")
                .stageHasSteps("Test B1", "Sleep", "Determine current directory")
                .stepContainsText("Sleep", "Sleeping for 1 ms")
                .stageHasState("Checkout", PipelineState.SUCCESS)
                .clearSearch()
                .filterBy(PipelineState.UNSTABLE)
                .stageIsVisibleInTree("B2")
                .filterBy(PipelineState.FAILURE)
                .stageIsVisibleInTree("B2")
                .stageIsVisibleInTree("A2")
                .resetFilter()
                .stageIsVisibleInTree("Checkout")
                .stageIsVisibleInTree("A2")
                .stageIsVisibleInTree("B2");
    }

    @Issue("GH#797")
    @Test
    @ConfiguredWithCode("configure-appearance.yml")
    void runningStageSelected(Page p, JenkinsConfiguredWithCodeRule j) throws Exception {
        String name = "gh797";
        WorkflowRun run = TestUtils.createAndRunJobNoWait(j, name, "gh797_errorAndContinueWithWait.jenkinsfile")
                .waitForStart();
        SemaphoreStep.waitForStart("wait/1", run);

        new PipelineJobPage(p, run.getParent())
                .goTo()
                .hasBuilds(1)
                .nthBuild(0)
                .goToBuild()
                .goToPipelineOverview()
                .hasStagesInGraph(2, "Caught1", "Runs1")
                .stageIsVisibleInTree("Parallel1")
                .stageIsVisibleInTree("Runs1")
                .stageIsSelected("Runs1");

        SemaphoreStep.success("wait/1", run);
        j.assertBuildStatus(Result.SUCCESS, j.waitForCompletion(run));
    }

    @Test
    @ConfiguredWithCode("configure-appearance.yml")
    void failedStageSelected(Page p, JenkinsConfiguredWithCodeRule j) throws Exception {
        String name = "Pipeline Success Error Caught";
        WorkflowRun run = TestUtils.createAndRunJob(j, name, "gh797_errorAndContinue.jenkinsfile", Result.SUCCESS);

        new PipelineJobPage(p, run.getParent())
                .goTo()
                .hasBuilds(1)
                .nthBuild(0)
                .goToBuild()
                .goToPipelineOverview()
                .hasStagesInGraph(2, "Caught1", "Runs1")
                .stageIsVisibleInTree("Parallel1")
                .stageIsVisibleInTree("Caught1")
                .stageIsVisibleInTree("Runs1")
                .stageIsSelected("Caught1");
    }

    @Issue("GH#815")
    @Test
    @ConfiguredWithCode("configure-appearance.yml")
    void nestedStage(Page p, JenkinsConfiguredWithCodeRule j) throws Exception {
        String name = "Nested Stage";
        WorkflowRun run = TestUtils.createAndRunJob(j, name, "gh815_nestedStage.jenkinsfile", Result.SUCCESS);

        new PipelineJobPage(p, run.getParent()).goTo().hasBuilds(1).nthBuild(0).hasStages(2, "Parent", "Child");
    }

    @Issue("GH#817")
    @Test
    @ConfiguredWithCode("configure-appearance.yml")
    void unicodePlainTextLogs(Page p, JenkinsConfiguredWithCodeRule j) throws Exception {
        String name = "Stage with Emoji";
        WorkflowRun run = TestUtils.createAndRunJob(j, name, "gh817_unicodePlainTextLogs.jenkinsfile", Result.SUCCESS);

        new PipelineJobPage(p, run.getParent())
                .goTo()
                .hasBuilds(1)
                .nthBuild(0)
                .goToBuild()
                .goToPipelineOverview()
                .hasStagesInGraph(1, "echo")
                .selectStageInGraph("echo")
                .stageHasSteps("\uD83D\uDE00")
                .stepContainsText("\uD83D\uDE00", "\uD83D\uDE00");
    }
}
