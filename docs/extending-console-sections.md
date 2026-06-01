# Extending Console Sections

Plugin authors can contribute custom collapsible section rules to Pipeline Graph View. There are two extension points depending on how much control you need.

## Dependency

Add Pipeline Graph View as a dependency in your plugin's `pom.xml`:

```xml
<dependency>
    <groupId>io.jenkins.plugins</groupId>
    <artifactId>pipeline-graph-view</artifactId>
    <version><!-- use latest --></version>
</dependency>
```

## Option 1: ConsoleSectionRule (regex-based)

For simple cases where a start line and end line can each be matched with a single regex. Rules are sent to the frontend and applied client-side as console output streams in.

Extend `ConsoleSectionRule` and annotate with `@Extension`:

```java
import hudson.Extension;
import io.jenkins.plugins.pipelinegraphview.consoleview.ConsoleSectionRule;

@Extension
public class MavenPhaseRule extends ConsoleSectionRule {

    @Override
    public String getId() {
        return "maven-phase";
    }

    @Override
    public String getDisplayName() {
        return "Maven Phase";
    }

    @Override
    public String getStartPattern() {
        // First capture group, if present, becomes the section title.
        return "\\[INFO\\] --- (.+) ---";
    }

    @Override
    public String getEndPattern() {
        return "\\[INFO\\] --- .+ ---|\\[INFO\\] BUILD";
    }

    @Override
    public boolean isEnabledByDefault() {
        return true;
    }
}
```

## Option 2: ConsoleSectionAnnotator (stateful, server-side)

For cases where detection requires state across lines - for example, grouping a stack trace that starts with an exception line and ends when indentation stops. Annotators run server-side, line by line, and can maintain state per log stream.

Extend `ConsoleSectionAnnotator` and annotate with `@Extension`:

```java
import hudson.Extension;
import io.jenkins.plugins.pipelinegraphview.consoleview.ConsoleSectionAnnotator;

@Extension
public class StackTraceAnnotator extends ConsoleSectionAnnotator {

    private boolean inTrace = false;

    @Override
    public String getId() {
        return "stack-trace";
    }

    @Override
    public String getDisplayName() {
        return "Stack Trace";
    }

    @Override
    public SectionBoundary detect(String line) {
        if (!inTrace && line.matches(".*Exception.*")) {
            inTrace = true;
            return SectionBoundary.start(line.trim());
        }
        if (inTrace && !line.startsWith("\tat ") && !line.startsWith("Caused by:")) {
            inTrace = false;
            return SectionBoundary.END;
        }
        return SectionBoundary.NONE;
    }

    @Override
    public void reset() {
        inTrace = false;
    }
}
```

`detect(String line)` is called once per line in order. Return `SectionBoundary.start("Title")` to open a section, `SectionBoundary.END` to close it, or `SectionBoundary.NONE` to do nothing. `reset()` is called before each new log stream.

## Which to use

|           | `ConsoleSectionRule`                     | `ConsoleSectionAnnotator`                              |
| --------- | ---------------------------------------- | ------------------------------------------------------ |
| Detection | Regex pair (start / end)                 | Line-by-line with state                                |
| Runs      | Client-side (frontend)                   | Server-side                                            |
| Title     | First capture group or full line         | Set dynamically in `detect()`                          |
| Use for   | Simple delimited output (npm, pip, etc.) | Context-dependent grouping (stack traces, test suites) |

`##[group]` / `::group::` markers in console output are always detected regardless of any registered extensions.
