import { createApp } from "./app";
import { createDynamoRepository } from "./repository";

const { TABLE_NAME, APP_PASSPHRASE } = process.env;
if (!TABLE_NAME || !APP_PASSPHRASE) throw new Error("TABLE_NAME and APP_PASSPHRASE must be set");

export const handler = createApp(createDynamoRepository(TABLE_NAME), APP_PASSPHRASE);
