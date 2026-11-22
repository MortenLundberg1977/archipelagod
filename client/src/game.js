// Archipelagod client
const socket = io();

let myIsland  = null;
let worldState = null;

// ── UI helpers ───────────────────────────────────────────────────────────────
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

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Login / Register ──────────────────────────────────────────────────────────
function setupLogin() {
  // Tab switching
  $('tab-login').addEventListener('click', () => {
    $('tab-login').classList.add('active');
    $('tab-register').classList.remove('active');
    $('panel-login').classList.remove('hidden');
    $('panel-register').classList.add('hidden');
  });
  $('tab-register').addEventListener('click', () => {
    $('tab-register').classList.add('active');
    $('tab-login').classList.remove('active');
    $('panel-register').classList.remove('hidden');
    $('panel-login').classList.add('hidden');
  });

  // Login
  $('login-btn').addEventListener('click', doLogin);
  [$('login-name'), $('login-pin')].forEach(el =>
    el.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); }));

  function doLogin() {
    const name = $('login-name').value.trim();
    const pin  = $('login-pin').value.trim();
    const err  = $('login-error');
    err.classList.add('hidden');
    if (!name) return showErr(err, 'Enter your name');
    if (!/^\d{4}$/.test(pin)) return showErr(err, 'PIN must be 4 digits');

    $('login-btn').disabled = true;
    socket.emit(EVENTS.LOGIN, { name, pin }, (res) => {
      $('login-btn').disabled = false;
      if (!res.ok) return showErr(err, res.error);
      enterGame(res);
    });
  }

  // Register
  $('register-btn').addEventListener('click', doRegister);
  [$('reg-name'), $('reg-pin'), $('reg-pin2')].forEach(el =>
    el.addEventListener('keydown', e => { if (e.key === 'Enter') doRegister(); }));

  function doRegister() {
    const name = $('reg-name').value.trim();
    const pin  = $('reg-pin').value.trim();
    const pin2 = $('reg-pin2').value.trim();
    const err  = $('reg-error');
    err.classList.add('hidden');
    if (!name) return showErr(err, 'Choose a name');
    if (!/^\d{4}$/.test(pin)) return showErr(err, 'PIN must be exactly 4 digits');
    if (pin !== pin2) return showErr(err, 'PINs do not match');

    $('register-btn').disabled = true;
    socket.emit(EVENTS.REGISTER, { name, pin }, (res) => {
      $('register-btn').disabled = false;
      if (!res.ok) return showErr(err, res.error);
      // Show recovery code before entering game
      showRecoveryModal(res.recoveryCode, res.island.name, () => enterGame(res));
    });
  }
}

function showErr(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
}

function showRecoveryModal(code, islandName, onDismiss) {
  $('recovery-code-display').textContent = code;
  $('recovery-island-name').textContent  = islandName;
  $('recovery-modal').classList.remove('hidden');
  window._onRecoveryDismiss = onDismiss;
}

function dismissRecovery() {
  $('recovery-modal').classList.add('hidden');
  if (window._onRecoveryDismiss) window._onRecoveryDismiss();
}
window.dismissRecovery = dismissRecovery;

function enterGame(res) {
  myIsland   = res.island;
  worldState = res.world;
  window._currentIsland = myIsland;
  $('login-screen').classList.add('hidden');
  $('game-screen').classList.remove('hidden');
  renderAll();
  setupMapEvents();
  toast(res.rejoined ? `Welcome back, ${myIsland.playerName}! 🏝️` : `Your island is born! 🏝️`);
}

// ── Map canvas events ────────────────────────────────────────────────────────
function setupMapEvents() {
  const canvas = $('island-map');
  canvas.addEventListener('click',     e => window.handleCanvasClick(canvas, myIsland, e));
  canvas.addEventListener('mousemove', e => window.handleCanvasHover(canvas, myIsland, e));
  canvas.addEventListener('mouseleave',() => {
    if (myIsland) window.renderIslandMap(canvas, myIsland, canvas._viewX, canvas._viewY);
  });
  // Touch: single-finger tap → placement or unit inspect
  // (2-finger pinch is handled inside setupZoom; we ignore multi-touch here)
  let _tapStart = null;
  canvas.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) { _tapStart = null; return; }
    _tapStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
  }, { passive: true });

  canvas.addEventListener('touchend', e => {
    if (!_tapStart || e.changedTouches.length !== 1) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - _tapStart.x, dy = t.clientY - _tapStart.y;
    const dt = Date.now() - _tapStart.t;
    _tapStart = null;
    // Only treat as tap if finger barely moved and lifted quickly
    if (Math.hypot(dx, dy) > 12 || dt > 400) return;

    if (window._placementType) {
      // In placement mode: dispatch a click to place
      const mouseEvent = new MouseEvent('click', { clientX: t.clientX, clientY: t.clientY, bubbles: true });
      canvas.dispatchEvent(mouseEvent);
    } else {
      // Not in placement mode: tap → inspect unit if one is there
      const unit = window.unitAtCanvasPoint?.(canvas, myIsland, t.clientX, t.clientY);
      if (unit) showUnitInfo(unit);
    }
  }, { passive: true });

  // Scroll arrow buttons
  $('scroll-up')   ?.addEventListener('click', () => reScroll(0, -4));
  $('scroll-down') ?.addEventListener('click', () => reScroll(0,  4));
  $('scroll-left') ?.addEventListener('click', () => reScroll(-4, 0));
  $('scroll-right')?.addEventListener('click', () => reScroll(4,  0));

  // Keyboard scroll
  document.addEventListener('keydown', e => {
    if (!myIsland) return;
    const moves = { ArrowUp:[0,-4], ArrowDown:[0,4], ArrowLeft:[-4,0], ArrowRight:[4,0] };
    if (moves[e.key]) { e.preventDefault(); reScroll(...moves[e.key]); }
  });

  // Zoom (mouse wheel + pinch)
  if (window.setupZoom) window.setupZoom(canvas, { get id() { return myIsland?.id; }, get type() { return myIsland?.type; } });
}

