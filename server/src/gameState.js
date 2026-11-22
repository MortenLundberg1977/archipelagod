const { v4: uuidv4 } = require('uuid');
const { createIsland, tickIsland, buildOnIsland } = require('./island');

// In-memory game state (replace with SQLite for persistence later)
const islands   = new Map(); // islandId → island
const players   = new Map(); // socketId → { playerId, islandId, name }
const tradeOffers = new Map(); // offerId → offer

function getPublicIsland(island) {
  // Strip trade internals, return what all players can see
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
  };
}

function getPrivateIsland(island) {
  // Full data for the island's owner
  return { ...island };
}

function getWorldState() {
  return {
    islands: [...islands.values()].map(getPublicIsland),
    tradeOffers: [...tradeOffers.values()],
    playerCount: players.size,
  };
}

function joinGame(socketId, playerName) {
  // Check if reconnecting
  for (const [sid, p] of players.entries()) {
    if (p.name === playerName) {
      // Reassign socket
      players.delete(sid);
      players.set(socketId, p);
      const island = islands.get(p.islandId);
      return { island, rejoined: true };
    }
  }

  // New player
  const playerId = uuidv4();
  const island   = createIsland(playerId, playerName);
  islands.set(island.id, island);
  players.set(socketId, { playerId, islandId: island.id, name: playerName });
  return { island, rejoined: false };
}

function playerDisconnect(socketId) {
  players.delete(socketId);
  // Island persists — player can rejoin
}

function getPlayerIsland(socketId) {
  const player = players.get(socketId);
  if (!player) return null;
  return islands.get(player.islandId) || null;
}

function handleBuild(socketId, buildingType) {
  const island = getPlayerIsland(socketId);
  if (!island) return { ok: false, error: 'No island found' };
  return buildOnIsland(island, buildingType);
}

function handleTradeOffer(socketId, { wantFromIslandId, offerResource, offerAmount, wantResource, wantAmount }) {
  const island = getPlayerIsland(socketId);
  if (!island) return { ok: false, error: 'No island found' };
  if (!island.hasMarket) return { ok: false, error: 'Build a market first' };
  if ((island.resources[offerResource] || 0) < offerAmount)
    return { ok: false, error: `Not enough ${offerResource}` };

  const offer = {
    id:              uuidv4(),
    fromIslandId:    island.id,
    fromPlayerName:  island.playerName,
    toIslandId:      wantFromIslandId || null, // null = open to anyone
    offerResource,
    offerAmount,
    wantResource,
    wantAmount,
    createdAt:       Date.now(),
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

  // Check both sides can fulfil
  if ((offerer.resources[offer.offerResource] || 0) < offer.offerAmount)
    return { ok: false, error: 'Offerer no longer has enough resources' };
  if ((acceptor.resources[offer.wantResource] || 0) < offer.wantAmount)
    return { ok: false, error: `You don't have enough ${offer.wantResource}` };

  // Exchange
  offerer.resources[offer.offerResource]  -= offer.offerAmount;
  acceptor.resources[offer.offerResource] += offer.offerAmount;
  acceptor.resources[offer.wantResource]  -= offer.wantAmount;
  offerer.resources[offer.wantResource]   += offer.wantAmount;

  // Happiness boost from successful trade
  offerer.happiness  = Math.min(100, offerer.happiness  + 5);
  acceptor.happiness = Math.min(100, acceptor.happiness + 5);

  tradeOffers.delete(offerId);

  return { ok: true, offererIsland: offerer, acceptorIsland: acceptor };
}

function tickAll() {
  for (const island of islands.values()) {
    tickIsland(island);
  }
  // Expire old trade offers (older than 5 minutes)
  const cutoff = Date.now() - 5 * 60 * 1000;
  for (const [id, offer] of tradeOffers.entries()) {
    if (offer.createdAt < cutoff) tradeOffers.delete(id);
  }
}

module.exports = {
  islands, players, tradeOffers,
  getPublicIsland, getPrivateIsland, getWorldState,
  joinGame, playerDisconnect, getPlayerIsland,
  handleBuild, handleTradeOffer, handleTradeAccept,
  tickAll,
};
