// Archipelagod — tile-based island map renderer + placement mode
// C64-inspired 16×16 pixel tiles on HTML5 canvas

const TILE   = 24;   // screen pixels per tile
const MAP_W  = 24;
const MAP_H  = 20;

// Tile type IDs
const T = { DEEP:0, SHALLOW:1, SAND:2, GRASS:3, DARK:4, FOREST:5, MOUNTAIN:6, FARM:7, DIRT:8 };

// C64-ish palette
const PAL = {
  deepWater: '#0040a0', shallows: '#2060c0',
  sand: '#c8a040', grass: '#40a030', darkGrass: '#208020',
  forest: '#145010', mountain: '#808080', snowPeak: '#d8d8d8',
  farmland: '#a07820', dirt: '#806040',
  black: '#000000', white: '#ffffff',
  roofRed: '#c03020', roofBrown: '#603010',
  wall: '#c0a060', wallDark: '#907040',
};

// ── Tile painters ─────────────────────────────────────────────────────────────
function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w || 1, h || 1);
}

function drawTile(ctx, type) {
  switch (type) {
    case T.DEEP:     drawDeep(ctx);     break;
    case T.SHALLOW:  drawShallow(ctx);  break;
    case T.SAND:     drawSand(ctx);     break;
    case T.GRASS:    drawGrass(ctx);    break;
    case T.DARK:     drawDark(ctx);     break;
    case T.FOREST:   drawForest(ctx);   break;
    case T.MOUNTAIN: drawMountain(ctx); break;
    case T.FARM:     drawFarmTile(ctx); break;
    case T.DIRT:     drawDirt(ctx);     break;
  }
}
function drawDeep(ctx) {
  ctx.fillStyle = PAL.deepWater; ctx.fillRect(0,0,16,16);
  ctx.fillStyle = '#3070c8';
  for (let y=2;y<16;y+=5) { ctx.fillRect(1,y,5,1); ctx.fillRect(9,y+2,5,1); }
}
function drawShallow(ctx) {
  ctx.fillStyle = PAL.shallows; ctx.fillRect(0,0,16,16);
  ctx.fillStyle = '#4080d8';
  for (let y=1;y<16;y+=4) { ctx.fillRect(2,y,4,1); ctx.fillRect(10,y+2,4,1); }
}
function drawSand(ctx) {
  ctx.fillStyle = PAL.sand; ctx.fillRect(0,0,16,16);
  ctx.fillStyle = '#b89030';
  px(ctx,3,3); px(ctx,9,7); px(ctx,5,11); px(ctx,13,2);
}
function drawGrass(ctx) {
  ctx.fillStyle = PAL.grass; ctx.fillRect(0,0,16,16);
  ctx.fillStyle = PAL.darkGrass;
  px(ctx,2,2,1,2); px(ctx,8,5,1,2); px(ctx,13,1,1,2); px(ctx,5,10,1,2); px(ctx,11,13,1,2);
}
function drawDark(ctx) {
  ctx.fillStyle = PAL.darkGrass; ctx.fillRect(0,0,16,16);
  ctx.fillStyle = '#306820';
  px(ctx,1,1,2,1); px(ctx,7,6,2,1); px(ctx,12,3,2,1); px(ctx,4,11,2,1);
}
function drawForest(ctx) {
  ctx.fillStyle = PAL.darkGrass; ctx.fillRect(0,0,16,16);
  ctx.fillStyle = PAL.forest; ctx.fillRect(2,1,12,8);
  ctx.fillStyle = '#1a6014'; ctx.fillRect(4,3,8,4);
  ctx.fillStyle = PAL.roofBrown; ctx.fillRect(6,9,4,5);
}
function drawMountain(ctx) {
  ctx.fillStyle = '#606060'; ctx.fillRect(0,0,16,16);
  ctx.fillStyle = PAL.mountain;
  for (let r=0;r<8;r++) ctx.fillRect(8-r,r,r*2,1);
  ctx.fillStyle = PAL.snowPeak; ctx.fillRect(7,0,2,3); ctx.fillRect(6,2,4,1);
}
function drawFarmTile(ctx) {
  ctx.fillStyle = PAL.farmland; ctx.fillRect(0,0,16,16);
  ctx.fillStyle = PAL.dirt;
  for (let y=1;y<16;y+=3) ctx.fillRect(0,y,16,1);
  ctx.fillStyle = '#50c030';
  for (let x=1;x<16;x+=3) ctx.fillRect(x,0,1,16);
}
function drawDirt(ctx) {
  ctx.fillStyle = PAL.dirt; ctx.fillRect(0,0,16,16);
  ctx.fillStyle = '#604830';
  px(ctx,4,4,2,1); px(ctx,10,8,2,1); px(ctx,6,12,2,1);
}

