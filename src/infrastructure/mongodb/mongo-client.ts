import { MongoClient } from 'mongodb';
import type { Db } from 'mongodb';

const DEFAULT_MONGODB_URI = 'mongodb://localhost:27017/dogfy-logistics';
const DEFAULT_MONGODB_DATABASE = 'dogfy-logistics';

export type MongoConnection = {
  client: MongoClient;
  db: Db;
};

export async function connectToMongoFromEnv(env: NodeJS.ProcessEnv): Promise<MongoConnection> {
  const uri = env.MONGODB_URI ?? DEFAULT_MONGODB_URI;
  const client = new MongoClient(uri);

  await client.connect();

  return {
    client,
    db: client.db(resolveDatabaseName(uri, env.MONGODB_DATABASE)),
  };
}

export function resolveDatabaseName(uri: string, configuredDatabase?: string): string {
  if (configuredDatabase !== undefined && configuredDatabase.trim().length > 0) {
    return configuredDatabase.trim();
  }

  const databaseFromUri = new URL(uri).pathname.replace('/', '').trim();

  return databaseFromUri.length > 0 ? databaseFromUri : DEFAULT_MONGODB_DATABASE;
}
