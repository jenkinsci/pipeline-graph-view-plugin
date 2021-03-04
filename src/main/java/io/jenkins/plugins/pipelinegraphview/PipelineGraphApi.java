package io.jenkins.plugins.pipelinegraphview;

import org.jenkinsci.plugins.workflow.job.WorkflowRun;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
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
                .map(flowNodeWrapper -> {
                    String state = flowNodeWrapper.getStatus().getResult().name();
                    if (flowNodeWrapper.getStatus().getState() != BlueRun.BlueRunState.FINISHED) {
                        state = flowNodeWrapper.getStatus().getState().name().toLowerCase(Locale.ROOT);
                    }

                    return new PipelineStageInternal(
                            Integer.parseInt(flowNodeWrapper.getId()), // TODO no need to parse it BO returns a string even though the datatype is number on the frontend
                            flowNodeWrapper.getDisplayName(),
                            flowNodeWrapper.getParents().stream()
                                    .map(wrapper -> Integer.parseInt(wrapper.getId()))
                                    .collect(Collectors.toList()),
                            state,
                            50, // TODO how ???
                            flowNodeWrapper.getType().name(),
                            flowNodeWrapper.getDisplayName() // TODO blue ocean uses timing information: "Passed in 0s"
                    );
                })
                .collect(Collectors.toList());


        // id => stage
        Map<Integer, PipelineStageInternal> stageMap = stages.stream()
                .collect(Collectors.toMap(PipelineStageInternal::getId, stage -> stage, (u, v) -> u, LinkedHashMap::new));

        Map<Integer, List<Integer>> stageToChildrenMap = new HashMap<>();

        List<Integer> stagesThatAreNested = new ArrayList<>();

        Map<Integer, Integer> nextSiblingToOlderSibling = new HashMap<>();

        List<Integer> stagesThatAreChildrenOrNestedStages = new ArrayList<>();
        stages.forEach(stage -> {
            if (stage.getParents().isEmpty()) {
                stageToChildrenMap.put(stage.getId(), new ArrayList<>());
            } else if (stage.getType().equals("PARALLEL")) {
                Integer parentId = stage.getParents().get(0); // assume one parent for now
                List<Integer> childrenOfParent = stageToChildrenMap.getOrDefault(parentId, new ArrayList<>());
                childrenOfParent.add(stage.getId());
                stageToChildrenMap.put(parentId, childrenOfParent);
                stagesThatAreChildrenOrNestedStages.add(stage.getId());
            } else if (stageMap.get(stage.getParents().get(0)).getType().equals("PARALLEL")) {
                Integer parentId = stage.getParents().get(0);
                PipelineStageInternal parent = stageMap.get(parentId);
                parent.setSeqContainerName(parent.getName());
                parent.setName(stage.getName());
                parent.setSequential(true);
                parent.setType(stage.getType());
                parent.setTitle(stage.getTitle());
                parent.setCompletePercent(stage.getCompletePercent());
                stage.setSequential(true);

                nextSiblingToOlderSibling.put(stage.getId(), parentId);
                stagesThatAreNested.add(stage.getId());
                stagesThatAreChildrenOrNestedStages.add(stage.getId());
                // nested stage of nested stage
            } else if (stagesThatAreNested.contains(stageMap.get(stage.getParents().get(0)).getId())) {
                PipelineStageInternal parent = stageMap.get(nextSiblingToOlderSibling.get(stage.getParents().get(0)));
                // shouldn't happen but found it after restarting a matrix build
                // this breaks the layout badly but prevents a null pointer
                if (parent != null) {
                    stage.setSequential(true);
                    parent.setNextSibling(stage);
                    stagesThatAreNested.add(stage.getId());
                    stagesThatAreChildrenOrNestedStages.add(stage.getId());
                }
            }
        });

        List<PipelineStage> stageResults = stageMap.values().stream()
                .map(pipelineStageInternal -> {
                    List<PipelineStage> children = stageToChildrenMap.getOrDefault(pipelineStageInternal.getId(), emptyList())
                            .stream()
                            .map(mapper(stageMap, stageToChildrenMap))
                            .collect(Collectors.toList());

                    return pipelineStageInternal.toPipelineStage(children);
                })
                .filter(stage -> !stagesThatAreChildrenOrNestedStages.contains(stage.getId())).collect(Collectors.toList());

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