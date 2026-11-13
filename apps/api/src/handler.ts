import { createHandler } from "./app";
import { createDynamoRepository } from "./dynamo";

const tableName = process.env.TABLE_NAME;
if (!tableName) throw new Error("TABLE_NAME must be configured");
export const handler = createHandler(createDynamoRepository(tableName));
