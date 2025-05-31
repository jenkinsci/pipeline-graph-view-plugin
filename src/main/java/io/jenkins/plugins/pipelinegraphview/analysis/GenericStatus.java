/*
 * The MIT License
 *
 * Copyright (c) 2016, CloudBees, Inc.
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

package io.jenkins.plugins.pipelinegraphview.analysis;

import hudson.model.Result;
import java.util.Map;

/**
 * Statuses of a {@link org.jenkinsci.plugins.workflow.graphanalysis.FlowChunk} in increasing priority order
 * Note, when adding new statuses you need to add a new {@link io.jenkins.plugins.pipelinegraphview.analysis.StatusAndTiming.StatusApiVersion}
 *  and set the value of {@link StatusAndTiming#CURRENT_API_VERSION} to that,
 *  and update {@link StatusAndTiming#coerceStatusMap(Map)} to do coercion for new codings to protect core APIs from unknown values
 */
public enum GenericStatus {
    /**
     * We resumed from checkpoint or {@link Result#NOT_BUILT} status - nothing ran in the chunk.
     */
    NOT_EXECUTED,

    /**
     * Completed &amp; successful, ex {@link Result#SUCCESS}
     */
    SUCCESS,

    /**
     * Completed with recoverable failures, such as noncritical tests, ex {@link Result#UNSTABLE}
     */
    UNSTABLE,

    /**
     * Not complete: still executing, in a node block, but the node block is in queue.
     */
    QUEUED,

    /**
     * Not complete: still executing, waiting for a result
     */
    IN_PROGRESS,

    /**
     * Completed and explicitly failed, i.e. {@link Result#FAILURE}
     */
    FAILURE,

    /**
     * Aborted while running, no way to determine final outcome {@link Result#ABORTED}
     */
    ABORTED,

    /**
     * Not complete: we are waiting for user input to continue (special case of IN_PROGRESS)
     */
    PAUSED_PENDING_INPUT;

    /**
     * Create a {@link GenericStatus} from a {@link Result}
     */
    public static GenericStatus fromResult(Result result) {
        if (result == Result.NOT_BUILT) {
            return GenericStatus.NOT_EXECUTED;
        } else if (result == Result.ABORTED) {
            return GenericStatus.ABORTED;
        } else if (result == Result.FAILURE) {
            return GenericStatus.FAILURE;
        } else if (result == Result.UNSTABLE) {
            return GenericStatus.UNSTABLE;
        } else if (result == Result.SUCCESS) {
            return GenericStatus.SUCCESS;
        } else {
            return GenericStatus.NOT_EXECUTED;
        }
    }
}
