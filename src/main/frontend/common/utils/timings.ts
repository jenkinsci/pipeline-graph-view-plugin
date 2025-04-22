const ONE_SECOND_MS: number = 1000;
const ONE_MINUTE_MS: number = 60 * ONE_SECOND_MS;
const ONE_HOUR_MS: number = 60 * ONE_MINUTE_MS;
const ONE_DAY_MS: number = 24 * ONE_HOUR_MS;
const ONE_MONTH_MS: number = 30 * ONE_DAY_MS;
const ONE_YEAR_MS: number = 365 * ONE_DAY_MS;

// TODO: 16/04/2025 How to support i18n like the methods this was copied from

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
 */
function getTimeSpanString(duration: number): string {
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
    return makeTimeSpanString(years, `${years} yr`, months, `${months} mo`);
  } else if (months > 0) {
    return makeTimeSpanString(months, `${months} mo`, days, `${days} day`);
  } else if (days > 0) {
    return makeTimeSpanString(days, `${days} day`, hours, `${hours} hr`);
  } else if (hours > 0) {
    return makeTimeSpanString(hours, `${hours} hr`, minutes, `${minutes} min`);
  } else if (minutes > 0) {
    return makeTimeSpanString(
      minutes,
      `${minutes} min`,
      seconds,
      `${seconds} sec`,
    );
  } else if (seconds >= 10) {
    return `${seconds} sec`;
  } else if (seconds >= 1) {
    return `${seconds + Math.floor(millis / 100) / 10} sec`;
  } else if (millis >= 100) {
    return `${Math.floor(millis / 10) / 100} sec`;
  } else {
    return `${millis} ms`;
  }
}

export function total(ms: number): string {
  return `${getTimeSpanString(ms)}`;
}

export function paused(since: number): string {
  return `Queued ${getTimeSpanString(since)}`;
}

export function started(since: number): string {
  return since == 0
    ? ""
    : `Started ${getTimeSpanString(Math.abs(since - Date.now()))} ago`;
}

export function time(since: number): string {
  return since == 0
    ? ""
    : new Date(since).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });
}
