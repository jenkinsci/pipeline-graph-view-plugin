import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

describe("BuildFlow.scss", () => {
  const scssPath = resolve(__dirname, "BuildFlow.scss");
  const scss = readFileSync(scssPath, "utf-8");

  it("contains all required CSS custom properties", () => {
    const requiredTokens = [
      "--card-background",
      "--card-border-width",
      "--card-border-color",
      "--form-input-border-radius",
      "--text-color",
      "--text-color-secondary",
      "--success-color",
      "--error-color",
      "--warning-color",
      "--build-color",
      "--accent-color",
      "--font-size-xs",
      "--font-bold-weight",
      "--standard-transition",
    ];
    for (const token of requiredTokens) {
      expect(scss).toContain(token);
    }
  });

  it("includes prefers-reduced-motion media query", () => {
    expect(scss).toContain("prefers-reduced-motion");
  });

  it("includes prefers-contrast media query", () => {
    expect(scss).toContain("prefers-contrast");
  });

  it("includes forced-colors media query", () => {
    expect(scss).toContain("forced-colors");
  });

  it("contains BEM-structured class selectors", () => {
    const requiredClasses = [
      "__node",
      "__edge",
      "__node-header",
      "__node-name",
      "pgv-status-icon",
      "__controls-bar",
      "__overflow-menu",
      "__history-dot",
    ];
    for (const cls of requiredClasses) {
      expect(scss).toContain(cls);
    }
  });

  it("uses pgv-node-enter animation", () => {
    expect(scss).toContain("@keyframes pgv-node-enter");
  });

  it("uses pgv-edge-pulse animation for in-progress edges", () => {
    expect(scss).toContain("@keyframes pgv-edge-pulse");
  });
});
