const express = require('express');
const cors = require('cors');
const path = require('path');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = 'mts_decor';
const COLLECTION_NAME = 'work_logs';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static frontend assets
app.use(express.static(__dirname));

let mongoClient = null;
let db = null;
let workLogsCollection = null;
let dbConnected = false;
let dbError = null;

async function connectToMongo() {
  if (!MONGODB_URI) {
    dbConnected = false;
    dbError = 'MONGODB_URI environment variable is not configured in .env file.';
    console.warn('⚠️  [MongoDB Atlas] MONGODB_URI is empty. Running in local-cache mode.');
    return;
  }

  try {
    console.log('🔄 [MongoDB Atlas] Connecting to cluster...');
    mongoClient = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });

    await mongoClient.connect();
    db = mongoClient.db(DB_NAME);
    workLogsCollection = db.collection(COLLECTION_NAME);

    // Create unique index on id for fast lookups and idempotency
    await workLogsCollection.createIndex({ id: 1 }, { unique: true });
    await workLogsCollection.createIndex({ date: -1 });
    await workLogsCollection.createIndex({ projectName: 1 });

    dbConnected = true;
    dbError = null;
    console.log(`✅ [MongoDB Atlas] Successfully connected to database: "${DB_NAME}", collection: "${COLLECTION_NAME}"`);
  } catch (err) {
    dbConnected = false;
    dbError = err.message;
    console.error('❌ [MongoDB Atlas] Connection failed:', err.message);
  }
}

// ---------------------------------------------------------
// REST API ENDPOINTS
// ---------------------------------------------------------

// 1. Health & Connection Status Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: dbConnected ? 'connected' : 'disconnected',
    hasUri: Boolean(MONGODB_URI),
    error: dbError,
    databaseName: DB_NAME,
    collectionName: COLLECTION_NAME
  });
});

// 2. Query Work Logs
app.get('/api/logs', async (req, res) => {
  if (!dbConnected || !workLogsCollection) {
    return res.status(503).json({
      success: false,
      database: 'disconnected',
      error: dbError || 'Database not connected',
      logs: []
    });
  }

  try {
    const { project, date } = req.query;
    const filter = {};
    if (project && project !== 'ALL') {
      filter.projectName = project;
    }
    if (date) {
      filter.date = date;
    }

    const logs = await workLogsCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (err) {
    console.error('Error fetching logs:', err);
    res.status(500).json({ success: false, error: err.message, logs: [] });
  }
});

// 3. Create a New Work Log
app.post('/api/logs', async (req, res) => {
  if (!dbConnected || !workLogsCollection) {
    return res.status(503).json({
      success: false,
      database: 'disconnected',
      error: dbError || 'Database not connected'
    });
  }

  try {
    const entry = req.body;
    if (!entry || !entry.projectName || !entry.floorFlat || !entry.workCategory) {
      return res.status(400).json({
        success: false,
        error: 'Missing required work entry fields (projectName, floorFlat, workCategory)'
      });
    }

    const nowIso = new Date().toISOString();
    const docToInsert = {
      ...entry,
      id: entry.id || `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: entry.createdAt || nowIso,
      updatedAt: nowIso
    };

    await workLogsCollection.updateOne(
      { id: docToInsert.id },
      { $set: docToInsert },
      { upsert: true }
    );

    res.status(201).json({
      success: true,
      log: docToInsert
    });
  } catch (err) {
    console.error('Error saving log:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Batch Sync / Upload from Client localStorage
app.post('/api/sync', async (req, res) => {
  if (!dbConnected || !workLogsCollection) {
    return res.status(503).json({
      success: false,
      database: 'disconnected',
      error: dbError || 'Database not connected'
    });
  }

  try {
    const { logs } = req.body;
    if (!Array.isArray(logs) || logs.length === 0) {
      return res.json({ success: true, syncedCount: 0 });
    }

    const operations = logs.map((item) => ({
      updateOne: {
        filter: { id: item.id },
        update: {
          $set: {
            ...item,
            updatedAt: new Date().toISOString()
          },
          $setOnInsert: {
            createdAt: item.createdAt || new Date().toISOString()
          }
        },
        upsert: true
      }
    }));

    const result = await workLogsCollection.bulkWrite(operations);
    const totalAffected = (result.upsertedCount || 0) + (result.modifiedCount || 0);

    res.json({
      success: true,
      upsertedCount: result.upsertedCount || 0,
      modifiedCount: result.modifiedCount || 0,
      totalSynced: totalAffected
    });
  } catch (err) {
    console.error('Error in batch sync:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Delete an Individual Log
app.delete('/api/logs/:id', async (req, res) => {
  if (!dbConnected || !workLogsCollection) {
    return res.status(503).json({
      success: false,
      database: 'disconnected',
      error: dbError || 'Database not connected'
    });
  }

  try {
    const { id } = req.params;
    const result = await workLogsCollection.deleteOne({ id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Entry not found' });
    }

    res.json({ success: true, id });
  } catch (err) {
    console.error('Error deleting log:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Clear All Logs (Admin Reset)
app.delete('/api/logs', async (req, res) => {
  if (!dbConnected || !workLogsCollection) {
    return res.status(503).json({
      success: false,
      database: 'disconnected',
      error: dbError || 'Database not connected'
    });
  }

  try {
    const result = await workLogsCollection.deleteMany({});
    res.json({
      success: true,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error('Error clearing logs:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fallback to index.html for single-page app routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, async () => {
  console.log(`🚀 [MTS Decor Server] Running at: http://localhost:${PORT}`);
  await connectToMongo();
});
