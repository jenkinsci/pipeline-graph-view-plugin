package io.jenkins.plugins.pipelinegraphview.multipipelinegraphview;

import static java.time.ZoneOffset.UTC;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Clock;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class EtagBuilderTest {

    private final PipelineRunFactory factory = new PipelineRunFactory(Clock.fixed(Instant.EPOCH, UTC));

    @Test
    void add_throwsException_whenGetEtagAlreadyCalled() {
        EtagBuilder builder = new EtagBuilder();
        builder.getEtag();

        assertThrows(IllegalStateException.class, () -> builder.add(factory.succeeded("1")));
    }

    @Test
    void getEtag_throwsException_whenGetEtagAlreadyCalled() {
        EtagBuilder builder = new EtagBuilder();
        builder.getEtag();

        assertThrows(IllegalStateException.class, builder::getEtag);
    }

    @Test
    void getEtag_returnsNull_whenARunIsInProgress() {
        String etag = new EtagBuilder()
                .add(factory.succeeded("1"))
                .add(factory.inProgress("2"))
                .add(factory.succeeded("3"))
                .getEtag();

        assertNull(etag);
    }

    @Test
    void getEtag_returnsAnEtag() {
        String etag = new EtagBuilder().add(factory.succeeded("1")).getEtag();

        assertEquals("\"UE+hE1BgAnUQUjmKlczCSQ==\"", etag);
    }
}
