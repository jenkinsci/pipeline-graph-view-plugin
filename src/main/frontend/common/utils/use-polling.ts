import { useEffect, useState } from "react";

export function usePolling<T extends { raw?: string }>(
  update: () => Promise<T>,
  interval: number,
  completeKey: keyof T,
  defaultValue: T,
  postProcess?: (next: T) => Promise<T>,
) {
  const [data, setData] = useState<T>(defaultValue);
  const [loading, setLoading] = useState<boolean>(true);
  useEffect(() => {
    let polling = true;
    let lastRaw = "";
    const poll = async () => {
      while (polling) {
        try {
          const data = await update();
          if (data.raw !== lastRaw) {
            lastRaw = data.raw ?? "";
            if (postProcess) {
              setData(await postProcess(data));
            } else {
              setData(data);
            }
          }
          if (data[completeKey]) {
            polling = false;
          }
          setLoading(false);
        } catch (err) {
          console.error(err);
        }
        if (!polling) break;
        await new Promise((resolve) => setTimeout(resolve, interval));
      }
    };
    poll();
    return () => {
      polling = false;
    };
  }, [completeKey, interval, update, postProcess]);
  return { data, loading };
}
