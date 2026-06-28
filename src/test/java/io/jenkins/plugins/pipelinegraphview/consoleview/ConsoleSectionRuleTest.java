package io.jenkins.plugins.pipelinegraphview.consoleview;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

import java.util.List;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.jvnet.hudson.test.JenkinsRule;
import org.jvnet.hudson.test.junit.jupiter.WithJenkins;

@WithJenkins
class ConsoleSectionRuleTest {

    @Test
    void extensionPointIsDiscoverable(JenkinsRule j) {
        // No built-in rules shipped; the list should be empty by default.
        // Plugin maintainers contribute their own rules via @Extension.
        List<ConsoleSectionRule> rules = ConsoleSectionRule.all().stream().toList();
        assertThat(rules, is(empty()));
    }

    @Test
    void defaultEnabledByDefaultReturnsTrue(JenkinsRule j) {
        ConsoleSectionRule stub = new ConsoleSectionRule() {
            @Override
            public String getId() {
                return "test";
            }

            @Override
            public String getDisplayName() {
                return "Test Rule";
            }

            @Override
            public String getStartPattern() {
                return "^START$";
            }

            @Override
            public String getEndPattern() {
                return "^END$";
            }
        };
        assertThat(stub.isEnabledByDefault(), is(true));
        // Patterns compile without error.
        Pattern.compile(stub.getStartPattern());
        Pattern.compile(stub.getEndPattern());
    }
}
