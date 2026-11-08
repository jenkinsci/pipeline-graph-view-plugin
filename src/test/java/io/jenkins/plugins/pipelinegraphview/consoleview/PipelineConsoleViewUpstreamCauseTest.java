package io.jenkins.plugins.pipelinegraphview.consoleview;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.endsWith;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasEntry;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.startsWith;

import hudson.model.Cause;
import hudson.model.CauseAction;
import hudson.model.FreeStyleProject;
import hudson.model.Item;
import hudson.model.Result;
import hudson.model.User;
import hudson.tasks.BuildTrigger;
import java.util.LinkedHashMap;
import java.util.Map;
import jenkins.model.Jenkins;
import jenkins.model.experimentalflags.UserExperimentalFlagsProperty;
import org.htmlunit.html.DomNode;
import org.htmlunit.html.HtmlAnchor;
import org.htmlunit.html.HtmlPage;
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.Issue;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.MockAuthorizationStrategy;
import org.jvnet.hudson.test.MockFolder;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

@WithJenkins
class PipelineConsoleViewUpstreamCauseTest {

    @Issue("GH#1262")
    @Test
    void upstreamPipelineCauseLinksToUpstreamStages(JenkinsRule j) throws Exception {
        WorkflowRun downstream = runPipelineChain(j, j.jenkins.createProject(WorkflowJob.class, "upstream"));

        try (JenkinsRule.WebClient wc = j.createWebClient()) {
            Map<String, String> links = detailLinks(wc.getPage(downstream, "stages/"));
            assertThat(links.keySet(), not(hasItem(j.contextPath + "/job/upstream/1")));
            assertThat(
                    links,
                    hasEntry(j.contextPath + "/job/upstream/1/stages/", "Started by upstream project upstream #1"));
        }
    }

    @Issue("GH#1262")
    @Test
    void upstreamPipelineCauseLinksToUpstreamStagesOnNewBuildPage(JenkinsRule j) throws Exception {
        j.jenkins.setSecurityRealm(j.createDummySecurityRealm());
        User.getById("alice", true)
                .addProperty(new UserExperimentalFlagsProperty(Map.of("new-build-page.flag", "true")));
        WorkflowRun downstream = runPipelineChain(j, j.jenkins.createProject(WorkflowJob.class, "upstream"));

        try (JenkinsRule.WebClient wc = j.createWebClient().login("alice")) {
            Map<String, String> links = detailLinks(wc.getPage(downstream, "stages/"));
            assertThat(links.keySet(), hasItem(j.contextPath + "/job/upstream/1/stages/"));
            assertThat(links.keySet(), not(hasItem(j.contextPath + "/job/upstream/1")));
        }
    }

    @Issue("GH#1262")
    @Test
    void upstreamPipelineInFolderLinksToUpstreamStages(JenkinsRule j) throws Exception {
        MockFolder folder = j.createFolder("folder");
        WorkflowRun downstream = runPipelineChain(j, folder.createProject(WorkflowJob.class, "upstream"));

        try (JenkinsRule.WebClient wc = j.createWebClient()) {
            assertThat(
                    detailLinks(wc.getPage(downstream, "stages/")),
                    hasEntry(
                            j.contextPath + "/job/folder/job/upstream/1/stages/",
                            "Started by upstream project folder » upstream #1"));
        }
    }

    @Issue("GH#1262")
    @Test
    void upstreamPipelineWithoutReadPermissionIsNotLinked(JenkinsRule j) throws Exception {
        WorkflowRun downstream = runPipelineChain(j, j.jenkins.createProject(WorkflowJob.class, "upstream"));
        j.jenkins.setSecurityRealm(j.createDummySecurityRealm());
        j.jenkins.setAuthorizationStrategy(new MockAuthorizationStrategy()
                .grant(Jenkins.READ)
                .everywhere()
                .to("carol")
                .grant(Item.READ)
                .onItems(downstream.getParent())
                .to("carol"));

        try (JenkinsRule.WebClient wc = j.createWebClient().login("carol")) {
            assertThat(
                    detailLinks(wc.getPage(downstream, "stages/")).keySet(),
                    everyItem(not(startsWith(j.contextPath + "/job/upstream/"))));
        }
    }