// ── Unit / building sprites ──────────────────────────────────────────────────
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
  // body
  ctx.fillStyle = '#c08060'; ctx.fillRect(5,4,6,4);  // head
  ctx.fillStyle = '#4060c0'; ctx.fillRect(4,8,8,5);  // shirt
  ctx.fillStyle = '#303080'; ctx.fillRect(4,13,3,3); ctx.fillRect(9,13,3,3); // legs
  // face dot
  ctx.fillStyle = PAL.black; px(ctx,7,6); px(ctx,10,6);
}
function drawPig(ctx) {
  ctx.fillStyle = '#f0a0a0'; ctx.fillRect(2,6,12,8);  // body
  ctx.fillRect(2,4,5,4);  // head
  ctx.fillStyle = '#d08080';
  ctx.fillRect(2,4,2,2);  // ear L
  ctx.fillRect(5,4,2,2);  // ear R
  ctx.fillStyle = '#c06060'; ctx.fillRect(3,7,2,2);  // snout
  ctx.fillStyle = PAL.black; px(ctx,3,7); px(ctx,4,7);  // nostrils
  // tail
  ctx.fillStyle = '#f0a0a0'; ctx.fillRect(13,7,2,1); ctx.fillRect(14,8,1,2);
}
function drawCow(ctx) {
  ctx.fillStyle = '#e8e8e8'; ctx.fillRect(2,5,12,9); // body
  ctx.fillStyle = '#202020';
  px(ctx,4,5,3,3); px(ctx,10,8,3,2); px(ctx,6,11,2,2); // spots
  ctx.fillStyle = '#e8e8e8'; ctx.fillRect(2,3,5,4);  // head
  ctx.fillStyle = '#202020'; px(ctx,3,4); px(ctx,5,4); // eyes
  ctx.fillStyle = '#c08080'; ctx.fillRect(2,6,1,4); ctx.fillRect(13,6,1,4); // legs
  // horns
  ctx.fillStyle = '#d0c060'; px(ctx,2,2); px(ctx,6,2);
}
function drawFarmPlot(ctx) {
  ctx.fillStyle = PAL.dirt; ctx.fillRect(0,0,16,16);
  ctx.fillStyle = '#604020';
  for (let y=2;y<16;y+=4) ctx.fillRect(0,y,16,2);
  // green shoots
  ctx.fillStyle = '#40c020';
  for (let x=2;x<16;x+=4) ctx.fillRect(x,1,2,14);
  ctx.fillStyle = '#60e040';
  for (let x=2;x<16;x+=4) px(ctx,x,0,2,1);
}
function drawHouse(ctx) {
  ctx.fillStyle = PAL.wall; ctx.fillRect(2,8,12,8);
  ctx.fillStyle = PAL.roofRed;
  for (let r=0;r<7;r++) ctx.fillRect(8-r,2+r,r*2,1);
  ctx.fillStyle = PAL.roofBrown; ctx.fillRect(6,11,4,5);  // door
  ctx.fillStyle = '#a0d0ff'; ctx.fillRect(3,10,3,3);      // window
  ctx.fillStyle = PAL.black; ctx.fillRect(4,10,1,3); ctx.fillRect(3,11,3,1);
}
function drawMine(ctx) {
  ctx.fillStyle = '#808080'; ctx.fillRect(2,8,12,8);
  ctx.fillStyle = '#606060';
  for (let r=0;r<5;r++) ctx.fillRect(8-r,4+r,r*2,1);
  ctx.fillStyle = PAL.black; ctx.fillRect(5,10,6,6);     // entrance
  ctx.fillStyle = '#a06020'; ctx.fillRect(4,9,8,1);      // beam
  ctx.fillStyle = '#c0c0c0'; px(ctx,6,13,4,1);           // tracks
  ctx.fillStyle = '#f0c000'; px(ctx,7,11,2,2);           // ore glint
}
function drawLumberMill(ctx) {
  ctx.fillStyle = '#a07040'; ctx.fillRect(2,7,10,9);
  ctx.fillStyle = PAL.roofBrown;
  for (let r=0;r<5;r++) ctx.fillRect(2+4-r,3+r,(r)*2+2,1);
  ctx.fillStyle = '#c0c0c0'; ctx.fillRect(11,5,4,8);     // saw blade area
  ctx.fillStyle = '#808080'; ctx.fillRect(12,6,2,6);
  ctx.fillStyle = '#804020'; ctx.fillRect(1,12,4,4);     // log pile
}
function drawFishingHut(ctx) {
  ctx.fillStyle = '#5080a0'; ctx.fillRect(0,10,16,6);    // water
  ctx.fillStyle = '#6090b0'; px(ctx,1,11,4,1); px(ctx,10,12,5,1);
  ctx.fillStyle = '#804020'; ctx.fillRect(3,5,10,8);     // hut
  ctx.fillStyle = '#3060a0';
  for (let r=0;r<5;r++) ctx.fillRect(8-r,1+r,r*2,1);   // roof
  ctx.fillStyle = '#603010'; ctx.fillRect(4,10,1,6); ctx.fillRect(11,10,1,6); // stilts
  ctx.fillStyle = '#ffffff'; ctx.fillRect(13,2,1,10);    // line
  ctx.fillStyle = '#ff4040'; ctx.fillRect(13,12,2,2);    // float
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

// ── Map generation ───────────────────────────────────────────────────────────
function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffffff;
  return h;
}
function pseudoNoise(x, y, seed) {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 0.001) * 43758.5453;
  return n - Math.floor(n);
}

