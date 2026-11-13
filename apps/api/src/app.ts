import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { parsePreferences, ValidationError } from "@axp/contracts";
import { ConflictError, type PreferencesRepository } from "./repository";

export function createHandler(repository: PreferencesRepository) {
  return async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyStructuredResultV2> => {
    const requestId = event.requestContext.requestId;
    const reply = (statusCode: number, body: unknown) => ({
      statusCode,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
      body: JSON.stringify(body),
    });
    const failure = (status: number, code: string, message: string) =>
      reply(status, { error: { code, message, requestId } });
    // Only API Gateway's verified authorizer context is trusted. Never decode
    // an arbitrary Authorization header or accept userId in a request body.
    const claims = event.requestContext.authorizer?.jwt?.claims;
    const userId = claims?.sub;
    if (typeof userId !== "string" || !userId || userId.includes("#") || claims?.token_use !== "access") {
      return failure(401, "UNAUTHORIZED", "Sign in to continue.");
    }
    const scopes = event.requestContext.authorizer.jwt.scopes ?? [];
    if (!scopes.includes("axp/access")) return failure(403, "FORBIDDEN", "API access is required.");
    try {
      const method = event.requestContext.http.method;
      if (event.rawPath === "/me" && method === "GET") {
        return reply(200, { userId });
      }
      if (event.rawPath !== "/preferences") return failure(404, "NOT_FOUND", "Route not found.");
      if (method === "GET") {
        return reply(200, await repository.get(userId) ?? {
          displayName: "", timeZone: "UTC", version: 0, updatedAt: null,
        });
      }
      if (method === "PUT") {
        const contentType = event.headers["content-type"] ?? event.headers["Content-Type"];
        if (contentType?.split(";")[0]?.trim().toLowerCase() !== "application/json") {
          return failure(415, "UNSUPPORTED_MEDIA_TYPE", "Use application/json.");
        }
        const body = event.isBase64Encoded ? Buffer.from(event.body ?? "", "base64").toString("utf8") : event.body ?? "";
        if (Buffer.byteLength(body) > 4096) return failure(413, "PAYLOAD_TOO_LARGE", "Request is too large.");
        let input: unknown;
        try { input = JSON.parse(body); } catch { return failure(400, "INVALID_JSON", "Invalid JSON body."); }
        return reply(200, await repository.save(userId, parsePreferences(input)));
      }
      return failure(405, "METHOD_NOT_ALLOWED", "Method not allowed.");
    } catch (error) {
      if (error instanceof ValidationError) return failure(400, "VALIDATION_ERROR", error.message);
      if (error instanceof ConflictError) return failure(409, "CONFLICT", error.message);
      console.error(JSON.stringify({ requestId, code: "INTERNAL_ERROR", errorType: error instanceof Error ? error.name : "Unknown" }));
      return failure(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
    }
  };
}
