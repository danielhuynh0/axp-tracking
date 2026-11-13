import assert from "node:assert/strict";
import { test } from "node:test";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import type { Preferences } from "@axp/contracts";
import { createHandler } from "../src/app";
import { ConflictError, type PreferencesRepository } from "../src/repository";

function setup() {
  const records = new Map<string, Preferences>();
  const repository: PreferencesRepository = {
    async get(id) { return records.get(id); },
    async save(id, input) {
      if ((records.get(id)?.version ?? 0) !== input.expectedVersion) throw new ConflictError("Reload before saving.");
      const saved = { displayName: input.displayName, timeZone: input.timeZone, version: input.expectedVersion + 1, updatedAt: new Date().toISOString() };
      records.set(id, saved); return saved;
    },
  };
  return { records, handler: createHandler(repository) };
}

function event(userId = "alice", method = "GET", body?: unknown): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    version: "2.0", routeKey: `${method} /preferences`, rawPath: "/preferences", rawQueryString: "",
    headers: { "content-type": "application/json" }, isBase64Encoded: false,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    requestContext: {
      accountId: "test", apiId: "test", domainName: "test", domainPrefix: "test", requestId: "request-1",
      stage: "$default", routeKey: `${method} /preferences`, time: "", timeEpoch: 0,
      http: { method, path: "/preferences", protocol: "HTTP/1.1", sourceIp: "127.0.0.1", userAgent: "test" },
      authorizer: { jwt: { claims: { sub: userId, token_use: "access" }, scopes: ["axp/access"] } },
    },
  };
}

const input = { displayName: "Alice", timeZone: "America/Los_Angeles", expectedVersion: 0 };

test("missing authentication, ID tokens, and missing scope cannot access storage", async () => {
  const { handler, records } = setup();
  const unauthenticated = event();
  unauthenticated.requestContext.authorizer = undefined as never;
  assert.equal((await handler(unauthenticated)).statusCode, 401);
  const idToken = event(); idToken.requestContext.authorizer.jwt.claims.token_use = "id";
  assert.equal((await handler(idToken)).statusCode, 401);
  const noScope = event(); noScope.requestContext.authorizer.jwt.scopes = [];
  assert.equal((await handler(noScope)).statusCode, 403);
  assert.equal(records.size, 0);
});

test("preferences persist and users cannot see or overwrite each other's data", async () => {
  const { handler } = setup();
  assert.equal((await handler(event("alice", "PUT", input))).statusCode, 200);
  const alice = JSON.parse((await handler(event("alice"))).body!);
  const bob = JSON.parse((await handler(event("bob"))).body!);
  assert.equal(alice.displayName, "Alice"); assert.equal(bob.version, 0);
  assert.equal((await handler(event("bob", "PUT", { ...input, displayName: "Bob" }))).statusCode, 200);
  assert.equal(JSON.parse((await handler(event("alice"))).body!).displayName, "Alice");
  assert.equal((await handler(event("bob", "PUT", { ...input, userId: "alice" }))).statusCode, 400);
});

test("stale writes conflict; a current version can update", async () => {
  const { handler } = setup();
  await handler(event("alice", "PUT", input));
  assert.equal((await handler(event("alice", "PUT", input))).statusCode, 409);
  const saved = await handler(event("alice", "PUT", { ...input, expectedVersion: 1 }));
  assert.equal(JSON.parse(saved.body!).version, 2);
});

test("malformed and oversized requests fail before persistence", async () => {
  const { handler, records } = setup();
  const invalid = event("alice", "PUT"); invalid.body = "{";
  assert.equal((await handler(invalid)).statusCode, 400);
  invalid.body = "x".repeat(4097);
  assert.equal((await handler(invalid)).statusCode, 413);
  invalid.headers = {};
  assert.equal((await handler(invalid)).statusCode, 415);
  assert.equal(records.size, 0);
});

test("unknown routes and methods are explicit, errors contain request IDs", async () => {
  const { handler } = setup();
  assert.equal((await handler(event("alice", "DELETE"))).statusCode, 405);
  const missing = event(); missing.rawPath = "/unknown";
  const result = await handler(missing);
  assert.equal(result.statusCode, 404);
  assert.equal(JSON.parse(result.body!).error.requestId, "request-1");
});

test("base64 JSON bodies are decoded", async () => {
  const { handler } = setup();
  const request = event("alice", "PUT", input);
  request.body = Buffer.from(request.body!).toString("base64"); request.isBase64Encoded = true;
  assert.equal((await handler(request)).statusCode, 200);
});
