import "@formatjs/intl-durationformat/polyfill";

import { useEffect, useState } from "react";

import { LocalizedMessageKey, useLocale, useMessages } from "../i18n/index.ts";
import { MessageKeyType } from "../i18n/messages.ts";

const ONE_SECOND_MS: number = 1000;
const ONE_MINUTE_MS: number = 60 * ONE_SECOND_MS;
const ONE_HOUR_MS: number = 60 * ONE_MINUTE_MS;
const ONE_DAY_MS: number = 24 * ONE_HOUR_MS;
const ONE_MONTH_MS: number = 30 * ONE_DAY_MS;
const ONE_YEAR_MS: number = 365 * ONE_DAY_MS;
type DurationUnit =
  | "years"
  | "months"
  | "days"
  | "hours"
  | "minutes"
  | "seconds"
  | "milliseconds";

function humanise(duration: number, locale: string): string {
  const years = Math.floor(duration / ONE_YEAR_MS);
  duration %= ONE_YEAR_MS;
  const months = Math.floor(duration / ONE_MONTH_MS);
  duration %= ONE_MONTH_MS;
  const days = Math.floor(duration / ONE_DAY_MS);
  duration %= ONE_DAY_MS;
  const hours = Math.floor(duration / ONE_HOUR_MS);
  duration %= ONE_HOUR_MS;
  const minutes = Math.floor(duration / ONE_MINUTE_MS);
  duration %= ONE_MINUTE_MS;
  const seconds = Math.floor(duration / ONE_SECOND_MS);

  const millis = duration % ONE_SECOND_MS;

  const durationParts: any = {};

  function applyDuration(
    big: number,
    bigKey: DurationUnit,
    small: number,
    smallKey: DurationUnit,
  ): DurationUnit {
    durationParts[bigKey] = big;
    if (big < 10) {
      durationParts[smallKey] = small;
      return smallKey;
    }
    return bigKey;
  }

  const options: any = {
    style: "narrow",
  };
  if (years > 0) {
    applyDuration(years, "years", months, "months");
  } else if (months > 0) {
    const unit = applyDuration(months, "months", days, "days");
    // I've included this because the narrow version of months (in english) is "m"
    // which could be confused with minutes.
    if (unit === "months") {
      options.style = "short";
    }
  } else if (days > 0) {
    applyDuration(days, "days", hours, "hours");
  } else if (hours > 0) {
    applyDuration(hours, "hours", minutes, "minutes");
  } else if (minutes > 0) {
    applyDuration(minutes, "minutes", seconds, "seconds");
  } else if (seconds >= 10) {
    durationParts["seconds"] = seconds;
  } else if (seconds >= 1) {
    durationParts["seconds"] = seconds;
    if (millis >= 100) {
      durationParts["milliseconds"] = millis;
      options.fractionalDigits = 1;
      options.milliseconds = "numeric";
    }
  } else if (millis >= 100) {
    durationParts["seconds"] = 0;
    durationParts["milliseconds"] = millis;
    options.fractionalDigits = Math.floor(millis / 10) % 10 === 0 ? 1 : 2;
    options.milliseconds = "numeric";
  } else {
    durationParts["milliseconds"] = millis;
  }

  // @ts-ignore https://github.com/microsoft/TypeScript/issues/60608
  return new Intl.DurationFormat(locale, options).format(durationParts);
}

export function Total({ ms }: { ms: number }) {
  return <>{humanise(ms, useLocale())}</>;
}

export function Paused({ since }: { since: number }) {
  const messages = useMessages();
  return (
    <>
      {messages.format(LocalizedMessageKey.queued, {
        0: humanise(since, useLocale()),
      })}
    </>
  );
}

export function Started({ since, live }: { since: number; live: boolean }) {
  return (
    <Since
      localeKey={LocalizedMessageKey.startedAgo}
      since={since}
      live={live}
    />
  );
}

export function Since({
  localeKey,
  since,
  live,
}: {
  localeKey?: MessageKeyType;
  since: number;
  live: boolean;
}) {
  const messages = useMessages();
  const locale = useLocale();

  const [duration, setDuration] = useState(0);

  // Initial set and when ever since changes, e.g. when steps/stages change.
  useEffect(() => {
    // Avoid displaying "0.42s ago" initially. Start with "1s ago".
    const ms = Math.max(1_000, Date.now() - since);
    // "9.99s ago" is not useful either. By the time you read it, it is already "10s ago".
    // Round everything to the next second.
    setDuration(1_000 * Math.round(ms / 1_000));
  }, [since]);

  useEffect(() => {
    // Update every second while in progress. Update every minute when done.
    const resolution = live ? 1_000 : 60_000;
    const update = () => {
      // Round with 1s/1min precision.
      setDuration(resolution * Math.round((Date.now() - since) / resolution));
    };
    let interval = 0;
    const delayIntervalSetup = setTimeout(
      () => {
        update();
        interval = window.setInterval(update, resolution);
      },
      // Delay the setup of the interval until the next break point for the resolution.
      // e.g. live and first duration = 0.7s; wait 0.3s; then update every 1s.
      //      -> rendered as 1s -> 2s -> 3s
      // e.g. done and first duration = 42.42s; wait 17.58s; then update every 1min.
      //      -> rendered as 42s -> 1min -> 2min -> 3min
      // Add 1ms to both delay and interval to avoid running just before the break point.
      resolution - ((Date.now() - since) % resolution),
    );
    return () => {
      clearTimeout(delayIntervalSetup);
      clearInterval(interval);
    };
  }, [live, since]);

  if (since === 0) {
    return <></>;
  }
  if (!localeKey) {
    return <Total ms={duration} />;
  }
  return <>{messages.format(localeKey, { "0": humanise(duration, locale) })}</>;
}

export function time(since: number, locale: string = "en-GB"): string {
  return since === 0
    ? ""
    : new Date(since).toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
      });
}

export function exact(since: number, locale: string = "en-GB"): string {
  if (since === 0) return "";

  const formatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return formatter.format(new Date(since));
}
