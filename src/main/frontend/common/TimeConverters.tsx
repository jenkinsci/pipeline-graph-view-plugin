/**
 * Returns formatted date from unix epoch
 * @param epochTime - The epoch time
 * @param timezone - The timezone string
 * @param formatType - The format type: 'short' for "DD MMM, HH:mm" or 'full' for "DD MMM, YYYY, HH:mm AM/PM"
 */
export const formatDateTime = (epochTime: number, timezone: string, formatType: 'short' | 'full'): string => {
  const date = new Date(epochTime);

  let options: Intl.DateTimeFormatOptions;
  if (formatType === 'short') {
    options = {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
      hour12: false
    };
  } else if (formatType === 'full') {
    options = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
      hour12: true
    };
  } else {
    throw new Error('Invalid format type');
  }

  return new Intl.DateTimeFormat(navigator.language, options).format(date);
};
