/*
 * The MIT License
 *
 * Copyright (c) 2026, Jan Faracik
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

package io.jenkins.plugins.pipelinegraphview;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonIncludeProperties;
import hudson.Extension;
import hudson.model.Item;
import hudson.widgets.HistoryWidget;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineGraph;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineGraphApi;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineStage;
import jenkins.model.HistoricalBuild;
import jenkins.widgets.HistoryPageEntryDecorator;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jspecify.annotations.NonNull;
import org.jspecify.annotations.Nullable;
import org.kohsuke.accmod.Restricted;
import org.kohsuke.accmod.restrictions.NoExternalUse;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/**
 * Shows a run's stages in its build history entry.
 */
@Extension(ordinal = Integer.MAX_VALUE)
public class PipelineStagesEntryDecorator extends HistoryPageEntryDecorator {
    private static final ObjectMapper MAPPER = JsonMapper.builder()
            .changeDefaultPropertyInclusion(inc -> inc.withValueInclusion(JsonInclude.Include.NON_NULL))
            .changeDefaultVisibility(v -> v.withFieldVisibility(JsonAutoDetect.Visibility.ANY))
            .addMixIn(PipelineStage.class, HistoryPagePipelineStageMixIn.class)
            .build();

    @Override
    public boolean isApplicable(@NonNull HistoryWidget<?, ?> widget, @NonNull HistoricalBuild build) {
        if (!(build instanceof WorkflowRun run)) {
            return false;
        }

        run.checkPermission(Item.READ);

        return true;
    }

    // The decorator is shared by every entry, so the JSON is built per entry rather than stored on the decorator
    @Restricted(NoExternalUse.class)
    public String getJson(@NonNull HistoricalBuild build) {
        WorkflowRun run = (WorkflowRun) build;
        // TODO - Do this without returning children
        PipelineGraph tree = new PipelineGraphApi(run).createTree();
        WorkflowRun previous = tree.complete ? null : run.getPreviousBuild();
        return toHistoryPageJson(tree, previous == null ? null : new PipelineGraphApi(previous).createTree());
    }

    /**
     * While a run is in progress, also includes the previous run's stages so the frontend can show
     * the stages still to come as placeholders.
     */
    static String toHistoryPageJson(PipelineGraph tree, @Nullable PipelineGraph previous) {
        ObjectNode json = MAPPER.valueToTree(tree);
        if (previous != null) {
            json.set("previousStages", MAPPER.<ObjectNode>valueToTree(previous).get("stages"));
        }
        return MAPPER.writeValueAsString(json);
    }

    @JsonIncludeProperties({"id", "name", "state", "startTimeMillis", "totalDurationMillis", "url"})
    private abstract static class HistoryPagePipelineStageMixIn {}
}