function reScroll(dx, dy) {
  const canvas = $('island-map');
  if (!canvas || !myIsland) return;
  window.scrollView(canvas, myIsland, dx, dy);
}

// ── Render ────────────────────────────────────────────────────────────────────
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
  $('hud-food').textContent   = `🌾 ${Math.floor(myIsland.resources.food)}`;
  $('hud-ore').textContent    = `⛏️ ${Math.floor(myIsland.resources.ore)}`;
  $('hud-timber').textContent = `🪵 ${Math.floor(myIsland.resources.timber)}`;
  $('hud-fish').textContent   = `🐟 ${Math.floor(myIsland.resources.fish)}`;
}

function renderMyIsland() {
  if (!myIsland) return;
  const typeInfo = ISLAND_TYPES[myIsland.type];
  $('island-type-badge').textContent = `${typeInfo.emoji} ${typeInfo.name}`;

  // Pixel art map (preserve scroll position if already set)
  const canvas = $('island-map');
  if (canvas && window.renderIslandMap) {
    window.renderIslandMap(canvas, myIsland, canvas._viewX, canvas._viewY);
    // Mini-map overview
    const miniSrc = window.renderMiniMap?.(canvas, myIsland);
    const miniDst = $('mini-map');
    if (miniSrc && miniDst) {
      const mctx = miniDst.getContext('2d');
      mctx.drawImage(miniSrc, 0, 0, miniDst.width, miniDst.height);
      // Draw viewport rect on mini-map
      const vx = canvas._viewX || 0, vy = canvas._viewY || 0;
      const vw = window.VIEW_W || 32, vh = window.VIEW_H || 24;
      const mw = miniDst.width, mh = miniDst.height;
      mctx.strokeStyle = '#ffffffaa';
      mctx.lineWidth = 1;
      mctx.strokeRect(vx * mw / 128, vy * mh / 128, vw * mw / 128, vh * mh / 128);
    }
  }

  // Units-on-island summary
  renderUnitList();

  // Build / place panel
  renderPlacePanel();

  // Trade button
  if (myIsland.hasMarket) {
    $('new-trade').classList.remove('hidden');
  }
}

function renderUnitList() {
  const el = $('units-list');
  el.innerHTML = '';
  const counts = {};
  for (const u of (myIsland.units || [])) {
    counts[u.type] = (counts[u.type] || 0) + 1;
  }
  for (const [type, count] of Object.entries(counts)) {
    const spec = UNITS[type];
    if (!spec) continue;
    const chip = document.createElement('div');
    chip.className = 'building-chip';
    chip.textContent = `${spec.emoji} ${spec.name} ×${count}`;
    el.appendChild(chip);
  }
  if (Object.keys(counts).length === 0) {
    el.innerHTML = '<em style="color:var(--muted)">No units placed</em>';
  }
}

function renderPlacePanel() {
  const bb = $('place-buttons');
  bb.innerHTML = '';

  for (const [type, spec] of Object.entries(UNITS)) {
    const btn = document.createElement('button');
    btn.className = 'build-btn';
    const costStr = Object.entries(spec.cost)
      .map(([r, v]) => `${v} ${RESOURCE_EMOJI[r] || r}`)
      .join(' ');
    btn.innerHTML = `${spec.emoji} <strong>${spec.name}</strong><br><small>${costStr || 'free'}</small>`;
    btn.title = getUnitTooltip(type, spec);
    btn.addEventListener('click', () => startPlacement(type));
    bb.appendChild(btn);
  }
}

function getUnitTooltip(type, spec) {
  const eff = spec.effect;
  const lines = [];
  if (eff.food)          lines.push(`+${eff.food} food/tick`);
  if (eff.ore)           lines.push(`+${eff.ore} ore/tick`);
  if (eff.timber)        lines.push(`+${eff.timber} timber/tick`);
  if (eff.fish)          lines.push(`+${eff.fish} fish/tick`);
  if (eff.happiness)     lines.push(`+${eff.happiness} happiness/tick`);
  if (eff.maxPopulation) lines.push(`+${eff.maxPopulation} population cap`);
  if (eff.enablesTrade)  lines.push('enables trading');
  if (spec.upkeep.food)  lines.push(`costs ${spec.upkeep.food} food/tick`);
  return lines.join(', ') || spec.name;
}

