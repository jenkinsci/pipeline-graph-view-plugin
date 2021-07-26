package io.jenkins.plugins.pipelinegraphview.utils;

public class PipelineStep {

  private String name;
  private String state; // TODO enum
  private int completePercent; // TODO int is fine?
  private String type; // TODO enum
  private String title;
  private int id;

  public PipelineStep(
      int id, String name, String state, int completePercent, String type, String title) {
    this.id = id;
    this.name = name;
    this.state = state;
    this.completePercent = completePercent;
    this.type = type;
    this.title = title;
  }

  public int getId() {
    return id;
  }

  public String getName() {
    return name;
  }

  public String getState() {
    return state;
  }

  public int getCompletePercent() {
    return completePercent;
  }

  public String getType() {
    return type;
  }

  public String getTitle() {
    return title;
  }
}
