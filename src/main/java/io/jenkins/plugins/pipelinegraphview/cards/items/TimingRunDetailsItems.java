package io.jenkins.plugins.pipelinegraphview.cards.items;

import hudson.Util;
import io.jenkins.plugins.pipelinegraphview.Messages;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem;
import io.jenkins.plugins.pipelinegraphview.cards.RunDetailsItem.Icon.Ionicon;
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
        RunDetailsItem startedItem = new RunDetailsItem.RunDetail(
                new Ionicon("time-outline"), ItemContent.of(Messages.startedAgo(Util.getTimeSpanString(startedTime))));
        runDetailsItems.add(startedItem);

        TimeInQueueAction timeInQueueAction = run.getAction(TimeInQueueAction.class);

        if (timeInQueueAction != null) {
            RunDetailsItem queuedItem = new RunDetailsItem.RunDetail(
                    new Ionicon("hourglass-outline"),
                    ItemContent.of(
                            Messages.queued(Util.getTimeSpanString(timeInQueueAction.getQueuingDurationMillis()))));

            runDetailsItems.add(queuedItem);
        }

        RunDetailsItem timerItem = new RunDetailsItem.RunDetail(
                new Ionicon("timer-outline"), ItemContent.of(Messages.took(run.getDurationString())));

        runDetailsItems.add(timerItem);

        return runDetailsItems;
    }
}
