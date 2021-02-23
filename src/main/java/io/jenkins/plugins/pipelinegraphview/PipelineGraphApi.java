package io.jenkins.plugins.pipelinegraphview;

import org.jenkinsci.plugins.workflow.job.WorkflowRun;

import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

import static java.util.Arrays.asList;
import static java.util.Collections.emptyList;

public class PipelineGraphApi {

    private transient WorkflowRun run;

    public PipelineGraphApi(WorkflowRun run) {
        this.run = run;
    }

    public PipelineGraph createGraph() {
        PipelineNodeGraphVisitor builder = new PipelineNodeGraphVisitor(run);
        List<PipelineStage> stages = builder.getPipelineNodes()
                .stream()
                .map(flowNodeWrapper -> new PipelineStage(
                        Integer.parseInt(flowNodeWrapper.getId()),
                        flowNodeWrapper.getDisplayName(),
                        emptyList(), // TODO implement child
                        flowNodeWrapper.getStatus().result.name(),
                        50, // TODO how ???
                        flowNodeWrapper.getType().name(),
                        flowNodeWrapper.getDisplayName() // TODO why duplicated
                ))
                .collect(Collectors.toList());

        return new PipelineGraph(stages);
    }
}