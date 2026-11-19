/**
 * SQLite Database Layer with Automatic Portable JSON Fallback & Seeding
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let dbMode = 'sqlite';
let sqliteDb = null;
const JSON_DB_FILE = path.join(DATA_DIR, 'layouts.json');

try {
  const { DatabaseSync } = require('node:sqlite');
  const dbPath = path.join(DATA_DIR, 'habitats.db');
  sqliteDb = new DatabaseSync(dbPath);
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS layouts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      crewSize INTEGER NOT NULL,
      missionLengthDays INTEGER NOT NULL,
      habitatShape TEXT NOT NULL,
      zonesJson TEXT NOT NULL,
      score INTEGER NOT NULL,
      metricsJson TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);
  console.log('[DB] Native SQLite (node:sqlite) active.');
} catch (err) {
  dbMode = 'json';
  console.log('[DB] Using persistent JSON file database mode.');
  if (!fs.existsSync(JSON_DB_FILE)) {
    fs.writeFileSync(JSON_DB_FILE, JSON.stringify([], null, 2));
  }
}

const db = {
  getAll: () => {
    if (dbMode === 'sqlite') {
      const stmt = sqliteDb.prepare('SELECT * FROM layouts ORDER BY createdAt DESC');
      const rows = stmt.all();
      return rows.map(r => ({
        ...r,
        zones: JSON.parse(r.zonesJson),
        metrics: JSON.parse(r.metricsJson)
      }));
    } else {
      const data = JSON.parse(fs.readFileSync(JSON_DB_FILE, 'utf8') || '[]');
      return data;
    }
  },
  getById: (id) => {
    if (dbMode === 'sqlite') {
      const stmt = sqliteDb.prepare('SELECT * FROM layouts WHERE id = ?');
      const row = stmt.get(id);
      if (!row) return null;
      return {
        ...row,
        zones: JSON.parse(row.zonesJson),
        metrics: JSON.parse(row.metricsJson)
      };
    } else {
      const data = JSON.parse(fs.readFileSync(JSON_DB_FILE, 'utf8') || '[]');
      return data.find(l => l.id === id) || null;
    }
  },
  insert: (layout) => {
    if (dbMode === 'sqlite') {
      const stmt = sqliteDb.prepare(`
        INSERT INTO layouts (id, name, crewSize, missionLengthDays, habitatShape, zonesJson, score, metricsJson, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        layout.id,
        layout.name,
        layout.crewSize,
        layout.missionLengthDays,
        layout.habitatShape,
        JSON.stringify(layout.zones),
        layout.score,
        JSON.stringify(layout.metrics),
        layout.createdAt
      );
      return layout;
    } else {
      const data = JSON.parse(fs.readFileSync(JSON_DB_FILE, 'utf8') || '[]');
      data.unshift(layout);
      fs.writeFileSync(JSON_DB_FILE, JSON.stringify(data, null, 2));
      return layout;
    }
  },
  delete: (id) => {
    if (dbMode === 'sqlite') {
      const stmt = sqliteDb.prepare('DELETE FROM layouts WHERE id = ?');
      stmt.run(id);
      return true;
    } else {
      let data = JSON.parse(fs.readFileSync(JSON_DB_FILE, 'utf8') || '[]');
      data = data.filter(l => l.id !== id);
      fs.writeFileSync(JSON_DB_FILE, JSON.stringify(data, null, 2));
      return true;
    }
  },
  count: () => {
    if (dbMode === 'sqlite') {
      const stmt = sqliteDb.prepare('SELECT COUNT(*) as count FROM layouts');
      return stmt.get().count;
    } else {
      const data = JSON.parse(fs.readFileSync(JSON_DB_FILE, 'utf8') || '[]');
      return data.length;
    }
  }
};

function seedDatabaseIfEmpty(runValidation) {
  if (db.count() > 0) return;

  console.log('[SEED] Seeding database with certified reference habitats...');

  // 1. Lunar Outpost Alpha (Optimal, 4 crew, 30 days, Dome)
  const lunarZones = [
    { x: 3, y: 3, type: 'sleep' }, { x: 4, y: 3, type: 'sleep' },
    { x: 3, y: 4, type: 'corridor' }, { x: 4, y: 4, type: 'corridor' }, { x: 5, y: 4, type: 'corridor' }, { x: 6, y: 4, type: 'corridor' },
    { x: 5, y: 3, type: 'work' }, { x: 6, y: 3, type: 'work' },
    { x: 7, y: 4, type: 'airlock' },
    { x: 3, y: 5, type: 'storage' }, { x: 4, y: 5, type: 'food' }, { x: 5, y: 5, type: 'corridor' },
    { x: 6, y: 5, type: 'exercise' }, { x: 7, y: 5, type: 'medical' },
    { x: 4, y: 6, type: 'hygiene' }, { x: 5, y: 6, type: 'storage' }
  ];
  const lunarEval = runValidation(4, 30, 'dome', lunarZones);
  db.insert({
    id: 'seed-lunar-alpha',
    name: 'Lunar Outpost Alpha',
    crewSize: 4,
    missionLengthDays: 30,
    habitatShape: 'dome',
    zones: lunarZones,
    score: lunarEval.score,
    metrics: lunarEval,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
  });

  // 2. Mars Transit Vessel (Deep-Space Long Duration, 6 crew, 500 days, Torus)
  const marsZones = [
    { x: 2, y: 2, type: 'sleep' }, { x: 3, y: 2, type: 'sleep' }, { x: 4, y: 2, type: 'sleep' },
    { x: 2, y: 3, type: 'corridor' }, { x: 3, y: 3, type: 'corridor' }, { x: 4, y: 3, type: 'corridor' }, { x: 5, y: 3, type: 'corridor' }, { x: 6, y: 3, type: 'corridor' }, { x: 7, y: 3, type: 'corridor' }, { x: 8, y: 3, type: 'corridor' }, { x: 9, y: 3, type: 'corridor' }, { x: 10, y: 3, type: 'airlock' },
    { x: 5, y: 2, type: 'storage' }, { x: 6, y: 2, type: 'storage' }, { x: 7, y: 2, type: 'food' }, { x: 8, y: 2, type: 'food' },
    { x: 2, y: 4, type: 'sleep' }, { x: 3, y: 4, type: 'sleep' }, { x: 4, y: 4, type: 'sleep' },
    { x: 5, y: 4, type: 'work' }, { x: 6, y: 4, type: 'work' }, { x: 7, y: 4, type: 'medical' }, { x: 8, y: 4, type: 'corridor' }, { x: 9, y: 4, type: 'corridor' }, { x: 10, y: 4, type: 'airlock' },
    { x: 8, y: 5, type: 'hygiene' }, { x: 9, y: 5, type: 'exercise' }, { x: 10, y: 5, type: 'storage' }
  ];
  const marsEval = runValidation(6, 500, 'torus', marsZones);
  db.insert({
    id: 'seed-mars-transit',
    name: 'Mars Transit Vessel',
    crewSize: 6,
    missionLengthDays: 500,
    habitatShape: 'torus',
    zones: marsZones,
    score: marsEval.score,
    metrics: marsEval,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
  });

  // 3. Flawed Prototype (Severe Acoustic & Hygiene Conflicts + Trapped Egress)
  const flawedZones = [
    { x: 4, y: 4, type: 'sleep' },
    { x: 5, y: 4, type: 'exercise' }, // Gym directly touching sleep
    { x: 6, y: 4, type: 'hygiene' },
    { x: 7, y: 4, type: 'food' },     // Waste directly touching galley
    { x: 8, y: 4, type: 'medical' },
    { x: 14, y: 8, type: 'airlock' }  // Airlock completely isolated without corridor
  ];
  const flawedEval = runValidation(6, 180, 'cylinder', flawedZones);
  db.insert({
    id: 'seed-flawed-prototype',
    name: 'Flawed Prototype (Test Case)',
    crewSize: 6,
    missionLengthDays: 180,
    habitatShape: 'cylinder',
    zones: flawedZones,
    score: flawedEval.score,
    metrics: flawedEval,
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
  });

  console.log('[SEED] Reference layouts seeded successfully.');
}

module.exports = {
  db,
  seedDatabaseIfEmpty
};
