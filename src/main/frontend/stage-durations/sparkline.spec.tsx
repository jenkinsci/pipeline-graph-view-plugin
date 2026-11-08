/** * @vitest-environment jsdom */

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Sparkline from "./sparkline.tsx";

describe("Sparkline", () => {
  it("leaves a gap for builds without a usual duration", () => {
    const { container } = render(
      <Sparkline values={[3000, 3000, undefined, 3000, 3000]} />,
    );

    expect(container.querySelectorAll("polyline")).toHaveLength(2);
  });

  it("takes the colour of a change and shades the builds since", () => {
    const { container } = render(
      <Sparkline
        values={[3000, 3000, 3000, 6000, 6000]}
        step={{
          direction: "slower",
          start: 3,
          before: 3000,
          after: 6000,
          builds: 2,
        }}
      />,
    );

    expect(container.querySelector("svg")).toHaveClass(
      "pgv-stage-durations__sparkline--slower",
    );
    expect(
      container.querySelector(".pgv-stage-durations__sparkline__since"),
    ).not.toBe(null);
  });

  it("needs at least two builds to draw a line", () => {
    const { container } = render(<Sparkline values={[3000, undefined]} />);

    expect(container.querySelector("svg")).toBe(null);
  });
});
