// Archipelagod — tile-based island map renderer + placement mode
// C64-inspired island generation: circle blobs, coast passes, rich terrain
// Map: 128×128 tiles (matching god-island-c64 original scale)
// View: 32×24 tiles shown at 20px each = 640×480 canvas

const TILE   = 20;   // screen pixels per tile
const MAP_W  = 128;  // logical map size (matches C64 original)
const MAP_H  = 128;
const VIEW_W = 32;   // tiles visible on screen
const VIEW_H = 24;

// Tile type IDs (matching C64 original order where possible)
const T = {
  DEEP:0, SHALLOW:1, SAND:2, GRASS:3, FOREST:4,
  HILL:5, MOUNTAIN:6, FLOWER:8,
  FARM:10, DIRT:11,   // extra for island types
  TMP:15              // internal during generation only
};

// Which tiles count as "land" (can place units)
function isLand(map, x, y) {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return false;
  const t = map[y][x];
  return t >= T.SAND && t !== T.TMP;
}

// ── C64-ish palette ───────────────────────────────────────────────────────────
const PAL = {
  deepWater:  '#1030a0', shallows:   '#2255c8',
  sand:       '#c8a040', grass:      '#3a9828',
  darkGrass:  '#1e7016', flower:     '#d84060',
  forest:     '#145010', hill:       '#7a9050',
  hillDark:   '#5a7030', mountain:   '#909090',
  snowPeak:   '#d8e0e8', farmland:   '#a07820',
  dirt:       '#806040', black:      '#000000',
  white:      '#ffffff', roofRed:    '#c03020',
  roofBrown:  '#603010', wall:       '#c0a060',
  wallDark:   '#907040',
};

// ── Tile painters (16×16 each) ────────────────────────────────────────────────
function px(ctx, x, y, w, h, color) {
  if (color) ctx.fillStyle = color;
  ctx.fillRect(x, y, w || 1, h || 1);
}

function drawTile(ctx, type) {
  switch (type) {
    case T.DEEP:     drawDeep(ctx);     break;
    case T.SHALLOW:  drawShallow(ctx);  break;
    case T.SAND:     drawSand(ctx);     break;
    case T.GRASS:    drawGrass(ctx);    break;
    case T.FOREST:   drawForest(ctx);   break;
    case T.HILL:     drawHill(ctx);     break;
    case T.MOUNTAIN: drawMountain(ctx); break;
    case T.FLOWER:   drawFlower(ctx);   break;
    case T.FARM:     drawFarmTile(ctx); break;
    case T.DIRT:     drawDirt(ctx);     break;
    default:
      ctx.fillStyle = PAL.deepWater;
      ctx.fillRect(0, 0, 16, 16);
  }
}

