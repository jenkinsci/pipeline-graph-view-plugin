package io.jenkins.plugins.pipelinegraphview.utils;

import edu.umd.cs.findbugs.annotations.CheckForNull;
import hudson.model.User;
import java.util.Arrays;
import java.util.List;
import org.jenkinsci.plugins.workflow.support.steps.input.InputStep;

/**
 * An input step that's waiting to be given.
 *
 * @param approvers who the input's {@code submitter} allows to approve it, or {@code null} when
 *     anyone who can build the job can
 */
public record PipelineInputStep(
        String message,
        String cancel,
        String id,
        String ok,
        boolean parameters,
        @CheckForNull List<String> approvers) {

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
                !inputStep.getParameters().isEmpty(),
                approvers(inputStep.getSubmitter()));
    }

    /**
     * The submitters by name. A submitter is a user or group id, so users are shown by their full
     * name and anything else, such as a group, as it's written.
     */
    @CheckForNull
    static List<String> approvers(@CheckForNull String submitter) {
        if (submitter == null) {
            return null;
        }
        List<String> approvers = Arrays.stream(submitter.split(","))
                .map(String::trim)
                .filter(id -> !id.isEmpty())
                .map(id -> {
                    User user = User.getById(id, false);
                    return user == null ? id : user.getFullName();
                })
                .distinct()
                .toList();
        return approvers.isEmpty() ? null : approvers;
    }
}
