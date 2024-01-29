package io.jenkins.plugins.pipelinegraphview.consoleview;

import hudson.Extension;
import hudson.model.Descriptor;
import hudson.model.Run;
import jenkins.console.ConsoleUrlProvider;
import org.jenkinsci.Symbol;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.kohsuke.stapler.DataBoundConstructor;

public class PipelineConsoleViewUrlProvider implements ConsoleUrlProvider {

    @DataBoundConstructor
    public PipelineConsoleViewUrlProvider() {}

    @Override
    public String getConsoleUrl(Run<?, ?> run) {
        if (run instanceof WorkflowRun) {
            return run.getUrl() + PipelineConsoleViewAction.URL_NAME;
        }
        return null;
    }

    @Extension
    @Symbol("pipelineGraphView")
    public static class DescriptorImpl extends Descriptor<ConsoleUrlProvider> {
        @Override
        public String getDisplayName() {
            return "Pipeline Graph View"; // TODO: Would it be better to match the action name ("Pipeline Console")?
        }
    }
}
