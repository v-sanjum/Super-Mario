# Pixel Runner

An original 2D side-scrolling platformer built with vanilla HTML5 Canvas + JavaScript,
served by a small Express app. No third-party game assets, sprites, or trademarked
characters are used — everything is drawn with plain canvas shapes, so it's safe to
deploy, rebrand, and extend freely.

## Features
- Run, jump, stomp-enemies platformer physics (gravity, friction, collisions)
- Coins, hazards (spikes), patrolling enemies, and a goal flag
- 2 sample levels (easy to add more — see below)
- Score, lives, timer, and level HUD
- Express server with `helmet` + `compression`, and a `/healthz` endpoint for uptime checks

## Run locally
```bash
npm install
npm start
```
Then open http://localhost:3000

The port is read from `process.env.PORT` (falls back to 3000), which is what most
Node hosting platforms, including Cloudways, expect.

## Deploying to Cloudways
1. In the Cloudways platform, create a new **Node.js** application (via the "Add Application" flow, selecting Node.js as the stack).
2. Push/upload this project's files to the app's `public_html` (or the app root Cloudways gives you) — e.g. via Git deployment, SFTP, or the Cloudways Git integration.
3. In the app's Node.js settings, set:
   - **Startup file**: `server.js`
   - **App port**: whatever Cloudways assigns via `PORT` — no code changes needed since the server already reads `process.env.PORT`.
4. Run `npm install` (Cloudways usually does this automatically on deploy, or via SSH: `npm install --production`).
5. Start/restart the app from the Cloudways dashboard.
6. Visit your app's URL — the game should load immediately.

(Exact menu names can shift as Cloudways updates its UI — if anything doesn't match what you see, their app docs at https://support.cloudways.com will have the current steps for Node.js apps.)

## Project structure
```
pixel-runner/
├── package.json
├── server.js          # Express static server + health check
├── public/
│   ├── index.html      # Page shell, HUD, overlay
│   ├── style.css        # Styling
│   └── game.js           # All game logic (physics, levels, rendering)
└── README.md
```

## Customizing / adding levels
Levels live in the `LEVELS` array at the top of `public/game.js` as ASCII grids:
- `#` = solid ground/platform
- `^` = spike hazard
- `C` = coin
- `E` = enemy (patrols back and forth)
- `F` = flag / level goal
- `.` = empty space

Add a new string array to `LEVELS` to add a level — the game will automatically
progress to it after the previous one's flag is reached.

## Notes
- Everything is rendered with canvas primitives (rectangles, circles, triangles) —
  there are no image/sprite assets to swap in, but you're welcome to replace the
  draw functions in `game.js` with `drawImage()` calls if you want custom art.
- No database or persistence is used; it's a fully client-side game logic-wise,
  with Express only serving the static files.
