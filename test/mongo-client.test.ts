import { describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  connectToMongoFromEnv,
  resolveDatabaseName,
} from '../src/infrastructure/mongodb/mongo-client.js';

describe('mongo client configuration', () => {
  it('uses MONGODB_DATABASE when it is configured', () => {
    expect(
      resolveDatabaseName('mongodb://localhost:27017/dogfy-logistics', 'custom-db'),
    ).toBe('custom-db');
  });

  it('falls back to the database name from MONGODB_URI', () => {
    expect(resolveDatabaseName('mongodb://localhost:27017/dogfy-logistics')).toBe(
      'dogfy-logistics',
    );
  });

  it('connects using the configured Mongo URI', async () => {
    const server = await MongoMemoryServer.create();
    const connection = await connectToMongoFromEnv({
      MONGODB_URI: server.getUri('dogfy-logistics-test'),
    });

    try {
      expect(connection.db.databaseName).toBe('dogfy-logistics-test');
    } finally {
      await connection.client.close();
      await server.stop();
    }
  });
});
