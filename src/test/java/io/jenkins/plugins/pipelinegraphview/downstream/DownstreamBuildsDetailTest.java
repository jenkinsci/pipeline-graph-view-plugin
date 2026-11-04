package io.jenkins.plugins.pipelinegraphview.downstream;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;

import hudson.model.Item;
import hudson.model.User;
import hudson.security.ACL;
import hudson.security.ACLContext;
import io.jenkins.plugins.pipelinegraphview.downstream.DownstreamBuildsDetail.BuildReference;
import java.util.List;
import jenkins.model.Jenkins;
import jenkins.model.details.Detail;
import jenkins.triggers.ReverseBuildTrigger;
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.MockAuthorizationStrategy;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

@WithJenkins
class DownstreamBuildsDetailTest {

    private JenkinsRule j;
    private WorkflowJob down;

    @BeforeEach
    void setUp(JenkinsRule j) throws Exception {
        this.j = j;
        down = pipeline("down", "echo 'downstream'");
    }

    @Test
    void upstreamTriggerIsLinked() throws Exception {
        WorkflowRun upRun = buildUpstreamWithReverseTrigger();

        DownstreamBuildsDetail detail = detailFor(upRun);
        assertThat(detail.getDisplayName(), is("1 downstream build"));
        assertThat(detail.getReferences(), contains(new BuildReference(down, 1)));
        assertThat(detail.getReferences().get(0).url(), is("job/down/1/stages/"));
    }

    @Test
    void upstreamTriggerSurvivesReload() throws Exception {
        WorkflowRun upRun = buildUpstreamWithReverseTrigger();

        upRun.reload();

        assertThat(upRun.getAction(TriggeredBuildsAction.class).getBuilds(), contains("down#1"));
    }

    @Test
    void buildStepsAreLinked() throws Exception {
        WorkflowRun upRun = j.buildAndAssertSuccess(pipeline("up", "build 'down'\nbuild job: 'down', wait: false"));
        j.waitUntilNoActivity();

        DownstreamBuildsDetail detail = detailFor(upRun);
        assertThat(detail.getDisplayName(), is("2 downstream builds"));
        assertThat(detail.getReferences(), contains(new BuildReference(down, 1), new BuildReference(down, 2)));
    }

    @Test
    void noDetailWithoutDownstreamBuilds() throws Exception {
        WorkflowRun run = j.buildAndAssertSuccess(pipeline("solo", "echo 'hello'"));

        assertThat(new DownstreamBuildsDetailFactory().createFor(run), empty());
    }

    @Test
    void deletedDownstreamBuildIsExcluded() throws Exception {
        WorkflowRun upRun = buildUpstreamWithReverseTrigger();

        down.getBuildByNumber(1).delete();

        assertThat(detailFor(upRun).getReferences(), empty());
    }

    @Test
    void downstreamBuildWithoutReadPermissionIsExcluded() throws Exception {
        WorkflowRun upRun = buildUpstreamWithReverseTrigger();
        WorkflowJob up = upRun.getParent();

        j.jenkins.setSecurityRealm(j.createDummySecurityRealm());
        j.jenkins.setAuthorizationStrategy(new MockAuthorizationStrategy()
                .grant(Jenkins.READ)
                .everywhere()
                .toEveryone()
                .grant(Item.READ)
                .onItems(up)
                .toEveryone()
                .grant(Item.DISCOVER)
                .onItems(down)
                .to("discoverer"));

        for (String user : List.of("reader", "discoverer")) {
            try (ACLContext ignored = ACL.as2(User.getById(user, true).impersonate2())) {
                assertThat(user, detailFor(upRun).getReferences(), empty());
            }
        }
    }

    private WorkflowRun buildUpstreamWithReverseTrigger() throws Exception {
        WorkflowJob up = pipeline("up", "echo 'hello'");
        down.addProperty(new PipelineTriggersJobProperty(List.of(new ReverseBuildTrigger("up"))));
        WorkflowRun upRun = j.buildAndAssertSuccess(up);
        j.waitUntilNoActivity();
        j.assertBuildStatusSuccess(down.getBuildByNumber(1));
        return upRun;
    }

    private WorkflowJob pipeline(String name, String script) throws Exception {
        WorkflowJob job = j.createProject(WorkflowJob.class, name);
        job.setDefinition(new CpsFlowDefinition(script, true));
        return job;
    }

    private static DownstreamBuildsDetail detailFor(WorkflowRun run) {
        List<? extends Detail> details = new DownstreamBuildsDetailFactory().createFor(run);
        assertThat(details, hasSize(1));
        return (DownstreamBuildsDetail) details.get(0);
    }
}
