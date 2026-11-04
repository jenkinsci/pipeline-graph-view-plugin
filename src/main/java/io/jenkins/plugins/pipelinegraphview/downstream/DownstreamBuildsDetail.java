package io.jenkins.plugins.pipelinegraphview.downstream;

import edu.umd.cs.findbugs.annotations.NonNull;
import hudson.model.Job;
import io.jenkins.plugins.pipelinegraphview.Messages;
import io.jenkins.plugins.pipelinegraphview.consoleview.PipelineConsoleViewAction;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import jenkins.model.Jenkins;
import jenkins.model.details.Detail;
import jenkins.model.lazy.LazyBuildMixIn;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.support.steps.build.DownstreamBuildAction;
import org.kohsuke.accmod.Restricted;
import org.kohsuke.accmod.restrictions.NoExternalUse;
import org.springframework.security.access.AccessDeniedException;

/**
 * Lists the builds a run triggered. Only builds that still exist in jobs the current user can read are included,
 * checked without loading the builds; the dialog listing them is rendered on demand.
 */
public class DownstreamBuildsDetail extends Detail {

    private List<BuildReference> references;

    DownstreamBuildsDetail(@NonNull WorkflowRun run) {
        super(run);
    }

    @Override
    public String getIconClassName() {
        return "symbol-arrow-down-circle-outline plugin-ionicons-api";
    }

    @Override
    public String getDisplayName() {
        int count = getReferences().size();
        return count == 1 ? Messages.DownstreamBuildsDetail_one() : Messages.DownstreamBuildsDetail_many(count);
    }

    public String getTitle() {
        return Messages.DownstreamBuildsDetail_title();
    }

    @Override
    public int getOrder() {
        // after the time-related details
        return -1;
    }

    @Restricted(NoExternalUse.class)
    public synchronized List<BuildReference> getReferences() {
        if (references == null) {
            references = resolveReferences((WorkflowRun) getObject());
        }
        return references;
    }

    private static List<BuildReference> resolveReferences(WorkflowRun run) {
        Set<BuildReference> result = new LinkedHashSet<>();
        DownstreamBuildAction buildStepAction = run.getAction(DownstreamBuildAction.class);
        if (buildStepAction != null) {
            for (DownstreamBuildAction.DownstreamBuild build : buildStepAction.getDownstreamBuilds()) {
                Integer number = build.getBuildNumber();
                if (number != null) {
                    addIfVisible(result, build.getJobFullName(), number);
                }
            }
        }
        TriggeredBuildsAction triggeredAction = run.getAction(TriggeredBuildsAction.class);
        if (triggeredAction != null) {
            for (String id : triggeredAction.getBuilds()) {
                int hash = id.lastIndexOf('#');
                addIfVisible(result, id.substring(0, hash), Integer.parseInt(id.substring(hash + 1)));
            }
        }
        return List.copyOf(result);
    }

    private static void addIfVisible(Set<BuildReference> references, String jobFullName, int number) {
        Job<?, ?> job;
        try {
            job = Jenkins.get().getItemByFullName(jobFullName, Job.class);
        } catch (AccessDeniedException e) {
            // the user can discover the job but not read it
            return;
        }
        if (job != null && buildExists(job, number)) {
            references.add(new BuildReference(job, number));
        }
    }

    private static boolean buildExists(Job<?, ?> job, int number) {
        if (job instanceof LazyBuildMixIn.LazyLoadingJob<?, ?> lazyJob) {
            return lazyJob.getLazyBuildMixIn()._getRuns().runExists(number);
        }
        return job.getBuildByNumber(number) != null;
    }

    @Restricted(NoExternalUse.class)
    public record BuildReference(Job<?, ?> job, int number) {
        public String url() {
            String url = job.getUrl() + number + "/";
            return job instanceof WorkflowJob ? url + PipelineConsoleViewAction.URL_NAME + "/" : url;
        }
    }
}
