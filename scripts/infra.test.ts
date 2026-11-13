import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseDocument } from "yaml";

// SAM/CloudFormation intrinsics remain tagged nodes; this validates YAML syntax
// and selected invariants. It does NOT replace sam validate --lint or deployment.
const document = parseDocument(readFileSync("infra/template.yaml", "utf8"));
const template = document.toJS();

test("infrastructure parses and keeps the API authenticated by default", () => {
  assert.deepEqual(document.errors, []);
  assert.equal(template.Transform, "AWS::Serverless-2016-10-31");
  assert.equal(template.Resources.HttpApi.Properties.Auth.DefaultAuthorizer, "CognitoJwt");
  assert.deepEqual(template.Resources.HttpApi.Properties.Auth.Authorizers.CognitoJwt.AuthorizationScopes, ["axp/access"]);
  for (const route of Object.values(template.Resources.ApiFunction.Properties.Events) as any[]) {
    assert.equal(route.Type, "HttpApi");
    assert.notEqual(route.Properties.Auth?.Authorizer, "NONE");
  }
});

test("storage is private, retained, and configured without always-on backend infrastructure", () => {
  const resources = template.Resources;
  assert.equal(resources.DataTable.DeletionPolicy, "Retain");
  assert.equal(resources.DataTable.Properties.BillingMode, "PAY_PER_REQUEST");
  assert.equal(resources.UserPool.Properties.AdminCreateUserConfig.AllowAdminCreateUserOnly, true);
  assert.equal(resources.UserPoolClient.Properties.GenerateSecret, false);
  assert.ok(Object.values(resources.WebBucket.Properties.PublicAccessBlockConfiguration).every(Boolean));
  assert.equal(resources.ApiFunction.Properties.VpcConfig, undefined);
  assert.equal(resources.ApiFunction.Properties.ProvisionedConcurrencyConfig, undefined);
});
