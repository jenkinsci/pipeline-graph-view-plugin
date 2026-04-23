package io.jenkins.plugins.pipelinegraphview.utils;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.equalTo;

import io.jenkins.plugins.pipelinegraphview.analysis.TimingInfo;
import java.io.ByteArrayOutputStream;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import net.sf.json.JSONObject;
import net.sf.json.JsonConfig;
import org.junit.jupiter.api.Test;

/**
 * Pins the Jackson writer against the legacy net.sf.json bean-processor output so a
 * wire-format regression fails this test rather than the frontend.
 */
class PipelineStepListJsonWriterTest {

    @Test
    void matchesLegacyOutputForRunningAndCompletedSteps() throws Exception {
        assertMatches(build());
    }

    @Test
    void matchesLegacyOutputForEmptyList() throws Exception {
        assertMatches(new PipelineStepList(true));
    }

    private static void assertMatches(PipelineStepList list) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PipelineStepListJsonWriter.write(list, baos);
        String jacksonOutput = baos.toString("UTF-8");

        JsonConfig config = new JsonConfig();
        PipelineStepList.PipelineStepListJsonProcessor.configure(config);
        String legacyOutput = JSONObject.fromObject(list, config).toString();

        // Jackson may emit keys/values in a different order than net.sf.json, so compare
        // parsed trees rather than raw strings.
        JSONObject parsedJackson = JSONObject.fromObject(jacksonOutput);
        JSONObject parsedLegacy = JSONObject.fromObject(legacyOutput);
        assertThat(parsedJackson, equalTo(parsedLegacy));
    }

    private static PipelineStepList build() {
        Map<String, Object> hiddenFlag = new LinkedHashMap<>();
        hiddenFlag.put("hidden", Boolean.TRUE);

        PipelineStep running = new PipelineStep(
                "3",
                "echo hello",
                PipelineState.RUNNING,
                "STEP",
                "Print Message",
                "2",
                null,
                new TimingInfo(0, 0, 1_700_000_000_000L),
                Map.of());

        PipelineStep completed = new PipelineStep(
                "4",
                "sh build.sh",
                PipelineState.SUCCESS,
                "STEP",
                "Shell Script",
                "2",
                null,
                new TimingInfo(1500, 0, 1_700_000_000_500L),
                hiddenFlag);

        PipelineStep withInput = new PipelineStep(
                "5",
                "Deploy?",
                PipelineState.PAUSED,
                "STEP",
                "",
                "2",
                new PipelineInputStep("Deploy to prod?", "Cancel", "input-1", "Proceed", true),
                new TimingInfo(0, 200, 1_700_000_001_000L),
                Map.of());

        return new PipelineStepList(List.of(running, completed, withInput), false);
    }
}