function startPlacement(unitType) {
  const canvas = $('island-map');
  if (!canvas || !window.enterPlacementMode) return;

  // Show cancel hint
  const hint = $('placement-hint');
  if (hint) {
    const spec = UNITS[unitType];
    hint.textContent = `📍 Tap the map to place ${spec.emoji} ${spec.name}`;
    hint.classList.remove('hidden');
  }

  window.enterPlacementMode(canvas, unitType, (type, x, y) => {
    if (hint) hint.classList.add('hidden');
    doPlaceUnit(type, x, y);
  });
}

// ── Unit info (tap to inspect on mobile) ─────────────────────────────────────
function showUnitInfo(unit) {
  const spec = UNITS[unit.type];
  if (!spec) return;
  const eff = spec.effect;
  const lines = [];
  if (eff.food)          lines.push(`+${eff.food} food/tick`);
  if (eff.ore)           lines.push(`+${eff.ore} ore/tick`);
  if (eff.timber)        lines.push(`+${eff.timber} timber/tick`);
  if (eff.fish)          lines.push(`+${eff.fish} fish/tick`);
  if (eff.happiness)     lines.push(`+${eff.happiness} happiness/tick`);
  if (eff.maxPopulation) lines.push(`+${eff.maxPopulation} pop cap`);
  if (spec.upkeep.food)  lines.push(`−${spec.upkeep.food} food/tick`);
  const detail = lines.length ? lines.join(' · ') : 'No production';
  toast(`${spec.emoji} ${spec.name}  ${detail}`, 3500);
}

// ── Actions ──────────────────────────────────────────────────────────────────
function doPlaceUnit(unitType, x, y) {
  socket.emit(EVENTS.PLACE_UNIT, { unitType, x, y }, (res) => {
    if (res.ok) {
      myIsland = res.island;
      window._currentIsland = myIsland;
      renderAll();
      const spec = UNITS[unitType];
      toast(`${spec.emoji} ${spec.name} placed!`);
    } else {
      toast(`❌ ${res.error}`);
      // Redraw clean map
      const _c2 = $('island-map');
      window.renderIslandMap(_c2, myIsland, _c2?._viewX, _c2?._viewY);
    }
  });
}

function doAcceptTrade(offerId) {
  socket.emit(EVENTS.TRADE_ACCEPT, { offerId }, (res) => {
    if (res.ok) toast('Trade complete! 🤝');
    else        toast(`❌ ${res.error}`);
  });
}

// ── World ─────────────────────────────────────────────────────────────────────
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

// ── Trade ─────────────────────────────────────────────────────────────────────
function renderTrade() {
  if (!worldState) return;
  const list   = $('trade-offers-list');
  const offers = worldState.tradeOffers || [];
  if (offers.length === 0) {
    list.innerHTML = '<em style="color:var(--muted)">No active trade offers</em>';
    return;
  }
  list.innerHTML = '';
  for (const offer of offers) {
    const isOwn = myIsland && offer.fromIslandId === myIsland.id;
    const card  = document.createElement('div');
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

function setupTradeForm() {
  $('post-trade-btn').addEventListener('click', () => {
    const offerAmount   = parseInt($('offer-amount').value) || 0;
    const offerResource = $('offer-resource').value;
    const wantAmount    = parseInt($('want-amount').value) || 0;
    const wantResource  = $('want-resource').value;
    if (offerResource === wantResource) { toast('Pick different resources!'); return; }
    socket.emit(EVENTS.TRADE_OFFER, { offerResource, offerAmount, wantResource, wantAmount }, (res) => {
      if (res.ok) toast('Trade offer posted! 📜');
      else        toast(`❌ ${res.error}`);
    });
  });
}

// ── Chat ──────────────────────────────────────────────────────────────────────
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
    div.innerHTML = `<span class="from">${escapeHtml(from)}:</span> ${escapeHtml(message)}`;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  });
}

// ── Socket events ─────────────────────────────────────────────────────────────
socket.on(EVENTS.ISLAND_UPDATE, (island) => {
  myIsland = island;
  window._currentIsland = myIsland;
  renderHUD();
  renderUnitList();
  const _c = $('island-map');
  window.renderIslandMap?.(_c, myIsland, _c?._viewX, _c?._viewY);
});

socket.on(EVENTS.WORLD_UPDATE, (world) => {
  worldState = world;
  renderWorld();
  renderTrade();
});

// ── Display constants ─────────────────────────────────────────────────────────
const RESOURCE_EMOJI = { food: '🌾', ore: '⛏️', timber: '🪵', fish: '🐟' };

// ── Init ──────────────────────────────────────────────────────────────────────
setupLogin();
setupTradeForm();
setupChat();
