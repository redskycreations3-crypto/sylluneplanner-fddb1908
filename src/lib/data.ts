import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Chapter, Profile, StudySession, Subject, TimetableEntry } from "./study";
import { enqueue, enqueueDelete, flushOutbox, isOnline, offlineUserId, readOutbox } from "./offline";
import { useEffect } from "react";
import { toast } from "sonner";

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Keeps working with no connection: queues the write and replays it on reconnect. */
function offlineFirst<T>(run: () => Promise<T>, queue: () => void) {
  if (!isOnline()) {
    queue();
    return Promise.resolve(undefined as T);
  }
  return run().catch((error) => {
    if (!isOnline()) {
      queue();
      return undefined as T;
    }
    throw error;
  });
}

/** Replays queued offline changes whenever the connection comes back. */
export function useOutboxSync() {
  const qc = useQueryClient();
  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      if (readOutbox().length === 0) return;
      const { synced, resolutions } = await flushOutbox();
      if (cancelled) return;
      if (synced > 0) qc.invalidateQueries();
      const conflicts = resolutions.filter((r) => r.outcome !== "synced");
      if (conflicts.length > 0) {
        toast.warning(
          conflicts.length === 1
            ? conflicts[0]!.message
            : `${conflicts.length} overlapping offline sessions resolved on sync.`,
          { description: "See Settings › Sync activity for details." },
        );
      } else if (synced > 0) {
        toast.success(`Synced ${synced} offline change${synced > 1 ? "s" : ""}.`);
      }
    };
    sync();
    window.addEventListener("online", sync);
    const id = window.setInterval(sync, 30000);
    return () => {
      cancelled = true;
      window.removeEventListener("online", sync);
      window.clearInterval(id);
    };
  }, [qc]);
}

let bootstrapPromise: Promise<void> | null = null;

export function bootstrapAccount() {
  if (!bootstrapPromise) {
    bootstrapPromise = runBootstrap().finally(() => {
      bootstrapPromise = null;
    });
  }
  return bootstrapPromise;
}

async function runBootstrap() {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

  if (!profile) {
    await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          display_name:
            (user.user_metadata?.["display_name"] as string | undefined) ??
            user.email?.split("@")[0] ??
            "Student",
          seeded: true,
        },
        { onConflict: "id" },
      );
  }
}

