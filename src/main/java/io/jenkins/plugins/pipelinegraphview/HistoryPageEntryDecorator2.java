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
import org.kohsuke.accmod.Restricted;
import org.kohsuke.accmod.restrictions.NoExternalUse;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

@Extension(ordinal = Integer.MAX_VALUE)
public class HistoryPageEntryDecorator2 extends HistoryPageEntryDecorator {
    private static final ObjectMapper MAPPER = JsonMapper.builder()
            .changeDefaultPropertyInclusion(inc -> inc.withValueInclusion(JsonInclude.Include.NON_NULL))
            .changeDefaultVisibility(v -> v.withFieldVisibility(JsonAutoDetect.Visibility.ANY))
            .addMixIn(PipelineStage.class, HistoryPagePipelineStageMixIn.class)
            .build();

    private String json;

    @Override
    public boolean isApplicable(@NonNull HistoryWidget<?, ?> widget, @NonNull HistoricalBuild build) {
        if (!(build instanceof WorkflowRun run)) {
            return false;
        }

        run.checkPermission(Item.READ);

        // TODO - Do this without returning children
        PipelineGraph tree = new PipelineGraphApi(run).createTree();
        json = toHistoryPageJson(tree);

        return true;
    }

    static String toHistoryPageJson(PipelineGraph tree) {
        return MAPPER.writeValueAsString(tree);
    }

    @Restricted(NoExternalUse.class)
    public String getJson() {
        return json;
    }

    @JsonIncludeProperties({"id", "name", "state", "startTimeMillis", "totalDurationMillis", "url"})
    private abstract static class HistoryPagePipelineStageMixIn {}
}