function generateMap(islandType) {
  const map = [];
  const seed = simpleHash(islandType);
  const cx = MAP_W / 2, cy = MAP_H / 2;
  for (let y = 0; y < MAP_H; y++) {
    map[y] = [];
    for (let x = 0; x < MAP_W; x++) {
      const dx = (x - cx) / (MAP_W * 0.35);
      const dy = (y - cy) / (MAP_H * 0.35);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const noise = pseudoNoise(x, y, seed) * 0.3;
      const h = 1 - dist + noise;

      if      (h > 0.7)  map[y][x] = islandType === 'MINING'  ? T.MOUNTAIN : T.DARK;
      else if (h > 0.5)  map[y][x] = islandType === 'FOREST'  ? T.FOREST   : T.GRASS;
      else if (h > 0.35) map[y][x] = islandType === 'FARMING' ? T.FARM     : T.GRASS;
      else if (h > 0.25) map[y][x] = T.SAND;
      else if (h > 0.15) map[y][x] = T.SHALLOW;
      else               map[y][x] = T.DEEP;
    }
  }
  return map;
}

function isLand(map, x, y) {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return false;
  return map[y][x] >= T.SAND;
}

// ── Render ───────────────────────────────────────────────────────────────────
// Module-level canvases for tile/sprite drawing
let _tc = null, _bc = null;
function getTileCanvases() {
  if (!_tc) {
    _tc = document.createElement('canvas'); _tc.width = _tc.height = 16;
    _bc = document.createElement('canvas'); _bc.width = _bc.height = 16;
  }
  return { tc: _tc.getContext('2d'), bc: _bc.getContext('2d') };
}

