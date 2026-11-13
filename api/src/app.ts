import { createHash, timingSafeEqual } from "node:crypto";
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { CATEGORIES, ValidationError, isSunday, parseEntryInput } from "./entries";
import type { EntryRepository } from "./repository";

type Handler = (event: APIGatewayProxyEventV2) => Promise<APIGatewayProxyResultV2>;

const json = (statusCode: number, body?: unknown): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: { "content-type": "application/json" },
  body: body === undefined ? "" : JSON.stringify(body),
});

// Hash both sides so timingSafeEqual gets equal-length buffers
const digest = (s: string) => createHash("sha256").update(s).digest();

export function createApp(repo: EntryRepository, passphrase: string): Handler {
  const expected = digest(passphrase);

  const isAuthorized = (event: APIGatewayProxyEventV2) => {
    const header = event.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    return token !== "" && timingSafeEqual(digest(token), expected);
  };

  const parseBody = (event: APIGatewayProxyEventV2): unknown => {
    if (!event.body) return undefined;
    const raw = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
    try {
      return JSON.parse(raw);
    } catch {
      throw new ValidationError("Body must be valid JSON");
    }
  };

  return async (event) => {
    const { method, path } = event.requestContext.http;

    if (method === "GET" && path === "/health") return json(200, { ok: true });
    if (!isAuthorized(event)) return json(401, { error: "Unauthorized" });

    try {
      if (method === "GET" && path === "/auth") return json(200, { ok: true });
      if (method === "GET" && path === "/categories") return json(200, CATEGORIES);

      if (path === "/entries") {
        if (method === "GET") {
          const { from, to } = event.queryStringParameters ?? {};
          if (!from || !to || !isSunday(from) || !isSunday(to) || from > to) {
            throw new ValidationError("from and to must be Sundays (YYYY-MM-DD) with from <= to");
          }
          return json(200, await repo.list(from, to));
        }
        if (method === "POST") return json(201, await repo.create(parseEntryInput(parseBody(event))));
      }

      const match = /^\/entries\/([^/]+)$/.exec(path);
      if (match) {
        const id = decodeURIComponent(match[1]);
        if (method === "PUT") {
          const entry = await repo.update(id, parseEntryInput(parseBody(event)));
          return entry ? json(200, entry) : json(404, { error: "Entry not found" });
        }
        if (method === "DELETE") {
          return (await repo.remove(id)) ? json(204) : json(404, { error: "Entry not found" });
        }
      }

      return json(404, { error: "Not found" });
    } catch (err) {
      if (err instanceof ValidationError) return json(400, { error: err.message });
      console.error(err);
      return json(500, { error: "Internal server error" });
    }
  };
}
