import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type OutboxOp =
  | { id: string; at: string; kind: "insert"; table: OutboxTable; payload: Record<string, unknown> }
  | { id: string; at: string; kind: "update"; table: OutboxTable; rowId: string; payload: Record<string, unknown> }
  | { id: string; at: string; kind: "delete"; table: OutboxTable; rowId: string };

export type OutboxTable = "study_sessions" | "chapters" | "timetable_entries";

const KEY = "studyflow.outbox.v1";
const EVENT = "studyflow:outbox";

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
export async function flushOutbox(): Promise<number> {
  if (!isOnline()) return 0;
  const ops = readOutbox();
  if (ops.length === 0) return 0;

  const remaining: OutboxOp[] = [];
  let synced = 0;

  for (const op of ops) {
    try {
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
  return synced;
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