function drawDeep(ctx) {
  ctx.fillStyle = PAL.deepWater; ctx.fillRect(0,0,16,16);
  ctx.fillStyle = '#2050c0';
  for (let y=2;y<16;y+=5) { ctx.fillRect(1,y,5,1); ctx.fillRect(9,y+2,5,1); }
}
function drawShallow(ctx) {
  ctx.fillStyle = PAL.shallows; ctx.fillRect(0,0,16,16);
  ctx.fillStyle = '#3870d8';
  for (let y=1;y<16;y+=4) { ctx.fillRect(2,y,4,1); ctx.fillRect(10,y+2,4,1); }
}
function drawSand(ctx) {
  ctx.fillStyle = PAL.sand; ctx.fillRect(0,0,16,16);
  ctx.fillStyle = '#b89030';
  px(ctx,3,3); px(ctx,9,7); px(ctx,5,11); px(ctx,13,2); px(ctx,1,13);
}
function drawGrass(ctx) {
  ctx.fillStyle = PAL.grass; ctx.fillRect(0,0,16,16);
  ctx.fillStyle = PAL.darkGrass;
  px(ctx,2,2,1,2); px(ctx,8,5,1,2); px(ctx,13,1,1,2); px(ctx,5,10,1,2); px(ctx,11,13,1,2);
}
function drawForest(ctx) {
  ctx.fillStyle = PAL.darkGrass; ctx.fillRect(0,0,16,16);
  ctx.fillStyle = PAL.forest; ctx.fillRect(2,1,12,10);
  ctx.fillStyle = '#1a7014'; ctx.fillRect(4,3,8,5);
  ctx.fillStyle = '#0a4008'; ctx.fillRect(6,5,4,3);
  ctx.fillStyle = PAL.roofBrown; ctx.fillRect(6,10,4,6);
}
function drawHill(ctx) {
  ctx.fillStyle = PAL.hill; ctx.fillRect(0,0,16,16);
  ctx.fillStyle = PAL.hillDark;
  for (let r=0;r<8;r++) ctx.fillRect(8-r, 8+r, r*2, 1);
  ctx.fillStyle = '#90b060';
  for (let r=0;r<4;r++) ctx.fillRect(8-r, 2+r, r*2, 1);
  ctx.fillStyle = PAL.grass;
  px(ctx,2,12,3,1); px(ctx,10,10,4,1);
}
function drawMountain(ctx) {
  ctx.fillStyle = '#606060'; ctx.fillRect(0,0,16,16);
  ctx.fillStyle = PAL.mountain;
  for (let r=0;r<9;r++) ctx.fillRect(8-r, r, r*2, 1);
  ctx.fillStyle = PAL.snowPeak;
  ctx.fillRect(7,0,2,4); ctx.fillRect(6,3,4,1);
  ctx.fillStyle = '#d0d8e0'; ctx.fillRect(5,5,2,2); ctx.fillRect(9,4,2,2);
}
function drawFlower(ctx) {
  ctx.fillStyle = PAL.grass; ctx.fillRect(0,0,16,16);
  ctx.fillStyle = PAL.darkGrass;
  px(ctx,2,2,1,2); px(ctx,13,1,1,2);
  // flowers
  ctx.fillStyle = PAL.flower;
  px(ctx,4,5,2,2); px(ctx,9,3,2,2); px(ctx,3,10,2,2); px(ctx,11,10,2,2); px(ctx,7,13,2,2);
  ctx.fillStyle = '#f0e040';
  px(ctx,5,6); px(ctx,10,4); px(ctx,4,11); px(ctx,12,11); px(ctx,8,14);
}
function drawFarmTile(ctx) {
  ctx.fillStyle = PAL.farmland; ctx.fillRect(0,0,16,16);
  ctx.fillStyle = PAL.dirt;
  for (let y=1;y<16;y+=3) ctx.fillRect(0,y,16,1);
  ctx.fillStyle = '#50c030';
  for (let x=1;x<16;x+=3) ctx.fillRect(x,0,1,16);
  ctx.fillStyle = '#38a018';
  for (let x=1;x<16;x+=3) px(ctx,x,2); px(ctx,x,8); px(ctx,x,14);
}
function drawDirt(ctx) {
  ctx.fillStyle = PAL.dirt; ctx.fillRect(0,0,16,16);
  ctx.fillStyle = '#604830';
  px(ctx,4,4,2,1); px(ctx,10,8,2,1); px(ctx,6,12,2,1);
}

// ── Unit / building sprites (16×16) ───────────────────────────────────────────
function drawUnit(ctx, type) {
  switch (type) {
    case 'VILLAGER':    drawVillager(ctx);    break;
    case 'PIG':         drawPig(ctx);         break;
    case 'COW':         drawCow(ctx);         break;
    case 'FARM_PLOT':   drawFarmPlot(ctx);    break;
    case 'HOUSE':       drawHouse(ctx);       break;
    case 'MINE':        drawMine(ctx);        break;
    case 'LUMBER_MILL': drawLumberMill(ctx);  break;
    case 'FISHING_HUT': drawFishingHut(ctx);  break;
    case 'MARKET':      drawMarket(ctx);      break;
  }
}

