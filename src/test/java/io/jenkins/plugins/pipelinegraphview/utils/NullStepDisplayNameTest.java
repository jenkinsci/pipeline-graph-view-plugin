package io.jenkins.plugins.pipelinegraphview.utils;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;

import hudson.model.TaskListener;
import java.util.List;
import java.util.Set;
import org.htmlunit.Page;
import org.jenkinsci.plugins.workflow.actions.LabelAction;
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition;
import org.jenkinsci.plugins.workflow.graph.FlowNode;
import org.jenkinsci.plugins.workflow.job.WorkflowJob;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;
import org.jenkinsci.plugins.workflow.steps.Step;
import org.jenkinsci.plugins.workflow.steps.StepContext;
import org.jenkinsci.plugins.workflow.steps.StepDescriptor;
import org.jenkinsci.plugins.workflow.steps.StepExecution;
import org.jenkinsci.plugins.workflow.steps.SynchronousStepExecution;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.Issue;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.TestExtension;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;
import org.kohsuke.stapler.DataBoundConstructor;

/**
 * A step's {@link FlowNode#getDisplayName()} can be {@code null}, for example when a
 * {@link LabelAction} without a name is attached to it. That used to throw a
 * {@link NullPointerException} for every stage of the run.
 */
@WithJenkins
class NullStepDisplayNameTest {

    private static final String PIPELINE = """
            stage('with-arguments') {
                nullDisplayName 'hello'
            }
            stage('without-arguments') {
                nullDisplayName ''
            }
            """;

    @Issue("GH#1587")
    @Test
    void stepsWithNullDisplayNameCanBeListed(JenkinsRule j) throws Exception {
        WorkflowRun run = runPipeline(j);
        PipelineStepApi api = new PipelineStepApi(run);

        List<PipelineStep> withArguments = api.getSteps(stageId(run, "with-arguments")).steps;
        assertThat(withArguments, hasSize(1));
        assertThat(withArguments.get(0).name, is("hello"));
        assertThat(withArguments.get(0).title, is(NullDisplayNameStep.DISPLAY_NAME));

        List<PipelineStep> withoutArguments = api.getSteps(stageId(run, "without-arguments")).steps;
        assertThat(withoutArguments, hasSize(1));
        assertThat(withoutArguments.get(0).name, is(NullDisplayNameStep.DISPLAY_NAME));
        assertThat(withoutArguments.get(0).title, is(""));
    }

    @Issue("GH#1587")
    @Test
    void stageLogCanBeViewedAsPlainText(JenkinsRule j) throws Exception {
        WorkflowRun run = runPipeline(j);

        Page page = j.createWebClient()
                .goTo(run.getUrl() + "stages/log?nodeId=" + stageId(run, "with-arguments"), "text/plain");

        assertThat(page.getWebResponse().getContentAsString(), containsString("ran with hello"));
    }

    private static WorkflowRun runPipeline(JenkinsRule j) throws Exception {
        WorkflowJob job = j.createProject(WorkflowJob.class);
        job.setDefinition(new CpsFlowDefinition(PIPELINE, true));
        return j.buildAndAssertSuccess(job);
    }

    private static String stageId(WorkflowRun run, String name) {
        return TestUtils.getNodesByDisplayName(run, name).get(0).getId();
    }

    /** Attaches a {@link LabelAction} with no name, so its node's display name is {@code null}. */
    public static class NullDisplayNameStep extends Step {
        static final String DISPLAY_NAME = "Null display name step";

        private final String value;

        @DataBoundConstructor
        public NullDisplayNameStep(String value) {
            this.value = value;
        }

        public String getValue() {
            return value;
        }

        @Override
        public StepExecution start(StepContext context) {
            return new Execution(context, value);
        }

        private static class Execution extends SynchronousStepExecution<Void> {
            private static final long serialVersionUID = 1L;
            private final transient String value;

            Execution(StepContext context, String value) {
                super(context);
                this.value = value;
            }

            @Override
            protected Void run() throws Exception {
                getContext().get(FlowNode.class).addAction(new LabelAction(null));
                getContext().get(TaskListener.class).getLogger().println("ran with " + value);
                return null;
            }
        }

        @TestExtension
        public static class DescriptorImpl extends StepDescriptor {
            @Override
            public String getFunctionName() {
                return "nullDisplayName";
            }

            @Override
            public String getDisplayName() {
                return DISPLAY_NAME;
            }

            @Override
            public Set<? extends Class<?>> getRequiredContext() {
                return Set.of(FlowNode.class, TaskListener.class);
            }
        }
    }
}
