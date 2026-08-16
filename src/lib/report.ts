import { jsPDF } from "jspdf";
import {
  DAYS,
  chapterProgress,
  colorOf,
  formatDuration,
  formatTime,
  sessionSeconds,
  sessionsOn,
  sessionsSince,
  startOfWeek,
  streaks,
  type Chapter,
  type Profile,
  type StudySession,
  type Subject,
  type TimetableEntry,
} from "./study";

type ReportInput = {
  profile: Profile | null | undefined;
  subjects: Subject[];
  chapters: Chapter[];
  sessions: StudySession[];
  timetable: TimetableEntry[];
};

const INK: [number, number, number] = [30, 27, 46];
const MUTED: [number, number, number] = [125, 122, 145];
const BRAND: [number, number, number] = [124, 92, 255];
const SOFT: [number, number, number] = [238, 234, 255];
const LINE: [number, number, number] = [228, 226, 238];

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

export function buildStudyReport({ profile, subjects, chapters, sessions, timetable }: ReportInput) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 40;
  let y = 0;

  const today = new Date();
  const weekStart = startOfWeek(today);
  const weekSessions = sessionsSince(sessions, weekStart);
  const weekSeconds = sessionSeconds(weekSessions);
  const todaySeconds = sessionSeconds(sessionsOn(sessions, today));
  const { current, longest, totalDays } = streaks(sessions, profile?.streak_min_minutes ?? 20);
  const syllabus = chapterProgress(chapters);

  const ensure = (needed: number) => {
    if (y + needed <= pageH - M) return;
    doc.addPage();
    y = M;
  };

  const heading = (text: string) => {
    ensure(46);
    y += 18;
    doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(...INK);
    doc.text(text, M, y);
    y += 10;
    doc.setDrawColor(...LINE).setLineWidth(1);
    doc.line(M, y, pageW - M, y);
    y += 14;
  };

  // ---- header band
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageW, 96, "F");
  doc.setFont("helvetica", "bold").setFontSize(22).setTextColor(255, 255, 255);
  doc.text("StudyFlow weekly report", M, 46);
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text(
    `${profile?.display_name ?? "Student"}  ·  Week of ${weekStart.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}  ·  Generated ${today.toLocaleString()}`,
    M,
    68,
  );
  y = 118;

  // ---- summary tiles
  const tiles = [
    { label: "This week", value: formatDuration(weekSeconds) },
    { label: "Today", value: formatDuration(todaySeconds) },
    { label: "Current streak", value: `${current} d` },
    { label: "Longest streak", value: `${longest} d` },
    { label: "Study days", value: String(totalDays) },
    { label: "Chapters done", value: `${syllabus.completed}/${syllabus.total}` },
  ];
  const cols = 3;
  const gap = 12;
  const tileW = (pageW - M * 2 - gap * (cols - 1)) / cols;
  const tileH = 56;
  tiles.forEach((tile, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = M + col * (tileW + gap);
    const ty = y + row * (tileH + gap);
    doc.setFillColor(...SOFT);
    doc.roundedRect(x, ty, tileW, tileH, 10, 10, "F");
    doc.setFont("helvetica", "bold").setFontSize(15).setTextColor(...INK);
    doc.text(tile.value, x + 14, ty + 26);
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...MUTED);
    doc.text(tile.label, x + 14, ty + 42);
  });
  y += Math.ceil(tiles.length / cols) * (tileH + gap);

  const weeklyGoal = (profile?.weekly_goal_minutes ?? 1200) * 60;
  const goalPct = weeklyGoal ? Math.min(100, Math.round((weekSeconds / weeklyGoal) * 100)) : 0;
  ensure(40);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...MUTED);
  doc.text(`Weekly goal ${formatDuration(weeklyGoal)}  ·  ${goalPct}% complete`, M, y + 8);
  doc.setFillColor(...LINE);
  doc.roundedRect(M, y + 14, pageW - M * 2, 8, 4, 4, "F");
  if (goalPct > 0) {
    doc.setFillColor(...BRAND);
    doc.roundedRect(M, y + 14, ((pageW - M * 2) * goalPct) / 100, 8, 4, 4, "F");
  }
  y += 30;

  // ---- weekly planner
  heading("Weekly planner");
  if (timetable.length === 0) {
    doc.setFont("helvetica", "italic").setFontSize(10).setTextColor(...MUTED);
    doc.text("No timetable entries yet.", M, y);
    y += 16;
  } else {
    for (const day of DAYS) {
      const entries = timetable
        .filter((entry) => entry.day_of_week === day.value)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
      ensure(24 + entries.length * 16);
      doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(...INK);
      doc.text(day.long, M, y);
      y += 14;
      if (entries.length === 0) {
        doc.setFont("helvetica", "italic").setFontSize(9).setTextColor(...MUTED);
        doc.text("Rest day", M + 14, y);
        y += 16;
        continue;
      }
      for (const entry of entries) {
        const subject = subjects.find((s) => s.id === entry.subject_id);
        doc.setFillColor(...hexToRgb(colorOf(subject).hex));
        doc.circle(M + 18, y - 3, 3, "F");
        doc.setFont("helvetica", "normal").setFontSize(9.5).setTextColor(...INK);
        doc.text(
          `${formatTime(entry.start_time)} – ${formatTime(entry.end_time)}   ${subject?.name ?? "Study"}${
            entry.title ? ` · ${entry.title}` : ""
          }`,
          M + 28,
          y,
        );
        y += 15;
      }
      y += 6;
    }
  }

  // ---- subject-wise progress
  heading("Subject-wise progress");
  const colX = [M, M + 170, M + 250, M + 330, M + 410];
  ensure(30);
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...MUTED);
  ["Subject", "This week", "All time", "Chapters", "Progress"].forEach((label, i) => {
    doc.text(label, colX[i]!, y);
  });
  y += 12;
  doc.setDrawColor(...LINE);
  doc.line(M, y - 4, pageW - M, y - 4);

  for (const subject of subjects) {
    const subjectChapters = chapters.filter((c) => c.subject_id === subject.id);
    const progress = chapterProgress(subjectChapters);
    const week = sessionSeconds(weekSessions.filter((s) => s.subject_id === subject.id));
    const all = sessionSeconds(sessions.filter((s) => s.subject_id === subject.id));
    ensure(24);
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(...INK);
    doc.text(subject.name.slice(0, 26), colX[0]!, y + 8);
    doc.setFont("helvetica", "normal").setFontSize(9.5);
    doc.text(formatDuration(week), colX[1]!, y + 8);
    doc.text(formatDuration(all), colX[2]!, y + 8);
    doc.text(`${progress.completed}/${progress.total}`, colX[3]!, y + 8);
    doc.setFillColor(...LINE);
    doc.roundedRect(colX[4]!, y + 2, 105, 7, 3.5, 3.5, "F");
    if (progress.percent > 0) {
      doc.setFillColor(...hexToRgb(colorOf(subject).hex));
      doc.roundedRect(colX[4]!, y + 2, (105 * progress.percent) / 100, 7, 3.5, 3.5, "F");
    }
    doc.setFontSize(8).setTextColor(...MUTED);
    doc.text(`${progress.percent}%`, colX[4]! + 112, y + 8);
    y += 22;
  }

  // ---- chapters in focus
  const active = chapters
    .filter((c) => c.status !== "completed")
    .sort((a, b) => (a.priority === "high" ? -1 : b.priority === "high" ? 1 : 0))
    .slice(0, 12);
  if (active.length > 0) {
    heading("Chapters in focus");
    for (const chapter of active) {
      const subject = subjects.find((s) => s.id === chapter.subject_id);
      ensure(18);
      doc.setFont("helvetica", "normal").setFontSize(9.5).setTextColor(...INK);
      doc.text(`${subject?.name ?? "Subject"} · ${chapter.name}`, M, y);
      doc.setTextColor(...MUTED);
      doc.text(
        `${chapter.status.replace("_", " ")} · ${chapter.priority} priority${
          chapter.target_date ? ` · due ${chapter.target_date}` : ""
        }`,
        pageW - M,
        y,
        { align: "right" },
      );
      y += 15;
    }
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...MUTED);
    doc.text(`StudyFlow · page ${i} of ${pages}`, pageW / 2, pageH - 20, { align: "center" });
  }

  return doc;
}

export function downloadStudyReport(input: ReportInput) {
  const doc = buildStudyReport(input);
  doc.save(`studyflow-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
