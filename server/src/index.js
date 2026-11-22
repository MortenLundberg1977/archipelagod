const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const path     = require('path');

const { EVENTS, TICK_INTERVAL_MS } = require('../../shared/constants');
const {
  getPrivateIsland, getWorldState,
  registerPlayer, loginPlayer, playerDisconnect, getPlayerIsland,
  handlePlaceUnit, handleTradeOffer, handleTradeAccept,
  tickAll, islands, players,
} = require('./gameState');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(express.static(path.join(__dirname, '../../client')));
app.get('/health', (_, res) => res.json({ ok: true, players: io.engine.clientsCount }));

// ── Socket.io ─────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[+] ${socket.id} connected`);

  // --- Register new player ---
  socket.on(EVENTS.REGISTER, ({ name, pin }, cb) => {
    const cleanName = (name || '').trim().slice(0, 20);
    if (!cleanName) return cb?.({ ok: false, error: 'Enter a name' });
    if (!/^\d{4}$/.test(pin)) return cb?.({ ok: false, error: 'PIN must be 4 digits' });

    const result = registerPlayer(socket.id, cleanName, pin);
    if (!result.ok) return cb?.({ ok: false, error: result.error });

    socket.join('world');
    console.log(`[+] Registered: ${cleanName}`);
    cb?.({
      ok: true,
      island:       getPrivateIsland(result.island),
      world:        getWorldState(),
      recoveryCode: result.recoveryCode,
      rejoined:     false,
    });
    socket.to('world').emit(EVENTS.WORLD_UPDATE, getWorldState());
  });

  // --- Login existing player ---
  socket.on(EVENTS.LOGIN, ({ name, pin }, cb) => {
    const cleanName = (name || '').trim().slice(0, 20);
    if (!cleanName) return cb?.({ ok: false, error: 'Enter a name' });
    if (!/^\d{4}$/.test(pin)) return cb?.({ ok: false, error: 'PIN must be 4 digits' });

    const result = loginPlayer(socket.id, cleanName, pin);
    if (!result.ok) return cb?.({ ok: false, error: result.error });

    socket.join('world');
    console.log(`[~] Login: ${cleanName}`);
    cb?.({
      ok:      true,
      island:  getPrivateIsland(result.island),
      world:   getWorldState(),
      rejoined: true,
    });
    socket.to('world').emit(EVENTS.WORLD_UPDATE, getWorldState());
  });

  // --- Place a unit on the map ---
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

  // --- Trade ---
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

  // --- Chat ---
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

// ── Game tick ─────────────────────────────────────────────────────────────────
setInterval(() => {
  tickAll();
  for (const [socketId, player] of players.entries()) {
    const island = islands.get(player.islandId);
    if (island) io.to(socketId).emit(EVENTS.ISLAND_UPDATE, getPrivateIsland(island));
  }
}, TICK_INTERVAL_MS);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Archipelagod running on port ${PORT}`));
