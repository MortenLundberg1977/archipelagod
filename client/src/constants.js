// Shared constants between server and client

const ISLAND_TYPES = {
  FARMING:  { name: 'Farming',  emoji: '🌾', bonuses: { food: 2, ore: 0.5, timber: 1,   fish: 1   } },
  MINING:   { name: 'Mining',   emoji: '⛏️',  bonuses: { food: 0.5, ore: 2, timber: 0.5, fish: 0.5 } },
  FISHING:  { name: 'Fishing',  emoji: '🌊', bonuses: { food: 1,   ore: 0.5, timber: 1,  fish: 2   } },
  FOREST:   { name: 'Forest',   emoji: '🌲', bonuses: { food: 1,   ore: 0.5, timber: 2,  fish: 1   } },
};

const RESOURCES = ['food', 'ore', 'timber', 'fish'];

const BASE_PRODUCTION = {
  food:   2,  // per tick per farm
  ore:    1,  // per tick per mine
  timber: 1,  // per tick per lumber mill
  fish:   2,  // per tick per fishing hut
};

const POPULATION_FOOD_COST = 1; // food per person per tick
const HAPPINESS_DECAY      = 0.5;
const TICK_INTERVAL_MS     = 5000; // 5 seconds per game tick

const BUILDINGS = {
  FARM:        { cost: { timber: 10, ore: 5  }, produces: 'food',   workers: 2 },
  MINE:        { cost: { timber: 15, ore: 0  }, produces: 'ore',    workers: 3 },
  LUMBER_MILL: { cost: { timber: 5,  ore: 10 }, produces: 'timber', workers: 2 },
  FISHING_HUT: { cost: { timber: 8,  ore: 3  }, produces: 'fish',   workers: 1 },
  HOUSE:       { cost: { timber: 20, ore: 10 }, capacity: 5,        workers: 0 },
  MARKET:      { cost: { timber: 30, ore: 20 }, enables: 'trade',   workers: 1 },
};

const EVENTS = {
  CONNECT:         'connect',
  DISCONNECT:      'disconnect',
  JOIN_GAME:       'join_game',
  GAME_STATE:      'game_state',
  ISLAND_UPDATE:   'island_update',
  WORLD_UPDATE:    'world_update',
  BUILD:           'build',
  TRADE_OFFER:     'trade_offer',
  TRADE_ACCEPT:    'trade_accept',
  TRADE_REJECT:    'trade_reject',
  CHAT:            'chat',
  ERROR:           'error',
};

// Works in both Node.js and browser
if (typeof module !== 'undefined') {
  module.exports = { ISLAND_TYPES, RESOURCES, BASE_PRODUCTION, POPULATION_FOOD_COST,
    HAPPINESS_DECAY, TICK_INTERVAL_MS, BUILDINGS, EVENTS };
}
