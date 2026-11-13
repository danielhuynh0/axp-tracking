import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { Preferences, SavePreferences } from "@axp/contracts";
import { ConflictError, userKey, type PreferencesRepository } from "./repository";

export function createDynamoRepository(tableName: string): PreferencesRepository {
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  return {
    async get(userId) {
      const { Item } = await client.send(new GetCommand({
        TableName: tableName, Key: userKey(userId), ConsistentRead: true,
      }));
      if (!Item) return undefined;
      return {
        displayName: Item.displayName, timeZone: Item.timeZone,
        version: Item.version, updatedAt: Item.updatedAt,
      } as Preferences;
    },
    async save(userId: string, input: SavePreferences) {
      const preferences: Preferences = {
        displayName: input.displayName, timeZone: input.timeZone,
        version: input.expectedVersion + 1, updatedAt: new Date().toISOString(),
      };
      try {
        await client.send(new PutCommand({
          TableName: tableName,
          Item: { ...userKey(userId), entityType: "Preferences", schemaVersion: 1, ...preferences },
          ConditionExpression: input.expectedVersion === 0 ? "attribute_not_exists(PK)" : "#version = :expected",
          ...(input.expectedVersion > 0 ? {
            ExpressionAttributeNames: { "#version": "version" },
            ExpressionAttributeValues: { ":expected": input.expectedVersion },
          } : {}),
        }));
      } catch (error) {
        if (error instanceof Error && error.name === "ConditionalCheckFailedException") {
          throw new ConflictError("Preferences changed in another session. Reload before saving.");
        }
        throw error;
      }
      return preferences;
    },
  };
}