/* ---------- queries ---------- */

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async (): Promise<Profile | null> => {
      const userId = await currentUserId();
      if (!userId) return null;
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSubjects() {
  return useQuery({
    queryKey: ["subjects"],
    queryFn: async (): Promise<Subject[]> => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .order("position")
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useChapters() {
  return useQuery({
    queryKey: ["chapters"],
    queryFn: async (): Promise<Chapter[]> => {
      const { data, error } = await supabase
        .from("chapters")
        .select("*")
        .order("position")
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSessions() {
  return useQuery({
    queryKey: ["sessions"],
    queryFn: async (): Promise<StudySession[]> => {
      const { data, error } = await supabase
        .from("study_sessions")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTimetable() {
  return useQuery({
    queryKey: ["timetable"],
    queryFn: async (): Promise<TimetableEntry[]> => {
      const { data, error } = await supabase
        .from("timetable_entries")
        .select("*")
        .order("day_of_week")
        .order("start_time");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ---------- mutations ---------- */

function useInvalidate(keys: string[]) {
  const qc = useQueryClient();
  return () => keys.forEach((key) => qc.invalidateQueries({ queryKey: [key] }));
}

export function useSaveProfile() {
  const invalidate = useInvalidate(["profile"]);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Profile>) => {
      const userId = isOnline() ? await currentUserId() : await offlineUserId();
      if (!userId) throw new Error("Not signed in");
      await offlineFirst(
        async () => {
          const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
          if (error) throw error;
        },
        () => {
          enqueue({ kind: "update", table: "profiles", rowId: userId, payload: patch });
          qc.setQueryData<Profile | null>(["profile"], (row) => (row ? { ...row, ...patch } : row));
        },
      );
    },
    onSuccess: invalidate,
  });
}

export function useSaveSubject() {
  const invalidate = useInvalidate(["subjects"]);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Subject> & { id?: string }) => {
      const userId = isOnline() ? await currentUserId() : await offlineUserId();
      if (!userId) throw new Error("Not signed in");
      if (input.id) {
        const { id, ...patch } = input;
        await offlineFirst(
          async () => {
            const { error } = await supabase.from("subjects").update(patch).eq("id", id);
            if (error) throw error;
          },
          () => {
            enqueue({ kind: "update", table: "subjects", rowId: id, payload: patch });
            qc.setQueryData<Subject[]>(["subjects"], (rows) =>
              (rows ?? []).map((row) => (row.id === id ? { ...row, ...patch } : row)),
            );
          },
        );
      } else {
        const payload = { ...input, name: input.name ?? "New subject", user_id: userId };
        await offlineFirst(
          async () => {
            const { error } = await supabase.from("subjects").insert(payload);
            if (error) throw error;
          },
          () => {
            const queued = enqueue({ kind: "insert", table: "subjects", payload });
            qc.setQueryData<Subject[]>(["subjects"], (rows) => [
              ...(rows ?? []),
              {
                id: queued.id,
                user_id: userId,
                name: payload.name,
                icon: input.icon ?? "book",
                color: input.color ?? "lavender",
                daily_goal_minutes: input.daily_goal_minutes ?? 0,
                weekly_goal_minutes: input.weekly_goal_minutes ?? 0,
                position: input.position ?? (rows?.length ?? 0),
                created_at: queued.at,
              } as Subject,
            ]);
          },
        );
      }
    },
    onSuccess: invalidate,
  });
}

export function useDeleteSubject() {
  const invalidate = useInvalidate(["subjects", "chapters", "sessions", "timetable"]);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await offlineFirst(
        async () => {
          const { error } = await supabase.from("subjects").delete().eq("id", id);
          if (error) throw error;
        },
        () => {
          enqueueDelete("subjects", id);
          qc.setQueryData<Subject[]>(["subjects"], (rows) => (rows ?? []).filter((row) => row.id !== id));
          qc.setQueryData<Chapter[]>(["chapters"], (rows) =>
            (rows ?? []).filter((row) => row.subject_id !== id),
          );
        },
      );
    },
    onSuccess: invalidate,
  });
}

export function useSaveChapter() {
  const invalidate = useInvalidate(["chapters"]);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Chapter> & { id?: string; subject_id?: string }) => {
      const userId = isOnline() ? await currentUserId() : await offlineUserId();
      if (!userId) throw new Error("Not signed in");
      if (input.id) {
        const { id, ...patch } = input;
        await offlineFirst(
          async () => {
            const { error } = await supabase.from("chapters").update(patch).eq("id", id);
            if (error) throw error;
          },
          () => {
            enqueue({ kind: "update", table: "chapters", rowId: id, payload: patch });
            qc.setQueryData<Chapter[]>(["chapters"], (rows) =>
              (rows ?? []).map((row) => (row.id === id ? { ...row, ...patch } : row)),
            );
          },
        );
      } else {
        if (!input.subject_id) throw new Error("Pick a subject");
        const subjectId = input.subject_id;
        const localCount = (qc.getQueryData<Chapter[]>(["chapters"]) ?? []).filter(
          (row) => row.subject_id === subjectId,
        ).length;
        const buildPayload = (position: number) => ({
          ...input,
          subject_id: subjectId,
          name: input.name ?? "New chapter",
          position: input.position ?? position,
          user_id: userId,
        });
        await offlineFirst(
          async () => {
            const { count } = await supabase
              .from("chapters")
              .select("id", { count: "exact", head: true })
              .eq("subject_id", subjectId);
            const { error } = await supabase.from("chapters").insert(buildPayload(count ?? localCount));
            if (error) throw error;
          },
          () => {
            const payload = buildPayload(localCount);
            const queued = enqueue({ kind: "insert", table: "chapters", payload });
            qc.setQueryData<Chapter[]>(["chapters"], (rows) => [
              ...(rows ?? []),
              {
                id: queued.id,
                user_id: userId,
                subject_id: subjectId,
                name: payload.name,
                status: input.status ?? "not_started",
                revision: input.revision ?? "none",
                priority: input.priority ?? "medium",
                target_date: input.target_date ?? null,
                notes: input.notes ?? null,
                position: payload.position,
                created_at: queued.at,
              } as Chapter,
            ]);
          },
        );
      }
    },
    onSuccess: invalidate,
  });
}

export function useDeleteChapter() {
  const invalidate = useInvalidate(["chapters", "sessions"]);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await offlineFirst(
        async () => {
          const { error } = await supabase.from("chapters").delete().eq("id", id);
          if (error) throw error;
        },
        () => {
          enqueueDelete("chapters", id);
          qc.setQueryData<Chapter[]>(["chapters"], (rows) => (rows ?? []).filter((row) => row.id !== id));
        },
      );
    },
    onSuccess: invalidate,
  });
}

export function useReorderChapters() {
  const invalidate = useInvalidate(["chapters"]);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ordered: { id: string; position: number }[]) => {
      await offlineFirst(
        async () => {
          for (const row of ordered) {
            const { error } = await supabase
              .from("chapters")
              .update({ position: row.position })
              .eq("id", row.id);
            if (error) throw error;
          }
        },
        () => {
          const positions = new Map(ordered.map((row) => [row.id, row.position]));
          for (const row of ordered) {
            enqueue({ kind: "update", table: "chapters", rowId: row.id, payload: { position: row.position } });
          }
          qc.setQueryData<Chapter[]>(["chapters"], (rows) =>
            (rows ?? []).map((row) =>
              positions.has(row.id) ? { ...row, position: positions.get(row.id)! } : row,
            ),
          );
        },
      );
    },
    onSuccess: invalidate,
  });
}

