package io.jenkins.plugins.pipelinegraphview.cards.items;

import hudson.Util;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import jenkins.metrics.impl.TimeInQueueAction;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

public class TimingRunDetailsItems {

  public static List<RunDetailsItem> get(WorkflowRun run) {
    List<RunDetailsItem> runDetailsItems = new ArrayList<>();

    RunDetailsItem startedItem =
        new RunDetailsItem.Builder()
            .ionicon("time-outline")
            .text(
                "Started "
                    + Util.getTimeSpanString(
                        Math.abs(run.getTime().getTime() - new Date().getTime()))
                    + " ago")
            .build();
    runDetailsItems.add(startedItem);

    TimeInQueueAction timeInQueueAction = run.getAction(TimeInQueueAction.class);

    if (timeInQueueAction != null) {
      RunDetailsItem queuedItem =
          new RunDetailsItem.Builder()
              .ionicon("hourglass-outline")
              .text(
                  "Queued " + Util.getTimeSpanString(timeInQueueAction.getQueuingDurationMillis()))
              .build();

      runDetailsItems.add(queuedItem);
    }

    RunDetailsItem timerItem =
        new RunDetailsItem.Builder()
            .ionicon("timer-outline")
            .text("Took " + run.getDurationString())
            .build();

    runDetailsItems.add(timerItem);

    return runDetailsItems;
  }
}
