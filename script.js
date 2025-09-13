const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let player, bullets, enemies, enemyBullets, enemyQueue;
let score, lives, level, totalEnemies, enemiesKilled;
let keys = {};

let allBuffs = [
  "Dodge",
  "Rage",
  "Shield",
  "Agility",
  "Assault",
  "Bouncing Bullet",
  "Healing Ring",
  "Sniper Aid",
  "Rocket Launcher",
  "Second Chance",
];

// Preload semua ikon buff
const buffIcons = {};
allBuffs.forEach((b) => {
  const key = b.toLowerCase().replace(/ /g, "_");
  const img = new Image();
  img.src = `img/${key}.png`; // contoh: img/agility.png
  buffIcons[b] = img;
});

let gameStarted = false;
let gameRunning = false;
let lastShot = 0;
let gameOverState = false;
let showMenu = true;
let highScore = parseInt(localStorage.getItem("highScore") || "0", 10);
document.getElementById("highscore").textContent = highScore;
let hitFlash = 0;
let showBuffSelection = false;
let activeBuffs = [];
let healUsed = false;
let secondChanceShieldActive = false;
let secondChanceShieldTimer = 0;
let sniperAlly = null;
let sniperUsedThisLevel = false;
let sniperShots = [];
let sniperLasers = [];
let rocketAmmo = 0;
let secondChanceUsed = false;

const buffDescriptions = {
  Dodge: "25% chance to avoid damage.",
  Rage: "Shoot faster (+20%) per lost life.",
  Shield: "One shield per level, absorbs 2 hits.",
  Agility: "Increase ship speed by 20%.",
  Assault: "Reduce enemy waves by 10%.",
  "Bouncing Bullet": "Bullets bounce up to 2 enemies, 20% chance for 3rd.",
  "Healing Ring": "Heal 1 life per level (once per level).",
  "Sniper Aid": "A sniper ally targets 3 strongest enemies each level.",
  "Rocket Launcher": "6 rockets per level, high damage, splash on hit.",
  "Second Chance": "Revive once after death.",
};

let offeredBuffs = [];
let shieldCharges = 0;
let boss = null;
let demoRespawnTimeout = null; // global, di atas atau dekat definisi demo vars

// stars
let stars = [];
let starSpeed = 1;
let warp = false;
let levelTextTimer = 0;
let levelCleared = false;

// demo
let demoPlayer,
  demoBullets,
  demoEnemies,
  demoEnemyBullets,
  demoTimer = 0;

// explosions
let explosions = [];
let rocketExplosions = [];

// ======== EMBEDDED AUDIO (Base64 WAV kecil) ========

// Retro shoot (blip)
const shootSFX = new Audio(
  "data:audio/wav;base64,UklGRtQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YZQAAACAgICAf39/f39/f3x8fHx7e3t7e3t6enp5eXl4eHh3d3d2dnZ1dXV0dHRzc3Nzc3Nzc3N0dHR1dXV2dnZ3d3d4eHh5eXl6enp7e3t8fHx/f3+AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA=="
);

// Retro explosion (noise burst)
const explodeSFX = new Audio(
  "data:audio/wav;base64,UklGRtQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YZQAAACAgYGBgoKCg4ODhISEhYWGh4eIiImKi4uMjY2Oj4+QkZKTlJWWmJmampydnp+goaKkpaaoq6ytsLGztLW4urq+wcPGyszO0tba3N7h5OXm6Ovr7/Dx8vP09vf5+vv8/f7/AQICAgQFBgcICQoLDA0ODw=="
);

// Retro game over (descending tone)
const gameOverSFX = new Audio(
  "data:audio/wav;base64,UklGRqQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YZQAAAB/f3x7e3p5eHd2dXNycXBycG9ubWxramloaGdmZWRjYmFgX15cW1pZWFdWVVRTUlFPTk1MS0pJSEdGRURDQkFAPz49PDs6OTg3NjU0MzIxMC8uLSwrKikoJyYlJCMiISAfHh0cGhoZGBcWFRQTEhEQDw4NDAsKCQgGBAICAA=="
);

// constants
const PLAYER_SPEED = 4;
const BULLET_SPEED = 8;
const ENEMY_SPEED = 0.6;
const ENEMY_BULLET_SPEED = 2;
const FIRE_RATE = 250;
const ENEMY_FIRE_MIN = 1600;
const ENEMY_FIRE_MAX = 2400;
const MAX_ENEMY_BULLETS = 8;

function resizeCanvas() {
  // hitung skala berdasarkan tinggi/ lebar layar
  const scale = Math.min(
    window.innerWidth / 900, // total dengan sidebar
    window.innerHeight / 600 // tinggi layar
  );

  canvas.style.width = canvas.width * scale + "px";
  canvas.style.height = canvas.height * scale + "px";
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas(); // panggil pertama kali

// ===== DRAW FUNCTIONS =====
function drawPlayer(x, y, color = "#61dafb") {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - 12);
  ctx.lineTo(x - 12, y + 12);
  ctx.lineTo(x + 12, y + 12);
  ctx.closePath();
  ctx.fill();
}

