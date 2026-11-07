package io.jenkins.plugins.pipelinegraphview.utils;

import edu.umd.cs.findbugs.annotations.CheckForNull;
import org.jenkinsci.plugins.workflow.support.steps.input.InputStep;

public record PipelineInputStep(String message, String cancel, String id, String ok, boolean parameters) {

    @CheckForNull
    static PipelineInputStep of(@CheckForNull InputStep inputStep) {
        if (inputStep == null) {
            return null;
        }
        return new PipelineInputStep(
                inputStep.getMessage(),
                inputStep.getCancel(),
                inputStep.getId(),
                inputStep.getOk(),
                !inputStep.getParameters().isEmpty());
    }
}
