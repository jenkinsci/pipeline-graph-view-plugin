package io.jenkins.plugins.pipelinegraphview.livestate;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.sameInstance;

import io.jenkins.plugins.pipelinegraphview.analysis.TimingInfo;
import io.jenkins.plugins.pipelinegraphview.utils.BlueRun;
import io.jenkins.plugins.pipelinegraphview.utils.NodeRunStatus;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

class BlockResolutionCacheTest {

    @Test
    void cachesTimingAndStatusPerRange() {
        BlockResolutionCache cache = new BlockResolutionCache();
        TimingInfo timing = new TimingInfo(100, 10, 1L);
        NodeRunStatus status = new NodeRunStatus(BlueRun.BlueRunResult.SUCCESS, BlueRun.BlueRunState.FINISHED);
        AtomicInteger timingCalls = new AtomicInteger();
        AtomicInteger statusCalls = new AtomicInteger();

        TimingInfo t1 = cache.getOrComputeTiming("3", "8", () -> {
            timingCalls.incrementAndGet();
            return timing;
        });
        TimingInfo t2 = cache.getOrComputeTiming("3", "8", () -> {
            timingCalls.incrementAndGet();
            return timing;
        });
        NodeRunStatus s1 = cache.getOrComputeStatus("3", "8", () -> {
            statusCalls.incrementAndGet();
            return status;
        });
        NodeRunStatus s2 = cache.getOrComputeStatus("3", "8", () -> {
            statusCalls.incrementAndGet();
            return status;
        });

        assertThat(t1, sameInstance(timing));
        assertThat(t2, sameInstance(timing));
        assertThat(s1, sameInstance(status));
        assertThat(s2, sameInstance(status));
        assertThat(timingCalls.get(), is(1));
        assertThat(statusCalls.get(), is(1));
    }

    @Test
    void differentRangesCacheIndependently() {
        BlockResolutionCache cache = new BlockResolutionCache();
        TimingInfo timingA = new TimingInfo(100, 0, 1L);
        TimingInfo timingB = new TimingInfo(200, 0, 2L);

        assertThat(cache.getOrComputeTiming("1", "5", () -> timingA), sameInstance(timingA));
        assertThat(cache.getOrComputeTiming("6", "9", () -> timingB), sameInstance(timingB));
        assertThat(
                cache.getOrComputeTiming("1", "5", () -> {
                    throw new AssertionError("should be cached");
                }),
                sameInstance(timingA));
        assertThat(
                cache.getOrComputeTiming("6", "9", () -> {
                    throw new AssertionError("should be cached");
                }),
                sameInstance(timingB));
    }
}