function drawEnemy(e) {
  ctx.fillStyle = "lime";
  if (e.type === "yellow") ctx.fillStyle = "yellow";
  if (e.type === "purple") ctx.fillStyle = "purple";
  if (e.type === "mini") ctx.fillStyle = "red";

  ctx.beginPath();

  if (e.type === "green") {
    // Diamond
    ctx.moveTo(e.x, e.y - 12);
    ctx.lineTo(e.x - 12, e.y);
    ctx.lineTo(e.x, e.y + 12);
    ctx.lineTo(e.x + 12, e.y);
    ctx.closePath();
  } else if (e.type === "yellow") {
    // Segitiga terbalik
    ctx.moveTo(e.x, e.y + 14);
    ctx.lineTo(e.x - 12, e.y - 10);
    ctx.lineTo(e.x + 12, e.y - 10);
    ctx.closePath();
  } else if (e.type === "purple") {
    // Hexagon
    const size = 12;
    for (let i = 0; i < 6; i++) {
      let angle = (Math.PI / 3) * i;
      let px = e.x + size * Math.cos(angle);
      let py = e.y + size * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else if (e.type === "mini") {
    // Lingkaran kecil
    ctx.arc(e.x, e.y, 8, 0, Math.PI * 2);
  }

  ctx.fill();
}

function explodeBullet(bullet) {
  // bisa pakai efek sederhana: partikel lingkaran membesar & memudar
  let explosion = {
    x: bullet.x,
    y: bullet.y,
    r: 2,
    alpha: 1,
  };

  const interval = setInterval(() => {
    const ctx = game.getContext("2d");
    ctx.save();
    ctx.globalAlpha = explosion.alpha;
    ctx.strokeStyle = "red";
    ctx.beginPath();
    ctx.arc(explosion.x, explosion.y, explosion.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    explosion.r += 2;
    explosion.alpha -= 0.1;

    if (explosion.alpha <= 0) {
      clearInterval(interval);
    }
  }, 30);
}

// ===== STARS =====
function initStars() {
  stars = [];
  for (let i = 0; i < 120; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 1,
    });
  }
}

function drawStars() {
  ctx.fillStyle = "white";
  for (let s of stars) {
    ctx.fillRect(s.x, s.y, s.size, s.size);
    s.y += starSpeed;
    if (s.y > canvas.height) {
      s.y = 0;
      s.x = Math.random() * canvas.width;
    }
  }
}

// ===== GAME FUNCTIONS =====
function resetKeys() {
  keys = {};
}

// REPLACE the existing initGame() with this full function
function initGame() {
  // reset status global
  gameStarted = false;

  // --- reset state dasar player & game ---
  player = { x: canvas.width / 2, y: canvas.height - 50, w: 24, h: 24 };
  bullets = [];
  enemies = [];
  enemyBullets = [];
  enemyQueue = [];
  score = 0;
  lives = 3;
  level = 1;
  totalEnemies = 0;
  enemiesKilled = 0;
  gameOverState = false;
  showMenu = false;
  explosions = [];
  boss = null;

  // --- reset semua buff ---
  offeredBuffs = [];
  activeBuffs = []; // baseline awal (ubah [] kalau mau kosong)
  rocketAmmo = 0;
  shieldCharges = 0;
  healUsed = false;
  sniperAlly = null;
  sniperUsedThisLevel = false;
  sniperShots = [];
  sniperLasers = [];
  secondChanceUsed = false;
  secondChanceShieldActive = false;
  secondChanceShieldTimer = 0;

  // --- bersihkan kartu buff ---
  const buffGrid = document.getElementById("buffGrid");
  if (buffGrid) {
    buffGrid.querySelectorAll(".buffCard").forEach((card) => {
      card.dataset.status = "empty";
      card.dataset.refillTriggered = "0";
      card.dataset.expireTriggered = "0";
      card.dataset.fill = "0";

      card.style.removeProperty("--fill");
      card.style.removeProperty("--buff-color");
      card.style.borderImage = "";
      card.style.filter = "none";
      card.classList.remove(
        "buff-refill",
        "buff-expired",
        "buff-expired-anim",
        "buff-progress",
        "buff-border-refill"
      );

      const img = card.querySelector("img");
      const plus = card.querySelector(".plus");
      if (img) {
        img.style.display = "none";
        img.style.filter = "none";
        img.alt = "";
      }
      if (plus) plus.style.display = "";
    });
  }

  // reset UI lain
  resetKeys();
  initStars();

  gameRunning = true;

  // mulai level pertama
  startLevel();

  // tandai game sudah mulai (setelah startLevel selesai)
  gameStarted = true;

  // update buff card sekali di awal
  updateBuffList();
}

function startLevel() {
  levelCleared = false;
  totalEnemies = Math.min(200, 5 + (level - 1) * 3);

  if (activeBuffs.includes("Assault")) {
    totalEnemies = Math.floor(totalEnemies * 0.9);
  }
  // Healing Ring → heal 1x tiap level
  // Healing Ring → bisa dipakai manual (1x per level)
  if (activeBuffs.includes("Healing Ring")) {
    healUsed = false; // reset tiap level
  }

  // Sniper Aid → reset sniper shot list
  if (activeBuffs.includes("Sniper Aid")) {
    sniperShots = [];
    sniperUsedThisLevel = false; // ➜ izinkan sniper muncul lagi di level baru
  }

  // Rocket Launcher → reset amunisi
  if (activeBuffs.includes("Rocket Launcher")) {
    rocketAmmo = 6;
  }

  enemiesKilled = 0;
  enemies = [];
  enemyQueue = [];
  boss = null; // reset bos tiap level

  if (level % 5 === 0) {
    // === LEVEL BOSS ===
    boss = {
      x: canvas.width / 2,
      y: 100,
      w: 80,
      h: 80,
      hp: 100,
      maxHp: 100,
      fireCooldown: 2000,
      summonCooldown: 3000,
    };

    // hanya 20% dari gelombang normal
    let helperCount = Math.floor(totalEnemies * 0.2);
    for (let i = 0; i < helperCount; i++) {
      let type = "green";
      if (level >= 3 && Math.random() < 0.2) type = "yellow";
      if (level >= 5 && Math.random() < 0.2) type = "purple";

      enemyQueue.push({
        x: 40 + (i % 10) * 60,
        y: -30 - i * 30,
        w: 24,
        h: 24,
        type: type,
        vy: ENEMY_SPEED,
        vx: Math.random() < 0.5 ? -0.3 : 0.3,
        alpha: 0,
        enter: true,
        fireCooldown:
          ENEMY_FIRE_MIN + Math.random() * (ENEMY_FIRE_MAX - ENEMY_FIRE_MIN),
      });
    }
  } else {
    // === LEVEL NORMAL ===
    for (let i = 0; i < totalEnemies; i++) {
      let type = "green";
      if (level >= 3 && Math.random() < 0.2) type = "yellow";
      if (level >= 5 && Math.random() < 0.2) type = "purple";

      enemyQueue.push({
        x: 40 + (i % 10) * 60,
        y: -30 - i * 30,
        w: 24,
        h: 24,
        type: type,
        vy: ENEMY_SPEED,
        vx: Math.random() < 0.5 ? -0.3 : 0.3,
        alpha: 0,
        enter: true,
        fireCooldown:
          ENEMY_FIRE_MIN + Math.random() * (ENEMY_FIRE_MAX - ENEMY_FIRE_MIN),
      });
    }
  }

  if (activeBuffs.includes("Shield")) {
    shieldCharges = 2;
  }

  refreshBuffCards(true);

  levelTextTimer = 2000;
}

// === EVENT HANDLER BUFF SELECTION ===
canvas.addEventListener("click", (e) => {
  if (!showBuffSelection) return;

  const rect = canvas.getBoundingClientRect();

  // Hitung skala tampilan → koordinat klik ke koordinat asli
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  offeredBuffs.forEach((buff, i) => {
    // === Hitbox harus sama dengan draw() ===
    let cardW = canvas.width * 0.15;
    let cardH = canvas.height * 0.3;
    let totalW = offeredBuffs.length * (cardW + 20) - 20;
    let startX = (canvas.width - totalW) / 2;
    let bx = startX + i * (cardW + 20);
    let by = canvas.height * 0.35;

    if (x >= bx && x <= bx + cardW && y >= by && y <= by + cardH) {
      console.log("Clicked buff:", buff);
      activeBuffs.push(buff);
      updateBuffList();

      if (buff === "Shield") shieldCharges = 2;
      if (buff === "Assault") totalEnemies = Math.floor(totalEnemies * 0.9);

      showBuffSelection = false;
      startLevel();
    }
  });
});

function spawnEnemies() {
  while (enemies.length < 15 && enemyQueue.length > 0) {
    enemies.push(enemyQueue.shift());
  }
}

function rectsOverlap(a, b) {
  return (
    a.x - a.w / 2 < b.x + b.w / 2 &&
    a.x + a.w / 2 > b.x - b.w / 2 &&
    a.y - a.h / 2 < b.y + b.h / 2 &&
    a.y + a.h / 2 > b.y - b.h / 2
  );
}

// explosions
function createExplosion(x, y, color = "yellow") {
  for (let i = 0; i < 10; i++) {
    explosions.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 30,
      color,
    });
  }
  explodeSFX.cloneNode().play();
}

