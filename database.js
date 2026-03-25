const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance';
const DB_NAME = 'attendance';

let db;
let client;

async function initDB() {
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('✅ Connected to MongoDB');

    // Create indexes
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('attendance').createIndex({ user_id: 1, date: 1 });
    await db.collection('leaves').createIndex({ user_id: 1 });

    // Seed default admin if not exists
    const admin = await db.collection('users').findOne({ username: 'admin' });
    if (!admin) {
      await db.collection('users').insertOne({
        username: 'admin',
        password: 'admin123',
        full_name: 'Administrator',
        email: 'admin@panavelystories.com',
        phone: '',
        department: 'Management',
        role: 'admin',
        status: 'active',
        created_at: new Date()
      });
      console.log('Default admin created: admin / admin123');
    }

    return db;
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('Make sure MONGODB_URI is set in your environment variables');
    process.exit(1);
  }
}

function getDB() {
  return db;
}

module.exports = { initDB, getDB };
