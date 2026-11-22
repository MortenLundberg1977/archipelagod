// Shared constants between server and client

const ISLAND_TYPES = {
  FARMING:  { name: 'Farming',  emoji: '🌾', bonuses: { food: 2.0, ore: 0.5, timber: 1.0, fish: 1.0 } },
  MINING:   { name: 'Mining',   emoji: '⛏️',  bonuses: { food: 0.5, ore: 2.0, timber: 0.5, fish: 0.5 } },
  FISHING:  { name: 'Fishing',  emoji: '🌊', bonuses: { food: 1.0, ore: 0.5, timber: 1.0, fish: 2.0 } },
  FOREST:   { name: 'Forest',   emoji: '🌲', bonuses: { food: 1.0, ore: 0.5, timber: 2.0, fish: 1.0 } },
};

const RESOURCES = ['food', 'ore', 'timber', 'fish'];

// Units: things you place on the map (animals, people, structures)
// Each has a cost, and an effect applied every tick
const UNITS = {
  VILLAGER:    {
    emoji: '👤', name: 'Villager',
    cost: { food: 10 },
    effect: { maxPopulation: 1 },          // each villager = +1 pop slot
    upkeep: { food: 1 },                   // eats 1 food per tick
  },
  PIG:         {
    emoji: '🐷', name: 'Pig',
    cost: { food: 15 },
    effect: { food: 1 },                   // produces 1 food/tick
    upkeep: {},
  },
  COW:         {
    emoji: '🐄', name: 'Cow',
    cost: { food: 25 },
    effect: { food: 2, happiness: 0.5 },   // food + happiness bonus
    upkeep: {},
  },
  FARM_PLOT:   {
    emoji: '🌱', name: 'Farm Plot',
    cost: { timber: 5 },
    effect: { food: 2 },
    upkeep: {},
  },
  HOUSE:       {
    emoji: '🏠', name: 'House',
    cost: { timber: 20, ore: 10 },
    effect: { maxPopulation: 5, happiness: 1 },
    upkeep: {},
  },
  MINE:        {
    emoji: '⛏️', name: 'Mine',
    cost: { timber: 15 },
    effect: { ore: 2 },
    upkeep: {},
  },
  LUMBER_MILL: {
    emoji: '🪵', name: 'Lumber Mill',
    cost: { timber: 5, ore: 10 },
    effect: { timber: 2 },
    upkeep: {},
  },
  FISHING_HUT: {
    emoji: '🐟', name: 'Fishing Hut',
    cost: { timber: 8, ore: 3 },
    effect: { fish: 3 },
    upkeep: {},
  },
  MARKET:      {
    emoji: '🏪', name: 'Market',
    cost: { timber: 30, ore: 20 },
    effect: { enablesTrade: true },
    upkeep: {},
  },
};

const POPULATION_FOOD_COST = 1; // base food per person per tick (villagers add upkeep on top)
const HAPPINESS_DECAY      = 0.5;
const TICK_INTERVAL_MS     = 5000;

const EVENTS = {
  CONNECT:       'connect',
  DISCONNECT:    'disconnect',
  REGISTER:      'register',       // new player: name + pin → island + recovery code
  LOGIN:         'login',          // returning player: name + pin
  ISLAND_UPDATE: 'island_update',
  WORLD_UPDATE:  'world_update',
  PLACE_UNIT:    'place_unit',
  TRADE_OFFER:   'trade_offer',
  TRADE_ACCEPT:  'trade_accept',
  TRADE_REJECT:  'trade_reject',
  CHAT:          'chat',
  ERROR:         'error',
};

// Works in both Node.js and browser
if (typeof module !== 'undefined') {
  module.exports = { ISLAND_TYPES, RESOURCES, UNITS, POPULATION_FOOD_COST,
    HAPPINESS_DECAY, TICK_INTERVAL_MS, EVENTS };
}
