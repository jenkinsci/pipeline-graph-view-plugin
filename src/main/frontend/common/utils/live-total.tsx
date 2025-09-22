import { useEffect, useState } from "react";

import { Total } from "./timings.tsx";

export default function LiveTotal({
  total,
  start,
}: {
  total: number | undefined;
  start: number;
}) {
  const [duration, setDuration] = useState<number>(total ?? Date.now() - start);
  useEffect(() => {
    if (total == null) {
      const interval = setInterval(() => {
        setDuration(Date.now() - start);
      }, 3001); // to match step polling interval
      return () => clearInterval(interval);
    } else {
      setDuration(total);
    }
  }, [start, total]);

  return <Total ms={duration} />;
}