// === SNIPER AID UPDATE ===
function updateSniper(dt) {
  if (!activeBuffs.includes("Sniper Aid")) return;

  // update laser life (pakai dt) dan hapus expired
  for (let li = sniperLasers.length - 1; li >= 0; li--) {
    sniperLasers[li].life -= dt;
    if (sniperLasers[li].life <= 0) sniperLasers.splice(li, 1);
  }

  // spawn sekali per level
  if (!sniperAlly && !sniperUsedThisLevel) {
    sniperAlly = {
      x: player.x,
      y: player.y - 80,
      state: "idle",
      shotsLeft: 3,
      target: null,
      aimTimer: 0,
      aimDuration: 0,
      currentLaser: null,
    };
  }

  if (!sniperAlly) return;

  // posisi mengikuti pemain, kecuali saat leave (biar bisa naik)
  if (sniperAlly.state !== "leave") {
    sniperAlly.x += (player.x - sniperAlly.x) * 0.1;
    sniperAlly.y = player.y - 80;
  }

  // === IDLE ===
  if (sniperAlly.state === "idle") {
    if (sniperAlly.shotsLeft > 0) {
      // hanya target yang visible dan belum diklaim
      let visibleEnemies = enemies.filter((e) => e.y > 0 && !e._sniperTargeted);

      let candidates = [];
      if (boss && boss.y > 0 && !boss._sniperTargeted) candidates.push(boss);
      candidates.push(...visibleEnemies);

      if (candidates.length > 0) {
        candidates.sort((a, b) => {
          const rank = (e) =>
            e === boss
              ? 4
              : e.type === "purple"
              ? 3
              : e.type === "yellow"
              ? 2
              : 1;
          return rank(b) - rank(a);
        });

        let tgt = candidates[0];
        sniperAlly.target = tgt;
        if (tgt) tgt._sniperTargeted = true;

        sniperAlly.aimDuration = 1800 + Math.random() * 600; // 1.8-2.4s
        sniperAlly.aimTimer = sniperAlly.aimDuration;

        // buat laser SEKALI dari TIP kapal (sniperAlly.y - 12)
        sniperAlly.currentLaser = {
          x1: sniperAlly.x,
          y1: sniperAlly.y - 12, // TIP origin
          x2: tgt.x + (tgt.w || 0) / 2,
          y2: tgt.y + (tgt.h || 0) / 2,
          life: sniperAlly.aimDuration,
        };
        sniperLasers.push(sniperAlly.currentLaser);

        sniperAlly.state = "aiming";
      }
      // jika tidak ada kandidat, tetap idle dan tunggu
    } else {
      sniperAlly.state = "leave";
    }
  }

  // === AIMING ===
  if (sniperAlly.state === "aiming") {
    let t = sniperAlly.target;

    // target invalid? -> cleanup dan kembali idle
    let targetInvalid =
      !t ||
      (t === boss && !boss) ||
      (t !== boss && enemies.indexOf(t) === -1) ||
      (t.y !== undefined && t.y < 0);

    if (targetInvalid) {
      if (t && t._sniperTargeted) t._sniperTargeted = false;
      if (sniperAlly.currentLaser) {
        sniperLasers = sniperLasers.filter(
          (l) => l !== sniperAlly.currentLaser
        );
        sniperAlly.currentLaser = null;
      }
      sniperAlly.target = null;
      sniperAlly.state = "idle";
      return;
    }

    // update laser endpoints tiap frame: origin = TIP kapal, endpoint = center target
    if (sniperAlly.currentLaser && sniperAlly.target) {
      sniperAlly.currentLaser.x1 = sniperAlly.x;
      sniperAlly.currentLaser.y1 = sniperAlly.y - 12; // TIP
      sniperAlly.currentLaser.x2 = sniperAlly.target.x;
      sniperAlly.currentLaser.y2 = sniperAlly.target.y;

      sniperAlly.currentLaser.life = sniperAlly.aimTimer;
    }

    sniperAlly.aimTimer -= dt;
    if (sniperAlly.aimTimer <= 0) {
      // fire: spawn shot FROM TIP kapal sehingga arahnya presisi
      let tt = sniperAlly.target;
      if (tt) {
        let tx = tt.x;
        let ty = tt.y;

        let dx = tx - sniperAlly.x;
        let dy = ty - (sniperAlly.y - 12); // gunakan TIP sebagai origin
        let len = Math.sqrt(dx * dx + dy * dy) || 1;

        sniperShots.push({
          x: sniperAlly.x,
          y: sniperAlly.y - 12, // spawn dari tip
          vx: (dx / len) * 25,
          vy: (dy / len) * 25,
          w: 6,
          h: 6,
          target: tt,
        });
        // biarkan tt._sniperTargeted true sampai peluru resolve
      }

      // hapus laser yang kita buat
      if (sniperAlly.currentLaser) {
        sniperLasers = sniperLasers.filter(
          (l) => l !== sniperAlly.currentLaser
        );
        sniperAlly.currentLaser = null;
      }

      // clear reference (actual enemy object masih punya _sniperTargeted until resolved)
      sniperAlly.target = null;

      sniperAlly.shotsLeft--;
      sniperAlly.state = sniperAlly.shotsLeft > 0 ? "idle" : "leave";
    }
  }

  // === LEAVE ===
  if (sniperAlly.state === "leave") {
    // jangan override y dari player; biarkan naik
    sniperAlly.y -= 5;
    if (sniperAlly.currentLaser) {
      sniperLasers = sniperLasers.filter((l) => l !== sniperAlly.currentLaser);
      sniperAlly.currentLaser = null;
    }
    if (sniperAlly.y < -60) {
      sniperAlly = null;
      sniperUsedThisLevel = true;
    }
  }
}

