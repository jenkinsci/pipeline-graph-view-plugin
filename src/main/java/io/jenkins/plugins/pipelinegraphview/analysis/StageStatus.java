package io.jenkins.plugins.pipelinegraphview.analysis;

/**
 * Duplicates some string constants used in pipeline-stage-tags-metadata plugin to avoid introducing the dependency.
 * See: https://github.com/jenkinsci/pipeline-model-definition-plugin/tree/master/pipeline-stage-tags-metadata
 *
 * @author cliffmeyers
 */
public class StageStatus {

    public static final String TAG_NAME = "STAGE_STATUS";

    public String getTagName() {
        return TAG_NAME;
    }

    public static String getSkippedForConditional() {
        return "SKIPPED_FOR_CONDITIONAL";
    }
}
