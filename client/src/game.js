// Archipelagod client
const socket = io();

let myIsland  = null;
let worldState = null;

// --- UI helpers ---
function $(id) { return document.getElementById(id); }

function toast(msg, duration = 2500) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}

function happinessClass(h) {
  if (h >= 65) return 'happy-high';
  if (h >= 35) return 'happy-mid';
  return 'happy-low';
}

function happinessEmoji(h) {
  if (h >= 65) return '😊';
  if (h >= 35) return '😐';
  return '😢';
}

// --- Login ---
function setupLogin() {
  const joinBtn   = $('join-btn');
  const nameInput = $('name-input');

  joinBtn.addEventListener('click', doJoin);
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') doJoin(); });

  function doJoin() {
    const name = nameInput.value.trim();
    if (!name) { toast('Enter your name!'); return; }
    socket.emit(EVENTS.JOIN_GAME, { name }, (res) => {
      if (!res.ok) { toast('Could not join — try again'); return; }
      myIsland   = res.island;
      worldState = res.world;
      $('login-screen').classList.add('hidden');
      $('game-screen').classList.remove('hidden');
      renderAll();
      toast(res.rejoined ? 'Welcome back!' : 'Your island awaits! 🏝️');
    });
  }
}

// --- Render ---
function renderAll() {
  renderHUD();
  renderMyIsland();
  renderWorld();
  renderTrade();
}

function renderHUD() {
  if (!myIsland) return;
  $('island-name').textContent = `🏝️ ${myIsland.name}`;
  $('hud-pop').textContent    = `👥 ${myIsland.population}/${myIsland.maxPopulation}`;
  const h = myIsland.happiness;
  $('hud-happy').textContent  = `${happinessEmoji(h)} ${h}%`;
  $('hud-happy').className    = happinessClass(h);
  $('hud-food').textContent   = `🌾 ${myIsland.resources.food}`;
  $('hud-ore').textContent    = `⛏️ ${myIsland.resources.ore}`;
  $('hud-timber').textContent = `🪵 ${myIsland.resources.timber}`;
  $('hud-fish').textContent   = `🐟 ${myIsland.resources.fish}`;
}

function renderMyIsland() {
  if (!myIsland) return;
  const typeInfo = ISLAND_TYPES[myIsland.type];
  $('island-type-badge').textContent = `${typeInfo.emoji} ${typeInfo.name}`;

  // Pixel art map
  const canvas = $('island-map');
  if (canvas && window.renderIslandMap) {
    window.renderIslandMap(canvas, myIsland);
  }

  // Buildings list
  const bl = $('buildings-list');
  bl.innerHTML = '';
  for (const [type, count] of Object.entries(myIsland.buildings)) {
    if (count > 0) {
      const chip = document.createElement('div');
      chip.className = 'building-chip';
      chip.textContent = `${BUILDING_EMOJI[type] || '🏗️'} ${BUILDING_NAMES[type] || type} ×${count}`;
      bl.appendChild(chip);
    }
  }

  // Build buttons
  const bb = $('build-buttons');
  bb.innerHTML = '';
  for (const [type, spec] of Object.entries(BUILDINGS)) {
    const btn = document.createElement('button');
    btn.className = 'build-btn';
    const costStr = Object.entries(spec.cost).map(([r,v]) => `${v} ${r}`).join(', ');
    btn.textContent = `${BUILDING_EMOJI[type] || '🏗️'} ${BUILDING_NAMES[type]} (${costStr})`;
    btn.addEventListener('click', () => doBuild(type));
    bb.appendChild(btn);
  }

  // Show trade panel only if market built
  if (myIsland.hasMarket) {
    $('new-trade').classList.remove('hidden');
  }
}

function renderWorld() {
  if (!worldState) return;
  const list = $('islands-list');
  list.innerHTML = '';
  for (const island of worldState.islands) {
    const card = document.createElement('div');
    card.className = 'island-card';
    const typeInfo = ISLAND_TYPES[island.type] || {};
    const isMe = myIsland && island.id === myIsland.id;
    card.innerHTML = `
      <div class="island-header">
        <span class="island-name">${typeInfo.emoji || '🏝️'} ${island.playerName}${isMe ? ' (you)' : ''}</span>
        <span class="${happinessClass(island.happiness)}">${happinessEmoji(island.happiness)} ${island.happiness}%</span>
      </div>
      <div>👥 ${island.population}/${island.maxPopulation} · ${typeInfo.name || island.type}</div>
    `;
    list.appendChild(card);
  }
  if (worldState.islands.length === 0) {
    list.innerHTML = '<em style="color:var(--muted)">No other islands yet</em>';
  }
}

