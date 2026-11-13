// config.json is overwritten by the deploy script with the stack's API URL,
// so the same build works locally and in AWS.
export type AppConfig = { apiUrl: string };

let cached: Promise<AppConfig> | undefined;

export function loadConfig(): Promise<AppConfig> {
  cached ??= fetch("/config.json", { cache: "no-store" }).then((r) => r.json());
  return cached;
}
