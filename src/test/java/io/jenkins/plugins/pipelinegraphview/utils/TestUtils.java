package io.jenkins.plugins.pipelinegraphview.utils;


import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import hudson.model.Result;
import org.jenkinsci.plugins.workflow.actions.ArgumentsAction;
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition;
import org.jenkinsci.plugins.workflow.cps.nodes.StepStartNode;
import org.jenkinsci.plugins.workflow.flow.FlowExecution;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jvnet.hudson.test.JenkinsRule;

// Using this (instead of GraphAPI) to find nodes, incase there are issues in GraphAPI.
import org.jenkinsci.plugins.workflow.support.visualization.table.FlowGraphTable;
import org.jenkinsci.plugins.workflow.support.visualization.table.FlowGraphTable.Row;

import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

public class TestUtils {
    private static final Logger LOGGER = Logger.getLogger(TestUtils.class.getName());

    public static WorkflowRun createAndRunJob(
        JenkinsRule jenkins,
        String jobName,
        String jenkinsFileName,
        Result expectedResult
    ) throws Exception {
        WorkflowJob job = TestUtils.createJob(jenkins, jobName, jenkinsFileName);
        jenkins.assertBuildStatus(expectedResult, job.scheduleBuild2(0));
        return job.getLastBuild();
    }

    public static WorkflowJob createJob(
        JenkinsRule jenkins,
        String jobName,
        String jenkinsFileName
    ) throws java.io.IOException {
        WorkflowJob job = jenkins.createProject(WorkflowJob.class, jobName);

        URL resource = Resources.getResource(TestUtils.class, jenkinsFileName);
        String jenkinsFile = Resources.toString(resource, Charsets.UTF_8);
        job.setDefinition(new CpsFlowDefinition(jenkinsFile, true));
        return job;
    }

    public static List<FlowNode> getNodesByDisplayName(WorkflowRun run, String displayName) throws java.io.IOException{
        FlowExecution execution = run.getExecution();
        FlowGraphTable graphTable = new FlowGraphTable(execution);
        graphTable.build();
        List<FlowNode> matchingNodes = new ArrayList<FlowNode>();
        for (Row row : graphTable.getRows()) {
            if(row.getDisplayName().equals(displayName)) {
                FlowNode node = row.getNode();
                LOGGER.log(Level.INFO, "Found matching node: '" + displayName + "' with ID " + node.getId());
                matchingNodes.add(node);
            }
        }
        return matchingNodes;
    }
}