function drawVillager(ctx) {
  ctx.fillStyle = '#c08060'; ctx.fillRect(5,4,6,4);
  ctx.fillStyle = '#4060c0'; ctx.fillRect(4,8,8,5);
  ctx.fillStyle = '#303080'; ctx.fillRect(4,13,3,3); ctx.fillRect(9,13,3,3);
  ctx.fillStyle = PAL.black; px(ctx,7,6); px(ctx,10,6);
}
function drawPig(ctx) {
  ctx.fillStyle = '#f0a0a0'; ctx.fillRect(2,6,12,8); ctx.fillRect(2,4,5,4);
  ctx.fillStyle = '#d08080'; ctx.fillRect(2,4,2,2); ctx.fillRect(5,4,2,2);
  ctx.fillStyle = '#c06060'; ctx.fillRect(3,7,2,2);
  ctx.fillStyle = PAL.black; px(ctx,3,7); px(ctx,4,7);
  ctx.fillStyle = '#f0a0a0'; ctx.fillRect(13,7,2,1); ctx.fillRect(14,8,1,2);
}
function drawCow(ctx) {
  ctx.fillStyle = '#e8e8e8'; ctx.fillRect(2,5,12,9);
  ctx.fillStyle = '#202020'; px(ctx,4,5,3,3); px(ctx,10,8,3,2); px(ctx,6,11,2,2);
  ctx.fillStyle = '#e8e8e8'; ctx.fillRect(2,3,5,4);
  ctx.fillStyle = '#202020'; px(ctx,3,4); px(ctx,5,4);
  ctx.fillStyle = '#c08080'; ctx.fillRect(2,6,1,4); ctx.fillRect(13,6,1,4);
  ctx.fillStyle = '#d0c060'; px(ctx,2,2); px(ctx,6,2);
}
function drawFarmPlot(ctx) {
  ctx.fillStyle = PAL.dirt; ctx.fillRect(0,0,16,16);
  ctx.fillStyle = '#604020';
  for (let y=2;y<16;y+=4) ctx.fillRect(0,y,16,2);
  ctx.fillStyle = '#40c020';
  for (let x=2;x<16;x+=4) ctx.fillRect(x,1,2,14);
  ctx.fillStyle = '#60e040';
  for (let x=2;x<16;x+=4) px(ctx,x,0,2,1);
}
function drawHouse(ctx) {
  ctx.fillStyle = PAL.wall; ctx.fillRect(2,8,12,8);
  ctx.fillStyle = PAL.roofRed;
  for (let r=0;r<7;r++) ctx.fillRect(8-r,2+r,r*2,1);
  ctx.fillStyle = PAL.roofBrown; ctx.fillRect(6,11,4,5);
  ctx.fillStyle = '#a0d0ff'; ctx.fillRect(3,10,3,3);
  ctx.fillStyle = PAL.black; ctx.fillRect(4,10,1,3); ctx.fillRect(3,11,3,1);
}
function drawMine(ctx) {
  ctx.fillStyle = '#808080'; ctx.fillRect(2,8,12,8);
  ctx.fillStyle = '#606060';
  for (let r=0;r<5;r++) ctx.fillRect(8-r,4+r,r*2,1);
  ctx.fillStyle = PAL.black; ctx.fillRect(5,10,6,6);
  ctx.fillStyle = '#a06020'; ctx.fillRect(4,9,8,1);
  ctx.fillStyle = '#c0c0c0'; px(ctx,6,13,4,1);
  ctx.fillStyle = '#f0c000'; px(ctx,7,11,2,2);
}
function drawLumberMill(ctx) {
  ctx.fillStyle = '#a07040'; ctx.fillRect(2,7,10,9);
  ctx.fillStyle = PAL.roofBrown;
  for (let r=0;r<5;r++) ctx.fillRect(2+4-r,3+r,r*2+2,1);
  ctx.fillStyle = '#c0c0c0'; ctx.fillRect(11,5,4,8);
  ctx.fillStyle = '#808080'; ctx.fillRect(12,6,2,6);
  ctx.fillStyle = '#804020'; ctx.fillRect(1,12,4,4);
}
function drawFishingHut(ctx) {
  ctx.fillStyle = '#5080a0'; ctx.fillRect(0,10,16,6);
  ctx.fillStyle = '#6090b0'; px(ctx,1,11,4,1); px(ctx,10,12,5,1);
  ctx.fillStyle = '#804020'; ctx.fillRect(3,5,10,8);
  ctx.fillStyle = '#3060a0';
  for (let r=0;r<5;r++) ctx.fillRect(8-r,1+r,r*2,1);
  ctx.fillStyle = '#603010'; ctx.fillRect(4,10,1,6); ctx.fillRect(11,10,1,6);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(13,2,1,10);
  ctx.fillStyle = '#ff4040'; ctx.fillRect(13,12,2,2);
}
function drawMarket(ctx) {
  ctx.fillStyle = PAL.wall; ctx.fillRect(1,7,14,9);
  for (let x=0;x<16;x+=2) {
    ctx.fillStyle = x%4===0 ? '#e03020' : '#f0f0f0';
    ctx.fillRect(x,5,2,3);
  }
  ctx.fillStyle = PAL.black; ctx.fillRect(0,8,16,1);
  ctx.fillStyle = '#f0c000'; ctx.fillRect(3,10,3,2);
  ctx.fillStyle = '#40c040'; ctx.fillRect(8,10,2,2);
  ctx.fillStyle = '#c04040'; ctx.fillRect(12,10,2,2);
  ctx.fillStyle = '#603010'; ctx.fillRect(6,11,4,5);
}

