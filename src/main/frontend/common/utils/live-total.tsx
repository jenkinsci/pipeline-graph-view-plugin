import { Since, Total } from "./timings.tsx";

export default function LiveTotal({
  total,
  start,
}: {
  total: number | undefined;
  start: number;
}) {
  if (typeof total === "number") {
    return <Total ms={total} />;
  }
  return <Since live since={start} />;
}
