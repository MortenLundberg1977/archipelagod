// Database layer — SQLite via better-sqlite3
// Stores players (auth) and islands (game state) persistently

const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

// Railway gives us a persistent volume at /data if configured,
// otherwise fall back to a local file next to the server
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'archipelagod.db'));

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ────────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id            TEXT PRIMARY KEY,
    name          TEXT UNIQUE NOT NULL,
    pin_hash      TEXT NOT NULL,
    recovery_code TEXT NOT NULL,
    created_at    INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS islands (
    id          TEXT PRIMARY KEY,
    player_id   TEXT NOT NULL REFERENCES players(id),
    state_json  TEXT NOT NULL,
    updated_at  INTEGER NOT NULL
  );
`);

// ── Simple PIN "hash" (not crypto — kids game, low stakes) ───────────────────
// XOR with island name + salt so "1234" isn't the same for every player
function hashPin(name, pin) {
  let h = 5381;
  const s = name.toLowerCase() + ':' + pin + ':archipelagod';
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
    h = h & 0xffffffff;
  }
  return h.toString(16);
}

// Recovery code: 3 groups of 4 uppercase letters, e.g. WQRT-MNBV-KPLX
function makeRecoveryCode() {
  const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I/O confusion
  let code = '';
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += alpha[Math.floor(Math.random() * alpha.length)];
  }
  return code;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
const stmts = {
  getPlayer:    db.prepare('SELECT * FROM players WHERE name = ?'),
  createPlayer: db.prepare('INSERT INTO players (id, name, pin_hash, recovery_code, created_at) VALUES (?,?,?,?,?)'),
  getIsland:    db.prepare('SELECT state_json FROM islands WHERE player_id = ?'),
  upsertIsland: db.prepare(`
    INSERT INTO islands (id, player_id, state_json, updated_at)
    VALUES (?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET state_json=excluded.state_json, updated_at=excluded.updated_at
  `),
};

/**
 * Register a new player. Returns { ok, recoveryCode } or { ok:false, error }.
 */
function register(playerId, name, pin) {
  if (stmts.getPlayer.get(name)) {
    return { ok: false, error: 'That name is already taken — try a different one' };
  }
  const recoveryCode = makeRecoveryCode();
  stmts.createPlayer.run(playerId, name, hashPin(name, pin), recoveryCode, Date.now());
  return { ok: true, recoveryCode };
}

/**
 * Login. Returns { ok, playerId } or { ok:false, error }.
 */
function login(name, pin) {
  const player = stmts.getPlayer.get(name);
  if (!player) return { ok: false, error: 'Name not found — check your spelling' };
  if (player.pin_hash !== hashPin(name, pin)) {
    return { ok: false, error: 'Wrong PIN — ask your teacher for the recovery code' };
  }
  return { ok: true, playerId: player.id, recoveryCode: player.recovery_code };
}

/**
 * Recover via recovery code. Returns { ok, playerId } or { ok:false, error }.
 */
function recover(name, recoveryCode) {
  const player = stmts.getPlayer.get(name);
  if (!player) return { ok: false, error: 'Name not found' };
  if (player.recovery_code !== recoveryCode.toUpperCase().replace(/[^A-Z]/g,'').replace(/(.{4})(?=.)/g,'$1-'))
    return { ok: false, error: 'Wrong recovery code' };
  return { ok: true, playerId: player.id };
}

/**
 * Save island state to DB.
 */
function saveIsland(island) {
  stmts.upsertIsland.run(island.id, island.playerId, JSON.stringify(island), Date.now());
}

/**
 * Load island for a player. Returns parsed island or null.
 */
function loadIsland(playerId) {
  const row = stmts.getIsland.get(playerId);
  if (!row) return null;
  try { return JSON.parse(row.state_json); } catch { return null; }
}

/**
 * Load all islands (for restoring world state on server restart).
 */
function loadAllIslands() {
  const rows = db.prepare('SELECT state_json FROM islands').all();
  return rows.map(r => { try { return JSON.parse(r.state_json); } catch { return null; } }).filter(Boolean);
}

module.exports = { register, login, recover, saveIsland, loadIsland, loadAllIslands, hashPin };
