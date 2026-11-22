const { v4: uuidv4 } = require('uuid');
const { ISLAND_TYPES, RESOURCES, UNITS, POPULATION_FOOD_COST, HAPPINESS_DECAY } = require('../../shared/constants');

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
    population:    5,
    maxPopulation: 10,
    happiness:     80,

    // Units placed on the map: [{ id, type, x, y }]
    // Start with a couple of houses and a farm plot so the island isn't empty
    units: [
      { id: uuidv4(), type: 'HOUSE',      x: 12, y: 9  },
      { id: uuidv4(), type: 'HOUSE',      x: 14, y: 11 },
      { id: uuidv4(), type: 'FARM_PLOT',  x: 10, y: 10 },
      { id: uuidv4(), type: 'FISHING_HUT',x: 16, y: 13 },
    ],

    // Trade
    hasMarket: false,

    // Stats
    createdAt: Date.now(),
    ticks: 0,
  };
}

function tickIsland(island) {
  island.ticks++;
  const typeBonuses = ISLAND_TYPES[island.type].bonuses;

  // --- Accumulate effects from all placed units ---
  let foodProd    = 0;
  let oreProd     = 0;
  let timberProd  = 0;
  let fishProd    = 0;
  let happBonus   = 0;
  let maxPopBonus = 0;
  let foodUpkeep  = 0;

  for (const unit of island.units) {
    const spec = UNITS[unit.type];
    if (!spec) continue;
    const e = spec.effect;
    if (e.food)          foodProd    += e.food;
    if (e.ore)           oreProd     += e.ore;
    if (e.timber)        timberProd  += e.timber;
    if (e.fish)          fishProd    += e.fish;
    if (e.happiness)     happBonus   += e.happiness;
    if (e.maxPopulation) maxPopBonus += e.maxPopulation;
    if (e.enablesTrade)  island.hasMarket = true;

    // upkeep
    if (spec.upkeep.food) foodUpkeep += spec.upkeep.food;
  }

  // Apply type bonuses to production
  island.resources.food   += foodProd   * typeBonuses.food;
  island.resources.ore    += oreProd    * typeBonuses.ore;
  island.resources.timber += timberProd * typeBonuses.timber;
  island.resources.fish   += fishProd   * typeBonuses.fish;

  // Update maxPopulation from houses/villagers
  island.maxPopulation = 10 + maxPopBonus; // 10 base + unit contributions

  // --- Consumption: population eats food + unit upkeep ---
  const foodNeeded = (island.population * POPULATION_FOOD_COST) + foodUpkeep;
  if (island.resources.food >= foodNeeded) {
    island.resources.food -= foodNeeded;
    island.happiness = Math.min(100, island.happiness + 2);
  } else {
    island.resources.food = 0;
    island.happiness = Math.max(0, island.happiness - 10);
  }

  // Happiness drift + unit bonus
  island.happiness += happBonus;
  island.happiness = Math.max(0, island.happiness - HAPPINESS_DECAY);
  island.happiness = Math.min(100, island.happiness);

  // --- Population growth ---
  if (island.happiness > 70 && island.population < island.maxPopulation) {
    if (island.ticks % 6 === 0) island.population++;
  }
  if (island.happiness < 20 && island.population > 1) {
    if (island.ticks % 4 === 0) island.population--;
  }

  // --- Animal & villager reproduction ---
  // Every ~30 ticks, check each reproducible type. If ≥2 exist, spawn one more.
  if (island.ticks % 30 === 0) {
    for (const species of ['VILLAGER', 'PIG', 'COW']) {
      const existing = island.units.filter(u => u.type === species);
      if (existing.length < 2) continue;

      // Resource check: need a bit of food to support new life
      const foodNeeded = species === 'COW' ? 10 : species === 'PIG' ? 6 : 5;
      if (island.resources.food < foodNeeded) continue;

      // Find a spot near one of the existing units (search a small radius)
      const parent = existing[Math.floor(Math.random() * existing.length)];
      let placed = false;
      const offsets = [-2,-1,0,1,2];
      outer: for (const dx of offsets) {
        for (const dy of offsets) {
          if (dx === 0 && dy === 0) continue;
          const nx = parent.x + dx, ny = parent.y + dy;
          if (nx < 0 || ny < 0 || nx > 127 || ny > 127) continue;
          // Make sure no other unit is at that tile
          if (island.units.some(u => u.x === nx && u.y === ny)) continue;
          island.units.push({ id: uuidv4(), type: species, x: nx, y: ny });
          island.resources.food -= foodNeeded;
          placed = true;
          break outer;
        }
      }
      // Only one new birth per tick cycle
      if (placed) break;
    }
  }

  // Clamp
  for (const r of RESOURCES) {
    island.resources[r] = Math.max(0, Math.round(island.resources[r] * 10) / 10);
  }
  island.happiness = Math.round(island.happiness * 10) / 10;

  return island;
}

function placeUnit(island, unitType, x, y) {
  const spec = UNITS[unitType];
  if (!spec) return { ok: false, error: 'Unknown unit type' };

  // Check resources
  for (const [res, cost] of Object.entries(spec.cost)) {
    if ((island.resources[res] || 0) < cost) {
      return { ok: false, error: `Not enough ${res} (need ${cost}, have ${Math.floor(island.resources[res] || 0)})` };
    }
  }

  // Deduct resources
  for (const [res, cost] of Object.entries(spec.cost)) {
    island.resources[res] -= cost;
  }

  // Add unit
  const unit = { id: uuidv4(), type: unitType, x, y };
  island.units.push(unit);

  return { ok: true, unit };
}

module.exports = { createIsland, tickIsland, placeUnit };