// ── Map generation (C64 algorithm port) ───────────────────────────────────────
// Seedable PRNG (xorshift-like via sin hash)
function makeRng(seed) {
  let s = seed | 1;
  return function() {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    return (s >>> 0) / 0x100000000;
  };
}

function simpleHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

// Fill a circle of radius r at (cx,cy) with tile, only where mask allows
function fillCircle(map, cx, cy, r, tile, mask) {
  for (let dy = -r; dy <= r; dy++) {
    const hy = cy + dy;
    if (hy < 1 || hy >= MAP_H - 1) continue;
    const halfW = Math.round(Math.sqrt(r * r - dy * dy));
    for (let dx = -halfW; dx <= halfW; dx++) {
      const hx = cx + dx;
      if (hx < 1 || hx >= MAP_W - 1) continue;
      if (mask === null || mask.includes(map[hy][hx])) {
        map[hy][hx] = tile;
      }
    }
  }
}

// One coastal pass: convert tiles adjacent to triggers
// kind 0: deep next to land → shallow
// kind 1: deep next to shallow → TMP
// kind 2: grass/forest/hill next to water → sand
function coastPass(map, kind) {
  const copy = map.map(row => row.slice());
  for (let y = 1; y < MAP_H - 1; y++) {
    for (let x = 1; x < MAP_W - 1; x++) {
      const t = copy[y][x];
      let src = -1;
      if (kind === 0 && t === T.DEEP)   src = T.SHALLOW;
      if (kind === 1 && t === T.DEEP)   src = T.TMP;
      if (kind === 2 && (t === T.GRASS || t === T.FOREST || t === T.HILL)) src = T.SAND;
      if (src === -1) continue;

      const neighbors = [copy[y-1][x], copy[y+1][x], copy[y][x-1], copy[y][x+1]];
      let trigger = false;
      if (kind === 0) trigger = neighbors.some(n => n >= T.SAND && n !== T.TMP);
      if (kind === 1) trigger = neighbors.some(n => n === T.SHALLOW);
      if (kind === 2) trigger = neighbors.some(n => n === T.DEEP || n === T.SHALLOW || n === T.TMP);
      if (trigger) map[y][x] = src;
    }
  }
}

// "spread": random position biased toward center (matches C64's spread routine)
function spread(rng) {
  return Math.floor(rng() * 64) + Math.floor(rng() * 48) + 9;
}

