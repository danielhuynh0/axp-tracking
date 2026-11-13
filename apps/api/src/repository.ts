import type { Preferences, SavePreferences } from "@axp/contracts";

export class ConflictError extends Error {}

export interface PreferencesRepository {
  get(userId: string): Promise<Preferences | undefined>;
  save(userId: string, input: SavePreferences): Promise<Preferences>;
}

export function userKey(userId: string) {
  if (!userId || userId.includes("#")) throw new Error("Invalid user identity");
  return { PK: `USER#${userId}`, SK: "PREFERENCES" };
}
