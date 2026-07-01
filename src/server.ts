import { buildApp } from './app.js';
import { buildDeliveryUseCases } from './composition-root.js';
import { connectToMongoFromEnv } from './infrastructure/mongodb/mongo-client.js';
import { MongoDeliveryRepository } from './infrastructure/mongodb/mongo-delivery-repository.js';

const mongoConnection = await connectToMongoFromEnv(process.env);
const deliveryRepository = new MongoDeliveryRepository(
  mongoConnection.db.collection('deliveries'),
);

await deliveryRepository.ensureIndexes();

const deliveryUseCases = buildDeliveryUseCases({
  repository: deliveryRepository,
});

const app = buildApp({
  logger: true,
  createDeliveryUseCase: deliveryUseCases.createDeliveryUseCase,
  getDeliveryStatusUseCase: deliveryUseCases.getDeliveryStatusUseCase,
});

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

async function shutdown(): Promise<void> {
  await app.close();
  await mongoConnection.client.close();
}

process.on('SIGINT', () => {
  void shutdown().finally(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  void shutdown().finally(() => {
    process.exit(0);
  });
});

try {
  await app.listen({ port, host });
  app.log.info(`API listening on http://${host}:${port}`);
} catch (error) {
  app.log.error(error);
  await mongoConnection.client.close();
  process.exit(1);
}
