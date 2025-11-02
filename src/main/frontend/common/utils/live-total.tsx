import { Since, Total } from "./timings.tsx";

export default function LiveTotal({
  total,
  start,
  paused,
}: {
  total: number | undefined;
  start: number;
  paused?: boolean;
}) {
  if (typeof total === "number") {
    return <Total ms={total} />;
  }
  return <Since live since={start} paused={paused} />;
}
