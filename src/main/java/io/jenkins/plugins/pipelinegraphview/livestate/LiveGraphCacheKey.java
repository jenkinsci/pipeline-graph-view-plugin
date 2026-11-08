package io.jenkins.plugins.pipelinegraphview.livestate;

import java.util.Set;
import org.kohsuke.accmod.Restricted;
import org.kohsuke.accmod.restrictions.NoExternalUse;

/**
 * What a graph or step list computed from the live state depends on. Steps such as {@code input}
 * and {@code lock} pause after their node has been added, which doesn't change the version, so
 * the running steps that are paused are part of the key too.
 */
@Restricted(NoExternalUse.class)
public record LiveGraphCacheKey(long version, Set<String> pausedNodeIds) {

    /** Whether a result computed for {@code this} can be served for {@code wanted}. */
    boolean satisfies(LiveGraphCacheKey wanted) {
        return version >= wanted.version && pausedNodeIds.equals(wanted.pausedNodeIds);
    }
}
