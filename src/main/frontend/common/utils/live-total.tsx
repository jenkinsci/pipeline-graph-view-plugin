import { useEffect, useState } from "react";

import { Total } from "./timings.tsx";

export default function LiveTotal({
  total,
  start,
}: {
  total: number | undefined;
  start: number;
}) {
  const sinceStart = () => Date.now() - start;
  const [duration, setDuration] = useState<number>(total ?? sinceStart());
  useEffect(() => {
    if (total == null) {
      const interval = setInterval(() => {
        setDuration(sinceStart());
      }, 3001); // to match step polling interval
      return () => clearInterval(interval);
    } else {
      setDuration(total);
    }
  }, [total]);

  return <Total ms={duration} />;
}
