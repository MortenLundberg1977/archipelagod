// Archipelagod — tile-based island map renderer
// C64-inspired 16x16 pixel tiles on an HTML5 canvas

const TILE = 24; // pixel size per tile on screen (16px art, scaled up)
const MAP_W = 24; // tiles wide
const MAP_H = 20; // tiles tall

// C64-inspired palette
const PAL = {
  deepWater:  '#0040a0',
  shallows:   '#2060c0',
  sand:       '#c8a040',
  grass:      '#40a030',
  darkGrass:  '#208020',
  forest:     '#145010',
  mountain:   '#808080',
  snowPeak:   '#d8d8d8',
  farmland:   '#a07820',
  dirt:       '#806040',
  black:      '#000000',
  white:      '#ffffff',
  roofRed:    '#c03020',
  roofBrown:  '#603010',
  wall:       '#c0a060',
  smoke:      '#a0a0b0',
};

// Tile types
const T = {
  DEEP:     0,
  SHALLOW:  1,
  SAND:     2,
  GRASS:    3,
  DARK:     4,
  FOREST:   5,
  MOUNTAIN: 6,
  FARM:     7,
  DIRT:     8,
};

// --- Tile drawers (16×16 into a canvas context, already translated) ---
function drawTile(ctx, type) {
  switch(type) {
    case T.DEEP:     drawDeepWater(ctx);  break;
    case T.SHALLOW:  drawShallows(ctx);   break;
    case T.SAND:     drawSand(ctx);       break;
    case T.GRASS:    drawGrass(ctx);      break;
    case T.DARK:     drawDarkGrass(ctx);  break;
    case T.FOREST:   drawForest(ctx);     break;
    case T.MOUNTAIN: drawMountain(ctx);   break;
    case T.FARM:     drawFarm(ctx);       break;
    case T.DIRT:     drawDirt(ctx);       break;
  }
}

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w || 1, h || 1);
}

function drawDeepWater(ctx) {
  ctx.fillStyle = PAL.deepWater; ctx.fillRect(0,0,16,16);
  // wave lines
  ctx.fillStyle = '#3070c8';
  for(let y=2;y<16;y+=5){ ctx.fillRect(1,y,5,1); ctx.fillRect(9,y+2,5,1); }
}
function drawShallows(ctx) {
  ctx.fillStyle = PAL.shallows; ctx.fillRect(0,0,16,16);
  ctx.fillStyle = '#4080d8';
  for(let y=1;y<16;y+=4){ ctx.fillRect(2,y,4,1); ctx.fillRect(10,y+2,4,1); }
}
function drawSand(ctx) {
  ctx.fillStyle = PAL.sand; ctx.fillRect(0,0,16,16);
  ctx.fillStyle = '#b89030';
  px(ctx,3,3,1,1); px(ctx,9,7,1,1); px(ctx,5,11,1,1); px(ctx,13,2,1,1);
}
function drawGrass(ctx) {
  ctx.fillStyle = PAL.grass; ctx.fillRect(0,0,16,16);
  ctx.fillStyle = PAL.darkGrass;
  px(ctx,2,2,1,2); px(ctx,8,5,1,2); px(ctx,13,1,1,2); px(ctx,5,10,1,2); px(ctx,11,13,1,2);
}
function drawDarkGrass(ctx) {
  ctx.fillStyle = PAL.darkGrass; ctx.fillRect(0,0,16,16);
  ctx.fillStyle = '#306820';
  px(ctx,1,1,2,1); px(ctx,7,6,2,1); px(ctx,12,3,2,1); px(ctx,4,11,2,1);
}
function drawForest(ctx) {
  ctx.fillStyle = PAL.darkGrass; ctx.fillRect(0,0,16,16);
  // tree canopy
  ctx.fillStyle = PAL.forest;
  ctx.fillRect(2,1,12,8);
  ctx.fillStyle = '#1a6014';
  ctx.fillRect(4,3,8,4);
  // trunk
  ctx.fillStyle = PAL.roofBrown;
  ctx.fillRect(6,9,4,5);
}
function drawMountain(ctx) {
  ctx.fillStyle = '#606060'; ctx.fillRect(0,0,16,16);
  // peak
  ctx.fillStyle = PAL.mountain;
  // triangle shape
  for(let r=0;r<8;r++){ ctx.fillRect(8-r,r,r*2,1); }
  ctx.fillStyle = PAL.snowPeak;
  ctx.fillRect(7,0,2,3); ctx.fillRect(6,2,4,1);
}
function drawFarm(ctx) {
  ctx.fillStyle = PAL.farmland; ctx.fillRect(0,0,16,16);
  // furrow rows
  ctx.fillStyle = PAL.dirt;
  for(let y=1;y<16;y+=3){ ctx.fillRect(0,y,16,1); }
  // green shoots
  ctx.fillStyle = '#50c030';
  for(let x=1;x<16;x+=3){ ctx.fillRect(x,0,1,16); }
}
function drawDirt(ctx) {
  ctx.fillStyle = PAL.dirt; ctx.fillRect(0,0,16,16);
  ctx.fillStyle = '#604830';
  px(ctx,4,4,2,1); px(ctx,10,8,2,1); px(ctx,6,12,2,1);
}

