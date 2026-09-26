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

import hudson.Extension;
import hudson.model.Item;
import hudson.widgets.HistoryWidget;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineGraph;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineGraphApi;
import io.jenkins.plugins.pipelinegraphview.utils.PipelineStage;
import jenkins.model.HistoricalBuild;
import jenkins.widgets.HistoryPageEntryDecorator;
import net.sf.json.JSONObject;
import net.sf.json.JsonConfig;
import net.sf.json.processors.JsonBeanProcessor;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jspecify.annotations.NonNull;
import org.kohsuke.accmod.Restricted;
import org.kohsuke.accmod.restrictions.NoExternalUse;

@Extension(ordinal = Integer.MAX_VALUE)
public class HistoryPageEntryDecorator2 extends HistoryPageEntryDecorator {
    private static final JsonConfig historyPageJsonConfig = new JsonConfig();

    static {
//        PipelineGraph.PipelineGraphJsonProcessor.configure(historyPageJsonConfig);
        historyPageJsonConfig.registerJsonBeanProcessor(
                PipelineStage.class, new HistoryPagePipelineStageJsonProcessor());
    }

    private String json;

    @Override
    public boolean isApplicable(@NonNull HistoryWidget<?, ?> widget, @NonNull HistoricalBuild build) {
        if (!(build instanceof WorkflowRun run)) {
            return false;
        }

        run.checkPermission(Item.READ);

        // TODO - Do this without returning children
        PipelineGraph tree = new PipelineGraphApi(run).createTree();
        json = toHistoryPageJson(tree).toString(2);

        return true;
    }

    static JSONObject toHistoryPageJson(PipelineGraph tree) {
        return JSONObject.fromObject(tree, historyPageJsonConfig);
    }

    @Restricted(NoExternalUse.class)
    public String getJson() {
        return json;
    }

    private static final class HistoryPagePipelineStageJsonProcessor implements JsonBeanProcessor {
        @Override
        public JSONObject processBean(Object bean, JsonConfig config) {
            if (!(bean instanceof PipelineStage stage)) {
                return null;
            }

            JSONObject json = new JSONObject();
            json.element("id", stage.getId());
            json.element("name", stage.getName());
            json.element("state", stage.getState(), config);
            json.element("startTimeMillis", stage.getStartTimeMillis());
            json.element("totalDurationMillis", stage.getTotalDurationMillis());
            json.element("url", stage.getUrl());
            return json;
        }
    }
}
