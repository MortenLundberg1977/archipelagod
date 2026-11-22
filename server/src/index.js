const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const path     = require('path');

const { EVENTS, TICK_INTERVAL_MS } = require('../../shared/constants');
const {
  getPrivateIsland, getPublicIsland, getWorldState,
  joinGame, playerDisconnect, getPlayerIsland,
  handlePlaceUnit, handleTradeOffer, handleTradeAccept,
  tickAll,
} = require('./gameState');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Serve static client files in production
app.use(express.static(path.join(__dirname, '../../client')));
app.get('/health', (_, res) => res.json({ ok: true, players: io.engine.clientsCount }));

// --- Socket.io ---
io.on('connection', (socket) => {
  console.log(`[+] ${socket.id} connected`);

  socket.on(EVENTS.JOIN_GAME, ({ name }, cb) => {
    const cleanName = (name || '').trim().slice(0, 20) || 'Islander';
    const { island, rejoined } = joinGame(socket.id, cleanName);

    socket.join('world');
    console.log(`[~] ${cleanName} ${rejoined ? 're' : ''}joined → island ${island.id}`);

    // Send this player their full island + the world
    cb?.({ ok: true, island: getPrivateIsland(island), world: getWorldState(), rejoined });

    // Tell everyone else a new island appeared
    socket.to('world').emit(EVENTS.WORLD_UPDATE, getWorldState());
  });

  socket.on(EVENTS.PLACE_UNIT, ({ unitType, x, y }, cb) => {
    const result = handlePlaceUnit(socket.id, { unitType, x, y });
    if (result.ok) {
      const island = getPlayerIsland(socket.id);
      cb?.({ ok: true, island: getPrivateIsland(island) });
      socket.to('world').emit(EVENTS.WORLD_UPDATE, getWorldState());
    } else {
      cb?.({ ok: false, error: result.error });
    }
  });

  socket.on(EVENTS.TRADE_OFFER, (params, cb) => {
    const result = handleTradeOffer(socket.id, params);
    if (result.ok) {
      io.to('world').emit(EVENTS.WORLD_UPDATE, getWorldState());
      cb?.({ ok: true, offer: result.offer });
    } else {
      cb?.({ ok: false, error: result.error });
    }
  });

  socket.on(EVENTS.TRADE_ACCEPT, ({ offerId }, cb) => {
    const result = handleTradeAccept(socket.id, offerId);
    if (result.ok) {
      io.to('world').emit(EVENTS.WORLD_UPDATE, getWorldState());
      cb?.({ ok: true });
    } else {
      cb?.({ ok: false, error: result.error });
    }
  });

  socket.on(EVENTS.CHAT, ({ message }) => {
    const island = getPlayerIsland(socket.id);
    if (!island) return;
    const clean = (message || '').trim().slice(0, 200);
    if (!clean) return;
    io.to('world').emit(EVENTS.CHAT, {
      from:      island.playerName,
      islandId:  island.id,
      message:   clean,
      timestamp: Date.now(),
    });
  });

  socket.on('disconnect', () => {
    console.log(`[-] ${socket.id} disconnected`);
    playerDisconnect(socket.id);
    io.to('world').emit(EVENTS.WORLD_UPDATE, getWorldState());
  });
});

// --- Game tick ---
setInterval(() => {
  tickAll();
  // Push island updates to each connected player
  for (const [socketId, player] of require('./gameState').players.entries()) {
    const island = require('./gameState').islands.get(player.islandId);
    if (island) {
      io.to(socketId).emit(EVENTS.ISLAND_UPDATE, getPrivateIsland(island));
    }
  }
}, TICK_INTERVAL_MS);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Archipelagod server running on port ${PORT}`));
