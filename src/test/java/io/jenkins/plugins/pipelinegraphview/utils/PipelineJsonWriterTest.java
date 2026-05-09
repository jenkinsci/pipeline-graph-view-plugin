package io.jenkins.plugins.pipelinegraphview.utils;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;

import io.jenkins.plugins.pipelinegraphview.analysis.TimingInfo;
import java.io.ByteArrayOutputStream;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import net.sf.json.JSONArray;
import net.sf.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Pins the {@code /allSteps} wire format. The frontend depends on this shape; if you're
 * changing something here you're changing a public HTTP contract.
 */
class PipelineJsonWriterTest {

    @Test
    void stepListSerializesToExpectedShape() throws Exception {
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

        JSONObject json = serialize(new PipelineStepList(List.of(running, completed, withInput), false));
        assertThat(json.getBoolean("runIsComplete"), is(false));

        JSONArray steps = json.getJSONArray("steps");
        assertThat(steps.size(), is(3));

        JSONObject first = steps.getJSONObject(0);
        assertThat(first.getString("id"), is("3"));
        assertThat(first.getString("state"), is("running"));
        assertThat(first.getString("stageId"), is("2"));
        // totalDurationMillis omitted for in-progress steps.
        assertThat(first.has("totalDurationMillis"), is(false));
        assertThat(first.has("inputStep"), is(false));
        assertThat(first.getJSONObject("flags").isEmpty(), is(true));

        JSONObject second = steps.getJSONObject(1);
        assertThat(second.getLong("totalDurationMillis"), is(1500L));
        assertThat(second.getJSONObject("flags").getBoolean("hidden"), is(true));

        JSONObject third = steps.getJSONObject(2);
        assertThat(third.getString("state"), is("paused"));
        JSONObject input = third.getJSONObject("inputStep");
        assertThat(input.getString("message"), is("Deploy to prod?"));
        assertThat(input.getBoolean("parameters"), is(true));
    }

    @Test
    void emptyStepListSerializesToExpectedShape() throws Exception {
        JSONObject json = serialize(new PipelineStepList(true));
        assertThat(json.getBoolean("runIsComplete"), is(true));
        assertThat(json.getJSONArray("steps").isEmpty(), is(true));
    }

    @Test
    void stageSerializesIsSequentialKey() throws Exception {
        PipelineStage stage = new PipelineStage(
                "7",
                "Build",
                List.of(),
                PipelineState.SUCCESS,
                "STAGE",
                "",
                null,
                null,
                true,
                false,
                false,
                new TimingInfo(500, 0, 1_700_000_002_000L),
                "built-in",
                "job/example/1/",
                null);

        PipelineGraph graph = new PipelineGraph(List.of(stage), true);
        JSONObject json = serialize(graph);
        assertThat(json.getBoolean("complete"), is(true));
        JSONObject s = json.getJSONArray("stages").getJSONObject(0);
        assertThat(s, is(notNullValue()));
        assertThat(s.getBoolean("isSequential"), is(true));
        assertThat(s.has("sequential"), is(false));
        assertThat(s.has("nextSibling"), is(false));
        assertThat(s.has("seqContainerName"), is(false));
        assertThat(s.getString("agent"), is("built-in"));
    }

    /**
     * Returns the {@code data} payload from the Stapler envelope that {@link PipelineJsonWriter}
     * emits. Tests elsewhere assert the envelope ({@code status}/{@code data}) shape.
     */
    private static JSONObject serialize(Object value) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PipelineJsonWriter.write(value, baos);
        JSONObject envelope = JSONObject.fromObject(baos.toString("UTF-8"));
        assertThat(envelope.getString("status"), is("ok"));
        return envelope.getJSONObject("data");
    }
}
