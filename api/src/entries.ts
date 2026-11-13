// NCARB AXP experience areas, in official order. IDs are NCARB's abbreviations.
export const CATEGORIES = [
  { id: "PcM", name: "Practice Management" },
  { id: "PjM", name: "Project Management" },
  { id: "PA", name: "Programming & Analysis" },
  { id: "PPD", name: "Project Planning & Design" },
  { id: "PDD", name: "Project Development & Documentation" },
  { id: "CE", name: "Construction & Evaluation" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
const CATEGORY_IDS = new Set<string>(CATEGORIES.map((c) => c.id));

export type EntryInput = {
  weekStart: string; // YYYY-MM-DD, always a Sunday
  hours: number;
  project: string;
  note: string;
  categories: CategoryId[];
};

export type Entry = EntryInput & { id: string; createdAt: string; updatedAt: string };

export class ValidationError extends Error {}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isSunday(date: string): boolean {
  if (!DATE_RE.test(date)) return false;
  const d = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date && d.getUTCDay() === 0;
}

export function parseEntryInput(body: unknown): EntryInput {
  if (typeof body !== "object" || body === null) throw new ValidationError("Body must be a JSON object");
  const b = body as Record<string, unknown>;

  if (typeof b.weekStart !== "string" || !isSunday(b.weekStart)) {
    throw new ValidationError("weekStart must be a Sunday in YYYY-MM-DD format");
  }
  if (typeof b.hours !== "number" || !(b.hours > 0) || b.hours > 168 || (b.hours * 4) % 1 !== 0) {
    throw new ValidationError("hours must be greater than 0, at most 168, in 0.25 increments");
  }
  const project = typeof b.project === "string" ? b.project.trim() : "";
  if (!project || project.length > 200) throw new ValidationError("project is required (max 200 characters)");

  const note = typeof b.note === "string" ? b.note.trim() : "";
  if (note.length > 2000) throw new ValidationError("note must be at most 2000 characters");

  if (!Array.isArray(b.categories) || b.categories.length === 0) {
    throw new ValidationError("categories must include at least one category");
  }
  const categories = [...new Set(b.categories)];
  if (!categories.every((c): c is CategoryId => typeof c === "string" && CATEGORY_IDS.has(c))) {
    throw new ValidationError(`categories must be from: ${[...CATEGORY_IDS].join(", ")}`);
  }

  return { weekStart: b.weekStart, hours: b.hours, project, note, categories };
}
