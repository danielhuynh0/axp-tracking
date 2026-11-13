import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { Entry, EntryInput } from "./entries";

// Single-user table: every entry shares PK "ENTRY" and sorts by SK "<weekStart>#<uuid>",
// so a week range is one Query. The public id is "<weekStart>_<uuid>" so the key can be
// rebuilt from the id alone.
const PK = "ENTRY";

export interface EntryRepository {
  list(fromWeek: string, toWeek: string): Promise<Entry[]>;
  create(input: EntryInput): Promise<Entry>;
  update(id: string, input: EntryInput): Promise<Entry | undefined>;
  remove(id: string): Promise<boolean>;
}

export function parseId(id: string): { weekStart: string; sk: string } | undefined {
  const match = /^(\d{4}-\d{2}-\d{2})_([0-9a-f-]{36})$/.exec(id);
  return match ? { weekStart: match[1], sk: `${match[1]}#${match[2]}` } : undefined;
}

type Item = Entry & { PK: string; SK: string };

const toEntry = ({ PK: _pk, SK: _sk, ...entry }: Item): Entry => entry;

export function createDynamoRepository(tableName: string, client = new DynamoDBClient({})): EntryRepository {
  const db = DynamoDBDocumentClient.from(client);

  return {
    async list(fromWeek, toWeek) {
      const items: Item[] = [];
      let startKey: Record<string, unknown> | undefined;
      do {
        const res = await db.send(
          new QueryCommand({
            TableName: tableName,
            KeyConditionExpression: "PK = :pk AND SK BETWEEN :from AND :to",
            ExpressionAttributeValues: { ":pk": PK, ":from": `${fromWeek}#`, ":to": `${toWeek}#~` },
            ExclusiveStartKey: startKey,
          }),
        );
        items.push(...((res.Items ?? []) as Item[]));
        startKey = res.LastEvaluatedKey;
      } while (startKey);
      return items.map(toEntry);
    },

    async create(input) {
      const uuid = randomUUID();
      const now = new Date().toISOString();
      const entry: Entry = { ...input, id: `${input.weekStart}_${uuid}`, createdAt: now, updatedAt: now };
      await db.send(new PutCommand({ TableName: tableName, Item: { PK, SK: `${input.weekStart}#${uuid}`, ...entry } }));
      return entry;
    },

    async update(id, input) {
      const key = parseId(id);
      if (!key || key.weekStart !== input.weekStart) return undefined;
      try {
        const res = await db.send(
          new UpdateCommand({
            TableName: tableName,
            Key: { PK, SK: key.sk },
            UpdateExpression: "SET hours = :h, project = :p, note = :n, categories = :c, updatedAt = :u",
            ExpressionAttributeValues: {
              ":h": input.hours,
              ":p": input.project,
              ":n": input.note,
              ":c": input.categories,
              ":u": new Date().toISOString(),
            },
            ConditionExpression: "attribute_exists(SK)",
            ReturnValues: "ALL_NEW",
          }),
        );
        return toEntry(res.Attributes as Item);
      } catch (err) {
        if ((err as Error).name === "ConditionalCheckFailedException") return undefined;
        throw err;
      }
    },

    async remove(id) {
      const key = parseId(id);
      if (!key) return false;
      const res = await db.send(
        new DeleteCommand({ TableName: tableName, Key: { PK, SK: key.sk }, ReturnValues: "ALL_OLD" }),
      );
      return res.Attributes !== undefined;
    },
  };
}
