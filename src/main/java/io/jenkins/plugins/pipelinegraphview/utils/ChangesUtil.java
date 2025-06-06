package io.jenkins.plugins.pipelinegraphview.utils;

import hudson.scm.ChangeLogSet;
import java.util.*;
import org.jenkinsci.plugins.workflow.job.WorkflowRun;

public class ChangesUtil {

    public static List<ChangeLogSet.Entry> getChanges(WorkflowRun run) {
        Optional<ChangeLogSet<? extends ChangeLogSet.Entry>> changeSet =
                run.getChangeSets().stream().filter(cs -> !cs.isEmptySet()).findFirst();

        return changeSet
                .map(entries -> Arrays.stream(entries.getItems())
                        .map(ChangeLogSet.Entry.class::cast)
                        .toList())
                .orElse(Collections.emptyList());
    }
}
