package io.jenkins.plugins.pipelinegraphview.consoleview;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

import java.util.List;
import org.junit.jupiter.api.Test;

class ConsoleSectionProcessorTest {

    @Test
    void emptyLogProducesNoEvents() {
        MarkerConsoleSectionAnnotator annotator = new MarkerConsoleSectionAnnotator();
        ConsoleSectionProcessor processor = new ConsoleSectionProcessor(List.of(annotator));
        List<ConsoleSectionProcessor.BoundaryEvent> events = processor.process("");
        assertThat(events, is(empty()));
    }

    @Test
    void noAnnotatorsProducesNoEvents() {
        ConsoleSectionProcessor processor = new ConsoleSectionProcessor(List.of());
        List<ConsoleSectionProcessor.BoundaryEvent> events = processor.process("hello\nworld");
        assertThat(events, is(empty()));
    }

    @Test
    void detectsGroupMarkers() {
        MarkerConsoleSectionAnnotator annotator = new MarkerConsoleSectionAnnotator();
        ConsoleSectionProcessor processor = new ConsoleSectionProcessor(List.of(annotator));

        String log = "line 0\n##[group]Build\ncompiling...\n##[endgroup]\nline 4";
        List<ConsoleSectionProcessor.BoundaryEvent> events = processor.process(log);

        assertThat(events, hasSize(2));

        assertThat(events.get(0).getLineIndex(), is(1));
        assertThat(events.get(0).getType(), is("START"));
        assertThat(events.get(0).getTitle(), is("Build"));

        assertThat(events.get(1).getLineIndex(), is(3));
        assertThat(events.get(1).getType(), is("END"));
        assertThat(events.get(1).getTitle(), nullValue());
    }

    @Test
    void detectsGitHubActionsMarkers() {
        MarkerConsoleSectionAnnotator annotator = new MarkerConsoleSectionAnnotator();
        ConsoleSectionProcessor processor = new ConsoleSectionProcessor(List.of(annotator));

        String log = "::group::Test Suite\nrunning tests\n::endgroup::";
        List<ConsoleSectionProcessor.BoundaryEvent> events = processor.process(log);

        assertThat(events, hasSize(2));
        assertThat(events.get(0).getType(), is("START"));
        assertThat(events.get(0).getTitle(), is("Test Suite"));
        assertThat(events.get(1).getType(), is("END"));
    }

    @Test
    void skipsDisabledAnnotators() {
        ConsoleSectionAnnotator disabled = new ConsoleSectionAnnotator() {
            @Override
            public String getId() {
                return "disabled";
            }

            @Override
            public String getDisplayName() {
                return "Disabled";
            }

            @Override
            public boolean isEnabledByDefault() {
                return false;
            }

            @Override
            public SectionBoundary detect(String line) {
                return SectionBoundary.start("Should not appear");
            }
        };

        ConsoleSectionProcessor processor = new ConsoleSectionProcessor(List.of(disabled));
        List<ConsoleSectionProcessor.BoundaryEvent> events = processor.process("any line");
        assertThat(events, is(empty()));
    }

    @Test
    void firstAnnotatorWinsOnSameLine() {
        ConsoleSectionAnnotator first = new ConsoleSectionAnnotator() {
            @Override
            public String getId() {
                return "first";
            }

            @Override
            public String getDisplayName() {
                return "First";
            }

            @Override
            public SectionBoundary detect(String line) {
                return line.contains("match") ? SectionBoundary.start("First") : SectionBoundary.NONE;
            }
        };

        ConsoleSectionAnnotator second = new ConsoleSectionAnnotator() {
            @Override
            public String getId() {
                return "second";
            }

            @Override
            public String getDisplayName() {
                return "Second";
            }

            @Override
            public SectionBoundary detect(String line) {
                return line.contains("match") ? SectionBoundary.start("Second") : SectionBoundary.NONE;
            }
        };

        ConsoleSectionProcessor processor = new ConsoleSectionProcessor(List.of(first, second));
        List<ConsoleSectionProcessor.BoundaryEvent> events = processor.process("match");

        assertThat(events, hasSize(1));
        assertThat(events.get(0).getTitle(), is("First"));
    }

    @Test
    void resetIsCalledBeforeProcessing() {
        int[] resetCount = {0};
        ConsoleSectionAnnotator counting = new ConsoleSectionAnnotator() {
            @Override
            public String getId() {
                return "counting";
            }

            @Override
            public String getDisplayName() {
                return "Counting";
            }

            @Override
            public void reset() {
                resetCount[0]++;
            }

            @Override
            public SectionBoundary detect(String line) {
                return SectionBoundary.NONE;
            }
        };

        ConsoleSectionProcessor processor = new ConsoleSectionProcessor(List.of(counting));
        processor.process("line 1\nline 2");
        processor.process("line 3");

        assertThat(resetCount[0], is(2));
    }
}
