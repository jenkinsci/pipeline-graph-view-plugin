package io.jenkins.plugins.pipelinegraphview.utils;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertTrue;

import hudson.model.Result;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.Issue;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

@WithJenkins
class EarlyConsoleTextTest {
    @Issue("GH#1005")
    @Test
    void earlyWarning(JenkinsRule j) throws Exception {
        String base = j.jenkins.getRootDir().getAbsolutePath();
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "gh_1005_early_warning", "gh_1005_early_warning.jenkinsfile", Result.SUCCESS);

        EarlyConsoleText ect = new EarlyConsoleText(run);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        boolean ok = ect.writeHtmlTo(out);
        assertTrue(ok);
        String s = out.toString(StandardCharsets.UTF_8);

        assertThat(s, containsString("Did you forget the `def` keyword?"));

        // Running on <a href=...>Jenkins</a> in /...
        assertThat(s, containsString("Running on <a"));
        assertThat(s, containsString(">Jenkins</a"));
        assertThat(s, containsString(" in " + base));

        // Does not include pipeline log
        assertThat(s, not(containsString("Minimal Test Case")));
        assertThat(s, not(containsString("target-1")));
    }

    @Issue("GH#566")
    @Test
    void withStageNameOnCutOffLine(JenkinsRule j) throws Exception {
        // Cut-off line is `[Pipeline] { (Wrapper)`
        String base = j.jenkins.getRootDir().getAbsolutePath();
        WorkflowRun run = TestUtils.createAndRunJob(
                j, "gh1286_wrapped_all_skipped", "gh1286_wrapped_all_skipped.jenkinsfile", Result.SUCCESS);

        EarlyConsoleText ect = new EarlyConsoleText(run);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        boolean ok = ect.writeHtmlTo(out);
        assertTrue(ok);
        String s = out.toString(StandardCharsets.UTF_8);

        assertThat(s, containsString("Start of Pipeline"));

        // Does not include pipeline log
        assertThat(s, not(containsString("Wrapper")));
        assertThat(s, not(containsString("Skipped")));
        assertThat(s, not(containsString("Next")));
    }

    @Issue("GH#566")
    @Test
    void nodeDetails(JenkinsRule j) throws Exception {
        String base = j.createSlave("test-agent", "test-agent-label", null).getRemoteFS();
        WorkflowRun run =
                TestUtils.createAndRunJob(j, "gh_566_top_agent", "gh_566_top_agent.jenkinsfile", Result.SUCCESS);

        EarlyConsoleText ect = new EarlyConsoleText(run);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        boolean ok = ect.writeHtmlTo(out);
        assertTrue(ok);
        String s = out.toString(StandardCharsets.UTF_8);

        // Running on <a href=...>test-agent</a> in /...
        assertThat(s, containsString("Running on <a"));
        assertThat(s, containsString(">test-agent</a"));
        assertThat(s, containsString(" in " + base));

        // Does not include pipeline log
        assertThat(s, not(containsString("Hello")));
    }
}
