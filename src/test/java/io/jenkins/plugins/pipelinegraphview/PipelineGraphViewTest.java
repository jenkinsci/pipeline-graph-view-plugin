package io.jenkins.plugins.pipelinegraphview;

import com.microsoft.playwright.Page;
import com.microsoft.playwright.junit.UsePlaywright;
import hudson.model.Result;
import io.jenkins.plugins.pipelinegraphview.playwright.ManageAppearancePage;
import io.jenkins.plugins.pipelinegraphview.playwright.PipelineJobPage;
import io.jenkins.plugins.pipelinegraphview.playwright.PlaywrightConfig;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineState;
import io.jenkins.plugins.pipelinegraphview.utils.TestUtils;
import java.util.concurrent.CompletableFuture;
import java.util.function.Supplier;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.util.function.ThrowingSupplier;

@WithJenkins
@UsePlaywright(PlaywrightConfig.class)
class PipelineGraphViewTest {
    private static final Logger log = LoggerFactory.getLogger(PipelineGraphViewTest.class);

    // Code generation can be generated against local using to give an idea of what commands to use
    // mvn exec:java -e -D exec.mainClass="com.microsoft.playwright.CLI" -Dexec.classpathScope=test -Dexec.args="codegen
    // http://localhost:8080/jenkins

    @Test
    void smokeTest(Page p, JenkinsRule j) {
        String name = "Integration Tests";
        WorkflowRun run = setupJenkins(p, j.jenkins.getRootUrl(), (ThrowingSupplier<WorkflowRun>)
                () -> TestUtils.createAndRunJob(j, name, "smokeTest.jenkinsfile", Result.FAILURE));

        new PipelineJobPage(p, run.getParent())
                .goTo()
                .hasBuilds(1)
                .nthBuild(0)
                .hasStages(6, "Checkout", "A1", "A2", "Build", "B1", "B2")
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

    private static WorkflowRun setupJenkins(Page p, String rootUrl, Supplier<WorkflowRun> setupRun) {
        CompletableFuture<WorkflowRun> run = CompletableFuture.supplyAsync(setupRun);
        CompletableFuture<Void> jenkinsSetup = CompletableFuture.runAsync(() -> {
            log.info("Setting up Jenkins to have the Pipeline Graph View on all pages");
            new ManageAppearancePage(p, rootUrl)
                    .goTo()
                    .displayPipelineOnJobPage()
                    .displayPipelineOnBuildPage()
                    .setPipelineGraphAsConsoleProvider()
                    .save();
            log.info("Jenkins setup complete");
        });

        CompletableFuture.allOf(run, jenkinsSetup).join();

        return run.join();
    }
}