// islandSeed: unique per island (use island.id so every island is different)
function generateMap(islandType, islandSeed) {
  const map = [];
  const seed = simpleHash((islandSeed || islandType) + '::archipelagod');
  const rng  = makeRng(seed);

  // Init all deep water
  for (let y = 0; y < MAP_H; y++) {
    map[y] = [];
    for (let x = 0; x < MAP_W; x++) map[y][x] = T.DEEP;
  }

  // ── 1. Big core circles of grass near centre (larger than C64 original) ──
  for (let i = 0; i < 12; i++) {
    const cx = Math.floor(rng() * 36) + 42;
    const cy = Math.floor(rng() * 36) + 42;
    const r  = Math.floor(rng() * 4) + 14;  // 14-17 (C64 was 13-14)
    fillCircle(map, cx, cy, r, T.GRASS, null);
  }

  // ── 2. 130 small blobs round the coast ──
  for (let i = 0; i < 130; i++) {
    const cx = spread(rng);
    const cy = spread(rng);
    const r  = Math.floor(rng() * 10) + 4;
    fillCircle(map, cx, cy, r, T.GRASS, null);
  }

  // ── 3. Hills + mountains ──
  for (let i = 0; i < 7; i++) {
    const cx = Math.floor(rng() * 64) + 32;
    const cy = Math.floor(rng() * 64) + 32;
    const r  = Math.floor(rng() * 4) + 3;
    fillCircle(map, cx, cy, r, T.HILL, [T.GRASS, T.FOREST]);
    fillCircle(map, cx, cy, Math.max(1, r - 2), T.MOUNTAIN, [T.HILL]);
  }

  // ── 4. Forests ──
  for (let i = 0; i < 24; i++) {
    const cx = spread(rng);
    const cy = spread(rng);
    const r  = Math.floor(rng() * 8) + 2;
    fillCircle(map, cx, cy, r, T.FOREST, [T.GRASS]);
  }

  // ── 5. Flower meadows ──
  for (let i = 0; i < 10; i++) {
    const cx = spread(rng);
    const cy = spread(rng);
    const r  = Math.floor(rng() * 2) + 1;
    fillCircle(map, cx, cy, r, T.FLOWER, [T.GRASS]);
  }

  // ── 6. Lakes (shallow water inland) ──
  for (let i = 0; i < 6; i++) {
    const cx = Math.floor(rng() * 32) + Math.floor(rng() * 32) + 36;
    const cy = Math.floor(rng() * 32) + Math.floor(rng() * 32) + 36;
    const r  = Math.floor(rng() * 4) + 1;
    fillCircle(map, cx, cy, r, T.SHALLOW, [T.GRASS, T.FOREST]);
  }

  // ── 7. Island-type terrain bonus ──
  const extra = islandType === 'FARMING' ? T.FARM :
                islandType === 'MINING'  ? T.MOUNTAIN :
                islandType === 'FOREST'  ? T.FOREST :
                islandType === 'FISHING' ? T.SHALLOW : null;
  if (extra !== null) {
    const allowFor = islandType === 'FARMING'  ? [T.GRASS] :
                     islandType === 'MINING'   ? [T.HILL] :
                     islandType === 'FOREST'   ? [T.GRASS] :
                                                 [T.SHALLOW, T.SAND];
    for (let i = 0; i < 8; i++) {
      const cx = spread(rng);
      const cy = spread(rng);
      const r  = Math.floor(rng() * 5) + 2;
      fillCircle(map, cx, cy, r, extra, allowFor);
    }
  }

  // ── 8. Three coastal passes (matches C64 genIsland exactly) ──
  coastPass(map, 0);  // sea next to land → shallow
  coastPass(map, 1);  // sea next to shallow → TMP
  coastPass(map, 2);  // land next to water → sand

  // Convert TMP → SHALLOW
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++)
      if (map[y][x] === T.TMP) map[y][x] = T.SHALLOW;

  return map;
}

