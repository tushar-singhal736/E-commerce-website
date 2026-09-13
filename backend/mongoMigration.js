const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const DATABASE_COLLECTIONS = {
  users: 'users',
  sessions: 'sessions',
  products: 'products',
  orders: 'orders',
  coupons: 'coupons',
  settings: 'settings'
};

const readJson = (filePath, defaultValue) => {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw || 'null');
    return parsed ?? defaultValue;
  } catch (error) {
    console.error(`Unable to read ${filePath}:`, error.message || error);
    return defaultValue;
  }
};

const migrateCollection = async (db, collectionName, data) => {
  if (!Array.isArray(data)) {
    console.warn(`Skipping ${collectionName}: expected array data but got ${typeof data}`);
    return;
  }
  const collection = db.collection(collectionName);
  if (data.length === 0) {
    console.log(`Skipping empty collection ${collectionName}`);
    return;
  }
  const legacyIds = data.map((item) => item.id || item.orderId || item._id || null).filter(Boolean);
  await collection.deleteMany({});
  await collection.insertMany(data.map((item, index) => ({
    ...item,
    _id: item.id ? item.id.toString() : `${collectionName}_${Date.now()}_${index}`
  })));
  console.log(`Migrated ${data.length} documents into ${collectionName}`);
};

const migrateMongoFromJson = async ({ uri, dbName }) => {
  if (!uri) {
    throw new Error('MONGODB_URI is required to run MongoDB migration.');
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db(dbName || 'ecommerce');

  try {
    const base = __dirname;
    await migrateCollection(db, DATABASE_COLLECTIONS.users, readJson(path.join(base, 'users.json'), []));
    await migrateCollection(db, DATABASE_COLLECTIONS.sessions, readJson(path.join(base, 'sessions.json'), []));
    await migrateCollection(db, DATABASE_COLLECTIONS.products, readJson(path.join(base, 'products.json'), []));
    await migrateCollection(db, DATABASE_COLLECTIONS.orders, readJson(path.join(base, 'orders.json'), []));
    await migrateCollection(db, DATABASE_COLLECTIONS.coupons, readJson(path.join(base, 'coupons.json'), []));

    const settings = readJson(path.join(base, 'settings.json'), { discountPercent: 0 });
    const settingsCollection = db.collection(DATABASE_COLLECTIONS.settings);
    await settingsCollection.deleteMany({});
    await settingsCollection.insertOne({ _id: 'settings', ...settings });
    console.log('Migrated settings document');
  } finally {
    await client.close();
  }
};

if (require.main === module) {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
  const dbName = process.env.MONGODB_DB || 'ecommerce';

  (async () => {
    try {
      console.log(`Starting MongoDB migration to ${uri}/${dbName}`);
      await migrateMongoFromJson({ uri, dbName });
      console.log('MongoDB migration finished successfully.');
    } catch (err) {
      console.error('MongoDB migration failed:', err.message || err);
      process.exit(1);
    }
  })();
}

module.exports = { migrateMongoFromJson };
