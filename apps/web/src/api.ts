import type { Preferences, SavePreferences, ApiErrorBody } from "@axp/contracts";
import { auth } from "./auth";
import { config } from "./config";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function request<T>(path: string, input?: unknown): Promise<T> {
  if (!config || !auth) throw new Error("The application is not connected yet.");
  const user = await auth.getUser();
  if (!user || user.expired) throw new ApiError(401, "Your session has expired. Sign in again to continue.");
  const response = await fetch(`${config.apiUrl.replace(/\/$/, "")}${path}`, {
    method: input === undefined ? "GET" : "PUT",
    headers: {
      Authorization: `Bearer ${user.access_token}`,
      ...(input === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: input === undefined ? undefined : JSON.stringify(input),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as ApiErrorBody | null;
    throw new ApiError(response.status, body?.error?.message ?? "Unable to complete the request. Please try again.");
  }
  return response.json() as Promise<T>;
}

export const api = {
  preferences: () => request<Preferences>("/preferences"),
  savePreferences: (input: SavePreferences) => request<Preferences>("/preferences", input),
};