// --- Building sprites ---
function drawBuilding(ctx, type) {
  switch(type) {
    case 'FARM':        drawFarmBuilding(ctx);   break;
    case 'MINE':        drawMineBuilding(ctx);   break;
    case 'LUMBER_MILL': drawLumberMill(ctx);     break;
    case 'FISHING_HUT': drawFishingHut(ctx);     break;
    case 'HOUSE':       drawHouse(ctx);          break;
    case 'MARKET':      drawMarket(ctx);         break;
  }
}

function drawHouse(ctx) {
  // walls
  ctx.fillStyle = PAL.wall; ctx.fillRect(2,8,12,8);
  // roof
  ctx.fillStyle = PAL.roofRed;
  for(let r=0;r<7;r++){ ctx.fillRect(8-r,2+r,r*2,1); }
  // door
  ctx.fillStyle = PAL.roofBrown; ctx.fillRect(6,11,4,5);
  // window
  ctx.fillStyle = '#a0d0ff'; ctx.fillRect(3,10,3,3);
  ctx.fillStyle = PAL.black; ctx.fillRect(4,10,1,3); ctx.fillRect(3,11,3,1);
}
function drawFarmBuilding(ctx) {
  // barn shape
  ctx.fillStyle = '#c04010'; ctx.fillRect(1,6,14,10);
  ctx.fillStyle = '#a03008';
  for(let r=0;r<6;r++){ ctx.fillRect(8-r,1+r,r*2,1); }
  ctx.fillStyle = PAL.black; ctx.fillRect(5,10,6,6); // door
  ctx.fillStyle = '#f0c000'; ctx.fillRect(2,8,3,3); // hay bale
}
function drawMineBuilding(ctx) {
  ctx.fillStyle = '#808080'; ctx.fillRect(2,8,12,8);
  ctx.fillStyle = '#606060';
  for(let r=0;r<5;r++){ ctx.fillRect(8-r,4+r,r*2,1); }
  // mine entrance
  ctx.fillStyle = PAL.black; ctx.fillRect(5,10,6,6);
  ctx.fillStyle = '#a06020'; ctx.fillRect(4,9,8,1); // beam
  // cart tracks
  ctx.fillStyle = '#604020'; ctx.fillRect(6,14,1,2); ctx.fillRect(9,14,1,2);
}
function drawLumberMill(ctx) {
  ctx.fillStyle = '#a07040'; ctx.fillRect(2,7,10,9);
  // saw wheel outline
  ctx.fillStyle = '#c0c0c0'; ctx.fillRect(11,5,4,8);
  ctx.fillStyle = '#808080'; ctx.fillRect(12,6,2,6);
  // log pile
  ctx.fillStyle = '#804020'; ctx.fillRect(1,12,4,4);
  ctx.fillStyle = '#603010'; ctx.fillRect(2,13,2,2);
  // roof
  ctx.fillStyle = PAL.roofBrown;
  for(let r=0;r<5;r++){ ctx.fillRect(2+4-r,3+r,(r)*2+2,1); }
}
function drawFishingHut(ctx) {
  ctx.fillStyle = '#5080a0'; ctx.fillRect(0,10,16,6); // water
  ctx.fillStyle = '#6090b0';
  ctx.fillRect(1,11,4,1); ctx.fillRect(10,12,5,1);
  // hut on stilts
  ctx.fillStyle = '#804020'; ctx.fillRect(3,5,10,8);
  ctx.fillStyle = '#3060a0';
  for(let r=0;r<5;r++){ ctx.fillRect(8-r,1+r,r*2,1); }
  // stilts
  ctx.fillStyle = '#603010'; ctx.fillRect(4,10,1,6); ctx.fillRect(11,10,1,6);
  // fishing line
  ctx.fillStyle = '#ffffff'; ctx.fillRect(13,2,1,10);
  ctx.fillStyle = '#ff4040'; ctx.fillRect(13,12,2,2); // float
}
function drawMarket(ctx) {
  ctx.fillStyle = PAL.wall; ctx.fillRect(1,7,14,9);
  // awning stripes
  for(let x=0;x<16;x+=2){
    ctx.fillStyle = x%4===0 ? '#e03020' : '#f0f0f0';
    ctx.fillRect(x,5,2,3);
  }
  ctx.fillStyle = PAL.black; ctx.fillRect(0,8,16,1); // awning bottom
  // stall items
  ctx.fillStyle = '#f0c000'; ctx.fillRect(3,10,3,2);
  ctx.fillStyle = '#40c040'; ctx.fillRect(8,10,2,2);
  ctx.fillStyle = '#c04040'; ctx.fillRect(12,10,2,2);
  // door
  ctx.fillStyle = '#603010'; ctx.fillRect(6,11,4,5);
}

