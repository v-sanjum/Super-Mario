// ==========================================================================
// Pixel Runner — an original side-scrolling platformer
// No third-party characters or assets are used; everything is drawn with
// simple canvas shapes so the whole game is safe to host and modify freely.
// ==========================================================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const timerEl = document.getElementById('timer');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMessage = document.getElementById('overlay-message');
const startBtn = document.getElementById('start-btn');

const TILE = 40;
const GRAVITY = 0.6;
const MOVE_SPEED = 3.6;
const JUMP_FORCE = -12.5;
const FRICTION = 0.8;

// ---------------------------------------------------------------------
// Level data. '#' = ground/platform, '^' = spike hazard, 'C' = coin,
// 'E' = enemy spawn, 'F' = flag (goal), '.' = empty space.
// Each row is TILE px tall; each column TILE px wide.
// ---------------------------------------------------------------------
const LEVELS = [
  [
    '..........................................',
    '..........................................',
    '..........C.......C..........C............',
    '..........................................',
    '..................####.....................',
    '..........................................',
    '.........C..........................C......',
    '......####........E.......####.............',
    '..........................................',
    '..C.................................C....F.',
    '####......####...........####........#####',
    '####..E...####...^^......####...E.....####',
    '############################################',
  ],
  [
    '..........................................',
    '...C..................C..........C.........',
    '..........................................',
    '.......####.......................####......',
    '..........................E...............',
    '..C........####........####............C...',
    '..........................................',
    '....E..................E..........####.....',
    '..........................................',
    '####...^^........####..........E........F..',
    '####...##........####...C...............###',
    '####...##........####...................###',
    '############################################',
  ],
];

let level = 0;
let camX = 0;
let score = 0;
let lives = 3;
let elapsed = 0;
let running = false;
let lastTime = 0;

let platforms = [];
let spikes = [];
let coins = [];
let enemies = [];
let flag = null;
let levelWidth = 0;
let levelHeight = 0;

const player = {
  x: 0, y: 0, w: 28, h: 34,
  vx: 0, vy: 0,
  onGround: false,
  facing: 1,
  invuln: 0,
};

const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    e.preventDefault();
  }
});
window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

function parseLevel(idx) {
  const rows = LEVELS[idx];
  platforms = [];
  spikes = [];
  coins = [];
  enemies = [];
  flag = null;
  levelHeight = rows.length * TILE;
  levelWidth = rows[0].length * TILE;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      const x = c * TILE;
      const y = r * TILE;
      if (ch === '#') {
        platforms.push({ x, y, w: TILE, h: TILE });
      } else if (ch === '^') {
        spikes.push({ x, y: y + TILE * 0.5, w: TILE, h: TILE * 0.5 });
      } else if (ch === 'C') {
        coins.push({ x: x + TILE / 2, y: y + TILE / 2, r: 10, taken: false, bob: Math.random() * Math.PI * 2 });
      } else if (ch === 'E') {
        enemies.push({
          x, y: y + TILE - 28, w: 28, h: 28,
          vx: 1.2, minX: Math.max(0, x - 80), maxX: x + 80,
          alive: true,
        });
      } else if (ch === 'F') {
        flag = { x, y: y - TILE * 2, w: TILE * 0.6, h: TILE * 3 };
      }
    }
  }
}

function resetPlayer() {
  player.x = 40;
  player.y = 40;
  player.vx = 0;
  player.vy = 0;
  player.invuln = 90;
  camX = 0;
}