function renderIslandMap(canvas, island) {
  if (!island) return;
  canvas.width  = MAP_W * TILE;
  canvas.height = MAP_H * TILE;
  const ctx = canvas.getContext('2d');
  const map = generateMap(island.type);
  const { tc, bc } = getTileCanvases();

  // Draw terrain
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      tc.clearRect(0, 0, 16, 16);
      drawTile(tc, map[y][x]);
      ctx.drawImage(_tc, x * TILE, y * TILE, TILE, TILE);
    }
  }

  // Draw units
  for (const unit of (island.units || [])) {
    const { x, y, type } = unit;
    if (!isLand(map, x, y)) continue;
    // Redraw tile underneath
    tc.clearRect(0, 0, 16, 16);
    drawTile(tc, map[y][x]);
    ctx.drawImage(_tc, x * TILE, y * TILE, TILE, TILE);
    // Draw unit on top
    bc.clearRect(0, 0, 16, 16);
    drawUnit(bc, type);
    ctx.drawImage(_bc, x * TILE, y * TILE, TILE, TILE);
  }

  // Store map on canvas for placement mode
  canvas._map = map;
}

// ── Placement mode ───────────────────────────────────────────────────────────
let _placementType = null;
let _placementCallback = null;

function enterPlacementMode(canvas, unitType, onPlace) {
  _placementType    = unitType;
  _placementCallback = onPlace;
  canvas.style.cursor = 'crosshair';
  canvas.classList.add('placement-mode');
}

function exitPlacementMode(canvas) {
  _placementType    = null;
  _placementCallback = null;
  canvas.style.cursor = '';
  canvas.classList.remove('placement-mode');
  // Clear hover overlay
  const ctx = canvas.getContext('2d');
  // Will be redrawn on next renderIslandMap call
}

function handleCanvasClick(canvas, island, e) {
  if (!_placementType || !_placementCallback) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = MAP_W * TILE / rect.width;
  const scaleY = MAP_H * TILE / rect.height;
  const px = Math.floor((e.clientX - rect.left) * scaleX / TILE);
  const py = Math.floor((e.clientY - rect.top)  * scaleY / TILE);
  const map = canvas._map;

  if (!map || !isLand(map, px, py)) {
    // Flash red on water click
    flashInvalid(canvas, px, py);
    return;
  }

  // Check not already occupied
  const occupied = (island.units || []).some(u => u.x === px && u.y === py);
  if (occupied) {
    flashInvalid(canvas, px, py);
    return;
  }

  _placementCallback(_placementType, px, py);
  exitPlacementMode(canvas);
}

function handleCanvasHover(canvas, island, e) {
  if (!_placementType) return;
  const rect  = canvas.getBoundingClientRect();
  const scaleX = MAP_W * TILE / rect.width;
  const scaleY = MAP_H * TILE / rect.height;
  const tx = Math.floor((e.clientX - rect.left) * scaleX / TILE);
  const ty = Math.floor((e.clientY - rect.top)  * scaleY / TILE);
  const map = canvas._map;

  // Re-render island then draw hover square
  renderIslandMap(canvas, island);
  const ctx = canvas.getContext('2d');
  const land = map && isLand(map, tx, ty);
  const occ  = (island.units || []).some(u => u.x === tx && u.y === ty);
  ctx.strokeStyle = (land && !occ) ? '#00ff88' : '#ff4040';
  ctx.lineWidth = 2;
  ctx.strokeRect(tx * TILE + 1, ty * TILE + 1, TILE - 2, TILE - 2);

  // Draw ghost unit
  if (land && !occ) {
    const { bc } = getTileCanvases();
    bc.clearRect(0, 0, 16, 16);
    drawUnit(bc, _placementType);
    ctx.globalAlpha = 0.55;
    ctx.drawImage(_bc, tx * TILE, ty * TILE, TILE, TILE);
    ctx.globalAlpha = 1;
  }
}

function flashInvalid(canvas, tx, ty) {
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(255,0,0,0.4)';
  ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
  setTimeout(() => renderIslandMap(canvas, window._currentIsland), 300);
}

// ── Exports ──────────────────────────────────────────────────────────────────
window.renderIslandMap   = renderIslandMap;
window.enterPlacementMode = enterPlacementMode;
window.exitPlacementMode  = exitPlacementMode;
window.handleCanvasClick  = handleCanvasClick;
window.handleCanvasHover  = handleCanvasHover;
window.MAP_W = MAP_W;
window.MAP_H = MAP_H;
window.TILE  = TILE;