export function useSaveSession() {
  const qc = useQueryClient();
  const invalidate = useInvalidate(["sessions"]);
  return useMutation({
    mutationFn: async (input: Partial<StudySession> & { id?: string }) => {
      const userId = isOnline() ? await currentUserId() : await offlineUserId();
      if (!userId) throw new Error("Not signed in");
      if (input.id) {
        const { id, ...patch } = input;
        await offlineFirst(
          async () => {
            const { error } = await supabase.from("study_sessions").update(patch).eq("id", id);
            if (error) throw error;
          },
          () => {
            enqueue({ kind: "update", table: "study_sessions", rowId: id, payload: patch });
            qc.setQueryData<StudySession[]>(["sessions"], (rows) =>
              (rows ?? []).map((row) => (row.id === id ? { ...row, ...patch } : row)),
            );
          },
        );
      } else {
        const payload = { ...input, user_id: userId };
        await offlineFirst(
          async () => {
            const { error } = await supabase.from("study_sessions").insert(payload);
            if (error) throw error;
          },
          () => {
            const queued = enqueue({ kind: "insert", table: "study_sessions", payload });
            qc.setQueryData<StudySession[]>(["sessions"], (rows) => [
              {
                id: queued.id,
                user_id: userId,
                subject_id: input.subject_id ?? null,
                chapter_id: input.chapter_id ?? null,
                started_at: input.started_at ?? queued.at,
                ended_at: input.ended_at ?? queued.at,
                duration_seconds: input.duration_seconds ?? 0,
                break_seconds: input.break_seconds ?? 0,
                session_type: input.session_type ?? "stopwatch",
                source: input.source ?? "timer",
                note: input.note ?? null,
                created_at: queued.at,
              },
              ...(rows ?? []),
            ]);
          },
        );
      }
    },
    onSuccess: invalidate,
  });
}

export function useDeleteSession() {
  const invalidate = useInvalidate(["sessions"]);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await offlineFirst(
        async () => {
          const { error } = await supabase.from("study_sessions").delete().eq("id", id);
          if (error) throw error;
        },
        () => {
          if (!id.startsWith("local-")) enqueue({ kind: "delete", table: "study_sessions", rowId: id });
          qc.setQueryData<StudySession[]>(["sessions"], (rows) =>
            (rows ?? []).filter((row) => row.id !== id),
          );
        },
      );
    },
    onSuccess: invalidate,
  });
}

