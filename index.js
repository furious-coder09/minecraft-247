/**
 * Random Action Minecraft Bot with Express Keep‑Alive
 * --------------------------------------------------
 * Deploy this file on **Render Free Web Service**.
 * It combines:
 *   • A tiny Express HTTP server with two routes:
 *       GET /      → "Minecraft bot is alive."
 *       GET /ping  → "pong"
 *     These endpoints can be hit by UptimeRobot or any cron‑style pinger every
 *     few minutes so Render keeps the container awake.
 *   • A Mineflayer bot that logs in to **your** Java‑edition server and does
 *     random things (walk, jump, fly up, look around). If the bot gets kicked
 *     or the process crashes, it auto‑reconnects after 10 s.
 *
 * Quick setup
 * -----------
 * 1.  In your repo root:
 *       npm init -y
 *       npm install mineflayer mineflayer-pathfinder vec3 minecraft-data express
 * 2.  Add this file (e.g. `index.js`) and push to GitHub.
 * 3.  On Render → **New → Web Service** → pick this repo.
 *       Build command : npm install
 *       Start command : node index.js
 *       Instance type : Free
 * 4.  In Render → Environment, set:
 *       MC_HOST     = play.your‑server.com
 *       MC_PORT     = 25565
 *       MC_USERNAME = RandomBot
 *       (MC_PASSWORD if your server runs in online‑mode)
 * 5.  Point an uptime monitor at https://<render‑url>.onrender.com/ping
 *
 * That’s all — your bot should stay alive on the free tier. 🎉
 */

const express = require('express');
const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals: { GoalBlock } } = require('mineflayer-pathfinder');
const { Vec3 } = require('vec3');
const mcData = require('minecraft-data');

const HTTP_PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────────────────────────────────────
// 1  Express Keep‑Alive Server
// ─────────────────────────────────────────────────────────────────────────────
const app = express();
app.get('/', (_, res) => res.send('Minecraft bot is alive.')); // basic root
app.get('/ping', (_, res) => res.send('pong'));                // health check

app.listen(HTTP_PORT, () =>
  console.log(`[HTTP] Listening on ${HTTP_PORT}. Endpoints: / & /ping`)
);

// ─────────────────────────────────────────────────────────────────────────────
// 2  Mineflayer Bot Logic
// ─────────────────────────────────────────────────────────────────────────────
function createBot() {
  const bot = mineflayer.createBot({
    host: process.env.MC_HOST || 'localhost',
    port: Number(process.env.MC_PORT) || 25565,
    username: process.env.MC_USERNAME || 'RandomBot',
    password: process.env.MC_PASSWORD || undefined, // omit if offline‑mode
    version: false // auto‑detect based on server
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    console.log('[BOT] Spawned in world');
    const defaultMoves = new Movements(bot, mcData(bot.version));
    defaultMoves.canDig = false;
    bot.pathfinder.setMovements(defaultMoves);
    randomLoop(bot);
  });

  bot.on('kicked', r => console.log('[BOT] Kicked:', r));
  bot.on('error', e => console.log('[BOT] Error:', e));
  bot.on('end', () => {
    console.log('[BOT] Disconnected — reconnecting in 10 s');
    setTimeout(createBot, 10_000);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3  Random Action Scheduler
// ─────────────────────────────────────────────────────────────────────────────
function randomLoop(bot) {
  setInterval(() => {
    if (!bot.entity) return; // bot not ready yet

    const action = Math.floor(Math.random() * 4);
    switch (action) {
      case 0: walkRandom(bot); break;
      case 1: jumpOnce(bot); break;
      case 2: flyUp(bot); break;
      case 3: lookAround(bot); break;
    }
  }, 8_000 + Math.random() * 4_000); // every 8–12 s
}

function walkRandom(bot) {
  const range = 20;
  const dx = Math.floor(Math.random() * range * 2) - range;
  const dz = Math.floor(Math.random() * range * 2) - range;
  const target = bot.entity.position.offset(dx, 0, dz);
  bot.chat(`Walking to ${target.x.toFixed(1)}, ${target.z.toFixed(1)}`);
  bot.pathfinder.setGoal(new GoalBlock(target.x, target.y, target.z));
}

function jumpOnce(bot) {
  bot.chat('Jump!');
  bot.setControlState('jump', true);
  setTimeout(() => bot.setControlState('jump', false), 500);
}

function flyUp(bot) {
  if (bot.game && bot.game.gameMode === 'creative') {
    bot.chat('Flying up!');
    bot.setControlState('jump', true);
    setTimeout(() => bot.setControlState('jump', false), 3_000);
  } else {
    bot.chat("Can't fly here");
  }
}

function lookAround(bot) {
  const yaw = Math.random() * Math.PI * 2; // 0 → 360°
  const pitch = (Math.random() - 0.5) * Math.PI / 3; // ±30°
  bot.look(yaw, pitch, true);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4  Keep‑Alive Console Log (optional; extra safety)
// ─────────────────────────────────────────────────────────────────────────────
setInterval(() => {
  console.log('[KEEP‑ALIVE]', new Date().toISOString());
}, 60_000);

// Start bot
createBot();

// Global error guards — don’t crash the container
process.on('uncaughtException', err => console.error('Uncaught:', err));
process.on('unhandledRejection', err => console.error('Unhandled:', err));
