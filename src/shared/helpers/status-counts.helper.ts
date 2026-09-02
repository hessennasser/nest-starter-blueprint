/**
 * Turn `SELECT status, COUNT(*) ... GROUP BY status` rows into a stable,
 * zero-filled map so a list response always carries every status key even when
 * a status has no rows. Pair it with the `statusCounts` field on a paginated
 * presenter output.
 */
export function buildStatusCounts<T extends string>(
  statuses: readonly T[],
  rows: ReadonlyArray<{ status: T; count: string | number }>,
): Record<T, number> {
  const counts = Object.fromEntries(
    statuses.map((status) => [status, 0]),
  ) as Record<T, number>;
  for (const row of rows) {
    counts[row.status] = Number(row.count) || 0;
  }
  return counts;
}