// ── Render ─────────────────────────────────────────────────────────────────────
let _tc = null, _bc = null;
function getTileCanvases() {
  if (!_tc) {
    _tc = document.createElement('canvas'); _tc.width = _tc.height = 16;
    _bc = document.createElement('canvas'); _bc.width = _bc.height = 16;
  }
  return { tc: _tc.getContext('2d'), bc: _bc.getContext('2d') };
}

// viewX/Y: top-left tile to show (defaults centred on island)
function renderIslandMap(canvas, island, viewX, viewY) {
  if (!island) return;
  const vw = window.VIEW_W || VIEW_W;
  const vh = window.VIEW_H || VIEW_H;

  // Centre view on start of island if not given
  if (viewX === undefined) viewX = Math.max(0, Math.floor(MAP_W / 2) - Math.floor(vw / 2));
  if (viewY === undefined) viewY = Math.max(0, Math.floor(MAP_H / 2) - Math.floor(vh / 2));
  viewX = Math.max(0, Math.min(MAP_W - vw, viewX));
  viewY = Math.max(0, Math.min(MAP_H - vh, viewY));

  canvas.width  = vw * TILE;
  canvas.height = vh * TILE;
  const ctx = canvas.getContext('2d');

  // Generate or reuse map (keyed by island id so each island is unique)
  const mapKey = island.id || island.type;
  if (!canvas._mapData || canvas._mapKey !== mapKey) {
    canvas._mapData = generateMap(island.type, island.id);
    canvas._mapKey  = mapKey;
    canvas._mapIslandType = island.type;
  }
  const map = canvas._mapData;
  canvas._map    = map;        // keep ref for placement checks
  canvas._viewX  = viewX;
  canvas._viewY  = viewY;

  const { tc, bc } = getTileCanvases();

  // Draw terrain in view
  for (let vy = 0; vy < vh; vy++) {
    for (let vx = 0; vx < vw; vx++) {
      const mx = vx + viewX, my = vy + viewY;
      tc.clearRect(0, 0, 16, 16);
      drawTile(tc, map[my][mx]);
      ctx.drawImage(_tc, vx * TILE, vy * TILE, TILE, TILE);
    }
  }

  // Draw units visible in view
  for (const unit of (island.units || [])) {
    const { x, y, type } = unit;
    const vx = x - viewX, vy = y - viewY;
    if (vx < 0 || vy < 0 || vx >= vw || vy >= vh) continue;
    if (!isLand(map, x, y)) continue;
    // Redraw tile underneath (units layer on top)
    tc.clearRect(0, 0, 16, 16);
    drawTile(tc, map[y][x]);
    ctx.drawImage(_tc, vx * TILE, vy * TILE, TILE, TILE);
    // Draw unit sprite
    bc.clearRect(0, 0, 16, 16);
    drawUnit(bc, type);
    ctx.drawImage(_bc, vx * TILE, vy * TILE, TILE, TILE);
  }
}

