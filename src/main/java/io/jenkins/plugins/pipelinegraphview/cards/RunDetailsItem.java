package io.jenkins.plugins.pipelinegraphview.cards;

import static java.util.Objects.requireNonNull;

import edu.umd.cs.findbugs.annotations.NonNull;
import edu.umd.cs.findbugs.annotations.Nullable;

public sealed interface RunDetailsItem {

    RunDetailsItem SEPARATOR = new Separator();

    record Separator() implements RunDetailsItem {}

    final class RunDetail implements RunDetailsItem {
        private final @NonNull Icon icon;
        private final @NonNull ItemContent content;
        private final @Nullable String tooltip;

        public RunDetail(@NonNull Icon icon, @NonNull ItemContent content, @Nullable String tooltip) {
            this.icon = requireNonNull(icon);
            this.content = requireNonNull(content);
            this.tooltip = tooltip;
        }

        public RunDetail(@NonNull Icon icon, @NonNull ItemContent content) {
            this(icon, content, null);
        }

        @Nullable
        public String tooltip() {
            return tooltip;
        }

        @NonNull
        public ItemContent content() {
            return content;
        }

        @NonNull
        public String icon() {
            return icon.value();
        }
    }

    sealed interface Icon {
        String value();

        record SimpleIcon(@NonNull String value) implements Icon {
            public SimpleIcon {
                requireNonNull(value);
            }
        }

        record Ionicon(@NonNull String value) implements Icon {
            public Ionicon(@NonNull String value) {
                requireNonNull(value);
                this.value = String.format("symbol-%s plugin-ionicons-api", value);
            }
        }
    }

    sealed interface ItemContent {
        static ItemContent of(@NonNull String text) {
            return new PlainContent(text);
        }

        static ItemContent of(String href, @NonNull String text) {
            return href == null || href.isBlank() ? new PlainContent(text) : new LinkContent(href, text);
        }

        record PlainContent(@NonNull String text) implements ItemContent {
            public PlainContent {
                requireNonNull(text);
            }
        }

        record LinkContent(@NonNull String href, @NonNull String text) implements ItemContent {
            public LinkContent {
                requireNonNull(href);
                requireNonNull(text);
            }
        }
    }
}
