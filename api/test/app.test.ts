import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { createMemoryRepository } from "../src/memoryRepository";

const PASS = "correct-horse";

function request(method: string, path: string, opts: { body?: unknown; query?: Record<string, string>; token?: string | null } = {}) {
  const token = opts.token === undefined ? PASS : opts.token;
  return {
    requestContext: { http: { method, path } },
    headers: token === null ? {} : { authorization: `Bearer ${token}` },
    queryStringParameters: opts.query,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    isBase64Encoded: false,
  } as unknown as APIGatewayProxyEventV2;
}

const valid = { weekStart: "2026-11-08", hours: 4, project: "Library", note: "CDs", categories: ["PDD", "PjM"] };

describe("api", () => {
  let app: ReturnType<typeof createApp>;
  const call = async (...args: Parameters<typeof request>) => {
    const res = (await app(request(...args))) as { statusCode: number; body: string };
    return { status: res.statusCode, body: res.body ? JSON.parse(res.body) : undefined };
  };

  beforeEach(() => {
    app = createApp(createMemoryRepository(), PASS);
  });

  it("serves /health without auth", async () => {
    expect((await call("GET", "/health", { token: null })).status).toBe(200);
  });

  it("answers CORS preflight without auth", async () => {
    expect((await call("OPTIONS", "/auth", { token: null })).status).toBe(204);
  });

  it("rejects missing or wrong passphrase", async () => {
    expect((await call("GET", "/auth", { token: null })).status).toBe(401);
    expect((await call("GET", "/auth", { token: "nope" })).status).toBe(401);
    expect((await call("GET", "/auth")).status).toBe(200);
  });

  it("creates, lists, updates and deletes entries", async () => {
    const created = await call("POST", "/entries", { body: valid });
    expect(created.status).toBe(201);
    const id = created.body.id;

    const listed = await call("GET", "/entries", { query: { from: "2026-11-01", to: "2026-11-08" } });
    expect(listed.body).toHaveLength(1);
    const outside = await call("GET", "/entries", { query: { from: "2026-11-15", to: "2026-11-22" } });
    expect(outside.body).toHaveLength(0);

    const updated = await call("PUT", `/entries/${id}`, { body: { ...valid, hours: 6 } });
    expect(updated.status).toBe(200);
    expect(updated.body.hours).toBe(6);

    expect((await call("DELETE", `/entries/${id}`)).status).toBe(204);
    expect((await call("DELETE", `/entries/${id}`)).status).toBe(404);
  });

  it("validates entry input", async () => {
    const bad = [
      { ...valid, weekStart: "2026-11-09" }, // Monday
      { ...valid, weekStart: "2026-02-30" },
      { ...valid, hours: 0 },
      { ...valid, hours: 1.1 },
      { ...valid, project: "  " },
      { ...valid, categories: [] },
      { ...valid, categories: ["XYZ"] },
    ];
    for (const body of bad) {
      expect((await call("POST", "/entries", { body })).status, JSON.stringify(body)).toBe(400);
    }
  });

  it("dedupes categories and trims text", async () => {
    const res = await call("POST", "/entries", { body: { ...valid, project: " Library ", categories: ["PA", "PA"] } });
    expect(res.body.project).toBe("Library");
    expect(res.body.categories).toEqual(["PA"]);
  });

  it("validates list range", async () => {
    expect((await call("GET", "/entries")).status).toBe(400);
    expect((await call("GET", "/entries", { query: { from: "2026-11-15", to: "2026-11-08" } })).status).toBe(400);
  });
});
