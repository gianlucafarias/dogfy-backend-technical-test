import type { Collection } from 'mongodb';
import type { DeliveryRepositoryPort } from '../../application/ports/delivery-repository-port.js';
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
}
