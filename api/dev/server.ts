// Local API for web development: `npm run dev` (in-memory data, passphrase "dev-passphrase")
import { createServer } from "node:http";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { createApp } from "../src/app";
import { createMemoryRepository } from "../src/memoryRepository";

const PORT = 3000;
const PASSPHRASE = process.env.APP_PASSPHRASE ?? "dev-passphrase";
const app = createApp(createMemoryRepository(), PASSPHRASE);

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
  "access-control-allow-headers": "authorization,content-type",
};

createServer(async (req, res) => {
  if (req.method === "OPTIONS") return res.writeHead(204, cors).end();

  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  const event = {
    requestContext: { http: { method: req.method, path: url.pathname } },
    headers: req.headers,
    queryStringParameters: Object.fromEntries(url.searchParams),
    body: chunks.length ? Buffer.concat(chunks).toString("utf8") : undefined,
    isBase64Encoded: false,
  } as unknown as APIGatewayProxyEventV2;

  const result = (await app(event)) as { statusCode: number; headers?: Record<string, string>; body?: string };
  res.writeHead(result.statusCode, { ...cors, ...result.headers }).end(result.body);
}).listen(PORT, () => console.log(`Dev API on http://localhost:${PORT} (passphrase: ${PASSPHRASE})`));
