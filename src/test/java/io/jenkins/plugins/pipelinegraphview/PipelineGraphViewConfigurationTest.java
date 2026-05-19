package io.jenkins.plugins.pipelinegraphview;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.jenkins.plugins.casc.misc.ConfiguredWithCode;
import io.jenkins.plugins.casc.misc.JenkinsConfiguredWithCodeRule;
import io.jenkins.plugins.casc.misc.junit.jupiter.WithJenkinsConfiguredWithCode;
import org.junit.jupiter.api.Test;

@WithJenkinsConfiguredWithCode
class PipelineGraphViewConfigurationTest {

    @Test
    void defaultValues(JenkinsConfiguredWithCodeRule j) {
        PipelineGraphViewConfiguration config = PipelineGraphViewConfiguration.get();
        assertFalse(config.isShowGraphOnJobPage());
        assertFalse(config.isShowStageNames());
        assertFalse(config.isShowStageDurations());
        assertFalse(config.isShowGraphOnBuildPage());
    }

    @Test
    void setAndGet(JenkinsConfiguredWithCodeRule j) {
        PipelineGraphViewConfiguration config = PipelineGraphViewConfiguration.get();
    }

    @Test
    @ConfiguredWithCode("configure-appearance.yml")
    void jcascLoadsAppearanceSettings(JenkinsConfiguredWithCodeRule j) {
        PipelineGraphViewConfiguration config = PipelineGraphViewConfiguration.get();
        assertTrue(config.isShowGraphOnBuildPage());
        assertTrue(config.isShowGraphOnJobPage());
    }
}
