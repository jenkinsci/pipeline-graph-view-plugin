package io.jenkins.plugins.pipelinegraphview;

import edu.umd.cs.findbugs.annotations.NonNull;
import hudson.Extension;
import hudson.ExtensionList;
import jenkins.appearance.AppearanceCategory;
import jenkins.model.GlobalConfiguration;
import jenkins.model.GlobalConfigurationCategory;
import org.jenkinsci.Symbol;
import org.kohsuke.stapler.DataBoundSetter;

@Extension
@Symbol("pipelineGraphView")
public class PipelineGraphViewConfiguration extends GlobalConfiguration {

  private boolean showGraphOnJobPage;

  public PipelineGraphViewConfiguration() {
    load();
  }

  public boolean isShowGraphOnJobPage() {
    return showGraphOnJobPage;
  }

  @DataBoundSetter
  public void setShowGraphOnJobPage(boolean showGraphOnJobPage) {
    this.showGraphOnJobPage = showGraphOnJobPage;
    save();
  }

  public static PipelineGraphViewConfiguration get() {
    return ExtensionList.lookupSingleton(PipelineGraphViewConfiguration.class);
  }

  @NonNull
  @Override
  public GlobalConfigurationCategory getCategory() {
    return GlobalConfigurationCategory.get(AppearanceCategory.class);
  }
}
