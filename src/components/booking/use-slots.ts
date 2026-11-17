"use client";

import { useEffect, useState } from "react";

export type SlotOption = { minuteOfDay: number; label: string; staffIds?: string[] };

/**
 * Loads available times for services/staff/date. Results are keyed by the query they answer,
 * so a stale response is never shown and no state is reset synchronously inside an effect.
 * `exclude` ignores one existing appointment (rescheduling it) — honoured server-side only
 * for the booking's owner or an admin.
 */
export function useSlots(params: { serviceIds: string[]; staffId: string; date: string | null; exclude?: string; enabled?: boolean }) {
  const [state, setState] = useState<{ key: string; slots: SlotOption[] | null; error: string | null }>({ key: "", slots: null, error: null });
  const [nonce, setNonce] = useState(0);
  const enabled = params.enabled !== false && Boolean(params.date) && params.serviceIds.length > 0;
  const key = enabled ? `${params.serviceIds.join(",")}|${params.staffId}|${params.date}|${params.exclude ?? ""}|${nonce}` : "";

  useEffect(() => {
    if (!key || !params.date) return;
    const ctrl = new AbortController();
    const qs = new URLSearchParams({ serviceIds: params.serviceIds.join(","), staffId: params.staffId, date: params.date });
    if (params.exclude) qs.set("exclude", params.exclude);
    fetch(`/api/availability?${qs}`, { signal: ctrl.signal, cache: "no-store" })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error ?? "We couldn't load available times.");
        setState({ key, slots: body.slots as SlotOption[], error: null });
      })
      .catch((e: Error) => {
        if (e.name === "AbortError") return;
        setState({ key, slots: null, error: e instanceof TypeError ? "You appear to be offline. Check your connection and try again." : e.message });
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` encodes every input
  }, [key]);

  const current = state.key === key;
  return {
    slots: current ? state.slots : null,
    error: current ? state.error : null,
    loading: Boolean(key) && !current,
    reload: () => setNonce((n) => n + 1),
  };
}
