import assert from "node:assert/strict";
import { test } from "node:test";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { createDynamoRepository } from "../src/dynamo";
import { ConflictError } from "../src/repository";

test("DynamoDB reads use the authenticated partition and do not expose storage metadata", async (context) => {
  context.mock.method(DynamoDBDocumentClient.prototype, "send", async (command: GetCommand) => {
    assert.ok(command instanceof GetCommand);
    assert.deepEqual(command.input.Key, { PK: "USER#alice", SK: "PREFERENCES" });
    assert.equal(command.input.ConsistentRead, true);
    return { Item: { PK: "USER#alice", SK: "PREFERENCES", schemaVersion: 1, displayName: "Alice", timeZone: "UTC", version: 1, updatedAt: "2026-01-01T00:00:00Z" } };
  });
  const result = await createDynamoRepository("test-table").get("alice");
  assert.deepEqual(result, { displayName: "Alice", timeZone: "UTC", version: 1, updatedAt: "2026-01-01T00:00:00Z" });
});

test("first save is conditional and stale DynamoDB writes become conflicts", async (context) => {
  const commands: PutCommand[] = [];
  context.mock.method(DynamoDBDocumentClient.prototype, "send", async (command: PutCommand) => {
    commands.push(command);
    if (commands.length > 1) throw Object.assign(new Error("conditional failure"), { name: "ConditionalCheckFailedException" });
    return {};
  });
  const repository = createDynamoRepository("test-table");
  const input = { displayName: "Alice", timeZone: "UTC", expectedVersion: 0 };
  const saved = await repository.save("alice", input);
  assert.equal(saved.version, 1);
  assert.equal(commands[0]!.input.ConditionExpression, "attribute_not_exists(PK)");
  assert.equal(commands[0]!.input.Item?.PK, "USER#alice");
  await assert.rejects(repository.save("alice", { ...input, expectedVersion: 1 }), ConflictError);
  assert.equal(commands[1]!.input.ConditionExpression, "#version = :expected");
  assert.deepEqual(commands[1]!.input.ExpressionAttributeValues, { ":expected": 1 });
});
