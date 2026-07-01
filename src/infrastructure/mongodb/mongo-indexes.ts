import type { Collection } from 'mongodb';
import type { MongoDeliveryDocument } from './mongo-delivery-document.js';

export async function ensureDeliveryIndexes(
  collection: Collection<MongoDeliveryDocument>,
): Promise<void> {
  await collection.createIndexes([
    {
      key: {
        'provider.code': 1,
        'provider.deliveryId': 1,
      },
      name: 'provider_delivery_lookup',
    },
    {
      key: {
        'provider.code': 1,
        status: 1,
      },
      name: 'provider_status_lookup',
    },
  ]);
}
