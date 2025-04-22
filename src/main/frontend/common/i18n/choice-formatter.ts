// The library @messageformat/core supports all the Java MessageFormat
// implementation apart from ChoiceFormat which it states is deprecated,
// this is a simple attempt at implementing this without any of the required
// validation as it is expected that this
// would already have happened to be used within Jelly
function nextUp(current: number): number {
  if (isNaN(current) || current === Number.POSITIVE_INFINITY) {
    return current;
  }
  if (current === 0) {
    return Number.MIN_VALUE;
  }
  const next = current + Number.EPSILON;
  // The final multiplication (current * (1 + Number.EPSILON)) is needed to handle cases where adding
  // Number.EPSILON to current does not result in a larger number due to floating-point precision limitations.
  // This ensures that the next representable floating-point number greater than current is returned,
  // even when current + Number.EPSILON equals current.
  return next === current ? current * (1 + Number.EPSILON) : next;
}

type Choice = {
  value: string;
  limit: number;
};

export function choice(
  value: unknown,
  locale: string,
  arg: string | null,
): string {
  const parts = (arg! as unknown as Array<string>)[0].split("|");
  const _value = Number(value);
  const choices: Choice[] = [];
  // a simple attempt to copy java.text.ChoiceFormat.applyPattern
  // we can assume that these are correctly parsed formats as otherwise java code would have complained
  // so a part is made up of a number and operator and a value
  // the valid operators are <, ≤, # (which means equal)
  for (let part of parts) {
    // let's iterate through the part until we reach an operator
    for (let i = 0; i < part.length; i++) {
      const char = part.charAt(i);
      if (char === "<" || char === "\u2264" || char === "#") {
        const operator = char;
        const number = Number(part.substring(0, i));
        choices.push({
          value: part.substring(i + 1),
          limit: operator === "<" ? nextUp(number) : number,
        });
        break;
      }
    }
  }
  // now we copy java.text.ChoiceFormat.format(double, java.lang.StringBuffer, java.text.FieldPosition)
  let i = 0;
  for (i = 0; i < choices.length; ++i) {
    if (!(_value >= choices[i].limit)) {
      // same as number < choiceLimits, except catches NaN
      break;
    }
  }
  --i;
  if (i < 0) {
    i = 0;
  }
  return choices[i].value;
}