function drawSniper() {
  if (sniperAlly) {
    ctx.save();
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.moveTo(sniperAlly.x, sniperAlly.y - 12);
    ctx.lineTo(sniperAlly.x - 10, sniperAlly.y + 12);
    ctx.lineTo(sniperAlly.x + 10, sniperAlly.y + 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // gambar laser
  sniperLasers.forEach((l) => {
    ctx.save();
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(l.x1, l.y1);
    ctx.lineTo(l.x2, l.y2);
    ctx.stroke();
    ctx.restore();
  });

  // gambar peluru sniper
  ctx.fillStyle = "cyan";
  sniperShots.forEach((s) => {
    ctx.fillRect(s.x - 2, s.y - 8, 4, 16);
  });
}

function update(dt) {
  if (!gameRunning) return;
  updateBuffList(); // ✅ supaya panel buff sync tiap frame
  updateSniper(dt);

  starSpeed = warp ? 6 : 1;

  // movement
  let speed = PLAYER_SPEED;
  if (activeBuffs.includes("Agility")) speed *= 1.2;
  // === Second Chance Shield Timer ===
  if (secondChanceShieldActive) {
    secondChanceShieldTimer -= dt;
    if (secondChanceShieldTimer <= 0) {
      secondChanceShieldActive = false; // habis
    }
  }

  if (keys["arrowleft"] || keys["a"]) player.x -= speed;
  if (keys["arrowright"] || keys["d"]) player.x += speed;
  if (keys["arrowup"] || keys["w"]) player.y -= speed;
  if (keys["arrowdown"] || keys["s"]) player.y += speed;

  player.x = Math.max(20, Math.min(canvas.width - 20, player.x));
  player.y = Math.max(20, Math.min(canvas.height - 20, player.y));

  // shoot
  let fireRateBonus = 1;
  if (activeBuffs.includes("Rage")) {
    let lostLives = 3 - lives; // asumsi nyawa awal 3
    fireRateBonus += lostLives * 0.2; // +20% per nyawa hilang
  }

  if (keys.space && Date.now() - lastShot > FIRE_RATE / fireRateBonus) {
    if (activeBuffs.includes("Rocket Launcher") && rocketAmmo > 0) {
      // 🚀 Tembakan roket
      bullets.push({
        x: player.x,
        y: player.y - 20,
        w: 8,
        h: 20,
        vy: -BULLET_SPEED * 0.8, // roket lebih lambat sedikit
        rocket: true, // tandai ini roket
      });
      rocketAmmo--; // kurangi stok
      explodeSFX.cloneNode().play(); // bunyi beda (opsional)
    } else {
      // 🔫 Tembakan biasa
      bullets.push({
        x: player.x,
        y: player.y - 15,
        w: 4,
        h: 10,
        vy: -BULLET_SPEED,
      });
      shootSFX.cloneNode().play();
    }

    lastShot = Date.now();
  }

  bullets.forEach((b) => {
    // === 📌 Batas pantulan ===
    if (activeBuffs.includes("Bouncing Bullet")) {
      if (b.bounce >= 2 && Math.random() > 0.2) {
        return; // berhenti setelah 2 pantulan, 20% peluang untuk 3
      }
    }

    // gerakkan bullet
    b.x += b.vx || 0;
    b.y += b.vy;
  });

  bullets = bullets.filter((b) => b.y > -20 && b.y < canvas.height + 20);

  enemyBullets.forEach((b) => {
    b.x += b.vx;
    b.y += b.vy;
  });
  enemyBullets = enemyBullets.filter((b) => b.y < canvas.height + 20);
  // bullet → boss
  if (boss) {
    bullets.forEach((b, bi) => {
      if (
        b.x > boss.x - boss.w / 2 &&
        b.x < boss.x + boss.w / 2 &&
        b.y > boss.y - boss.h / 2 &&
        b.y < boss.y + boss.h / 2
      ) {
        boss.hp -= 1;
        bullets.splice(bi, 1);
        explosions.push({
          x: b.x,
          y: b.y,
          vx: 0,
          vy: 0,
          life: 15,
          color: "white",
        });
      }
    });

    if (boss.hp <= 0) {
      boss = null;
      levelCleared = true;
      warp = true;
      setTimeout(() => {
        warp = false;
        level++;
        if (level % 2 === 0 && activeBuffs.length < allBuffs.length) {
          offeredBuffs = allBuffs
            .filter((b) => !activeBuffs.includes(b))
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);
          showBuffSelection = true;
        } else {
          startLevel();
        }
      }, 1000);
    }
  }

  spawnEnemies();

  enemies.forEach((e) => {
    if (e.enter) {
      e.alpha += 0.03;
      if (e.alpha >= 1) e.enter = false;
    } else {
      if (e.type === "mini") {
        // mini kamikaze → langsung ke player
        let dx = player.x - e.x;
        let dy = player.y - e.y;
        let len = Math.sqrt(dx * dx + dy * dy);
        e.x += (dx / len) * 2;
        e.y += (dy / len) * 2;
      } else {
        e.y += e.vy;
        e.x += e.vx;
        if (e.x < 20 || e.x > canvas.width - 20) e.vx *= -1;
      }

      // shooting
      if (e.type === "green" || e.type === "purple") {
        e.fireCooldown -= dt;
        if (e.fireCooldown <= 0 && enemyBullets.length < MAX_ENEMY_BULLETS) {
          let dx = player.x - e.x;
          let dy = player.y - e.y;
          let len = Math.sqrt(dx * dx + dy * dy);
          enemyBullets.push({
            x: e.x,
            y: e.y,
            w: 4,
            h: 8,
            vx: (dx / len) * ENEMY_BULLET_SPEED,
            vy: (dy / len) * ENEMY_BULLET_SPEED,
            dmg: 1,
          });
          e.fireCooldown =
            ENEMY_FIRE_MIN + Math.random() * (ENEMY_FIRE_MAX - ENEMY_FIRE_MIN);
        }
      } else if (e.type === "yellow") {
        e.fireCooldown -= dt;
        if (e.fireCooldown <= 0) {
          enemyBullets.push({
            x: e.x,
            y: e.y,
            w: 6,
            h: 14,
            vx: 0,
            vy: ENEMY_BULLET_SPEED * 0.7, // lebih lambat
            dmg: 2,
          });
          e.fireCooldown = ENEMY_FIRE_MIN * 2; // lebih jarang
        }
      }

      if (e.y > canvas.height - 20) gameOver();
    }
  });

  // collisions
  // === BULLETS vs ENEMIES (termasuk rocket splash) ===
  // Ganti blok lama bullets.forEach(...) dengan blok ini:
  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    let b = bullets[bi];

    // cek setiap musuh (loop mundur supaya splice aman)
    let hitHandled = false;
    for (let ei = enemies.length - 1; ei >= 0; ei--) {
      let e = enemies[ei];
      if (rectsOverlap(b, e)) {
        // --- ROCKET HIT: splash around impact point ---
        if (b.rocket) {
          const cx = b.x; // impact center (pakai posisi peluru saat kena)
          const cy = b.y;
          const BLAST = 60; // blast radius (px) — ubah kalau mau lebih besar/kecil

          // visual & suara ledakan inti
          createExplosion(cx, cy, "orange");
          rocketExplosions.push({ x: cx, y: cy, r: 0, maxR: BLAST, life: 30 });

          // HAPUS semua musuh yang berada dalam radius blast
          for (let j = enemies.length - 1; j >= 0; j--) {
            let enemy = enemies[j];
            let dx = enemy.x - cx;
            let dy = enemy.y - cy;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= BLAST) {
              if (enemy._sniperTargeted) enemy._sniperTargeted = false;
              createExplosion(enemy.x, enemy.y, "red");
              enemies.splice(j, 1);
              enemiesKilled++;
              score += 10;
              if (score > highScore) {
                highScore = score;
                localStorage.setItem("highScore", highScore);
              }
            }
          }

          // Periksa boss juga (jika ada) — terkena jika berada dalam radius
          if (boss) {
            let dx = boss.x - cx;
            let dy = boss.y - cy;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= BLAST) {
              // berikan damage besar ke boss (atur nilainya jika perlu)
              boss.hp -= 45;
              if (boss.hp <= 0) {
                createExplosion(boss.x, boss.y, "orange");
                boss = null;
                score += 200;
              }
            }
          }

          // hapus peluru (roket) dan hentikan pengecekan musuh lain untuk peluru itu
          bullets.splice(bi, 1);
          hitHandled = true;
          break;
        }

        // --- NORMAL BULLET HIT ---
        // ambil posisi/tipe sebelum di-splice supaya spawn mini/ bouncing pakai posisi benar
        const ex = e.x,
          ey = e.y,
          etype = e.type;

        // bersihkan flag sniper jika ada
        if (e._sniperTargeted) e._sniperTargeted = false;

        createExplosion(ex, ey, "lime");

        // hapus peluru & musuh yang kena
        bullets.splice(bi, 1);
        enemies.splice(ei, 1);
        enemiesKilled++;
        score += 10;
        if (score > highScore) {
          highScore = score;
          localStorage.setItem("highScore", highScore);
        }

        // jika musuh purple -> spawn mini
        if (etype === "purple") {
          for (let j = 0; j < 3; j++) {
            enemies.push({
              x: ex,
              y: ey,
              w: 16,
              h: 16,
              type: "mini",
              enter: false,
              alpha: 1,
            });
          }
        }

        // bouncing bullet: spawn bullet baru ke musuh lain (pakai enemy list *setelah* penghapusan)
        if (activeBuffs.includes("Bouncing Bullet")) {
          // hitungan bounce: 0 = tembakan awal, 1 = pantulan pertama, dst
          let bounceCount = b.bounce || 0;

          // izinkan pantulan kalau:
          // - ini pantulan pertama (selalu dapat)
          // - ini pantulan kedua dan chance 20%
          let canBounce =
            bounceCount === 0 || (bounceCount === 1 && Math.random() < 0.2);

          if (canBounce) {
            let candidates = enemies;
            if (candidates.length > 0) {
              let target =
                candidates[Math.floor(Math.random() * candidates.length)];
              let dx = target.x - ex;
              let dy = target.y - ey;
              let len = Math.sqrt(dx * dx + dy * dy) || 1;

              bullets.push({
                x: ex,
                y: ey,
                w: 4,
                h: 10,
                vx: (dx / len) * BULLET_SPEED * 2, // pantulan lebih cepat
                vy: (dy / len) * BULLET_SPEED * 2,
                bounce: bounceCount + 1,
                angle: Math.atan2(dy, dx), // arah ke musuh
                bouncing: true, // flag untuk gambar khusus
              });

              explosions.push({
                x: ex,
                y: ey,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                life: 10,
                color: "cyan",
              });
            }
          }
        }

        hitHandled = true;
        break;
      }
    } // end enemies loop

    // (optionally) jika peluru tidak hit apa-apa, akan terus ada sampai di luar layar
    if (hitHandled) continue;
  }

  enemyBullets.forEach((b, i) => {
    if (rectsOverlap(b, player)) {
      if (activeBuffs.includes("Dodge") && Math.random() < 0.25) {
        enemyBullets.splice(i, 1); // peluru hilang tapi player selamat
        return;
      }

      if (
        (activeBuffs.includes("Shield") || secondChanceShieldActive) &&
        shieldCharges > 0
      ) {
        shieldCharges--;
        enemyBullets.splice(i, 1);
        return;
      }

      createExplosion(player.x, player.y, "red");
      enemyBullets.splice(i, 1);
      lives -= b.dmg ?? 1;
      if (lives < 0) lives = 0;
      hitFlash = 200;
      if (lives <= 0) {
        gameOver();
      } else {
        updateBuffList();
      }
    }
  });

  // explosions update
  explosions.forEach((ex) => {
    ex.x += ex.vx;
    ex.y += ex.vy;
    ex.life--;
  });
  explosions = explosions.filter((ex) => ex.life > 0);
  // update rocket explosion visual
  for (let i = rocketExplosions.length - 1; i >= 0; i--) {
    let re = rocketExplosions[i];
    re.r += 3; // lingkaran membesar
    re.life -= 1; // makin memudar
    if (re.life <= 0) rocketExplosions.splice(i, 1);
  }

  // === BOSS logic ===
  if (boss) {
    // gerakan sederhana (goyang kiri-kanan)
    boss.x += Math.sin(Date.now() / 1000) * 0.5;

    // summon musuh tiap cooldown
    boss.summonCooldown -= dt;
    if (boss.summonCooldown <= 0) {
      boss.summonCooldown = 5000; // reset 5 detik
      for (let i = 0; i < 4; i++) {
        let roll = Math.random();
        let type = "green";
        if (roll < 0.1) type = "purple";
        else if (roll < 0.4) type = "yellow";
        enemies.push({
          x: boss.x + (Math.random() * 100 - 50),
          y: boss.y + 80 + i * 20,
          w: 24,
          h: 24,
          type: type,
          vy: ENEMY_SPEED,
          vx: Math.random() < 0.5 ? -0.3 : 0.3,
          alpha: 1,
          enter: false,
          fireCooldown:
            ENEMY_FIRE_MIN + Math.random() * (ENEMY_FIRE_MAX - ENEMY_FIRE_MIN),
        });
      }
    }

    // shotgun attack
    boss.fireCooldown -= dt;
    if (boss.fireCooldown <= 0) {
      boss.fireCooldown = 4000; // reset 4 detik
      let spread = Math.PI / 2; // 90 derajat
      for (let i = 0; i < 12; i++) {
        let angle = -spread / 2 + (spread / 11) * i;
        enemyBullets.push({
          x: boss.x,
          y: boss.y,
          w: 6,
          h: 12,
          vx: Math.sin(angle) * 4,
          vy: Math.cos(angle) * 4,
          dmg: 1,
        });
      }
    }
  }

  // === Update sniper shots & lasers ===
  // === Update sniper shots & lasers ===
  for (let i = sniperShots.length - 1; i >= 0; i--) {
    let s = sniperShots[i];

    // fungsi ranking musuh
    const getPriority = (enemy) => {
      if (enemy === boss) return 4;
      if (enemy.type === "purple") return 3;
      if (enemy.type === "yellow") return 2;
      return 1; // green & mini
    };

    // --- RETARGETING jika target hilang ---
    if (
      !s.target ||
      (s.target === boss && !boss) ||
      (s.target !== boss && enemies.indexOf(s.target) === -1)
    ) {
      let candidates = [];
      if (boss) candidates.push(boss);
      candidates.push(...enemies);

      if (candidates.length > 0) {
        // sort berdasarkan PRIORITAS dulu, lalu jarak
        candidates.sort((a, b) => {
          let prioDiff = getPriority(b) - getPriority(a);
          if (prioDiff !== 0) return prioDiff; // yang lebih tinggi prioritasnya
          let da = Math.hypot(a.x - s.x, a.y - s.y);
          let db = Math.hypot(b.x - s.x, b.y - s.y);
          return da - db; // kalau prioritas sama → pilih terdekat
        });
        s.target = candidates[0];
      } else {
        sniperShots.splice(i, 1);
        continue;
      }
    }

    // --- SEEKING LOGIC ---
    let tx = s.target.x + (s.target.w || 0) / 2;
    let ty = s.target.y + (s.target.h || 0) / 2;
    let dx = tx - s.x;
    let dy = ty - s.y;
    let len = Math.sqrt(dx * dx + dy * dy) || 1;

    const speed = 12;
    s.vx = (dx / len) * speed;
    s.vy = (dy / len) * speed;

    s.x += s.vx;
    s.y += s.vy;

    // cek tabrakan
    if (len < 15) {
      createExplosion(s.target.x, s.target.y, "red");

      if (s.target === boss) {
        boss.hp -= 45;
        if (boss.hp <= 0) {
          createExplosion(boss.x, boss.y, "orange");
          boss = null;
          score += 200;
        }
      } else {
        if (s.target._sniperTargeted) s.target._sniperTargeted = false;
        enemies = enemies.filter((e) => e !== s.target);
        enemiesKilled++;
        score += 50;
        if (score > highScore) {
          highScore = score;
          localStorage.setItem("highScore", highScore);
        }
      }

      sniperShots.splice(i, 1);
    }
  }

  // === Update sniper lasers ===
  sniperLasers = sniperLasers.filter((l) => {
    l.life -= dt;
    return l.life > 0;
  });

  if (levelTextTimer > 0) levelTextTimer -= dt;

  if (
    !levelCleared &&
    !boss && // ⬅️ pastikan tidak ada boss
    enemiesKilled >= totalEnemies &&
    enemies.length === 0 &&
    enemyQueue.length === 0
  ) {
    levelCleared = true;
    warp = true;

    // 💥 Hancurkan semua peluru musuh dengan animasi ledakan
    enemyBullets.forEach((b) => {
      createExplosion(b.x, b.y, "red");
    });
    enemyBullets = [];

    setTimeout(() => {
      warp = false;
      level++;
      if (level % 2 === 0 && activeBuffs.length < allBuffs.length) {
        offeredBuffs = allBuffs
          .filter((b) => !activeBuffs.includes(b))
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
        showBuffSelection = true;
      } else {
        startLevel();
      }
    }, 1000);
  }
}

