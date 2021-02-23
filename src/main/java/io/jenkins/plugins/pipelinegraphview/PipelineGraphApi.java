package io.jenkins.plugins.pipelinegraphview;

import org.jenkinsci.plugins.workflow.job.WorkflowRun;

import static java.util.Arrays.asList;
import static java.util.Collections.emptyList;

public class PipelineGraphApi {

    private transient WorkflowRun run;

    public PipelineGraphApi(WorkflowRun run) {
        this.run = run;
    }

    public PipelineGraph createGraph() {
        PipelineStage stage1 = new PipelineStage(111, "Build", emptyList(), "success", 50, "STAGE", "Build");

        PipelineStage stage2child1 = new PipelineStage(112, "JUnit", emptyList(), "success", 50, "PARALLEL", "JUnit");
        PipelineStage stage2child2 = new PipelineStage(113, "DBUnit", emptyList(), "success", 50, "PARALLEL", "DBUnit");
        PipelineStage stage2child3 = new PipelineStage(114, "Jasmine", emptyList(), "success", 50, "PARALLEL", "Jasmine");
        PipelineStage stage2 = new PipelineStage(115, "Test", asList(stage2child1, stage2child2, stage2child3), "not_build", 50, "STAGE", "Test");

        PipelineStage stage3child1 = new PipelineStage(116, "Firefox", emptyList(), "success", 50, "PARALLEL", "Firefox");
        PipelineStage stage3child2 = new PipelineStage(117, "Edge", emptyList(), "failure", 50, "PARALLEL", "Edge");
        PipelineStage stage3child3 = new PipelineStage(118, "Safari", emptyList(), "running", 60, "PARALLEL", "Safari");
        PipelineStage stage3child4 = new PipelineStage(119, "Chrome", emptyList(), "running", 120, "PARALLEL", "Chrome");
        PipelineStage stage3 = new PipelineStage(120, "Browser Tests", asList(stage3child1, stage3child2, stage3child3, stage3child4), "not_build", 50, "STAGE", "Browser Tests");

        PipelineStage stage4 = new PipelineStage(121, "Skizzled", emptyList(), "skipped", 50, "STAGE", "Skizzled");
        PipelineStage stage5 = new PipelineStage(122, "Foshizzle", emptyList(), "skipped", 50, "STAGE", "Foshizzle");

        PipelineStage stage6 = new PipelineStage(123, "Deploy", emptyList(), "success", 50, "STAGE", "Deploy");

        return new PipelineGraph(asList(stage1, stage2, stage3, stage4, stage5, stage6));
    }
}