package io.jenkins.plugins.pipelinegraphview.utils;

import hudson.console.LineTransformationOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

public class EarlyConsoleText {
    private final WorkflowRun run;

    public EarlyConsoleText(WorkflowRun run) {
        this.run = run;
    }

    private static class FoundStart extends IOException {}

    public boolean writeHtmlTo(OutputStream out) throws IOException {
        try (OutputStream scanForStart = new LineTransformationOutputStream() {
            @Override
            protected void eol(byte[] b, int len) throws IOException {
                String line = new String(b, 0, len, StandardCharsets.UTF_8);
                if (line.startsWith("</span><span class=\"pipeline-new-node\" nodeId=")
                        && line.contains(">[Pipeline] {")) {
                    throw new FoundStart();
                }
                out.write(b, 0, len);
            }
        }) {
            long r = run.getLogText().writeHtmlTo(0, new OutputStreamWriter(scanForStart, StandardCharsets.UTF_8));
            return r > 0;
        } catch (IOException e) {
            if (e instanceof FoundStart) {
                return true;
            }
            throw e;
        }
    }
}
