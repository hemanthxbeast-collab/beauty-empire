/** True when PostgreSQL rejected a write because of the staff-overlap exclusion constraint. */
export function isOverlapViolation(err: unknown): boolean {
  const seen = new Set<unknown>();
  const visit = (e: unknown): boolean => {
    if (!e || typeof e !== "object" || seen.has(e)) return false;
    seen.add(e);
    const o = e as Record<string, unknown>;
    const text = `${String(o.message ?? "")} ${String(o.code ?? "")} ${String(o.originalCode ?? "")} ${String(o.constraint ?? "")}`;
    if (text.includes("appointment_no_staff_overlap") || text.includes("23P01")) return true;
    return visit(o.cause) || visit(o.meta);
  };
  return visit(err);
}
