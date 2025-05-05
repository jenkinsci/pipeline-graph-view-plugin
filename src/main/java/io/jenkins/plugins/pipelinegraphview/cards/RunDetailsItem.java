package io.jenkins.plugins.pipelinegraphview.cards;

import static java.util.Objects.requireNonNull;

public class RunDetailsItem {

    private final String icon;
    private final String text;
    private final String href;
    private final boolean separator;
    private final String tooltip;

    RunDetailsItem(String icon, String text, String href, boolean separator, String tooltip) {
        this.icon = icon;
        this.text = text;
        this.href = href;
        this.separator = separator;
        this.tooltip = tooltip;
    }

    public String getIcon() {
        return icon;
    }

    public String getText() {
        return text;
    }

    public String getHref() {
        return href;
    }

    public String getTooltip() {
        return tooltip;
    }

    public boolean isSeparator() {
        return separator;
    }

    public static class Builder {

        private String icon;
        private String text;
        private String href;
        private String tooltip;
        private boolean separator;

        public Builder text(String text) {
            this.text = text;
            return this;
        }

        public Builder icon(String icon) {
            this.icon = icon;
            return this;
        }

        public Builder tooltip(String tooltip) {
            this.tooltip = tooltip;
            return this;
        }

        public Builder ionicon(String ionicon) {
            this.icon = String.format("symbol-%s plugin-ionicons-api", ionicon);
            return this;
        }

        public Builder href(String href) {
            this.href = href;
            return this;
        }

        public Builder separator() {
            this.separator = true;
            return this;
        }

        public RunDetailsItem build() {
            if (!separator) {
                requireNonNull(icon);
            }
            return new RunDetailsItem(icon, text, href, separator, tooltip);
        }
    }
}
