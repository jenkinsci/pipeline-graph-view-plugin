import { baseline, Step } from "./utils.ts";

const WIDTH = 96;
const HEIGHT = 24;
const PADDING = 3;

/**
 * A stage's durations across the builds, oldest first, with its median as a dashed line. Builds
 * without a usual duration leave a gap rather than joining their neighbours, and the line takes the
 * colour of the change when the stage got slower or faster.
 */
export default function Sparkline({
  values,
  step,
}: {
  values: Array<number | undefined>;
  step?: Step;
}) {
  const defined = values.filter(
    (value): value is number => value !== undefined,
  );
  if (defined.length < 2) {
    return null;
  }

  // At least 1ms, so durations that are all 0 still draw a flat line
  const max = Math.max(1, ...defined);
  const x = (index: number) =>
    PADDING + (index * (WIDTH - PADDING * 2)) / Math.max(1, values.length - 1);
  const y = (value: number) =>
    HEIGHT - PADDING - (value / max) * (HEIGHT - PADDING * 2);

  // Each run of builds with a duration is its own segment
  const segments: string[][] = [];
  let current: string[] = [];
  values.forEach((value, index) => {
    if (value === undefined) {
      if (current.length > 0) {
        segments.push(current);
      }
      current = [];
    } else {
      current.push(`${x(index)},${y(value)}`);
    }
  });
  if (current.length > 0) {
    segments.push(current);
  }

  const median = baseline(values);
  let lastIndex = values.length - 1;
  while (values[lastIndex] === undefined) {
    lastIndex--;
  }

  return (
    <svg
      className={
        "pgv-stage-durations__sparkline" +
        (step ? ` pgv-stage-durations__sparkline--${step.direction}` : "")
      }
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      aria-hidden="true"
    >
      {step && (
        <rect
          className="pgv-stage-durations__sparkline__since"
          x={x(step.start) - PADDING / 2}
          y={0}
          width={WIDTH - x(step.start) + PADDING / 2}
          height={HEIGHT}
          rx={3}
        />
      )}
      {median !== undefined && (
        <line
          className="pgv-stage-durations__sparkline__median"
          x1={PADDING}
          x2={WIDTH - PADDING}
          y1={y(median)}
          y2={y(median)}
        />
      )}
      {segments.map((points) =>
        points.length === 1 ? (
          <circle
            key={points[0]}
            cx={points[0].split(",")[0]}
            cy={points[0].split(",")[1]}
            r={1.25}
          />
        ) : (
          <polyline key={points[0]} points={points.join(" ")} />
        ),
      )}
      <circle
        className="pgv-stage-durations__sparkline__latest"
        cx={x(lastIndex)}
        cy={y(values[lastIndex]!)}
        r={2}
      />
    </svg>
  );
}
