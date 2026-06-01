package io.jenkins.plugins.pipelinegraphview.consoleview;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Built-in annotator that detects {@code ##[group]Title / ##[endgroup]}
 * and {@code ::group::Title / ::endgroup::} markers in console output.
 *
 * <p>This is the server-side counterpart to the frontend marker parser
 * in {@code parseConsoleSections.ts}. Both must agree on the syntax.
 *
 * <p>Not registered as an {@code @Extension} because the frontend already
 * handles these markers directly. This class exists for third-party code
 * that may instantiate it explicitly.
 */
public class MarkerConsoleSectionAnnotator extends ConsoleSectionAnnotator {

    // Same ANSI stripping as the frontend.
    private static final Pattern ANSI_RE = Pattern.compile("\033\\[[0-9;]*[a-zA-Z]");
    private static final Pattern GROUP_START = Pattern.compile("^(?:##\\[group\\]|::group::)\\s*(.*)$");
    private static final Pattern GROUP_END = Pattern.compile("^(?:##\\[endgroup\\]|::endgroup::)\\s*$");

    @Override
    public String getId() {
        return "markers";
    }

    @Override
    public String getDisplayName() {
        return "Section Markers";
    }

    @Override
    public SectionBoundary detect(String line) {
        String stripped = ANSI_RE.matcher(line).replaceAll("").stripLeading();

        // Reject shell trace lines.
        if (stripped.startsWith("+ ")) {
            return SectionBoundary.NONE;
        }

        Matcher startMatch = GROUP_START.matcher(stripped);
        if (startMatch.matches()) {
            String title = startMatch.group(1);
            return SectionBoundary.start(title.isEmpty() ? "Section" : title);
        }

        if (GROUP_END.matcher(stripped).matches()) {
            return SectionBoundary.END;
        }

        return SectionBoundary.NONE;
    }
}
