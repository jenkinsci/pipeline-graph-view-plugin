package io.jenkins.plugins.pipelinegraphview;

import com.microsoft.playwright.Page;
import com.microsoft.playwright.junit.Options;
import com.microsoft.playwright.junit.OptionsFactory;
import com.microsoft.playwright.junit.UsePlaywright;
import hudson.model.Result;
import io.jenkins.plugins.pipelinegraphview.playwright.ManageApperanceJenkinsPage;
import io.jenkins.plugins.pipelinegraphview.playwright.PipelineJobPage;
import io.jenkins.plugins.pipelinegraphview.utils.TestUtils;
import java.util.concurrent.CompletableFuture;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

@WithJenkins
@UsePlaywright(PipelineGraphViewTest.TestOptions.class)
class PipelineGraphViewTest {

    public static class TestOptions implements OptionsFactory {

        @Override
        public Options getOptions() {
            return new Options().setBrowserName("chromium").setHeadless(false);
        }
    }

    // Code generation can be generated against local using to give an idea of what commands to use
    // mvn exec:java -e -D exec.mainClass="com.microsoft.playwright.CLI" -Dexec.classpathScope=test -Dexec.args="codegen
    // http://localhost:8080/jenkins

    @Test
    void doTheThing(Page p, JenkinsRule j) throws Exception {
        String name = "Integration Tests";
        WorkflowRun run = setupJenkins(p, j, name, "nestedScriptedParallel.jenkinsfile");

        new PipelineJobPage(p, run.getParent())
                .goTo()
                .hasBuilds(1)
                .nthBuild(0)
                .hasStages(4)
                .stageHasName(0, "Build")
                .stageHasName(1, "A1")
                .stageHasName(2, "Build")
                .stageHasName(3, "B1")
                .goToBuild();

        Thread.sleep(1000000);
    }

    private static WorkflowRun setupJenkins(Page p, JenkinsRule j, String name, String jenkinsFile) {
        CompletableFuture<WorkflowRun> run = CompletableFuture.supplyAsync(() -> {
            try {
                return TestUtils.createAndRunJob(j, name, jenkinsFile, Result.SUCCESS);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        });
        CompletableFuture<Void> jenkinsSetup =
                CompletableFuture.runAsync(() -> new ManageApperanceJenkinsPage(p, j.jenkins.getRootUrl())
                        .goTo()
                        .displayPipelineOnJobPage()
                        .displayPipelineOnBuildPage()
                        .setPipelineGraphAsConsoleProvider()
                        .save());

        CompletableFuture.allOf(run, jenkinsSetup).join();

        return run.join();
    }
}
