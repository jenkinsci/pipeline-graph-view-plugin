import { useContext } from "react";

import { I18NContext } from "../i18n/i18n-provider";
import { Messages } from "../i18n/messages";

const ONE_SECOND_MS: number = 1000;
const ONE_MINUTE_MS: number = 60 * ONE_SECOND_MS;
const ONE_HOUR_MS: number = 60 * ONE_MINUTE_MS;
const ONE_DAY_MS: number = 24 * ONE_HOUR_MS;
const ONE_MONTH_MS: number = 30 * ONE_DAY_MS;
const ONE_YEAR_MS: number = 365 * ONE_DAY_MS;

const YEAR = "Util.year";
const MONTH = "Util.month";
const HOURS = "Util.hour";
const DAY = "Util.day";
const MINUTE = "Util.minute";
const SECOND = "Util.second";
const MILLIS = "Util.millisecond";
const STARTED_AGO = "startedAgo";

/**
 * Create a string representation of a time duration.
 * If the quantity of the most significant unit is big (>=10), then we use only that most significant unit in the string representation.
 * If the quantity of the most significant unit is small (a single-digit value), then we also use a secondary, smaller unit for increased precision.
 * So 13 minutes and 43 seconds returns just "13 minutes", but 3 minutes and 43 seconds is "3 minutes 43 seconds"
 * @see https://github.com/jenkinsci/jenkins/blob/f9edeb0c0485fddfc03a7e1710ac5cf2b35ec497/core/src/main/java/hudson/Util.java#L781
 */
function makeTimeSpanString(
  bigUnit: number,
  bigLabel: string,
  smallUnit: number,
  smallLabel: string,
): string {
  return bigUnit < 10 ? `${bigLabel} ${smallLabel}` : bigLabel;
}

/**
 * Returns a human-readable text of the time duration, for example "3 minutes 40 seconds".
 * This version should be used for representing a duration of some activity (like build)
 * @see https://github.com/jenkinsci/jenkins/blob/f9edeb0c0485fddfc03a7e1710ac5cf2b35ec497/core/src/main/java/hudson/Util.java#L734
 *
 * @param duration number of milliseconds.
 * @param messages the messages to get the labels from.
 */
function getTimeSpanString(duration: number, messages: Messages): string {
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
  if (years > 0) {
    return makeTimeSpanString(
      years,
      messages.format(YEAR, { "0": years }),
      months,
      messages.format(MONTH, { "0": months }),
    );
  } else if (months > 0) {
    return makeTimeSpanString(
      months,
      messages.format(MONTH, { "0": months }),
      days,
      messages.format(DAY, { "0": days }),
    );
  } else if (days > 0) {
    return makeTimeSpanString(
      days,
      messages.format(DAY, { "0": days }),
      hours,
      messages.format(HOURS, { "0": hours }),
    );
  } else if (hours > 0) {
    return makeTimeSpanString(
      hours,
      messages.format(HOURS, { "0": hours }),
      minutes,
      messages.format(MINUTE, { "0": minutes }),
    );
  } else if (minutes > 0) {
    return makeTimeSpanString(
      minutes,
      messages.format(MINUTE, { "0": minutes }),
      seconds,
      messages.format(SECOND, { "0": seconds }),
    );
  } else if (seconds >= 10) {
    return messages.format(SECOND, { "0": seconds });
  } else if (seconds >= 1) {
    return messages.format(SECOND, {
      "0": seconds + Math.floor(millis / 100) / 10,
    });
  } else if (millis >= 100) {
    return messages.format(SECOND, { "0": Math.floor(millis / 10) / 100 });
  } else {
    return messages.format(MILLIS, { "0": millis });
  }
}

export function Total({ ms }: { ms: number }) {
  const messages = useContext(I18NContext);
  return <>{getTimeSpanString(ms, messages)}</>;
}

export function Paused({ since }: { since: number }) {
  const messages = useContext(I18NContext);
  return <>{`Queued ${getTimeSpanString(since, messages)}`}</>;
}

export function Started({ since }: { since: number }) {
  const messages = useContext(I18NContext);
  if (since === 0) {
    return <></>;
  }

  return (
    <>
      {messages.format(STARTED_AGO, {
        "0": getTimeSpanString(Math.abs(since - Date.now()), messages),
      })}
    </>
  );
}

export function time(since: number): string {
  return since === 0
    ? ""
    : new Date(since).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });
}

export function exact(since: number): string {
  if (since === 0) return "";

  const formatter = new Intl.DateTimeFormat("en-GB", {
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
