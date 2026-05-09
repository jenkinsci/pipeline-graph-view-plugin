package io.jenkins.plugins.pipelinegraphview.livestate;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;

import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

class SkippedStageCacheTest {

    @Test
    void cachesBothBooleanOutcomes() {
        SkippedStageCache cache = new SkippedStageCache();
        AtomicInteger trueCalls = new AtomicInteger();
        AtomicInteger falseCalls = new AtomicInteger();

        boolean first = cache.getOrCompute("5", () -> {
            trueCalls.incrementAndGet();
            return true;
        });
        boolean second = cache.getOrCompute("5", () -> {
            trueCalls.incrementAndGet();
            return true;
        });
        boolean otherFirst = cache.getOrCompute("6", () -> {
            falseCalls.incrementAndGet();
            return false;
        });
        boolean otherSecond = cache.getOrCompute("6", () -> {
            falseCalls.incrementAndGet();
            return false;
        });

        assertThat(first, is(true));
        assertThat(second, is(true));
        assertThat(otherFirst, is(false));
        assertThat(otherSecond, is(false));
        assertThat(trueCalls.get(), is(1));
        assertThat(falseCalls.get(), is(1));
    }

    @Test
    void differentNodeIdsCacheIndependently() {
        SkippedStageCache cache = new SkippedStageCache();
        assertThat(cache.getOrCompute("1", () -> true), is(true));
        assertThat(cache.getOrCompute("2", () -> false), is(false));
        assertThat(
                cache.getOrCompute("1", () -> {
                    throw new AssertionError("should be cached");
                }),
                is(true));
        assertThat(
                cache.getOrCompute("2", () -> {
                    throw new AssertionError("should be cached");
                }),
                is(false));
    }
}
