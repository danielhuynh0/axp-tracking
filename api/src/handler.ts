import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

const json = (statusCode: number, body: unknown): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const { method, path } = event.requestContext.http;

  if (method === "GET" && path === "/health") {
    return json(200, { ok: true });
  }

  return json(404, { error: "Not found" });
};
