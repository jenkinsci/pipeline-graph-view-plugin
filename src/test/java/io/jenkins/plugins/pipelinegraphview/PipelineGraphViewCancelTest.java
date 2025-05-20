package io.jenkins.plugins.pipelinegraphview;

import com.microsoft.playwright.Page;
import com.microsoft.playwright.junit.UsePlaywright;
import hudson.model.Result;
import io.jenkins.plugins.pipelinegraphview.playwright.ManageAppearancePage;
import io.jenkins.plugins.pipelinegraphview.playwright.PipelineJobPage;
import io.jenkins.plugins.pipelinegraphview.playwright.PlaywrightConfig;
import io.jenkins.plugins.pipelinegraphview.utils.TestUtils;
import java.util.concurrent.CompletableFuture;
import java.util.function.Supplier;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.test.steps.SemaphoreStep;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.util.function.ThrowingSupplier;

@WithJenkins
@UsePlaywright(PlaywrightConfig.class)
class PipelineGraphViewCancelTest {

    private static final Logger log = LoggerFactory.getLogger(PipelineGraphViewCancelTest.class);

    @Test
    void cancelButtonCancelsBuild(Page p, JenkinsRule j) throws Exception {
        WorkflowRun run = setupJenkins(p, j.jenkins.getRootUrl(), (ThrowingSupplier<WorkflowRun>)
                () -> TestUtils.createAndRunJobNoWait(j, "indefiniteWait", "indefiniteWait.jenkinsfile")
                        .waitForStart());
        SemaphoreStep.waitForStart("wait/1", run);
        new PipelineJobPage(p, run.getParent())
                .goTo()
                .hasBuilds(1)
                .nthBuild(0)
                .goToBuild()
                .goToPipelineOverview()
                .cancel();
        SemaphoreStep.success("wait/1", null);
        j.assertBuildStatus(Result.ABORTED, j.waitForCompletion(run));
    }

    private WorkflowRun setupJenkins(Page p, String rootUrl, Supplier<WorkflowRun> setupRun) {
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
