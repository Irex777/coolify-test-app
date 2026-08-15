# VOID KEEP — arcade

Single-file space-medieval raycast FPS + tiny zero-dependency Node score server.
Play with friends, enter a name, climb the server-side leaderboard.

## Run locally
    node server.js            # http://localhost:3000

## Env
- `PORT` (default 3000)
- `DATA_DIR` (default /data) — scores.json lives here; mount a volume for persistence

## API
- `GET  /healthz` — health
- `GET  /api/leaderboard?limit=10` — top scores
- `GET  /api/stats` — global stats (runs, kings, kills, best wave)
- `GET  /api/mine?name=X` — a player's totals + rank
- `POST /api/score` — `{name, score, kills, wave, time}` → `{rank, top}`

## Docker
    docker build -t voidkeep . && docker run -p 3000:3000 -v voidkeep_data:/data voidkeep
