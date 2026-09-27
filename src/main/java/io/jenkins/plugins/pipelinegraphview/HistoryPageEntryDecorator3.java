/*
 * The MIT License
 *
 * Copyright (c) 2026, Jan Faracik
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

package io.jenkins.plugins.pipelinegraphview;

import hudson.Extension;
import hudson.model.Run;
import hudson.tasks.junit.CaseResult;
import hudson.tasks.test.AbstractTestResultAction;
import hudson.tasks.test.TestResult;
import hudson.widgets.HistoryWidget;
import jenkins.model.HistoricalBuild;
import jenkins.model.Jenkins;
import jenkins.widgets.HistoryPageEntryDecorator;
import org.jspecify.annotations.NonNull;

/**
 * TODO - remove this, this is purely for POCing
 */
@Extension
public class HistoryPageEntryDecorator3 extends HistoryPageEntryDecorator {

    private int failCount;

    private int skipCount;

    private int totalCount;

    private int passCount;

    private int regressionCount;

    private int fixedCount;

    @Override
    public boolean isApplicable(@NonNull HistoryWidget<?, ?> widget, @NonNull HistoricalBuild build) {
        if (!(build instanceof Run<?, ?> run)) {
            return false;
        }

        boolean junitInstalled = Jenkins.get().getPlugin("junit") != null;
        if (!junitInstalled) {
            return false;
        }

        AbstractTestResultAction<?> action = run.getAction(AbstractTestResultAction.class);

        if (action == null) {
            return false;
        }

        this.failCount = action.getFailCount();
        this.skipCount = action.getSkipCount();
        this.totalCount = action.getTotalCount();
        this.passCount = action.getTotalCount() - action.getFailCount() - action.getSkipCount();
        this.regressionCount = countRegressions(action);
        this.fixedCount = countFixed(action);

        return true;
    }

    /**
     * Tests failing in this build that passed in the previous one.
     */
    private static int countRegressions(AbstractTestResultAction<?> action) {
        int count = 0;
        for (TestResult test : action.getFailedTests()) {
            if (test instanceof CaseResult caseResult && caseResult.getStatus() == CaseResult.Status.REGRESSION) {
                count++;
            }
        }
        return count;
    }

    /**
     * Tests that failed in the previous build and pass in this one. Walks the previous build's
     * failures rather than this build's passes, as there are far fewer of them.
     */
    private static int countFixed(AbstractTestResultAction<?> action) {
        AbstractTestResultAction<?> previous = action.getPreviousResult();
        if (previous == null || !(action.getResult() instanceof TestResult current)) {
            return 0;
        }

        int count = 0;
        for (TestResult test : previous.getFailedTests()) {
            TestResult now = current.findCorrespondingResult(test.getId());
            if (now != null && now.isPassed()) {
                count++;
            }
        }
        return count;
    }

    @SuppressWarnings("unused")
    public int getFailCount() {
        return failCount;
    }

    @SuppressWarnings("unused")
    public int getSkipCount() {
        return skipCount;
    }

    @SuppressWarnings("unused")
    public int getTotalCount() {
        return totalCount;
    }

    @SuppressWarnings("unused")
    public int getPassCount() {
        return passCount;
    }

    @SuppressWarnings("unused")
    public int getRegressionCount() {
        return regressionCount;
    }

    @SuppressWarnings("unused")
    public int getFixedCount() {
        return fixedCount;
    }
}
