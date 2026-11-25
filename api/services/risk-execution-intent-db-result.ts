/** Normalize mysql2 update results before treating a conditional lease write as successful. */
export function getAffectedRowsCount(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  if (!header || typeof header !== "object" || !("affectedRows" in header)) return 0;
  const count = Number((header as { affectedRows?: unknown }).affectedRows);
  return Number.isSafeInteger(count) && count >= 0 ? count : 0;
}