// --- Map generation ---
function generateMap(islandType) {
  const map = [];
  for(let y=0;y<MAP_H;y++){
    map[y] = [];
    for(let x=0;x<MAP_W;x++){
      map[y][x] = T.DEEP;
    }
  }

  // Simple island shape using distance from center + noise
  const cx = MAP_W/2, cy = MAP_H/2;
  const seed = simpleHash(islandType);

  for(let y=0;y<MAP_H;y++){
    for(let x=0;x<MAP_W;x++){
      const dx = (x - cx) / (MAP_W * 0.35);
      const dy = (y - cy) / (MAP_H * 0.35);
      const dist = Math.sqrt(dx*dx + dy*dy);
      const noise = pseudoNoise(x, y, seed) * 0.3;
      const h = 1 - dist + noise;

      if      (h > 0.7) map[y][x] = islandType === 'MOUNTAIN' ? T.MOUNTAIN : T.DARK;
      else if (h > 0.5) map[y][x] = islandType === 'FOREST'   ? T.FOREST   : T.GRASS;
      else if (h > 0.35) map[y][x] = islandType === 'FARMING' ? T.FARM     : T.GRASS;
      else if (h > 0.25) map[y][x] = T.SAND;
      else if (h > 0.15) map[y][x] = T.SHALLOW;
      else               map[y][x] = T.DEEP;
    }
  }
  return map;
}

function simpleHash(str) {
  let h = 0;
  for(let i=0;i<str.length;i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffffff;
  return h;
}

function pseudoNoise(x, y, seed) {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 0.001) * 43758.5453;
  return n - Math.floor(n);
}

// Building placement: pick land tiles
function placeBuildingsOnMap(map, buildings) {
  const placements = []; // {x, y, type}
  const used = new Set();

  // Fixed positions for different buildings
  const positions = [
    {x:12,y:9}, {x:14,y:11}, {x:10,y:13}, {x:8,y:7},
    {x:15,y:8}, {x:13,y:14}, {x:9,y:11}, {x:16,y:12},
  ];
  let posIdx = 0;

  for(const [type, count] of Object.entries(buildings || {})){
    for(let i=0;i<count && posIdx<positions.length;i++){
      const {x,y} = positions[posIdx++];
      // Find nearest land tile
      const land = findNearestLand(map, x, y);
      if(land && !used.has(`${land.x},${land.y}`)){
        used.add(`${land.x},${land.y}`);
        placements.push({x: land.x, y: land.y, type});
      }
    }
  }
  return placements;
}

function findNearestLand(map, cx, cy) {
  for(let r=0;r<5;r++){
    for(let dy=-r;dy<=r;dy++){
      for(let dx=-r;dx<=r;dx++){
        const x = cx+dx, y = cy+dy;
        if(x>=0 && y>=0 && x<MAP_W && y<MAP_H){
          const t = map[y][x];
          if(t===T.GRASS||t===T.DARK||t===T.FARM||t===T.DIRT) return {x,y};
        }
      }
    }
  }
  return null;
}

// --- Main render function ---
function renderIslandMap(canvas, island) {
  if (!island) return;
  const ctx = canvas.getContext('2d');
  canvas.width  = MAP_W * TILE;
  canvas.height = MAP_H * TILE;

  const map = generateMap(island.type);
  const buildings = placeBuildingsOnMap(map, island.buildings);

  // Off-screen tile canvas (16×16)
  const tileCanvas = document.createElement('canvas');
  tileCanvas.width = tileCanvas.height = 16;
  const tc = tileCanvas.getContext('2d');

  // Draw tiles
  for(let y=0;y<MAP_H;y++){
    for(let x=0;x<MAP_W;x++){
      tc.clearRect(0,0,16,16);
      drawTile(tc, map[y][x]);
      ctx.drawImage(tileCanvas, x*TILE, y*TILE, TILE, TILE);
    }
  }

  // Draw buildings
  const bCanvas = document.createElement('canvas');
  bCanvas.width = bCanvas.height = 16;
  const bc = bCanvas.getContext('2d');

  for(const {x, y, type} of buildings){
    bc.clearRect(0,0,16,16);
    // Re-draw tile underneath first
    tc.clearRect(0,0,16,16);
    drawTile(tc, map[y][x]);
    ctx.drawImage(tileCanvas, x*TILE, y*TILE, TILE, TILE);
    // Draw building on top
    drawBuilding(bc, type);
    ctx.drawImage(bCanvas, x*TILE, y*TILE, TILE, TILE);
  }

  // Tick animation: simple shimmer on water
  animateWater(ctx, map);
}

let waterFrame = 0;
function animateWater(ctx, map) {
  // subtle water glint every few seconds
  waterFrame++;
}

// Export
window.renderIslandMap = renderIslandMap;
