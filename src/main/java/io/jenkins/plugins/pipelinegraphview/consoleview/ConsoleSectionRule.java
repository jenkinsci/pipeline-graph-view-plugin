package io.jenkins.plugins.pipelinegraphview.consoleview;

import hudson.ExtensionList;
import hudson.ExtensionPoint;

/**
 * Extension point for contributing console section detection rules.
 *
 * <p>Plugin authors can implement this to define regex-based collapsible sections
 * in Pipeline Graph View console output. Each rule specifies a start pattern (that
 * opens a collapsible section) and an end pattern (that closes it).
 *
 * <p>Rules are discovered via {@link ExtensionList} and sent to the frontend
 * as part of the console view configuration.
 *
 * <p>Example:
 * <pre>
 * {@literal @}Extension
 * public class MavenPhaseRule extends ConsoleSectionRule {
 *     {@literal @}Override public String getId() { return "maven-phase"; }
 *     {@literal @}Override public String getDisplayName() { return "Maven Phase"; }
 *     {@literal @}Override public String getStartPattern() { return "\\[INFO\\] --- .+ ---"; }
 *     {@literal @}Override public String getEndPattern() { return "\\[INFO\\] --- .+ ---|\\[INFO\\] BUILD"; }
 *     {@literal @}Override public boolean isEnabledByDefault() { return true; }
 * }
 * </pre>
 */
public abstract class ConsoleSectionRule implements ExtensionPoint {

    /**
     * Unique identifier for this rule.
     * Used as a key for user preference toggles.
     */
    public abstract String getId();

    /**
     * Human-readable name shown in the settings panel.
     */
    public abstract String getDisplayName();

    /**
     * ECMAScript-compatible regex pattern that matches the start of a collapsible section.
     * These patterns are compiled on the frontend with {@code new RegExp(...)}, so they must
     * use ECMAScript regex syntax (avoid Java-only features like possessive quantifiers or
     * {@code \p{}} Unicode categories).
     * The first capture group, if present, is used as the section title.
     */
    public abstract String getStartPattern();

    /**
     * ECMAScript-compatible regex pattern that matches the end of a collapsible section.
     * See {@link #getStartPattern()} for syntax requirements.
     */
    public abstract String getEndPattern();

    /**
     * Whether this rule is enabled by default.
     * Users can override per-job or globally.
     */
    public boolean isEnabledByDefault() {
        return true;
    }

    /**
     * All registered section rules.
     */
    public static ExtensionList<ConsoleSectionRule> all() {
        return ExtensionList.lookup(ConsoleSectionRule.class);
    }
}
