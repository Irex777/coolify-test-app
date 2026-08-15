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

## Auto-deploy
Pushes to branch `voidkeep` auto-deploy to https://voidkeep.aiwrk.org:
- A watcher on the dev machine (`~/voidkeep-deploy`) detects new commits and
  sends a signed push event to Coolify's manual GitHub webhook.
- Optional server-side upgrade: add a GitHub repo webhook (event: push) at
  `https://coolify.aiwrk.org/webhooks/source/github/events/manual` using the
  app's `manual_webhook_secret_github` as the webhook secret.
