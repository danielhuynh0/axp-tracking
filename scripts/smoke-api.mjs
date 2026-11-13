import assert from "node:assert/strict";
import { createRequire } from "node:module";

process.env.TABLE_NAME = "local-bundle-smoke-test";
const require = createRequire(import.meta.url);
const { handler } = require("../apps/api/dist/handler.js");
// This route does not touch AWS. It verifies that the actual CommonJS Lambda
// artifact loads and runs with its bundled dependencies on the target runtime.
const response = await handler({
  rawPath: "/me",
  requestContext: {
    requestId: "bundle-smoke",
    http: { method: "GET" },
    authorizer: {
      jwt: { claims: { sub: "smoke-user", token_use: "access" }, scopes: ["axp/access"] },
    },
  },
});
assert.equal(response.statusCode, 200);
assert.deepEqual(JSON.parse(response.body), { userId: "smoke-user" });
console.log("Bundled Lambda identity smoke test passed.");
