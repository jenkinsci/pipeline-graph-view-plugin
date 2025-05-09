package io.jenkins.plugins.pipelinegraphview;

import static io.jenkins.plugins.pipelinegraphview.consoleview.PipelineConsoleViewAction.URL_NAME;

import edu.umd.cs.findbugs.annotations.NonNull;
import hudson.Extension;
import hudson.model.Job;
import hudson.model.Run;
import org.jenkinsci.plugins.displayurlapi.DisplayURLProvider;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

@Extension(ordinal = 50) // Take precedence over Blue Ocean if both are installed and there is no configured provider.
public class PipelineGraphDisplayURLProvider extends DisplayURLProvider {

    @Override
    @NonNull
    public String getDisplayName() {
        return "Pipeline Graph";
    }

    @Override
    @NonNull
    public String getName() {
        return "pipeline-graph";
    }

    @Override
    @NonNull
    public String getRunURL(Run<?, ?> run) {
        if (run instanceof WorkflowRun) {
            return DisplayURLProvider.getDefault().getRunURL(run) + URL_NAME;
        }
        return DisplayURLProvider.getDefault().getRunURL(run);
    }

    @Override
    public String getArtifactsURL(Run<?, ?> run) {
        return DisplayURLProvider.getDefault().getArtifactsURL(run);
    }

    @Override
    public String getChangesURL(Run<?, ?> run) {
        return DisplayURLProvider.getDefault().getChangesURL(run);
    }

    @Override
    public String getTestsURL(Run<?, ?> run) {
        return DisplayURLProvider.getDefault().getTestsURL(run);
    }

    @Override
    public String getJobURL(Job<?, ?> job) {
        return DisplayURLProvider.getDefault().getJobURL(job);
    }
}
