import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type OutboxOp =
  | { id: string; at: string; kind: "insert"; table: OutboxTable; payload: Record<string, unknown> }
  | { id: string; at: string; kind: "update"; table: OutboxTable; rowId: string; payload: Record<string, unknown> }
  | { id: string; at: string; kind: "delete"; table: OutboxTable; rowId: string };

export type OutboxTable = "study_sessions" | "chapters" | "timetable_entries";

const KEY = "studyflow.outbox.v1";
const EVENT = "studyflow:outbox";
const RESOLUTIONS_KEY = "studyflow.sync-resolutions.v1";

export type SyncResolution = {
  id: string;
  at: string;
  outcome: "synced" | "merged" | "trimmed" | "dropped" | "failed";
  message: string;
};

export function readResolutions(): SyncResolution[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(RESOLUTIONS_KEY);
    return raw ? (JSON.parse(raw) as SyncResolution[]) : [];
  } catch {
    return [];
  }
}

function writeResolutions(list: SyncResolution[]) {
  localStorage.setItem(RESOLUTIONS_KEY, JSON.stringify(list.slice(-30)));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function clearResolutions() {
  writeResolutions([]);
}

export function isOnline() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

export function readOutbox(): OutboxOp[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OutboxOp[]) : [];
  } catch {
    return [];
  }
}

function writeOutbox(ops: OutboxOp[]) {
  localStorage.setItem(KEY, JSON.stringify(ops));
  window.dispatchEvent(new CustomEvent(EVENT));
}

type OutboxDraft = OutboxOp extends infer T ? (T extends OutboxOp ? Omit<T, "id" | "at"> : never) : never;

export function enqueue(op: OutboxDraft) {
  const full = {
    ...op,
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
  } as OutboxOp;
  writeOutbox([...readOutbox(), full]);
  return full;
}

/** Push every queued change to the cloud. Returns how many synced. */
export async function flushOutbox(): Promise<{ synced: number; resolutions: SyncResolution[] }> {
  if (!isOnline()) return { synced: 0, resolutions: [] };
  const ops = readOutbox();
  if (ops.length === 0) return { synced: 0, resolutions: [] };

  const remaining: OutboxOp[] = [];
  const resolutions: SyncResolution[] = [];
  let synced = 0;

  for (const op of ops) {
    try {
      if (op.kind === "insert" && op.table === "study_sessions") {
        const outcome = await syncSessionInsert(op.payload);
        resolutions.push({ id: op.id, at: new Date().toISOString(), ...outcome });
        synced += 1;
        continue;
      }
      const table = supabase.from(op.table);
      const { error } =
        op.kind === "insert"
          ? await table.insert(op.payload as never)
          : op.kind === "update"
            ? await table.update(op.payload as never).eq("id", op.rowId)
            : await table.delete().eq("id", op.rowId);
      if (error) throw error;
      synced += 1;
    } catch {
      remaining.push(op);
    }
  }

  writeOutbox(remaining);
  if (resolutions.length > 0) writeResolutions([...readResolutions(), ...resolutions]);
  return { synced, resolutions };
}

/**
 * Offline sessions can overlap sessions that were already recorded on another
 * device. We merge exact duplicates, trim partial overlaps, and drop the ones
 * that are fully covered — then report what happened.
 */
async function syncSessionInsert(
  payload: Record<string, unknown>,
): Promise<Omit<SyncResolution, "id" | "at">> {
  const startedAt = String(payload["started_at"] ?? new Date().toISOString());
  const endedAt = String(payload["ended_at"] ?? startedAt);
  let start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();

  const { data: existing } = await supabase
    .from("study_sessions")
    .select("id, started_at, ended_at, duration_seconds")
    .lt("started_at", new Date(end + 1).toISOString())
    .gt("ended_at", new Date(start - 1).toISOString());

  const overlaps = (existing ?? []).filter(
    (row) => new Date(row.started_at).getTime() < end && new Date(row.ended_at).getTime() > start,
  );

  const duplicate = overlaps.find(
    (row) =>
      Math.abs(new Date(row.started_at).getTime() - start) < 60_000 &&
      Math.abs(new Date(row.ended_at).getTime() - end) < 60_000,
  );
  if (duplicate) {
    return { outcome: "merged", message: "Duplicate offline session merged with the existing one." };
  }

  for (const row of overlaps) {
    const rowEnd = new Date(row.ended_at).getTime();
    if (rowEnd > start) start = Math.max(start, rowEnd);
  }

  const seconds = Math.floor((end - start) / 1000);
  if (overlaps.length > 0 && seconds < 60) {
    return { outcome: "dropped", message: "Overlapping offline session discarded (already covered)." };
  }

  const finalPayload = {
    ...payload,
    started_at: new Date(start).toISOString(),
    ended_at: new Date(end).toISOString(),
    ...(overlaps.length > 0 ? { duration_seconds: seconds } : {}),
  };
  const { error } = await supabase.from("study_sessions").insert(finalPayload as never);
  if (error) throw error;

  return overlaps.length > 0
    ? {
        outcome: "trimmed",
        message: `Overlap resolved — offline session shortened to ${Math.round(seconds / 60)}m.`,
      }
    : { outcome: "synced", message: "Offline session synced." };
}

export async function offlineUserId(): Promise<string | null> {
  // getSession reads local storage, so it also works with no connection.
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

export function usePendingCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const update = () => setCount(readOutbox().length);
    update();
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return count;
}

export function useSyncResolutions() {
  const [items, setItems] = useState<SyncResolution[]>([]);
  useEffect(() => {
    const update = () => setItems(readResolutions());
    update();
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return items;
}