// ── Mini-map (top-down overview, like C64's island map) ───────────────────────
// Draws 128×128 map into a small canvas (1px per tile or scaled)
function renderMiniMap(canvas, island) {
  if (!island || !canvas._mapData) return;
  const map = canvas._mapData;
  const mw = 128, mh = 128;
  // Use separate canvas
  const mini = canvas._miniCanvas || (canvas._miniCanvas = document.createElement('canvas'));
  mini.width = mw; mini.height = mh;
  const ctx = mini.getContext('2d');
  const img = ctx.createImageData(mw, mh);
  const colMap = {
    [T.DEEP]:     [16, 48, 160],
    [T.SHALLOW]:  [34, 85, 200],
    [T.SAND]:     [200, 160, 64],
    [T.GRASS]:    [58, 152, 40],
    [T.FOREST]:   [20, 80, 16],
    [T.HILL]:     [122, 144, 80],
    [T.MOUNTAIN]: [144, 144, 144],
    [T.FLOWER]:   [216, 64, 96],
    [T.FARM]:     [160, 120, 32],
    [T.DIRT]:     [128, 96, 64],
    [T.TMP]:      [34, 85, 200],
  };
  for (let y = 0; y < mh; y++) {
    for (let x = 0; x < mw; x++) {
      const t = map[y][x];
      const c = colMap[t] || [0, 0, 0];
      const i = (y * mw + x) * 4;
      img.data[i]   = c[0]; img.data[i+1] = c[1];
      img.data[i+2] = c[2]; img.data[i+3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return mini;  // caller draws this onto a small display canvas
}

// ── Scroll the view ───────────────────────────────────────────────────────────
function scrollView(canvas, island, dx, dy) {
  const nx = (canvas._viewX || 0) + dx;
  const ny = (canvas._viewY || 0) + dy;
  renderIslandMap(canvas, island, nx, ny);
}

// ── Placement mode ────────────────────────────────────────────────────────────
let _placementType     = null;
let _placementCallback = null;

function enterPlacementMode(canvas, unitType, onPlace) {
  _placementType     = unitType;
  _placementCallback = onPlace;
  window._placementType = unitType;   // expose for touch handler in game.js
  canvas.style.cursor = 'crosshair';
  canvas.classList.add('placement-mode');
}

function exitPlacementMode(canvas) {
  _placementType     = null;
  _placementCallback = null;
  window._placementType = null;
  canvas.style.cursor = '';
  canvas.classList.remove('placement-mode');
}

// Convert canvas click to map tile, check validity, call callback
function handleCanvasClick(canvas, island, e) {
  if (!_placementType || !_placementCallback) return;
  const rect  = canvas.getBoundingClientRect();
  const vw = window.VIEW_W || VIEW_W, vh = window.VIEW_H || VIEW_H;
  const scaleX = vw * TILE / rect.width;
  const scaleY = vh * TILE / rect.height;
  const vx = Math.floor((e.clientX - rect.left) * scaleX / TILE);
  const vy = Math.floor((e.clientY - rect.top)  * scaleY / TILE);
  const mx = vx + (canvas._viewX || 0);
  const my = vy + (canvas._viewY || 0);
  const map = canvas._map;

  if (!map || !isLand(map, mx, my)) {
    flashInvalid(canvas, vx, vy);
    return;
  }
  const occupied = (island.units || []).some(u => u.x === mx && u.y === my);
  if (occupied) { flashInvalid(canvas, vx, vy); return; }

  _placementCallback(_placementType, mx, my);
  exitPlacementMode(canvas);
}

// Hover preview with ghost unit and green/red highlight
function handleCanvasHover(canvas, island, e) {
  if (!_placementType) return;
  const rect  = canvas.getBoundingClientRect();
  const vw = window.VIEW_W || VIEW_W, vh = window.VIEW_H || VIEW_H;
  const scaleX = vw * TILE / rect.width;
  const scaleY = vh * TILE / rect.height;
  const vx = Math.floor((e.clientX - rect.left) * scaleX / TILE);
  const vy = Math.floor((e.clientY - rect.top)  * scaleY / TILE);
  const mx = vx + (canvas._viewX || 0);
  const my = vy + (canvas._viewY || 0);
  const map = canvas._map;

  renderIslandMap(canvas, island, canvas._viewX, canvas._viewY);
  const ctx = canvas.getContext('2d');
  const land = map && isLand(map, mx, my);
  const occ  = (island.units || []).some(u => u.x === mx && u.y === my);
  ctx.strokeStyle = (land && !occ) ? '#00ff88' : '#ff4040';
  ctx.lineWidth = 2;
  ctx.strokeRect(vx * TILE + 1, vy * TILE + 1, TILE - 2, TILE - 2);

  if (land && !occ) {
    const { bc } = getTileCanvases();
    bc.clearRect(0, 0, 16, 16);
    drawUnit(bc, _placementType);
    ctx.globalAlpha = 0.55;
    ctx.drawImage(_bc, vx * TILE, vy * TILE, TILE, TILE);
    ctx.globalAlpha = 1;
  }
}

function flashInvalid(canvas, vx, vy) {
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(255,0,0,0.4)';
  ctx.fillRect(vx * TILE, vy * TILE, TILE, TILE);
  setTimeout(() => {
    if (window._currentIsland)
      renderIslandMap(canvas, window._currentIsland, canvas._viewX, canvas._viewY);
  }, 300);
}

// ── Zoom support ──────────────────────────────────────────────────────────────
// TILE is fixed (we re-render at different view sizes instead of CSS scaling)
// zoomLevel: 1 = normal (32×24 tiles), 2 = zoomed in (16×12 tiles)
const ZOOM_CONFIGS = [
  { vw: 48, vh: 32 },  // 0: zoomed out
  { vw: 32, vh: 24 },  // 1: normal
  { vw: 16, vh: 12 },  // 2: zoomed in
];
let _zoomLevel = 1;

function setZoom(canvas, island, level) {
  _zoomLevel = Math.max(0, Math.min(ZOOM_CONFIGS.length - 1, level));
  const cfg = ZOOM_CONFIGS[_zoomLevel];
  // Update module-level VIEW_W/H
  window.VIEW_W = cfg.vw;
  window.VIEW_H = cfg.vh;
  // Re-centre view
  const vx = Math.max(0, Math.min(MAP_W - cfg.vw, (canvas._viewX || 0)));
  const vy = Math.max(0, Math.min(MAP_H - cfg.vh, (canvas._viewY || 0)));
  renderIslandMap(canvas, island, vx, vy);
}

function setupZoom(canvas, island) {
  // Mouse wheel zoom
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    setZoom(canvas, island, _zoomLevel + (e.deltaY < 0 ? 1 : -1));
  }, { passive: false });

  // Pinch-to-zoom
  let _lastDist = null;
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) _lastDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY);
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 2 || _lastDist === null) return;
    e.preventDefault();
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY);
    if (dist > _lastDist + 20)      { setZoom(canvas, island, _zoomLevel + 1); _lastDist = dist; }
    else if (dist < _lastDist - 20) { setZoom(canvas, island, _zoomLevel - 1); _lastDist = dist; }
  }, { passive: false });
  canvas.addEventListener('touchend', () => { _lastDist = null; });
}