export function useSaveTimetableEntry() {
  const invalidate = useInvalidate(["timetable"]);
  return useMutation({
    mutationFn: async (input: Partial<TimetableEntry> & { id?: string; days?: number[] }) => {
      const userId = await currentUserId();
      if (!userId) throw new Error("Not signed in");
      const { days, id, ...rest } = input;
      if (id) {
        const { error } = await supabase.from("timetable_entries").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const targetDays = days && days.length > 0 ? days : [rest.day_of_week ?? 1];
        const { error } = await supabase.from("timetable_entries").insert(
          targetDays.map((day) => ({
            ...rest,
            day_of_week: day,
            user_id: userId,
          })),
        );
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });
}

export function useDeleteTimetableEntry() {
  const invalidate = useInvalidate(["timetable"]);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("timetable_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export async function exportAllData() {
  const [subjects, chapters, sessions, timetable, profile] = await Promise.all([
    supabase.from("subjects").select("*"),
    supabase.from("chapters").select("*"),
    supabase.from("study_sessions").select("*"),
    supabase.from("timetable_entries").select("*"),
    supabase.from("profiles").select("*").maybeSingle(),
  ]);
  return {
    exported_at: new Date().toISOString(),
    profile: profile.data,
    subjects: subjects.data ?? [],
    chapters: chapters.data ?? [],
    sessions: sessions.data ?? [],
    timetable: timetable.data ?? [],
  };
}

export async function resetAllData() {
  const userId = await currentUserId();
  if (!userId) return;
  await supabase.from("study_sessions").delete().eq("user_id", userId);
  await supabase.from("timetable_entries").delete().eq("user_id", userId);
  await supabase.from("chapters").delete().eq("user_id", userId);
  await supabase.from("subjects").delete().eq("user_id", userId);
  await supabase.from("profiles").update({ seeded: false }).eq("id", userId);
}

type ImportPayload = {
  subjects?: Subject[];
  chapters?: Chapter[];
  sessions?: StudySession[];
  timetable?: TimetableEntry[];
};

export async function importAllData(payload: ImportPayload) {
  const userId = await currentUserId();
  if (!userId) throw new Error("Not signed in");
  await resetAllData();
  const subjectIdMap = new Map<string, string>();

  for (const subject of payload.subjects ?? []) {
    const { data } = await supabase
      .from("subjects")
      .insert({
        user_id: userId,
        name: subject.name,
        icon: subject.icon,
        color: subject.color,
        daily_goal_minutes: subject.daily_goal_minutes,
        weekly_goal_minutes: subject.weekly_goal_minutes,
        position: subject.position,
      })
      .select()
      .single();
    if (data) subjectIdMap.set(subject.id, data.id);
  }

  const chapterIdMap = new Map<string, string>();
  for (const chapter of payload.chapters ?? []) {
    const subjectId = subjectIdMap.get(chapter.subject_id);
    if (!subjectId) continue;
    const { data } = await supabase
      .from("chapters")
      .insert({
        user_id: userId,
        subject_id: subjectId,
        name: chapter.name,
        status: chapter.status,
        revision: chapter.revision,
        priority: chapter.priority,
        target_date: chapter.target_date,
        notes: chapter.notes,
        position: chapter.position,
      })
      .select()
      .single();
    if (data) chapterIdMap.set(chapter.id, data.id);
  }

  for (const session of payload.sessions ?? []) {
    await supabase.from("study_sessions").insert({
      user_id: userId,
      subject_id: session.subject_id ? (subjectIdMap.get(session.subject_id) ?? null) : null,
      chapter_id: session.chapter_id ? (chapterIdMap.get(session.chapter_id) ?? null) : null,
      started_at: session.started_at,
      ended_at: session.ended_at,
      duration_seconds: session.duration_seconds,
      break_seconds: session.break_seconds,
      session_type: session.session_type,
      note: session.note,
    });
  }

  for (const entry of payload.timetable ?? []) {
    await supabase.from("timetable_entries").insert({
      user_id: userId,
      subject_id: entry.subject_id ? (subjectIdMap.get(entry.subject_id) ?? null) : null,
      title: entry.title,
      day_of_week: entry.day_of_week,
      start_time: entry.start_time,
      end_time: entry.end_time,
      note: entry.note,
      reminder: entry.reminder,
      position: entry.position,
    });
  }
  await supabase.from("profiles").update({ seeded: true }).eq("id", userId);
}
