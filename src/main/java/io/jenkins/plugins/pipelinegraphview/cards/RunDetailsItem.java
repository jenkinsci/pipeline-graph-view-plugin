package io.jenkins.plugins.pipelinegraphview.cards;

import static java.util.Objects.requireNonNull;

public class RunDetailsItem {

  private final String icon;
  private final String text;
  private final String href;

  private RunDetailsItem(String icon, String text, String href) {
    this.icon = icon;
    this.text = text;
    this.href = href;
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

  public static class Builder {

    private String icon;
    private String text;
    private String href;

    public Builder text(String text) {
      this.text = text;
      return this;
    }

    public Builder icon(String icon) {
      this.icon = icon;
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

    public RunDetailsItem build() {
      requireNonNull(icon);
      return new RunDetailsItem(icon, text, href);
    }
  }
}