function drawBoss(b) {
  ctx.save();
  // tubuh bos
  ctx.fillStyle = "magenta";
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.w / 2, 0, Math.PI * 2);
  ctx.fill();

  // inti bos
  ctx.fillStyle = "cyan";
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.w / 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawStars();

  // === BUFF SELECTION SCENE ===
  if (showBuffSelection) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "cyan";
    ctx.font = "28px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Choose Your Buff", canvas.width / 2, 100);

    offeredBuffs.forEach((b, i) => {
      let cardW = canvas.width * 0.15;
      let cardH = canvas.height * 0.3;
      let totalW = offeredBuffs.length * (cardW + 20) - 20;
      let startX = (canvas.width - totalW) / 2;
      let bx = startX + i * (cardW + 20);
      let by = canvas.height * 0.35;

      ctx.fillStyle = "white";
      ctx.fillRect(bx, by, cardW, cardH);

      const imgKey = b.toLowerCase().replace(/ /g, "_");
      const icon = buffIcons[b];
      if (icon && icon.complete) {
        const maxW = cardW * 0.8;
        const maxH = cardH * 0.4;
        const ratio = Math.min(maxW / icon.width, maxH / icon.height);
        const iw = icon.width * ratio;
        const ih = icon.height * ratio;
        const ix = bx + (cardW - iw) / 2;
        const iy = by + 10;
        ctx.drawImage(icon, ix, iy, iw, ih);
      }

      ctx.fillStyle = "black";
      ctx.font = `${Math.floor(canvas.height * 0.03)}px Orbitron, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(b, bx + cardW / 2, by + cardH * 0.55);

      ctx.font = `${Math.floor(canvas.height * 0.02)}px Orbitron, sans-serif`;
      let desc = buffDescriptions[b] || "";
      let words = desc.split(" ");
      let line = "";
      let lineHeight = canvas.height * 0.03;
      let y = by + cardH * 0.65;

      words.forEach((word) => {
        let testLine = line + word + " ";
        let metrics = ctx.measureText(testLine);
        if (metrics.width > cardW * 0.9) {
          ctx.fillText(line, bx + cardW / 2, y);
          line = word + " ";
          y += lineHeight;
        } else {
          line = testLine;
        }
      });
      ctx.fillText(line, bx + cardW / 2, y);
    });

    ctx.restore();
    return;
  }

  // === MENU UTAMA ===
  if (showMenu) {
    if (!demoPlayer) initDemo();
    updateDemo();

    if (demoPlayer.alive) drawPlayer(demoPlayer.x, demoPlayer.y);
    ctx.fillStyle = "white";
    demoBullets.forEach((b) => ctx.fillRect(b.x - 2, b.y - 5, 4, 10));
    demoEnemies.forEach((e) => drawEnemy(e));
    ctx.fillStyle = "orange";
    demoEnemyBullets.forEach((b) => ctx.fillRect(b.x - 2, b.y - 4, 4, 8));

    explosions.forEach((ex) => {
      ctx.fillStyle = ex.color;
      ctx.globalAlpha = ex.life / 30;
      ctx.fillRect(ex.x, ex.y, 4, 4);
      ctx.globalAlpha = 1;
    });

    ctx.fillStyle = "cyan";
    ctx.font = "32px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SPACE SHOOTER", canvas.width / 2, 100);
    ctx.font = "18px Orbitron, sans-serif";
    ctx.fillText("Arrow Keys / WASD to move", canvas.width / 2, 160);
    ctx.fillText("Space to shoot", canvas.width / 2, 190);
    ctx.fillText("Press START or Enter to Play", canvas.width / 2, 230);
    return;
  }

  // === PLAYER ===
  if (!gameOverState) {
    drawPlayer(player.x, player.y);

    if (activeBuffs.includes("Rage")) {
      let lostLives = 3 - lives;
      if (lostLives > 0) {
        ctx.save();
        let alpha = Math.min(0.6, 0.2 * lostLives);
        ctx.strokeStyle = `rgba(255,0,0,${alpha})`;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(player.x, player.y, 30, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    if (
      (activeBuffs.includes("Shield") || secondChanceShieldActive) &&
      shieldCharges > 0
    ) {
      ctx.save();
      let alpha = shieldCharges === 2 ? 0.5 : 0.25;
      ctx.strokeStyle = `rgba(0,150,255,${alpha})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 36, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // === BULLETS ===
  bullets.forEach((b) => {
    if (b.rocket) {
      // 🚀 Rocket
      ctx.fillStyle = "red";
      ctx.fillRect(b.x - 4, b.y - 10, 8, 20);
    } else if (b.bouncing) {
      // 🔵 Pantulan (menghadap ke target)
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle || 0);
      ctx.fillStyle = "cyan";
      ctx.beginPath();
      ctx.moveTo(0, -6); // ujung depan
      ctx.lineTo(-3, 6); // kiri bawah
      ctx.lineTo(3, 6); // kanan bawah
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else {
      // 🔫 Normal bullet
      ctx.fillStyle = "white";
      ctx.fillRect(b.x - 2, b.y - 5, 4, 10);
    }
  });

  // musuh bullet
  ctx.fillStyle = "orange";
  enemyBullets.forEach((b) => ctx.fillRect(b.x - 2, b.y - 4, 4, 8));

  // sniper bullet
  ctx.fillStyle = "cyan";
  sniperShots.forEach((s) => ctx.fillRect(s.x - 2, s.y - 8, 4, 16));

  // ENEMIES
  enemies.forEach((e) => {
    ctx.globalAlpha = e.alpha;
    drawEnemy(e);
    ctx.globalAlpha = 1;
  });

  explosions.forEach((ex) => {
    ctx.fillStyle = ex.color;
    ctx.globalAlpha = ex.life / 30;
    ctx.fillRect(ex.x, ex.y, 4, 4);
    ctx.globalAlpha = 1;
  });

  rocketExplosions.forEach((re) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(re.x, re.y, re.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 100, 0, ${re.life / 30})`;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  });

  drawSniper();

  if (levelTextTimer > 0 && !gameOverState) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, levelTextTimer / 500);
    ctx.fillStyle = "cyan";
    ctx.font = "24px Orbitron,sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      `LEVEL ${level} — Enemies: ${totalEnemies}`,
      canvas.width / 2,
      canvas.height / 2
    );
    ctx.restore();
  }

  document.getElementById("score").textContent = score;
  document.getElementById("lives").textContent = lives;
  document.getElementById("level").textContent = level;
  document.getElementById("remaining").textContent = Math.max(
    0,
    totalEnemies - enemiesKilled
  );
  document.getElementById("highscore").textContent = highScore;

  if (gameOverState) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "red";
    ctx.font = "32px Orbitron,sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 30);
    ctx.fillStyle = "white";
    ctx.font = "20px Orbitron,sans-serif";
    ctx.fillText(
      `Final Score: ${score}`,
      canvas.width / 2,
      canvas.height / 2 + 10
    );
    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.fillStyle = "yellow";
      ctx.font = "18px Orbitron,sans-serif";
      ctx.fillText(
        "Press R to Restart",
        canvas.width / 2,
        canvas.height / 2 + 50
      );
    }
    ctx.restore();
  }

  if (boss) {
    drawBoss(boss);
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "20px Orbitron, sans-serif";
    ctx.fillStyle = "white";
    ctx.fillText("Omega Core", canvas.width / 2, 30);
    ctx.fillStyle = "red";
    ctx.fillRect(canvas.width / 2 - 150, 40, 300, 12);
    ctx.fillStyle = "lime";
    ctx.fillRect(canvas.width / 2 - 150, 40, (boss.hp / boss.maxHp) * 300, 12);
    ctx.restore();
  }

  if (hitFlash > 0) {
    ctx.save();
    ctx.fillStyle = "rgba(255,0,0,0.4)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    hitFlash -= 16;
  }
}

// ===== ===== REPLACE updateBuffList() WITH THIS (and add helpers) ===== =====

// ---- INIT: buat kartu + struktur .buffFill + .buffFace (panggil sekali) ----
function initBuffUI() {
  const buffGrid = document.getElementById("buffGrid");
  const tooltip = document.getElementById("buffTooltip");
  if (!buffGrid || !tooltip) return;

  buffGrid.innerHTML = "";

  for (let i = 0; i < 10; i++) {
    const card = document.createElement("div");
    card.className = "buffCard";
    card.dataset.index = i;
    card.dataset.status = "empty"; // empty | refilling | expiring | expired | active
    card.dataset.refillTriggered = "0"; // 0 none | 1 in-progress | 2 done
    card.dataset.expireTriggered = "0"; // 0 none | 1 in-progress | 2 done
    card.dataset.fill = "0";

    // fill layer
    const fill = document.createElement("div");
    fill.className = "buffFill";
    fill.style.setProperty("--fill", "0");
    card.appendChild(fill);

    // face (ikon + plus)
    const face = document.createElement("div");
    face.className = "buffFace";
    const img = document.createElement("img");
    img.style.display = "none";
    img.alt = "";
    const plus = document.createElement("div");
    plus.className = "plus";
    plus.textContent = "+";
    face.appendChild(img);
    face.appendChild(plus);
    card.appendChild(face);

    // animationend handler (single place to manage transitions)
    card.addEventListener("animationend", (ev) => {
      const name = ev.animationName;

      // borderRefill -> selesai border anim -> progress (set full)
      if (name === "borderRefill") {
        // end of border animation -> show progress as finished
        card.classList.remove("buff-border-refill");
        card.classList.remove("buff-refill");
        card.classList.add("buff-progress");
        card.dataset.refillTriggered = "2"; // marked done
        card.dataset.status = "active";
        card.style.setProperty("--fill", "1");
        card.dataset.fill = "1";
        const im = card.querySelector("img");
        if (im) im.style.filter = "none";
      }

      // fillUp or flipForward -> end of explicit fill/flip animations
      if (name === "fillUp" || name === "flipForward") {
        card.classList.remove("buff-refill");
        card.dataset.refillTriggered = "2";
        card.dataset.status = "active";
        card.style.setProperty("--fill", "1");
        card.dataset.fill = "1";
      }

      // expire animations (flipBackward / fillDown) -> set expired state
      if (name === "fillDown" || name === "flipBackward") {
        card.classList.remove("buff-expired-anim");
        card.classList.add("buff-expired");
        card.dataset.status = "expired";
        card.dataset.expireTriggered = "2"; // expired done
        card.style.setProperty("--fill", "0");
        card.dataset.fill = "0";
        const im = card.querySelector("img");
        if (im) im.style.filter = "grayscale(100%) brightness(0.6)";
      }
    });

    buffGrid.appendChild(card);
  }

  // tooltip delegation (hover)
  buffGrid.addEventListener("mouseover", (e) => {
    const card = e.target.closest(".buffCard");
    if (!card) return;
    const related = e.relatedTarget;
    if (related && card.contains(related)) return;
    const idx = Number(card.dataset.index);
    showBuffTooltip(idx, card);
  });
  buffGrid.addEventListener("mouseout", (e) => {
    const card = e.target.closest(".buffCard");
    if (!card) return;
    const related = e.relatedTarget;
    if (related && card.contains(related)) return;
    tooltip.classList.add("hidden");
  });
  buffGrid.addEventListener("mouseleave", () =>
    tooltip.classList.add("hidden")
  );
}

function showBuffTooltip(idx, card) {
  const tooltip = document.getElementById("buffTooltip");
  if (!tooltip) return;

  if (idx < activeBuffs.length) {
    const buff = activeBuffs[idx];
    let text = buffDescriptions[buff] || "";

    // dynamic status lines
    if (buff === "Rage") {
      let lost = 3 - lives;
      text += ` (Current: +${lost * 20}%)`;
    }
    if (buff === "Shield") {
      text += ` (Charges: ${shieldCharges})`;
    }

    tooltip.innerHTML = `<strong style="color:cyan">${buff}</strong><br>${text}`;
  } else {
    tooltip.innerHTML = `<strong style="color:cyan">Empty Slot</strong><br>A new buff will appear here when selected.`;
  }

  // position tooltip relative to the card (viewport coords)
  const rect = card.getBoundingClientRect();
  tooltip.style.left = rect.right + 10 + "px";
  tooltip.style.top = rect.top + "px";
  tooltip.classList.remove("hidden");
}

// ---- Dipanggil hanya saat startLevel() agar kartu konsumtif refill SEKALI ----
// forceRefill = true  -> ini adalah TRIGGER yang hanya dipanggil di startLevel()
// forceRefill = false -> hanya sinkronkan tampilan tanpa memicu animasi refill
function refreshBuffCards(forceRefill = false) {
  const buffGrid = document.getElementById("buffGrid");
  if (!buffGrid) return;
  const cards = buffGrid.querySelectorAll(".buffCard");

  const consumptiveList = [
    "Rocket Launcher",
    "Shield",
    "Healing Ring",
    "Sniper Aid",
  ];

  cards.forEach((card, i) => {
    // Kosong
    if (i >= activeBuffs.length) {
      card.classList.remove(
        "buff-refill",
        "buff-progress",
        "buff-border-refill",
        "buff-expired-anim",
        "buff-expired"
      );
      card.dataset.status = "empty";
      card.dataset.refillTriggered = "0";
      card.dataset.expireTriggered = "0";
      card.dataset.fill = "0";
      card.style.removeProperty("--fill");
      card.style.removeProperty("--buff-color");
      const im = card.querySelector("img");
      const plus = card.querySelector(".plus");
      if (im) im.style.display = "none";
      if (plus) plus.style.display = "";
      return;
    }

    // Ada buff
    const buff = activeBuffs[i];
    let color = "cyan";
    if (buff === "Rocket Launcher") color = "purple";
    else if (buff === "Shield") color = "deepskyblue";
    else if (buff === "Healing Ring") color = "hotpink";
    else if (buff === "Sniper Aid") color = "lime";
    card.style.setProperty("--buff-color", color);

    const im = card.querySelector("img");
    const plus = card.querySelector(".plus");
    if (im) {
      im.style.display = "";
      im.src = `img/${buff.toLowerCase().replace(/ /g, "_")}.png`;
      im.alt = buff;
      im.style.filter = "none";
    }
    if (plus) plus.style.display = "none";

    const isConsumptive = consumptiveList.includes(buff);

    if (isConsumptive) {
      if (!gameStarted) {
        // Sebelum game mulai, tampil abu-abu
        card.classList.remove(
          "buff-refill",
          "buff-progress",
          "buff-border-refill",
          "buff-expired-anim"
        );
        card.classList.add("buff-expired");
        card.dataset.status = "expired";
        card.dataset.expireTriggered = "2";
        card.dataset.refillTriggered = "0";
        card.style.setProperty("--fill", "0");
        card.dataset.fill = "0";
        if (im) im.style.filter = "grayscale(100%) brightness(0.6)";
        return;
      }

      // Reset flag setiap kali mulai level
      if (forceRefill) {
        card.classList.remove(
          "buff-expired",
          "buff-expired-anim",
          "buff-progress"
        );
        card.dataset.status = "refilling";
        card.dataset.refillTriggered = "1"; // in progress
        card.dataset.expireTriggered = "0";
        card.style.setProperty("--fill", "0");
        card.dataset.fill = "0";

        // kasih animasi border refill
        card.classList.add("buff-border-refill");
      }
    } else {
      // Buff pasif selalu aktif
      card.classList.remove(
        "buff-expired",
        "buff-expired-anim",
        "buff-border-refill"
      );
      card.classList.add("buff-progress");
      card.dataset.status = "active";
      card.dataset.refillTriggered = "2";
      card.style.setProperty("--fill", "1");
      card.dataset.fill = "1";
    }
  });
}

function updateBuffList() {
  const buffGrid = document.getElementById("buffGrid");
  if (!buffGrid) return;
  const cards = buffGrid.querySelectorAll(".buffCard");
  const consumptiveList = [
    "Rocket Launcher",
    "Shield",
    "Healing Ring",
    "Sniper Aid",
  ];

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const faceImg = card.querySelector("img");
    const plus = card.querySelector(".plus");
    const prev = card.dataset.status || "empty";

    // SLOT KOSONG
    if (i >= activeBuffs.length) {
      if (prev !== "empty") {
        card.classList.remove(
          "buff-refill",
          "buff-expired-anim",
          "buff-expired",
          "buff-progress",
          "buff-border-refill"
        );
        card.style.removeProperty("--fill");
        card.style.removeProperty("--buff-color");
        card.dataset.fill = "0";
        if (faceImg) faceImg.style.display = "none";
        if (plus) plus.style.display = "";
        card.dataset.status = "empty";
        card.dataset.refillTriggered = "0";
        card.dataset.expireTriggered = "0";
      }
      continue;
    }

    // ADA BUFF
    const buff = activeBuffs[i];
    const src = `img/${buff.toLowerCase().replace(/ /g, "_")}.png`;
    if (faceImg.getAttribute("src") !== src) faceImg.setAttribute("src", src);
    faceImg.alt = buff;
    faceImg.style.display = "";
    if (plus) plus.style.display = "none";

    // Hitung remaining & warna
    let remaining = 1,
      max = 1,
      color = "cyan";

    if (buff === "Rage") {
      let lost = 3 - lives;
      remaining = Math.min(1, Math.max(0, lost / 3));
      color = "red";
    } else if (buff === "Healing Ring") {
      max = 1;
      remaining = healUsed ? 0 : 1;
      color = "hotpink";
    } else if (buff === "Rocket Launcher") {
      max = 6;
      remaining = rocketAmmo / max;
      color = "purple";
    } else if (buff === "Shield") {
      max = 2;
      remaining = shieldCharges / max;
      color = "deepskyblue";
    } else if (buff === "Sniper Aid") {
      max = 3;
      let used = sniperUsedThisLevel
        ? 3
        : 3 - (sniperAlly ? sniperAlly.shotsLeft : 3);
      remaining = (max - used) / max;
      color = "lime";
    }

    // Simpan variabel CSS untuk progress bar
    card.style.setProperty("--buff-color", color);
    card.style.setProperty("--fill", String(remaining));
    card.dataset.fill = String(remaining);

    // === Expire handling for consumptive buffs (trigger once) ===
    const isConsumptive = consumptiveList.includes(buff);
    if (isConsumptive) {
      // expired -> kalau remaining 0 dan belum pernah expired
      if (remaining <= 0) {
        // jangan trigger expire jika sedang dalam proses refill
        if (
          card.dataset.expireTriggered === "0" &&
          card.dataset.status !== "expired" &&
          card.dataset.refillTriggered !== "1"
        ) {
          // start expire animation once
          card.dataset.expireTriggered = "1";
          card.dataset.status = "expiring";
          if (!card.classList.contains("buff-expired-anim")) {
            card.classList.add("buff-expired-anim");
          }
        }
      } else {
        // masih ada remaining -> pastikan bukan expired
        if (card.dataset.status === "expired") {
          // expired state persists until level end; do not auto-refill here
          // (we intentionally do nothing)
        } else {
          // keep active
          card.classList.remove("buff-expired-anim", "buff-expired");
          if (card.dataset.expireTriggered !== "1")
            card.dataset.expireTriggered = "0";
          if (card.dataset.status !== "active") card.dataset.status = "active";
        }
      }
    } else {
      // pasif buff selalu active
      card.classList.remove("buff-expired", "buff-expired-anim");
      card.dataset.expireTriggered = "0";
      card.dataset.status = "active";
    }
  }
}

// ===== init once (call after DOM ready) =====
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initBuffUI();
    updateBuffList();
  });
} else {
  initBuffUI();
  updateBuffList();
}

// ✅ Tambahkan sekali saja saat DOM siap
document.addEventListener("DOMContentLoaded", () => {
  const buffGrid = document.getElementById("buffGrid");
  const tooltip = document.getElementById("buffTooltip");

  buffGrid.addEventListener("mouseleave", () => {
    tooltip.classList.add("hidden");
  });
});

function gameOver() {
  if (activeBuffs.includes("Second Chance") && !secondChanceUsed) {
    secondChanceUsed = true;

    // ✅ Bangkit dengan 2 nyawa
    lives = 2;

    // ✅ Aktifkan shield buff temporer (12 detik)
    secondChanceShieldActive = true;
    secondChanceShieldTimer = 12000; // dalam ms
    shieldCharges = 2; // langsung dapat 2 charge shield

    gameRunning = true;
    gameOverState = false;
    return;
  }

  gameRunning = false;
  gameOverState = true;
  // if (score > highScore) highScore = score;
  // gameOverSFX.play();

  if (score > highScore) {
    highScore = score;
    localStorage.setItem("highScore", highScore);
  }
}

// ===== DEMO =====
function initDemo() {
  // reset/siapkan demo player + arrays
  demoPlayer = {
    x: canvas.width / 2,
    y: canvas.height - 80,
    w: 24,
    h: 24,
    alive: true,
    respawnScheduled: false, // flag untuk mencegah multi-respawn
    targetX: canvas.width / 2,
  };
  demoBullets = [];
  demoEnemies = [];
  demoEnemyBullets = [];
  explosions = [];
  demoTimer = 0;

  // initial demo enemies (beri type sehingga drawEnemy bisa render)
  for (let i = 0; i < 5; i++) {
    let roll = Math.random();
    let type = "green";
    if (roll < 0.1) type = "purple";
    else if (roll < 0.4) type = "yellow";

    demoEnemies.push({
      x: 100 + Math.random() * 440,
      y: -20 - i * 60,
      w: 24,
      h: 24,
      vy: 1,
      fireCooldown: 60 + Math.random() * 60,
      type: type,
      alpha: 1,
      enter: false,
    });
  }

  // clear any pending respawn timeout (safety)
  if (demoRespawnTimeout) {
    clearTimeout(demoRespawnTimeout);
    demoRespawnTimeout = null;
  }
}

function updateDemo() {
  demoTimer++;

  // === spawn musuh demo berkala (variasi tipe) ===
  // === spawn musuh demo berkala (variasi tipe) ===
  if (demoTimer % 180 === 0) {
    // tiap 1 detik sekali
    let roll = Math.random();
    let type = "green";
    if (roll < 0.1) type = "purple";
    else if (roll < 0.4) type = "yellow";

    demoEnemies.push({
      x: 100 + Math.random() * 440,
      y: -20,
      w: 24,
      h: 24,
      vy: 1,
      fireCooldown: 60 + Math.random() * 60,
      type: type,
      alpha: 1,
      enter: false,
    });
  }

  // === gerak musuh demo ===
  demoEnemies.forEach((e) => {
    e.y += e.vy;
    if (e.y > canvas.height + 20) {
      // 🚀 respawn ke atas (infinite loop)
      e.y = -20;
      e.x = 100 + Math.random() * 440;

      // kasih type baru biar variasi
      let roll = Math.random();
      if (roll < 0.1) e.type = "purple";
      else if (roll < 0.4) e.type = "yellow";
      else e.type = "green";
    }
  });

  // === perilaku kapal player demo (tetap sama: target, hindar, tembak) ===
  let target = null;
  if (demoEnemies.length > 0) {
    // pilih musuh paling bawah sebagai target (mirip kode Anda sebelumnya)
    target = demoEnemies.reduce((a, b) => (a.y > b.y ? a : b));
  }

  if (demoPlayer.alive) {
    if (!demoPlayer.targetX) demoPlayer.targetX = demoPlayer.x;

    // gerak halus ke arah musuh (jaga perilaku awal)
    if (target) demoPlayer.targetX = target.x;

    // hindari peluru yang dekat (tetap seperti sebelumnya)
    let danger = null;
    demoEnemyBullets.forEach((b) => {
      if (b.y < demoPlayer.y && Math.abs(b.x - demoPlayer.x) < 15) {
        if (!danger || b.y > danger.y) danger = b;
      }
    });
    if (danger) {
      demoPlayer.targetX += danger.x < demoPlayer.x ? 40 : -40;
    }

    // smooth movement (tetap)
    demoPlayer.x += (demoPlayer.targetX - demoPlayer.x) * 0.05;

    // tembak ke musuh (tetap)
    if (target && target.y > 50 && demoTimer % 60 === 0) {
      // Anda sebelumnya spawn satu peluru; kalau mau 3 peluru tetap bisa diubah,
      // tapi saya pertahankan perilaku Anda supaya tidak diubah, seperti permintaan.
      let dx = target.x - demoPlayer.x;
      let dy = target.y - demoPlayer.y;
      let len = Math.sqrt(dx * dx + dy * dy) || 1;
      demoBullets.push({
        x: demoPlayer.x,
        y: demoPlayer.y,
        w: 4,
        h: 10,
        vx: (dx / len) * 4,
        vy: (dy / len) * 4,
      });
      shootSFX.cloneNode().play();
    }
  }

  // update peluru player demo
  demoBullets.forEach((b) => {
    b.x += b.vx || 0;
    b.y += b.vy || -5;
  });
  demoBullets = demoBullets.filter((b) => b.y > -20 && b.y < canvas.height);

  // cek tabrakan peluru → musuh demo
  demoBullets.forEach((b, bi) => {
    demoEnemies.forEach((e, ei) => {
      if (rectsOverlap(b, e)) {
        createExplosion(e.x, e.y, "lime");
        demoBullets.splice(bi, 1);
        demoEnemies.splice(ei, 1);
      }
    });
  });

  // musuh demo menembak
  demoEnemies.forEach((e) => {
    e.fireCooldown--;
    if (e.fireCooldown <= 0) {
      demoEnemyBullets.push({ x: e.x, y: e.y, w: 4, h: 8, vx: 0, vy: 3 });
      e.fireCooldown = 60 + Math.random() * 60;
    }
  });

  // update peluru musuh demo
  demoEnemyBullets.forEach((b) => {
    b.x += b.vx;
    b.y += b.vy;
  });
  demoEnemyBullets = demoEnemyBullets.filter((b) => b.y < canvas.height + 20);

  // === cek tabrakan peluru → player demo (HANYA schedule respawn ONCE) ===
  demoEnemyBullets.forEach((b, bi) => {
    if (demoPlayer.alive && rectsOverlap(b, demoPlayer)) {
      createExplosion(demoPlayer.x, demoPlayer.y, "red");
      demoEnemyBullets.splice(bi, 1);

      // tandai mati & schedule 1x respawn
      demoPlayer.alive = false;

      if (!demoPlayer.respawnScheduled) {
        demoPlayer.respawnScheduled = true;
        // schedule satu kali saja
        demoRespawnTimeout = setTimeout(() => {
          initDemo();
          demoRespawnTimeout = null;
        }, 1200); // 1.2s delay (sesuaikan)
      }
    }
  });

  // cek musuh menembus layar → player demo mati (sama handling satu kali)
  demoEnemies.forEach((e) => {
    if (e.y > canvas.height - 30 && demoPlayer.alive) {
      createExplosion(demoPlayer.x, demoPlayer.y, "red");
      demoPlayer.alive = false;
      if (!demoPlayer.respawnScheduled) {
        demoPlayer.respawnScheduled = true;
        demoRespawnTimeout = setTimeout(() => {
          initDemo();
          demoRespawnTimeout = null;
        }, 1200);
      }
    }
  });

  // ledakan update
  explosions.forEach((ex) => {
    ex.x += ex.vx;
    ex.y += ex.vy;
    ex.life--;
  });
  explosions = explosions.filter((ex) => ex.life > 0);

  // respawn periodic check REMOVED — kita pakai timeout di atas
  // demoEnemies cleanup (respawn jenis saat reset posisi)
}

// ===== LOOP =====
let lastTime = performance.now();
function loop(ts) {
  let dt = ts - lastTime;
  lastTime = ts;
  if (gameRunning) update(dt);
  draw();
  requestAnimationFrame(loop);
}

// ===== INPUT =====
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    keys.space = true;
  }
  if (e.code === "Enter" && showMenu) {
    initGame();
  }
  if (e.key.toLowerCase() === "r" && gameOverState) {
    initGame();
  }
  keys[e.key.toLowerCase()] = true;
  keys[e.code.toLowerCase()] = true;
  if (
    e.key.toLowerCase() === "e" &&
    activeBuffs.includes("Healing Ring") &&
    !healUsed
  ) {
    if (lives < 3) {
      lives++;
      healUsed = true; // hanya sekali per level
      createExplosion(player.x, player.y, "lime"); // efek visual heal
    }
  }
});
window.addEventListener("keyup", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    keys.space = false;
  }
  keys[e.key.toLowerCase()] = false;
  keys[e.code.toLowerCase()] = false;
});

document.getElementById("btnStart").addEventListener("click", () => {
  if (showMenu) initGame();
});
document.getElementById("btnReset").addEventListener("click", initGame);

// start
initStars();
requestAnimationFrame(loop);