    @Issue("GH#1262")
    @Test
    void deletedUpstreamBuildKeepsCoreRendering(JenkinsRule j) throws Exception {
        WorkflowJob upstream = j.jenkins.createProject(WorkflowJob.class, "upstream");
        WorkflowRun downstream = runPipelineChain(j, upstream);
        upstream.getBuildByNumber(1).delete();

        try (JenkinsRule.WebClient wc = j.createWebClient()) {
            Map<String, String> links = detailLinks(wc.getPage(downstream, "stages/"));
            assertThat(links.values(), hasItem("Started by upstream project upstream #1"));
            assertThat(links.keySet(), everyItem(not(endsWith("/stages/"))));
        }
    }

    @Issue("GH#1262")
    @Test
    void upstreamFreestyleCauseKeepsCoreLink(JenkinsRule j) throws Exception {
        WorkflowJob downstreamJob = j.createProject(WorkflowJob.class, "downstream");
        downstreamJob.setDefinition(new CpsFlowDefinition("echo 'downstream'", true));
        FreeStyleProject upstream = j.createFreeStyleProject("upstream");
        upstream.getPublishersList().add(new BuildTrigger("downstream", Result.SUCCESS));
        j.jenkins.rebuildDependencyGraph();
        j.buildAndAssertSuccess(upstream);
        j.waitUntilNoActivity();
        WorkflowRun downstream = downstreamJob.getBuildByNumber(1);

        try (JenkinsRule.WebClient wc = j.createWebClient()) {
            Map<String, String> links = detailLinks(wc.getPage(downstream, "stages/"));
            assertThat(links.keySet(), hasItem(j.contextPath + "/job/upstream/1"));
            assertThat(links.keySet(), not(hasItem(j.contextPath + "/job/upstream/1/stages/")));
        }
    }

    @Test
    void otherCausesUseCoreRendering(JenkinsRule j) throws Exception {
        User.getById("bob", true);
        WorkflowJob job = j.createProject(WorkflowJob.class, "job");
        job.setDefinition(new CpsFlowDefinition("echo 'hello'", true));
        WorkflowRun run =
                j.assertBuildStatusSuccess(job.scheduleBuild2(0, new CauseAction(new Cause.UserIdCause("bob"))));

        try (JenkinsRule.WebClient wc = j.createWebClient()) {
            assertThat(detailLinks(wc.getPage(run, "stages/")).keySet(), hasItem(j.contextPath + "/user/bob"));
        }
    }

    private static WorkflowRun runPipelineChain(JenkinsRule j, WorkflowJob upstream) throws Exception {
        WorkflowJob downstreamJob = j.createProject(WorkflowJob.class, "downstream");
        downstreamJob.setDefinition(new CpsFlowDefinition("echo 'downstream'", true));
        upstream.setDefinition(new CpsFlowDefinition("build '/downstream'", true));
        j.buildAndAssertSuccess(upstream);
        return downstreamJob.getBuildByNumber(1);
    }

    /** The href and normalised text of each link in the details bar. */
    private static Map<String, String> detailLinks(HtmlPage page) {
        Map<String, String> links = new LinkedHashMap<>();
        page.querySelectorAll(".jenkins-details a.jenkins-details__item").stream()
                .map(DomNode.class::cast)
                .filter(HtmlAnchor.class::isInstance)
                .map(HtmlAnchor.class::cast)
                .forEach(a -> links.put(
                        a.getHrefAttribute(), a.getTextContent().strip().replaceAll("\\s+", " ")));
        return links;
    }
}
