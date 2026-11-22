const { v4: uuidv4 } = require('uuid');
const { createIsland, tickIsland, placeUnit } = require('./island');
const db = require('./db');

// In-memory world (loaded from DB on startup, saved periodically)
const islands   = new Map(); // islandId → island
const players   = new Map(); // socketId → { playerId, islandId, name }
const tradeOffers = new Map(); // offerId → offer

// ── Restore world from DB on startup ─────────────────────────────────────────
for (const island of db.loadAllIslands()) {
  islands.set(island.id, island);
}
console.log(`[DB] Restored ${islands.size} island(s) from database`);

// ── Save all islands to DB every 30 seconds ───────────────────────────────────
setInterval(() => {
  for (const island of islands.values()) db.saveIsland(island);
}, 30_000);

// ── Public / private island views ─────────────────────────────────────────────
function getPublicIsland(island) {
  return {
    id:            island.id,
    playerId:      island.playerId,
    playerName:    island.playerName,
    name:          island.name,
    type:          island.type,
    population:    island.population,
    maxPopulation: island.maxPopulation,
    happiness:     island.happiness,
    hasMarket:     island.hasMarket,
    ticks:         island.ticks,
    unitCount:     (island.units || []).length,
  };
}

function getPrivateIsland(island) {
  return { ...island };
}

function getWorldState() {
  return {
    islands:     [...islands.values()].map(getPublicIsland),
    tradeOffers: [...tradeOffers.values()],
    playerCount: players.size,
  };
}

// ── Auth + join ───────────────────────────────────────────────────────────────
/**
 * Register a new player + create their island.
 * Returns { ok, island, recoveryCode } or { ok:false, error }
 */
function registerPlayer(socketId, name, pin) {
  const playerId = uuidv4();
  const result   = db.register(playerId, name, pin);
  if (!result.ok) return result;

  const island = createIsland(playerId, name);
  islands.set(island.id, island);
  db.saveIsland(island);

  players.set(socketId, { playerId, islandId: island.id, name });
  return { ok: true, island, recoveryCode: result.recoveryCode };
}

/**
 * Login existing player.
 * Returns { ok, island, rejoined } or { ok:false, error }
 */
function loginPlayer(socketId, name, pin) {
  const result = db.login(name, pin);
  if (!result.ok) return result;

  const { playerId } = result;

  // Find their island in memory, or reload from DB
  let island = [...islands.values()].find(i => i.playerId === playerId);
  if (!island) {
    island = db.loadIsland(playerId);
    if (island) islands.set(island.id, island);
  }
  if (!island) return { ok: false, error: 'Island not found — contact your teacher' };

  // Reassign socket if reconnecting
  for (const [sid, p] of players.entries()) {
    if (p.playerId === playerId) players.delete(sid);
  }
  players.set(socketId, { playerId, islandId: island.id, name });

  return { ok: true, island, rejoined: true };
}

function playerDisconnect(socketId) {
  const player = players.get(socketId);
  if (player) {
    // Save island immediately on disconnect
    const island = islands.get(player.islandId);
    if (island) db.saveIsland(island);
  }
  players.delete(socketId);
}

function getPlayerIsland(socketId) {
  const player = players.get(socketId);
  if (!player) return null;
  return islands.get(player.islandId) || null;
}

// ── Game actions ──────────────────────────────────────────────────────────────
function handlePlaceUnit(socketId, { unitType, x, y }) {
  const island = getPlayerIsland(socketId);
  if (!island) return { ok: false, error: 'No island found' };
  return placeUnit(island, unitType, x, y);
}

function handleTradeOffer(socketId, { wantFromIslandId, offerResource, offerAmount, wantResource, wantAmount }) {
  const island = getPlayerIsland(socketId);
  if (!island) return { ok: false, error: 'No island found' };
  if (!island.hasMarket) return { ok: false, error: 'Build a market first' };
  if ((island.resources[offerResource] || 0) < offerAmount)
    return { ok: false, error: `Not enough ${offerResource}` };

  const offer = {
    id:             uuidv4(),
    fromIslandId:   island.id,
    fromPlayerName: island.playerName,
    toIslandId:     wantFromIslandId || null,
    offerResource,  offerAmount,
    wantResource,   wantAmount,
    createdAt:      Date.now(),
  };
  tradeOffers.set(offer.id, offer);
  return { ok: true, offer };
}

function handleTradeAccept(socketId, offerId) {
  const acceptor = getPlayerIsland(socketId);
  if (!acceptor) return { ok: false, error: 'No island found' };
  if (!acceptor.hasMarket) return { ok: false, error: 'Build a market first' };

  const offer = tradeOffers.get(offerId);
  if (!offer) return { ok: false, error: 'Offer no longer available' };

  const offerer = islands.get(offer.fromIslandId);
  if (!offerer) return { ok: false, error: 'Offering island not found' };

  if ((offerer.resources[offer.offerResource] || 0) < offer.offerAmount)
    return { ok: false, error: 'Offerer no longer has enough resources' };
  if ((acceptor.resources[offer.wantResource] || 0) < offer.wantAmount)
    return { ok: false, error: `You don't have enough ${offer.wantResource}` };

  offerer.resources[offer.offerResource]  -= offer.offerAmount;
  acceptor.resources[offer.offerResource] += offer.offerAmount;
  acceptor.resources[offer.wantResource]  -= offer.wantAmount;
  offerer.resources[offer.wantResource]   += offer.wantAmount;

  offerer.happiness  = Math.min(100, offerer.happiness  + 5);
  acceptor.happiness = Math.min(100, acceptor.happiness + 5);

  tradeOffers.delete(offerId);
  return { ok: true, offererIsland: offerer, acceptorIsland: acceptor };
}

// ── Tick ──────────────────────────────────────────────────────────────────────
function tickAll() {
  for (const island of islands.values()) tickIsland(island);

  // Expire old trade offers (5 min)
  const cutoff = Date.now() - 5 * 60 * 1000;
  for (const [id, offer] of tradeOffers.entries()) {
    if (offer.createdAt < cutoff) tradeOffers.delete(id);
  }
}

module.exports = {
  islands, players, tradeOffers,
  getPublicIsland, getPrivateIsland, getWorldState,
  registerPlayer, loginPlayer, playerDisconnect, getPlayerIsland,
  handlePlaceUnit, handleTradeOffer, handleTradeAccept,
  tickAll,
};
