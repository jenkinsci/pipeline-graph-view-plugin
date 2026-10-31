package io.jenkins.plugins.pipelinegraphview;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.startsWith;

import hudson.model.Result;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineGraphApi;
import io.jenkins.plugins.pipelinegraphview.utils.TestUtils;
import java.util.List;
import java.util.stream.StreamSupport;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@WithJenkins
class PipelineStagesEntryDecoratorTest {

    private JenkinsRule j;

    @BeforeEach
    void setUp(JenkinsRule j) {
        this.j = j;
    }

    @Test
    void keepsChildrenOfMatrixStages() throws Exception {
        JsonNode stages = historyPageStages("matrix", "matrix.jenkinsfile");

        assertThat(stages.size(), is(1));
        JsonNode matrix = stages.get(0);
        assertThat(matrix.path("name").asString(), is("BuildAndTest"));
        assertThat(matrix.path("children").size(), is(12));
        for (JsonNode branch : matrix.path("children")) {
            assertThat(branch.path("type").asString(), is("PARALLEL"));
            assertThat(branch.path("name").asString(), startsWith("Matrix - PLATFORM = "));
            assertThat(names(branch.path("children")), contains("Build", "Test"));
        }
    }

    @Test
    void dropsChildrenOfOtherStages() throws Exception {
        JsonNode stages = historyPageStages("parallel", "complexParallelSmokes.jenkinsfile");

        assertThat(names(stages), hasSize(3));
        for (JsonNode stage : stages) {
            assertThat(stage.has("children"), is(false));
            assertThat(stage.has("type"), is(false));
        }
    }

    private JsonNode historyPageStages(String jobName, String jenkinsFile) throws Exception {
        WorkflowRun run = TestUtils.createAndRunJob(j, jobName, jenkinsFile, Result.SUCCESS);
        String json = PipelineStagesEntryDecorator.toHistoryPageJson(new PipelineGraphApi(run).createTree(), null);
        return JsonMapper.builder().build().readTree(json).path("stages");
    }

    private static List<String> names(JsonNode stages) {
        return StreamSupport.stream(stages.spliterator(), false)
                .map(stage -> stage.path("name").asString())
                .toList();
    }
}
