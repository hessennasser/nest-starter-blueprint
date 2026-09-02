import { BadRequestException } from '@nestjs/common';

export type DateRangeQuery = {
  dateFrom?: string;
  dateTo?: string;
};

export type DateRangeBounds = {
  from?: Date;
  to?: Date;
};

export type PreviousDateRangeBounds = {
  from: Date;
  to: Date;
  dateFrom: string;
  dateTo: string;
};

/**
 * Turn the calendar dates a list screen sends into inclusive UTC bounds.
 * Omitting both is the deliberate "all time" case.
 */
export function resolveInclusiveDateRange(
  query: DateRangeQuery,
): DateRangeBounds {
  const from = query.dateFrom ? new Date(query.dateFrom) : undefined;
  const to = query.dateTo ? new Date(query.dateTo) : undefined;

  if (from) from.setUTCHours(0, 0, 0, 0);
  if (to) to.setUTCHours(23, 59, 59, 999);

  if (from && to && from > to) {
    throw new BadRequestException('dateFrom must be on or before dateTo');
  }
  return { from, to };
}

const formatUtcDate = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * The window of equal length immediately before `current`, for "vs. previous
 * period" comparisons. `null` when the current range is open on the left.
 */
export function resolvePreviousInclusiveDateRange(
  current: DateRangeBounds,
  now: Date = new Date(),
): PreviousDateRangeBounds | null {
  if (!current.from) return null;
  const currentEnd = current.to ?? now;
  const durationMs = currentEnd.getTime() - current.from.getTime();
  if (durationMs < 0) return null;

  const to = new Date(current.from.getTime() - 1);
  const from = new Date(to.getTime() - durationMs);
  return { from, to, dateFrom: formatUtcDate(from), dateTo: formatUtcDate(to) };
}
