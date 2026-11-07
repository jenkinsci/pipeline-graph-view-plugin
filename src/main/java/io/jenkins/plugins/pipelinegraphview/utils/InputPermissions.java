package io.jenkins.plugins.pipelinegraphview.utils;

import hudson.model.Job;
import hudson.security.SecurityRealm;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeoutException;
import jenkins.model.IdStrategy;
import jenkins.model.Jenkins;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.support.steps.input.InputAction;
import org.jenkinsci.plugins.workflow.support.steps.input.InputStep;
import org.jenkinsci.plugins.workflow.support.steps.input.InputStepExecution;
import org.kohsuke.accmod.Restricted;
import org.kohsuke.accmod.restrictions.NoExternalUse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * What the current user can do with an input step a run is waiting on.
 *
 * <p>Graphs and steps are cached and shared by every user, so these are worked out per request
 * and added to the JSON as it's written, as {@code canProceed} and {@code canAbort} on each
 * {@code inputStep}.
 */
@Restricted(NoExternalUse.class)
public record InputPermissions(boolean canProceed, boolean canAbort) {

    private static final Logger logger = LoggerFactory.getLogger(InputPermissions.class);

    /** The current user's permissions for each input the run is waiting on, by input id. */
    public static Map<String, InputPermissions> forCurrentUser(WorkflowRun run) {
        InputAction action = run.getAction(InputAction.class);
        if (action == null || !run.isBuilding()) {
            return Map.of();
        }
        Map<String, InputPermissions> permissions = new HashMap<>();
        try {
            for (InputStepExecution execution : action.getExecutions()) {
                permissions.put(execution.getId(), of(execution.getInput(), run.getParent()));
            }
        } catch (InterruptedException | TimeoutException e) {
            logger.warn("Could not get the inputs {} is waiting on", run, e);
        }
        return permissions;
    }

    /** Sets {@code canProceed} and {@code canAbort} on every {@code inputStep} in the JSON. */
    public static void apply(JsonNode json, Map<String, InputPermissions> permissions) {
        if (permissions.isEmpty()) {
            return;
        }
        if (json instanceof ObjectNode object && object.get("inputStep") instanceof ObjectNode inputStep) {
            InputPermissions found = permissions.get(inputStep.path("id").asString());
            inputStep.put("canProceed", found != null && found.canProceed());
            inputStep.put("canAbort", found != null && found.canAbort());
        }
        for (JsonNode child : json) {
            apply(child, permissions);
        }
    }

    static InputPermissions of(InputStep input, Job<?, ?> job) {
        boolean canProceed = canProceed(input, job);
        return new InputPermissions(canProceed, canProceed || canCancel(job));
    }

    /**
     * Mirrors the private checks in {@code InputStepExecution}, which has the final say when the
     * input is submitted: without a {@code submitter}, it needs Job/Build. With one, it needs to be
     * one of the listed users or groups, or an administrator.
     */
    private static boolean canProceed(InputStep input, Job<?, ?> job) {
        String submitter = input.getSubmitter();
        if (submitter == null) {
            return job.hasPermission(Job.BUILD);
        }
        Jenkins jenkins = Jenkins.get();
        if (!jenkins.isUseSecurity() || jenkins.hasPermission(Jenkins.ADMINISTER)) {
            return true;
        }
        String[] submitters = submitter.split(",");
        SecurityRealm realm = jenkins.getSecurityRealm();
        Authentication authentication = Jenkins.getAuthentication2();
        if (isMember(authentication.getName(), submitters, realm.getUserIdStrategy())) {
            return true;
        }
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            if (isMember(authority.getAuthority(), submitters, realm.getGroupIdStrategy())) {
                return true;
            }
        }
        return false;
    }

    private static boolean canCancel(Job<?, ?> job) {
        return !Jenkins.get().isUseSecurity() || job.hasPermission(Job.CANCEL);
    }

    private static boolean isMember(String id, String[] submitters, IdStrategy idStrategy) {
        return Arrays.stream(submitters).anyMatch(submitter -> idStrategy.equals(id, submitter.trim()));
    }
}
