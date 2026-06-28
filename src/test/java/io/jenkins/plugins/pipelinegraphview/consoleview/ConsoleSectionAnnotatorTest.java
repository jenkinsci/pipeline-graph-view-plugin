package io.jenkins.plugins.pipelinegraphview.consoleview;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

@WithJenkins
class ConsoleSectionAnnotatorTest {

    @Test
    void markerAnnotatorIsNotAutoDiscovered(JenkinsRule j) {
        // MarkerConsoleSectionAnnotator no longer has @Extension because the
        // frontend handles markers directly. Verify it does NOT appear in all().
        List<ConsoleSectionAnnotator> annotators =
                ConsoleSectionAnnotator.all().stream().toList();
        List<String> ids =
                annotators.stream().map(ConsoleSectionAnnotator::getId).toList();
        assertThat(ids, not(hasItem("markers")));
    }

    @Test
    void markerAnnotatorDetectsAzureDevOpsGroup(JenkinsRule j) {
        MarkerConsoleSectionAnnotator annotator = new MarkerConsoleSectionAnnotator();
        ConsoleSectionAnnotator.SectionBoundary result = annotator.detect("##[group]Build");
        assertThat(result.getType(), is(ConsoleSectionAnnotator.SectionBoundary.Type.START));
        assertThat(result.getTitle(), is("Build"));
    }

    @Test
    void markerAnnotatorDetectsGitHubActionsGroup(JenkinsRule j) {
        MarkerConsoleSectionAnnotator annotator = new MarkerConsoleSectionAnnotator();
        ConsoleSectionAnnotator.SectionBoundary result = annotator.detect("::group::Test Suite");
        assertThat(result.getType(), is(ConsoleSectionAnnotator.SectionBoundary.Type.START));
        assertThat(result.getTitle(), is("Test Suite"));
    }

    @Test
    void markerAnnotatorDetectsEndgroup(JenkinsRule j) {
        MarkerConsoleSectionAnnotator annotator = new MarkerConsoleSectionAnnotator();
        assertThat(annotator.detect("##[endgroup]").getType(), is(ConsoleSectionAnnotator.SectionBoundary.Type.END));
        assertThat(annotator.detect("::endgroup::").getType(), is(ConsoleSectionAnnotator.SectionBoundary.Type.END));
    }

    @Test
    void markerAnnotatorRejectsShellTrace(JenkinsRule j) {
        MarkerConsoleSectionAnnotator annotator = new MarkerConsoleSectionAnnotator();
        ConsoleSectionAnnotator.SectionBoundary result = annotator.detect("+ echo ##[group]Build");
        assertThat(result.getType(), is(ConsoleSectionAnnotator.SectionBoundary.Type.NONE));
    }

    @Test
    void markerAnnotatorHandlesAnsiEscapes(JenkinsRule j) {
        MarkerConsoleSectionAnnotator annotator = new MarkerConsoleSectionAnnotator();
        ConsoleSectionAnnotator.SectionBoundary result = annotator.detect("\033[32m##[group]Colored\033[0m");
        assertThat(result.getType(), is(ConsoleSectionAnnotator.SectionBoundary.Type.START));
        assertThat(result.getTitle(), is("Colored"));
    }

    @Test
    void markerAnnotatorUsesDefaultTitleWhenEmpty(JenkinsRule j) {
        MarkerConsoleSectionAnnotator annotator = new MarkerConsoleSectionAnnotator();
        ConsoleSectionAnnotator.SectionBoundary result = annotator.detect("##[group]");
        assertThat(result.getType(), is(ConsoleSectionAnnotator.SectionBoundary.Type.START));
        assertThat(result.getTitle(), is("Section"));
    }

    @Test
    void markerAnnotatorReturnsNoneForPlainLine(JenkinsRule j) {
        MarkerConsoleSectionAnnotator annotator = new MarkerConsoleSectionAnnotator();
        ConsoleSectionAnnotator.SectionBoundary result = annotator.detect("just a normal line");
        assertThat(result.getType(), is(ConsoleSectionAnnotator.SectionBoundary.Type.NONE));
    }

    @Test
    void sectionBoundaryStartCarriesTitle(JenkinsRule j) {
        ConsoleSectionAnnotator.SectionBoundary boundary = ConsoleSectionAnnotator.SectionBoundary.start("My Title");
        assertThat(boundary.getType(), is(ConsoleSectionAnnotator.SectionBoundary.Type.START));
        assertThat(boundary.getTitle(), is("My Title"));
    }

    @Test
    void sectionBoundaryEndAndNoneHaveNoTitle(JenkinsRule j) {
        assertThat(ConsoleSectionAnnotator.SectionBoundary.END.getTitle(), nullValue());
        assertThat(ConsoleSectionAnnotator.SectionBoundary.NONE.getTitle(), nullValue());
    }

    @Test
    void markerAnnotatorIsEnabledByDefault(JenkinsRule j) {
        MarkerConsoleSectionAnnotator annotator = new MarkerConsoleSectionAnnotator();
        assertThat(annotator.isEnabledByDefault(), is(true));
    }
}
