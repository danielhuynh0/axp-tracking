// Platform contracts only. AXP entities and allocation policies belong in a
// separate domain package when their business rules have been agreed.
export interface Preferences {
  displayName: string;
  timeZone: string;
  version: number;
  updatedAt: string | null;
}

export interface SavePreferences {
  displayName: string;
  timeZone: string;
  expectedVersion: number;
}

export interface ApiErrorBody {
  error: { code: string; message: string; requestId: string };
}

export class ValidationError extends Error {}

export function parsePreferences(value: unknown): SavePreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError("A JSON object is required.");
  }
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !["displayName", "timeZone", "expectedVersion"].includes(key))) {
    throw new ValidationError("Unexpected preference fields.");
  }
  if (typeof input.displayName !== "string" || input.displayName.trim().length > 80) {
    throw new ValidationError("Display name must be at most 80 characters.");
  }
  if (typeof input.timeZone !== "string" || input.timeZone.length > 100) {
    throw new ValidationError("A valid time zone is required.");
  }
  try {
    new Intl.DateTimeFormat("en", { timeZone: input.timeZone }).format();
  } catch {
    throw new ValidationError("A valid time zone is required.");
  }
  if (!Number.isSafeInteger(input.expectedVersion) || (input.expectedVersion as number) < 0) {
    throw new ValidationError("A nonnegative expectedVersion is required.");
  }
  return {
    displayName: input.displayName.trim(),
    timeZone: input.timeZone,
    expectedVersion: input.expectedVersion as number,
  };
}