function startLevel(idx) {
  level = idx;
  parseLevel(idx);
  resetPlayer();
  levelEl.textContent = idx + 1;
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function updatePlayer() {
  // Horizontal input
  if (keys['ArrowLeft'] || keys['KeyA']) {
    player.vx -= MOVE_SPEED * 0.35;
    player.facing = -1;
  }
  if (keys['ArrowRight'] || keys['KeyD']) {
    player.vx += MOVE_SPEED * 0.35;
    player.facing = 1;
  }
  player.vx *= FRICTION;
  if (Math.abs(player.vx) > MOVE_SPEED) {
    player.vx = MOVE_SPEED * Math.sign(player.vx);
  }
  if (Math.abs(player.vx) < 0.05) player.vx = 0;

  // Jump
  if ((keys['Space'] || keys['ArrowUp'] || keys['KeyW']) && player.onGround) {
    player.vy = JUMP_FORCE;
    player.onGround = false;
  }

  player.vy += GRAVITY;
  if (player.vy > 18) player.vy = 18;

  // Move horizontally then resolve collisions
  player.x += player.vx;
  for (const p of platforms) {
    if (rectsOverlap(player, p)) {
      if (player.vx > 0) player.x = p.x - player.w;
      else if (player.vx < 0) player.x = p.x + p.w;
      player.vx = 0;
    }
  }

  // Move vertically then resolve collisions
  player.y += player.vy;
  player.onGround = false;
  for (const p of platforms) {
    if (rectsOverlap(player, p)) {
      if (player.vy > 0) {
        player.y = p.y - player.h;
        player.onGround = true;
      } else if (player.vy < 0) {
        player.y = p.y + p.h;
      }
      player.vy = 0;
    }
  }

  if (player.x < 0) player.x = 0;
  if (player.x + player.w > levelWidth) player.x = levelWidth - player.w;

  // Fell off the bottom
  if (player.y > levelHeight + 100) {
    loseLife();
    return;
  }

  // Spikes
  for (const s of spikes) {
    if (rectsOverlap(player, s) && player.invuln <= 0) {
      loseLife();
      return;
    }
  }

  // Coins
  for (const c of coins) {
    if (c.taken) continue;
    const dx = (player.x + player.w / 2) - c.x;
    const dy = (player.y + player.h / 2) - c.y;
    if (Math.sqrt(dx * dx + dy * dy) < c.r + 16) {
      c.taken = true;
      score += 10;
      scoreEl.textContent = score;
    }
  }

  // Enemies
  for (const e of enemies) {
    if (!e.alive) continue;
    if (rectsOverlap(player, e)) {
      const stomping = player.vy > 0 && (player.y + player.h) - e.y < 18;
      if (stomping) {
        e.alive = false;
        player.vy = JUMP_FORCE * 0.6;
        score += 50;
        scoreEl.textContent = score;
      } else if (player.invuln <= 0) {
        loseLife();
        return;
      }
    }
  }

  // Flag / goal
  if (flag && rectsOverlap(player, flag)) {
    nextLevel();
    return;
  }

  if (player.invuln > 0) player.invuln--;

  // Camera follows player, clamped to level bounds
  const targetCamX = player.x - canvas.width / 2 + player.w / 2;
  camX = Math.max(0, Math.min(targetCamX, levelWidth - canvas.width));
}

function updateEnemies() {
  for (const e of enemies) {
    if (!e.alive) continue;
    e.x += e.vx;
    if (e.x < e.minX || e.x + e.w > e.maxX) {
      e.vx *= -1;
      e.x = Math.max(e.minX, Math.min(e.x, e.maxX - e.w));
    }
  }
}

function loseLife() {
  lives--;
  livesEl.textContent = Math.max(lives, 0);
  if (lives <= 0) {
    gameOver(false);
  } else {
    resetPlayer();
  }
}

function nextLevel() {
  if (level + 1 < LEVELS.length) {
    startLevel(level + 1);
  } else {
    gameOver(true);
  }
}

function gameOver(won) {
  running = false;
  overlay.classList.remove('hidden');
  overlayTitle.textContent = won ? 'You Win! 🎉' : 'Game Over';
  overlayMessage.textContent = won
    ? `Final score: ${score}. Nicely done!`
    : `You ran out of lives. Final score: ${score}.`;
  startBtn.textContent = 'Play Again';
}

function drawBackground() {
  // Simple parallax hills
  ctx.save();
  ctx.translate(-camX * 0.3, 0);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.arc(i * 300 + 100, 460, 70, Math.PI, 0);
    ctx.fill();
  }
  ctx.restore();
}

