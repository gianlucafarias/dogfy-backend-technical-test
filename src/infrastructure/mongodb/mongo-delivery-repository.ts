import type { Collection } from 'mongodb';
import type { DeliveryRepositoryPort } from '../../application/ports/delivery-repository-port.js';
import type { DeliveryStatus } from '../../domain/delivery-status.js';
import { terminalDeliveryStatuses } from '../../domain/delivery-status.js';
import type { Delivery } from '../../domain/delivery.js';
import type { MongoDeliveryDocument } from './mongo-delivery-document.js';
import { toDelivery, toMongoDeliveryDocument } from './mongo-delivery-mapper.js';
import { ensureDeliveryIndexes } from './mongo-indexes.js';

export class MongoDeliveryRepository implements DeliveryRepositoryPort {
  private readonly collection: Collection<MongoDeliveryDocument>;

  constructor(collection: Collection<MongoDeliveryDocument>) {
    this.collection = collection;
  }

  async ensureIndexes(): Promise<void> {
    await ensureDeliveryIndexes(this.collection);
  }

  async save(delivery: Delivery): Promise<void> {
    const document = toMongoDeliveryDocument(delivery);

    await this.collection.replaceOne(
      {
        _id: document._id,
      },
      document,
      {
        upsert: true,
      },
    );
  }

  async findById(id: string): Promise<Delivery | null> {
    const document = await this.collection.findOne({
      _id: id,
    });

    if (document === null) {
      return null;
    }

    return toDelivery(document);
  }

  async findNrwDeliveriesPendingPolling(): Promise<Delivery[]> {
    const documents = await this.collection
      .find({
        'provider.code': 'NRW',
        status: {
          $nin: [...terminalDeliveryStatuses],
        },
      })
      .toArray();

    return documents.map(toDelivery);
  }

  async updateLatestStatus(id: string, status: DeliveryStatus, now: Date): Promise<void> {
    const persistedNow = new Date(now);

    await this.collection.updateOne(
      {
        _id: id,
      },
      {
        $set: {
          status,
          updatedAt: persistedNow,
          statusUpdatedAt: persistedNow,
        },
      },
    );
  }
}
