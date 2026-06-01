package io.jenkins.plugins.pipelinegraphview.consoleview;

import edu.umd.cs.findbugs.annotations.CheckForNull;
import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Processes console log text through registered {@link ConsoleSectionAnnotator}
 * instances and collects section boundary events.
 *
 * <p>A fresh processor is created per request. It clones each annotator so
 * shared singleton instances from {@code ExtensionList} are never mutated
 * concurrently.
 */
public class ConsoleSectionProcessor {

    private final List<ConsoleSectionAnnotator> annotators;

    public ConsoleSectionProcessor(List<ConsoleSectionAnnotator> annotators) {
        // Filter to only enabled annotators and clone each so shared singletons
        // are never mutated by concurrent requests.
        List<ConsoleSectionAnnotator> cloned = new ArrayList<>();
        for (ConsoleSectionAnnotator a : annotators) {
            if (a.isEnabledByDefault()) {
                cloned.add(a.clone());
            }
        }
        this.annotators = Collections.unmodifiableList(cloned);
    }

    /**
     * Process raw log text and return boundary events.
     *
     * @param logText raw plain-text log output (not HTML)
     * @return ordered list of boundary events with line indices
     */
    public List<BoundaryEvent> process(String logText) {
        if (annotators.isEmpty() || logText.isEmpty()) {
            return Collections.emptyList();
        }
        try {
            return process(new java.io.ByteArrayInputStream(logText.getBytes(StandardCharsets.UTF_8)));
        } catch (IOException e) {
            // ByteArrayInputStream never throws IOException in practice.
            return Collections.emptyList();
        }
    }

    /**
     * Process log content from an input stream, reading line by line to avoid
     * buffering the entire log as a single String.
     *
     * @param input stream of raw plain-text log output (UTF-8)
     * @return ordered list of boundary events with line indices
     */
    public List<BoundaryEvent> process(InputStream input) throws IOException {
        if (annotators.isEmpty()) {
            return Collections.emptyList();
        }

        List<BoundaryEvent> events = new ArrayList<>();
        for (ConsoleSectionAnnotator a : annotators) {
            a.reset();
        }

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(input, StandardCharsets.UTF_8))) {
            String line;
            int lineIndex = 0;
            while ((line = reader.readLine()) != null) {
                for (ConsoleSectionAnnotator annotator : annotators) {
                    ConsoleSectionAnnotator.SectionBoundary boundary = annotator.detect(line);
                    if (boundary.getType() != ConsoleSectionAnnotator.SectionBoundary.Type.NONE) {
                        events.add(new BoundaryEvent(
                                lineIndex,
                                boundary.getType() == ConsoleSectionAnnotator.SectionBoundary.Type.START
                                        ? "START"
                                        : "END",
                                boundary.getTitle()));
                        break;
                    }
                }
                lineIndex++;
            }
        }
        return events;
    }

    /**
     * Creates an OutputStream that processes log lines incrementally as bytes
     * are written. Call {@link LineProcessingOutputStream#getEvents()} after
     * writing is complete to retrieve the collected boundary events.
     *
     * <p>This avoids buffering the entire log in memory - lines are processed
     * and discarded as they arrive.
     */
    public LineProcessingOutputStream createOutputStream() {
        return new LineProcessingOutputStream();
    }

    /**
     * An OutputStream that feeds lines directly into the processor's annotators
     * as they are written, avoiding a full in-memory buffer of the log.
     */
    public class LineProcessingOutputStream extends OutputStream {
        private final ByteArrayOutputStream lineBuffer = new ByteArrayOutputStream(512);
        private final List<BoundaryEvent> events = new ArrayList<>();
        private int lineIndex = 0;

        private LineProcessingOutputStream() {
            for (ConsoleSectionAnnotator a : annotators) {
                a.reset();
            }
        }

        @Override
        public void write(int b) throws IOException {
            if (b == '\n') {
                processLine();
            } else {
                lineBuffer.write(b);
            }
        }

        @Override
        public void write(byte[] buf, int off, int len) throws IOException {
            int end = off + len;
            for (int i = off; i < end; i++) {
                if (buf[i] == '\n') {
                    // Flush everything before the newline as part of the current line
                    if (i > off) {
                        lineBuffer.write(buf, off, i - off);
                    }
                    processLine();
                    off = i + 1;
                }
            }
            // Buffer remaining bytes (partial line)
            if (off < end) {
                lineBuffer.write(buf, off, end - off);
            }
        }

        @Override
        public void close() throws IOException {
            // Process any remaining partial line (no trailing newline)
            if (lineBuffer.size() > 0) {
                processLine();
            }
        }

        private void processLine() {
            String line = lineBuffer.toString(StandardCharsets.UTF_8);
            lineBuffer.reset();
            for (ConsoleSectionAnnotator annotator : annotators) {
                ConsoleSectionAnnotator.SectionBoundary boundary = annotator.detect(line);
                if (boundary.getType() != ConsoleSectionAnnotator.SectionBoundary.Type.NONE) {
                    events.add(new BoundaryEvent(
                            lineIndex,
                            boundary.getType() == ConsoleSectionAnnotator.SectionBoundary.Type.START ? "START" : "END",
                            boundary.getTitle()));
                    break;
                }
            }
            lineIndex++;
        }

        /** Returns the boundary events collected during writing. */
        public List<BoundaryEvent> getEvents() {
            return Collections.unmodifiableList(events);
        }
    }

    /**
     * A single section boundary event at a specific line index.
     */
    public static final class BoundaryEvent {
        private final int lineIndex;
        private final String type;
        private final String title;

        public BoundaryEvent(int lineIndex, String type, @CheckForNull String title) {
            this.lineIndex = lineIndex;
            this.type = type;
            this.title = title;
        }

        public int getLineIndex() {
            return lineIndex;
        }

        /** "START" or "END". */
        public String getType() {
            return type;
        }

        @CheckForNull
        public String getTitle() {
            return title;
        }
    }
}