function drawPlatforms() {
  ctx.fillStyle = '#8b5a2b';
  for (const p of platforms) {
    ctx.fillRect(p.x - camX, p.y, p.w, p.h);
    ctx.fillStyle = '#3f9d3f';
    ctx.fillRect(p.x - camX, p.y, p.w, 8);
    ctx.fillStyle = '#8b5a2b';
  }
}

function drawSpikes() {
  ctx.fillStyle = '#d63031';
  for (const s of spikes) {
    const teeth = 4;
    const w = s.w / teeth;
    for (let i = 0; i < teeth; i++) {
      const bx = s.x - camX + i * w;
      ctx.beginPath();
      ctx.moveTo(bx, s.y + s.h);
      ctx.lineTo(bx + w / 2, s.y);
      ctx.lineTo(bx + w, s.y + s.h);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawCoins(t) {
  for (const c of coins) {
    if (c.taken) continue;
    const bob = Math.sin(t / 200 + c.bob) * 4;
    ctx.fillStyle = '#ffd447';
    ctx.strokeStyle = '#c99400';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(c.x - camX, c.y + bob, c.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawEnemies() {
  for (const e of enemies) {
    if (!e.alive) continue;
    ctx.fillStyle = '#6c3483';
    ctx.fillRect(e.x - camX, e.y, e.w, e.h);
    ctx.fillStyle = '#fff';
    ctx.fillRect(e.x - camX + 5, e.y + 8, 5, 5);
    ctx.fillRect(e.x - camX + e.w - 10, e.y + 8, 5, 5);
  }
}

function drawFlag() {
  if (!flag) return;
  ctx.fillStyle = '#7f8c8d';
  ctx.fillRect(flag.x - camX + flag.w / 2 - 3, flag.y, 6, flag.h);
  ctx.fillStyle = '#27ae60';
  ctx.beginPath();
  ctx.moveTo(flag.x - camX + flag.w / 2 + 3, flag.y + 6);
  ctx.lineTo(flag.x - camX + flag.w / 2 + 3 + 34, flag.y + 18);
  ctx.lineTo(flag.x - camX + flag.w / 2 + 3, flag.y + 30);
  ctx.closePath();
  ctx.fill();
}

function drawPlayer() {
  const flashing = player.invuln > 0 && Math.floor(player.invuln / 5) % 2 === 0;
  if (flashing) ctx.globalAlpha = 0.4;

  const px = player.x - camX;
  const py = player.y;

  // body
  ctx.fillStyle = '#e94560';
  ctx.fillRect(px, py, player.w, player.h);
  // cap
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(px - 2, py - 8, player.w + 4, 10);
  // face
  ctx.fillStyle = '#f5cba7';
  ctx.fillRect(px + (player.facing > 0 ? 6 : 0), py + 12, player.w - 6, 12);
  // eyes
  ctx.fillStyle = '#222';
  const eyeX = player.facing > 0 ? px + player.w - 10 : px + 4;
  ctx.fillRect(eyeX, py + 16, 4, 4);

  ctx.globalAlpha = 1;
}

function draw(t) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawSpikes();
  drawPlatforms();
  drawCoins(t);
  drawEnemies();
  drawFlag();
  drawPlayer();
}

function loop(t) {
  if (!running) return;
  const dt = t - lastTime;
  lastTime = t;

  updatePlayer();
  updateEnemies();
  draw(t);

  elapsed += dt;
  timerEl.textContent = Math.floor(elapsed / 1000);

  requestAnimationFrame(loop);
}

function startGame() {
  score = 0;
  lives = 3;
  elapsed = 0;
  scoreEl.textContent = score;
  livesEl.textContent = lives;
  timerEl.textContent = 0;
  startLevel(0);
  overlay.classList.add('hidden');
  running = true;
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

startBtn.addEventListener('click', startGame);
