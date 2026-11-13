import { randomUUID } from "node:crypto";
import type { Entry } from "./entries";
import { parseId, type EntryRepository } from "./repository";

// In-memory store for tests and the local dev server
export function createMemoryRepository(): EntryRepository {
  const items = new Map<string, Entry>();
  return {
    async list(from, to) {
      return [...items.values()]
        .filter((e) => e.weekStart >= from && e.weekStart <= to)
        .sort((a, b) => a.id.localeCompare(b.id));
    },
    async create(input) {
      const now = new Date().toISOString();
      const entry = { ...input, id: `${input.weekStart}_${randomUUID()}`, createdAt: now, updatedAt: now };
      items.set(entry.id, entry);
      return entry;
    },
    async update(id, input) {
      const existing = items.get(id);
      if (!existing || parseId(id)?.weekStart !== input.weekStart) return undefined;
      const entry = { ...existing, ...input, updatedAt: new Date().toISOString() };
      items.set(id, entry);
      return entry;
    },
    async remove(id) {
      return items.delete(id);
    },
  };
}
