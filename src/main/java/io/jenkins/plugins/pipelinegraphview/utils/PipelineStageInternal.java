package io.jenkins.plugins.pipelinegraphview.utils;

import java.util.Collections;
import java.util.List;
import org.jenkinsci.plugins.workflow.pipelinegraphanalysis.TimingInfo;

public class PipelineStageInternal {

  private String name;
  private List<String> parents;
  private String state; // TODO enum
  private int completePercent; // TODO int is fine?
  private String type; // TODO enum
  private String title;
  private String id;
  private String seqContainerName;
  private PipelineStageInternal nextSibling;
  private boolean sequential;
  private boolean synthetic;
  private Long pauseDurationMillis;
  private Long startTimeMillis;
  private Long totalDurationMillis;

  public PipelineStageInternal(
      String id,
      String name,
      List<String> parents,
      String state,
      int completePercent,
      String type,
      String title,
      boolean synthetic,
      TimingInfo times) {
    this.id = id;
    this.name = name;
    this.parents = parents;
    this.state = state;
    this.completePercent = completePercent;
    this.type = type;
    this.title = title;
    this.synthetic = synthetic;
    this.pauseDurationMillis = times.getPauseDurationMillis();
    this.startTimeMillis = times.getStartTimeMillis();
    this.totalDurationMillis = times.getTotalDurationMillis();
  }

  public boolean isSequential() {
    return sequential;
  }

  public void setId(String id) {
    this.id = id;
  }

  public void setSequential(boolean sequential) {
    this.sequential = sequential;
  }

  public void setState(String state) {
    this.state = state;
  }

  public void setCompletePercent(int completePercent) {
    this.completePercent = completePercent;
  }

  public void setType(String type) {
    this.type = type;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public void setNextSibling(PipelineStageInternal nextSibling) {
    this.nextSibling = nextSibling;
  }

  public void setSeqContainerName(String seqContainerName) {
    this.seqContainerName = seqContainerName;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getSeqContainerName() {
    return seqContainerName;
  }

  public String getId() {
    return id;
  }

  public String getName() {
    return name;
  }

  public List<String> getParents() {
    return parents;
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

  public String getUniqueName() {
    return String.format("{id: %s, name: %s}", id, name);
  }

  public boolean isSynthetic() {
    return synthetic;
  }

  public void setSynthetic(boolean synthetic) {
    this.synthetic = synthetic;
  }

  public PipelineStage toPipelineStage(List<PipelineStage> children) {
    return new PipelineStage(
        id,
        name,
        children,
        state,
        completePercent,
        type,
        title,
        seqContainerName,
        nextSibling != null ? nextSibling.toPipelineStage(Collections.emptyList()) : null,
        sequential,
        synthetic,
        pauseDurationMillis,
        startTimeMillis,
        totalDurationMillis);
  }
}
