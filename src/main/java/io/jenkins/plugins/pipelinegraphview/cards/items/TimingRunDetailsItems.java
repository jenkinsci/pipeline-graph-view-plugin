package io.jenkins.plugins.pipelinegraphview.cards.items;

import hudson.Util;
import io.jenkins.plugins.pipelinegraphview.Messages;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem.Icon;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem.ItemContent;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import jenkins.metrics.impl.TimeInQueueAction;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

public class TimingRunDetailsItems {

    public static List<RunDetailsItem> get(WorkflowRun run) {
        List<RunDetailsItem> runDetailsItems = new ArrayList<>();

        long startedTime = Math.abs(run.getTime().getTime() - new Date().getTime());
        RunDetailsItem startedItem = new RunDetailsItem.Item(
                new Icon.IonIcon("time-outline"),
                new ItemContent.PlainContent(Messages.startedAgo(Util.getTimeSpanString(startedTime))));
        runDetailsItems.add(startedItem);

        TimeInQueueAction timeInQueueAction = run.getAction(TimeInQueueAction.class);

        if (timeInQueueAction != null) {
            RunDetailsItem queuedItem = new RunDetailsItem.Item(
                    new Icon.IonIcon("hourglass-outline"),
                    new ItemContent.PlainContent(
                            Messages.queued(Util.getTimeSpanString(timeInQueueAction.getQueuingDurationMillis()))));

            runDetailsItems.add(queuedItem);
        }

        RunDetailsItem timerItem = new RunDetailsItem.Item(
                new Icon.IonIcon("timer-outline"),
                new ItemContent.PlainContent(Messages.took(run.getDurationString())));

        runDetailsItems.add(timerItem);

        return runDetailsItems;
    }
}