function renderTrade() {
  if (!worldState) return;
  const list = $('trade-offers-list');
  const offers = worldState.tradeOffers || [];
  if (offers.length === 0) {
    list.innerHTML = '<em style="color:var(--muted)">No active trade offers</em>';
    return;
  }
  list.innerHTML = '';
  for (const offer of offers) {
    const isOwn = myIsland && offer.fromIslandId === myIsland.id;
    const card = document.createElement('div');
    card.className = 'trade-offer-card';
    card.innerHTML = `
      <strong>${offer.fromPlayerName}</strong> offers
      <span style="color:var(--green)">${offer.offerAmount} ${offer.offerResource}</span> for
      <span style="color:var(--yellow)">${offer.wantAmount} ${offer.wantResource}</span>
      ${isOwn ? '<em style="color:var(--muted)"> (your offer)</em>' : ''}
    `;
    if (!isOwn && myIsland?.hasMarket) {
      const btn = document.createElement('button');
      btn.textContent = 'Accept';
      btn.style.marginLeft = '0.5rem';
      btn.addEventListener('click', () => doAcceptTrade(offer.id));
      card.appendChild(btn);
    }
    list.appendChild(card);
  }
}

// --- Actions ---
function doBuild(buildingType) {
  socket.emit(EVENTS.BUILD, { buildingType }, (res) => {
    if (res.ok) {
      myIsland = res.island;
      renderAll();
      toast(`${BUILDING_NAMES[buildingType]} built! 🏗️`);
    } else {
      toast(`❌ ${res.error}`);
    }
  });
}

function doAcceptTrade(offerId) {
  socket.emit(EVENTS.TRADE_ACCEPT, { offerId }, (res) => {
    if (res.ok) {
      toast('Trade complete! 🤝');
    } else {
      toast(`❌ ${res.error}`);
    }
  });
}

function setupTradeForm() {
  $('post-trade-btn').addEventListener('click', () => {
    const offerAmount    = parseInt($('offer-amount').value) || 0;
    const offerResource  = $('offer-resource').value;
    const wantAmount     = parseInt($('want-amount').value) || 0;
    const wantResource   = $('want-resource').value;
    if (offerResource === wantResource) { toast('Pick different resources!'); return; }
    socket.emit(EVENTS.TRADE_OFFER, { offerResource, offerAmount, wantResource, wantAmount }, (res) => {
      if (res.ok) toast('Trade offer posted! 📜');
      else        toast(`❌ ${res.error}`);
    });
  });
}

function setupChat() {
  const input   = $('chat-input');
  const sendBtn = $('chat-send-btn');
  const log     = $('chat-log');

  function send() {
    const msg = input.value.trim();
    if (!msg) return;
    socket.emit(EVENTS.CHAT, { message: msg });
    input.value = '';
  }

  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });

  socket.on(EVENTS.CHAT, ({ from, message }) => {
    const div = document.createElement('div');
    div.className = 'chat-msg';
    div.innerHTML = `<span class="from">${from}:</span> ${escapeHtml(message)}`;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  });
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// --- Socket events ---
socket.on(EVENTS.ISLAND_UPDATE, (island) => {
  myIsland = island;
  renderHUD();
  renderMyIsland();
});

socket.on(EVENTS.WORLD_UPDATE, (world) => {
  worldState = world;
  renderWorld();
  renderTrade();
});

// --- Constants for display ---
const BUILDING_EMOJI = {
  FARM: '🌾', MINE: '⛏️', LUMBER_MILL: '🪵', FISHING_HUT: '🐟', HOUSE: '🏠', MARKET: '🏪',
};
const BUILDING_NAMES = {
  FARM: 'Farm', MINE: 'Mine', LUMBER_MILL: 'Lumber Mill', FISHING_HUT: 'Fishing Hut', HOUSE: 'House', MARKET: 'Market',
};

// --- Init ---
setupLogin();
setupTradeForm();
setupChat();
