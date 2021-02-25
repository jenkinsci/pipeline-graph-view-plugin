package io.jenkins.plugins.pipelinegraphview;

import org.jenkinsci.plugins.workflow.job.WorkflowRun;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import static java.util.Collections.emptyList;

public class PipelineGraphApi {

    private transient WorkflowRun run;

    public PipelineGraphApi(WorkflowRun run) {
        this.run = run;
    }

    public PipelineGraph createGraph() {
        PipelineNodeGraphVisitor builder = new PipelineNodeGraphVisitor(run);
        List<PipelineStageInternal> stages = builder.getPipelineNodes()
                .stream()
                .map(flowNodeWrapper -> new PipelineStageInternal(
                        Integer.parseInt(flowNodeWrapper.getId()), // TODO no need to parse it BO returns a string even though the datatype is number on the frontend
                        flowNodeWrapper.getDisplayName(),
                        flowNodeWrapper.getParents().stream()
                            .map(wrapper -> Integer.parseInt(wrapper.getId()))
                        .collect(Collectors.toList()),
                        flowNodeWrapper.getStatus().getState() == BlueRun.BlueRunState.SKIPPED ? "skipped" : flowNodeWrapper.getStatus().getResult().name(),
                        50, // TODO how ???
                        flowNodeWrapper.getType().name(),
                        flowNodeWrapper.getDisplayName() // TODO blue ocean uses timing information: "Passed in 0s"
                ))
                .collect(Collectors.toList());


        // id => stage
        Map<Integer, PipelineStageInternal> stageMap = stages.stream()
                .collect(Collectors.toMap(PipelineStageInternal::getId, stage -> stage));


        Map<Integer, List<Integer>> stageToChildrenMap = new HashMap<>();
        List<Integer> stagesThatAreChildren = new ArrayList<>();
        stages.forEach(stage -> {
            if (stage.getParents().isEmpty()) {
                stageToChildrenMap.put(stage.getId(), new ArrayList<>());
            } else if (stage.getType().equals("PARALLEL") || stageMap.get(stage.getParents().get(0)).getType().equals("PARALLEL")) {
                Integer parentId = stage.getParents().get(0); // assume one parent for now
                List<Integer> childrenOfParent = stageToChildrenMap.getOrDefault(parentId, new ArrayList<>());
                childrenOfParent.add(stage.getId());
                stageToChildrenMap.put(parentId, childrenOfParent);
                stagesThatAreChildren.add(stage.getId());
            }
        });

        List<PipelineStage> stageResults = stages.stream()
                .map(pipelineStageInternal -> {
                    List<PipelineStage> children = stageToChildrenMap.getOrDefault(pipelineStageInternal.getId(), emptyList())
                            .stream()
                            .map(mapper(stageMap, stageToChildrenMap))
                            .collect(Collectors.toList());

                    return pipelineStageInternal.toPipelineStage(children);
                })
                .filter(stage -> !stagesThatAreChildren.contains(stage.getId())).collect(Collectors.toList());

        return new PipelineGraph(stageResults);
    }

    private Function<Integer, PipelineStage> mapper(Map<Integer, PipelineStageInternal> stageMap, Map<Integer, List<Integer>> stageToChildrenMap) {
        return id -> {
            List<Integer> orDefault = stageToChildrenMap.getOrDefault(id, emptyList());
            List<PipelineStage> children = orDefault.stream()
                    .map(mapper(stageMap, stageToChildrenMap)).collect(Collectors.toList());
            return stageMap.get(id).toPipelineStage(children);
        };
    }
}