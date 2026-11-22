const { v4: uuidv4 } = require('uuid');
const { ISLAND_TYPES, RESOURCES, BASE_PRODUCTION, POPULATION_FOOD_COST,
        HAPPINESS_DECAY, BUILDINGS } = require('../../shared/constants');

const ISLAND_TYPE_KEYS = Object.keys(ISLAND_TYPES);

function randomIslandType() {
  return ISLAND_TYPE_KEYS[Math.floor(Math.random() * ISLAND_TYPE_KEYS.length)];
}

function createIsland(playerId, playerName) {
  const type = randomIslandType();
  return {
    id:         uuidv4(),
    playerId,
    playerName,
    type,
    name:       `${playerName}'s Island`,

    // Resources
    resources: { food: 50, ore: 20, timber: 30, fish: 30 },

    // Population
    population: 5,
    maxPopulation: 10, // grows with houses
    happiness: 80,     // 0–100

    // Buildings: { buildingType: count }
    buildings: {
      FARM:        1,
      FISHING_HUT: 1,
      HOUSE:       2,
    },

    // Trade
    hasMarket: false,
    tradeOffers: [], // { id, fromIslandId, resource, amount, wantResource, wantAmount }

    // Stats
    createdAt: Date.now(),
    ticks: 0,
  };
}

function tickIsland(island) {
  island.ticks++;
  const typeBonuses = ISLAND_TYPES[island.type].bonuses;

  // --- Production ---
  const b = island.buildings;
  island.resources.food   += (b.FARM        || 0) * BASE_PRODUCTION.food   * typeBonuses.food;
  island.resources.ore    += (b.MINE        || 0) * BASE_PRODUCTION.ore    * typeBonuses.ore;
  island.resources.timber += (b.LUMBER_MILL || 0) * BASE_PRODUCTION.timber * typeBonuses.timber;
  island.resources.fish   += (b.FISHING_HUT || 0) * BASE_PRODUCTION.fish   * typeBonuses.fish;

  // --- Consumption ---
  const foodNeeded = island.population * POPULATION_FOOD_COST;
  if (island.resources.food >= foodNeeded) {
    island.resources.food -= foodNeeded;
    island.happiness = Math.min(100, island.happiness + 2);
  } else {
    // Not enough food — people are unhappy
    island.resources.food = 0;
    island.happiness = Math.max(0, island.happiness - 10);
  }

  // Happiness drift
  island.happiness = Math.max(0, island.happiness - HAPPINESS_DECAY);

  // --- Population growth ---
  // Grow if happy and room available
  if (island.happiness > 70 && island.population < island.maxPopulation) {
    if (island.ticks % 6 === 0) island.population++;
  }
  // Shrink if very unhappy
  if (island.happiness < 20 && island.population > 1) {
    if (island.ticks % 4 === 0) island.population--;
  }

  // Clamp resources (no negatives)
  for (const r of RESOURCES) {
    island.resources[r] = Math.max(0, Math.round(island.resources[r] * 10) / 10);
  }

  island.happiness = Math.round(island.happiness * 10) / 10;

  return island;
}

function buildOnIsland(island, buildingType) {
  const spec = BUILDINGS[buildingType];
  if (!spec) return { ok: false, error: 'Unknown building type' };

  // Check resources
  for (const [res, cost] of Object.entries(spec.cost)) {
    if ((island.resources[res] || 0) < cost) {
      return { ok: false, error: `Not enough ${res} (need ${cost}, have ${island.resources[res] || 0})` };
    }
  }

  // Deduct resources
  for (const [res, cost] of Object.entries(spec.cost)) {
    island.resources[res] -= cost;
  }

  // Apply effect
  island.buildings[buildingType] = (island.buildings[buildingType] || 0) + 1;
  if (buildingType === 'HOUSE')  island.maxPopulation += spec.capacity;
  if (buildingType === 'MARKET') island.hasMarket = true;

  return { ok: true };
}

module.exports = { createIsland, tickIsland, buildOnIsland };
