package io.jenkins.plugins.pipelinegraphview.multipipelinegraphview;

import edu.umd.cs.findbugs.annotations.CheckForNull;
import edu.umd.cs.findbugs.annotations.NonNull;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;

public class EtagBuilder {
    private static final EtagProducer NOOP = new EtagProducer.NoopEtagProducer();
    private EtagProducer producer = new EtagProducer.ValidEtagProducer();
    private boolean computed = false;

    public EtagBuilder add(PipelineRun run) {
        checkAlreadyComputed();
        if (run.result.isInProgress()) {
            producer = NOOP; // If we have an in-progress run, we cannot produce a valid ETag
        } else {
            producer.consume(run);
        }
        return this;
    }

    @CheckForNull
    public String getEtag() {
        checkAlreadyComputed();
        computed = true;
        return producer.etag();
    }

    private void checkAlreadyComputed() {
        if (computed) {
            throw new IllegalStateException("getEtag() already called");
        }
    }

    private sealed interface EtagProducer {
        void consume(@NonNull PipelineRun run);

        @CheckForNull
        String etag();

        final class ValidEtagProducer implements EtagProducer {
            private final MessageDigest digest;

            ValidEtagProducer() {
                try {
                    digest = MessageDigest.getInstance("MD5");
                } catch (NoSuchAlgorithmException e) {
                    throw new RuntimeException(e);
                }
            }

            @Override
            public void consume(@NonNull PipelineRun run) {
                digest.update(run.etag().getBytes(StandardCharsets.UTF_8));
                digest.update((byte) '\0');
            }

            @Override
            public String etag() {
                return "\"" + Base64.getEncoder().encodeToString(digest.digest()) + "\"";
            }
        }

        final class NoopEtagProducer implements EtagProducer {

            private NoopEtagProducer() {}

            @Override
            public void consume(@NonNull PipelineRun run) {}

            @Override
            public String etag() {
                return null;
            }
        }
    }
}
