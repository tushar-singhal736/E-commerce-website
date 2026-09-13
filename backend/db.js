const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'ecommerce';
const clientOptions = { serverSelectionTimeoutMS: 5000 };

let client;
let db;

const connect = async () => {
  if (!client) {
    client = new MongoClient(MONGODB_URI, clientOptions);
    await client.connect();
    db = client.db(MONGODB_DB);
  }
  return db;
};

const prepareDocs = (docs) => docs.map((doc, index) => {
  const row = { ...doc };
  if (row._id !== undefined && row._id !== null) {
    row._id = String(row._id);
  }
  if (row.id !== undefined && row.id !== null) {
    row.id = String(row.id);
  }
  if (row.orderId !== undefined && row.orderId !== null) {
    row.orderId = String(row.orderId);
  }
  if (!row._id) {
    row._id = `${row.id || row.orderId || `${Date.now()}_${index}`}`;
  }
  return row;
});

const getCollection = async (name) => {
  const database = await connect();
  return database.collection(name);
};

const getAll = async (name) => {
  const collection = await getCollection(name);
  return await collection.find({}).toArray();
};

const replaceAll = async (name, docs) => {
  const collection = await getCollection(name);
  await collection.deleteMany({});
  if (!Array.isArray(docs) || docs.length === 0) return;
  await collection.insertMany(prepareDocs(docs));
};

const getSettings = async () => {
  const collection = await getCollection('settings');
  const record = await collection.findOne({ _id: 'settings' });
  return record || { discountPercent: 0 };
};

const saveSettings = async (settings) => {
  const collection = await getCollection('settings');
  const payload = { _id: 'settings', ...settings };
  await collection.replaceOne({ _id: 'settings' }, payload, { upsert: true });
  return payload;
};

module.exports = {
  connect,
  getAll,
  replaceAll,
  getSettings,
  saveSettings,
};
