# 🏝️ Archipelagod

A multiplayer island god-game inspired by the C64 original God Island.

Build your island, grow your population, keep them happy, and trade with other islands.

## Gameplay

- Each player gets a randomly typed island (Farming 🌾, Mining ⛏️, Fishing 🌊, or Forest 🌲)
- All islands can survive via hunting, fishing, and basic farming
- Island type gives production bonuses — trade to make up for weaknesses
- Build a **Market** to unlock trading with other islands
- Keep your people fed and happy to grow your population

## Tech stack

- **Server:** Node.js + Socket.io (real-time multiplayer)
- **Client:** Vanilla HTML/CSS/JS (no framework — C64 spirit!)
- **Hosting:** Railway (server) + Cloudflare Pages (client)

## Running locally

```bash
cd server
npm install
npm start
```

Then open `client/index.html` via a local server (e.g. `npx serve client`).

## Roadmap

- [ ] Persistent saves (SQLite)
- [ ] Tile-based island map (canvas)
- [ ] C64-style pixel art graphics
- [ ] Events (storms, droughts, festivals)
- [ ] Diplomacy (alliances, wars)
