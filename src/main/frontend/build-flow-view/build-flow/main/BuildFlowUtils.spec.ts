import { describe, expect, it } from "vitest";

import {
  resultDotColor,
  statusClass,
  statusColor,
  toResult,
} from "./BuildFlowUtils.ts";

describe("statusClass", () => {
  it("maps known statuses", () => {
    expect(statusClass("SUCCESS")).toBe("pgv-build-flow__node--success");
    expect(statusClass("FAILURE")).toBe("pgv-build-flow__node--failure");
    expect(statusClass("UNSTABLE")).toBe("pgv-build-flow__node--unstable");
    expect(statusClass("ABORTED")).toBe("pgv-build-flow__node--aborted");
    expect(statusClass("IN_PROGRESS")).toBe(
      "pgv-build-flow__node--in-progress",
    );
    expect(statusClass("QUEUED")).toBe("pgv-build-flow__node--queued");
  });

  it("defaults to not-built for unknown statuses", () => {
    expect(statusClass("UNKNOWN")).toBe("pgv-build-flow__node--not-built");
    expect(statusClass("")).toBe("pgv-build-flow__node--not-built");
  });
});

describe("statusColor", () => {
  it("maps known statuses to CSS vars", () => {
    expect(statusColor("SUCCESS")).toBe("var(--success-color)");
    expect(statusColor("FAILURE")).toBe("var(--error-color)");
    expect(statusColor("UNSTABLE")).toBe("var(--warning-color)");
    expect(statusColor("IN_PROGRESS")).toBe("var(--build-color)");
  });

  it("defaults to secondary text color", () => {
    expect(statusColor("ABORTED")).toBe("var(--text-color-secondary)");
    expect(statusColor("NOT_BUILT")).toBe("var(--text-color-secondary)");
  });
});

describe("resultDotColor", () => {
  it("maps known results to colors", () => {
    expect(resultDotColor("SUCCESS")).toBe("var(--success-color)");
    expect(resultDotColor("FAILURE")).toBe("var(--error-color)");
    expect(resultDotColor("UNSTABLE")).toBe("var(--warning-color)");
  });

  it("defaults to secondary text color for aborted/unknown", () => {
    expect(resultDotColor("ABORTED")).toBe("var(--text-color-secondary)");
    expect(resultDotColor("")).toBe("var(--text-color-secondary)");
  });
});

describe("toResult", () => {
  it("maps Build Flow statuses to Result enum values", () => {
    expect(toResult("SUCCESS")).toBe("success");
    expect(toResult("FAILURE")).toBe("failure");
    expect(toResult("UNSTABLE")).toBe("unstable");
    expect(toResult("ABORTED")).toBe("aborted");
    expect(toResult("IN_PROGRESS")).toBe("running");
    expect(toResult("QUEUED")).toBe("queued");
    expect(toResult("NOT_BUILT")).toBe("not_built");
  });

  it("defaults to unknown for unrecognized statuses", () => {
    expect(toResult("SOMETHING_ELSE")).toBe("unknown");
    expect(toResult("")).toBe("unknown");
  });
});
