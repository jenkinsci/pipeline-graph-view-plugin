package io.jenkins.plugins.pipelinegraphview;

import edu.umd.cs.findbugs.annotations.NonNull;
import hudson.Extension;
import hudson.Util;
import hudson.model.Run;
import org.jenkinsci.plugins.displayurlapi.ClassicDisplayURLProvider;

@Extension
public class PipelineGraphDisplayURLProvider extends ClassicDisplayURLProvider {

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
        return getRoot() + Util.encode(run.getUrl()) + "pipeline-graph";
    }
}
