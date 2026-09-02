/**
 * Money is stored as integer minor units (e.g. cents) everywhere in this
 * codebase — never a float column. These helpers are for the rare display /
 * reporting path that needs a 2-decimal major-unit number.
 */
export function toDecimal(value: string | null | undefined): number {
  if (value == null) return 0;
  return parseFloat(parseFloat(value).toFixed(2));
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Minor units (int) → major units number, e.g. 12345 → 123.45. */
export function fromMinorUnits(minor: number): number {
  return Math.round(minor) / 100;
}

/** Major units number → minor units (int), e.g. 123.45 → 12345. */
export function toMinorUnits(major: number): number {
  return Math.round(major * 100);
}
