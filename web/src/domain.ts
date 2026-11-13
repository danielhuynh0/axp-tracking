// Mirrors api/src/entries.ts
export const CATEGORIES = [
  { id: "PcM", name: "Practice Management" },
  { id: "PjM", name: "Project Management" },
  { id: "PA", name: "Programming & Analysis" },
  { id: "PPD", name: "Project Planning & Design" },
  { id: "PDD", name: "Project Development & Documentation" },
  { id: "CE", name: "Construction & Evaluation" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const categoryName = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)!.name;

export type EntryInput = {
  weekStart: string;
  hours: number;
  project: string;
  note: string;
  categories: CategoryId[];
};

export type Entry = EntryInput & { id: string; createdAt: string; updatedAt: string };

// Hours are split equally across an entry's categories.
export const splitHours = (entry: Pick<EntryInput, "hours" | "categories">) =>
  entry.categories.length ? entry.hours / entry.categories.length : 0;

export const formatHours = (h: number) => `${Number(h.toFixed(2))}h`;

// --- Weeks (Sunday-start, as YYYY-MM-DD strings in UTC to avoid DST drift) ---

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toIso = (d: Date) => d.toISOString().slice(0, 10);

export function weekStartOf(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return toIso(d);
}

export function addWeeks(weekStart: string, n: number): string {
  const d = toDate(weekStart);
  d.setUTCDate(d.getUTCDate() + 7 * n);
  return toIso(d);
}

// Snap a YYYY-MM-DD date (e.g. from <input type="date">) to its Sunday
export function snapToWeek(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return weekStartOf(new Date(y, m - 1, d));
}

// --- Report: week → category → entry lines ---

export type ReportLine = { entryId: string; project: string; note: string; hours: number };
export type ReportCategory = { id: CategoryId; name: string; total: number; lines: ReportLine[] };
export type ReportWeek = { weekStart: string; total: number; categories: ReportCategory[] };
export type Report = { weeks: ReportWeek[]; totals: { id: CategoryId; name: string; total: number }[]; total: number };

export function buildReport(entries: Entry[], from: string, to: string): Report {
  const weeks: ReportWeek[] = [];
  for (let w = from; w <= to; w = addWeeks(w, 1)) {
    const weekEntries = entries.filter((e) => e.weekStart === w);
    const categories = CATEGORIES.map((c) => {
      const lines = weekEntries
        .filter((e) => e.categories.includes(c.id))
        .map((e) => ({ entryId: e.id, project: e.project, note: e.note, hours: splitHours(e) }));
      return { id: c.id, name: c.name, total: lines.reduce((s, l) => s + l.hours, 0), lines };
    }).filter((c) => c.lines.length > 0);
    weeks.push({ weekStart: w, total: weekEntries.reduce((s, e) => s + e.hours, 0), categories });
  }

  const totals = CATEGORIES.map((c) => ({
    id: c.id,
    name: c.name,
    total: weeks.reduce((s, w) => s + (w.categories.find((x) => x.id === c.id)?.total ?? 0), 0),
  }));
  return { weeks, totals, total: weeks.reduce((s, w) => s + w.total, 0) };
}

export function formatWeek(weekStart: string): string {
  const fmt = (iso: string) =>
    toDate(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const end = toDate(weekStart);
  end.setUTCDate(end.getUTCDate() + 6);
  return `${fmt(weekStart)} – ${fmt(toIso(end))}`;
}
