package io.jenkins.plugins.pipelinegraphview;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import com.github.benmanes.caffeine.cache.Cache;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.junit.UsePlaywright;
import hudson.model.Result;
import io.jenkins.plugins.casc.misc.ConfiguredWithCode;
import io.jenkins.plugins.casc.misc.JenkinsConfiguredWithCodeRule;
import io.jenkins.plugins.casc.misc.junit.jupiter.WithJenkinsConfiguredWithCode;
import io.jenkins.plugins.pipelinegraphview.livestate.LiveGraphRegistry;
import io.jenkins.plugins.pipelinegraphview.playwright.PipelineBuildPage;
import io.jenkins.plugins.pipelinegraphview.playwright.PipelineJobPage;
import io.jenkins.plugins.pipelinegraphview.playwright.PlaywrightConfig;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineGraphViewCache;
import io.jenkins.plugins.pipelinegraphview.utils.TestUtils;
import java.io.File;
import java.lang.reflect.Field;
import java.nio.file.Files;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.test.steps.SemaphoreStep;
import org.junit.jupiter.api.Test;

/**
 * End-to-end check that a force-killed run's graph is rendered in a real browser, including
 * after a page reload (the tree response is served as immutable once the graph is recovered).
 */
@WithJenkinsConfiguredWithCode
@UsePlaywright(PlaywrightConfig.class)
class RecoveredGraphPageTest {

    @Test
    @ConfiguredWithCode("configure-appearance.yml")
    void recoveredStagesRenderAndSurviveReload(Page p, JenkinsConfiguredWithCodeRule j) throws Exception {
        WorkflowRun run = TestUtils.createAndRunJobNoWait(j, "recover-page", "indefiniteWait.jenkinsfile")
                .waitForStart();
        SemaphoreStep.waitForStart("wait/1", run);
        run.doKill();
        j.assertBuildStatus(Result.ABORTED, j.waitForCompletion(run));

        // As after a plugin upgrade/restart: no live state and no cached graph, only node files.
        clearLiveStates();
        Files.deleteIfExists(new File(run.getRootDir(), PipelineGraphViewCache.TREE_FILE_NAME).toPath());

        PipelineBuildPage buildPage = new PipelineJobPage(p, run.getParent())
                .goTo()
                .hasBuilds(1)
                .nthBuild(0)
                .goToBuild();
        buildPage.hasStagesInGraph(1, "Wait");

        p.reload();
        buildPage.hasStagesInGraph(1, "Wait");

        buildPage.goToPipelineOverview().hasStagesInGraph(1, "Wait");
        p.reload();
        assertThat(p.locator(".PWGx-PipelineGraph-container")).isVisible();
        assertThat(p.locator("#tree-view-pane")).isVisible();
    }

    private static void clearLiveStates() throws Exception {
        LiveGraphRegistry registry = LiveGraphRegistry.get();
        Field states = registry.getClass().getDeclaredField("states");
        states.setAccessible(true);
        ((Cache<?, ?>) states.get(registry)).invalidateAll();
    }
}