// ── Tap-to-inspect (mobile) ───────────────────────────────────────────────────
// Returns the unit at the tapped canvas position, or null
function unitAtCanvasPoint(canvas, island, clientX, clientY) {
  const rect   = canvas.getBoundingClientRect();
  const vw = window.VIEW_W || VIEW_W, vh = window.VIEW_H || VIEW_H;
  const scaleX = vw * TILE / rect.width;
  const scaleY = vh * TILE / rect.height;
  const vx = Math.floor((clientX - rect.left) * scaleX / TILE);
  const vy = Math.floor((clientY - rect.top)  * scaleY / TILE);
  const mx = vx + (canvas._viewX || 0);
  const my = vy + (canvas._viewY || 0);
  return (island?.units || []).find(u => u.x === mx && u.y === my) || null;
}

// ── Exports ───────────────────────────────────────────────────────────────────
window.renderIslandMap    = renderIslandMap;
window.renderMiniMap      = renderMiniMap;
window.scrollView         = scrollView;
window.setupZoom          = setupZoom;
window.setZoom            = setZoom;
window.enterPlacementMode = enterPlacementMode;
window.exitPlacementMode  = exitPlacementMode;
window.handleCanvasClick  = handleCanvasClick;
window.handleCanvasHover  = handleCanvasHover;
window.unitAtCanvasPoint  = unitAtCanvasPoint;
window.MAP_W   = MAP_W;
window.MAP_H   = MAP_H;
window.VIEW_W  = VIEW_W;
window.VIEW_H  = VIEW_H;
window.TILE    = TILE;
window.isLand  = isLand;
