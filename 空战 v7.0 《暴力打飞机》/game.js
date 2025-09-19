const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let player = { x: 160, y: 500, width: 40, height: 40 };
let bullets = [], enemies = [];
let score = 0, gold = 0;
let bulletInterval = 300;
let fireRateLevel = 1;
let shieldCount = 0;
let paused = false;
let hasWingmen = false;
let wingmen = [];

class StarParticle {
  constructor() { this.reset(); }
  reset() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.radius = Math.random() * 1.5 + 0.5;
    this.alpha = Math.random();
    this.speedX = (Math.random() - 0.5) * 0.2;
    this.speedY = (Math.random() - 0.5) * 0.2;
  }
  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.alpha += (Math.random() - 0.5) * 0.02;
    if (this.alpha < 0.1 || this.alpha > 1 ||
        this.x < 0 || this.x > canvas.width ||
        this.y < 0 || this.y > canvas.height) {
      this.reset();
    }
  }
  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,${this.alpha})';
    ctx.fill();
  }
}

const starParticles = [];
for (let i = 0; i < 300; i++) {
  starParticles.push(new StarParticle());
}

function drawStarfield() {
  starParticles.forEach(p => {
    p.update();
    p.draw(ctx);
  });
}

const enemyImageSources = [
  "assets/images/enemy_stone_1.png",
  "assets/images/enemy_stone_2.png",
  "assets/images/enemy_stone_3.png",
  "assets/images/enemy_silver_node.png",
  "assets/images/enemy_mystrile_node.png",
  "assets/images/enemy_gold_node.png",
  "assets/images/enemy_copper_node.png"
];

const enemyImages = enemyImageSources.map(src => {
  const img = new Image();
  img.src = src;
  return img;
});

function startShooting() {
  function shootLoop() {
    if (!paused) {
      bullets.push({ x: player.x + 18, y: player.y });
      if (hasWingmen) {
        wingmen.forEach(w => {
          bullets.push({ x: player.x + w.offsetX + 18, y: player.y });
        });
      }
    }
    setTimeout(shootLoop, bulletInterval);
  }
  shootLoop();
}

function spawnEnemies() {
  setInterval(() => {
    if (!paused) {
      const speed = Math.random() * 1.5 + 1.5;
      const randomImg = enemyImages[Math.floor(Math.random() * enemyImages.length)];
      const enemy = {
        x: Math.random() * canvas.width,
        y: -30,
        speed: speed,
        img: randomImg,
        fallback: false
      };
      if (!randomImg.complete || randomImg.naturalWidth === 0) {
        enemy.fallback = true;
      }
      enemies.push(enemy);
    }
  }, 1000);
}

function updateHUD() {
  document.getElementById("scoreDisplay").textContent = "得分：" + score;
  document.getElementById("goldDisplay").textContent = "金币：" + gold;
  document.getElementById("speedDisplay").textContent = "射速等级：" + fireRateLevel;
  document.getElementById("shieldDisplay").textContent =
    "护盾：" + (shieldCount > 0 ? shieldCount + " 层" : "未激活");

  const hud = document.getElementById("hud");
  hud.classList.add("hud-flash");
  setTimeout(() => hud.classList.remove("hud-flash"), 600);
}

function checkPlayerCollision() {
  enemies.forEach((e) => {
    if (
      player.x < e.x + 30 &&
      player.x + player.width > e.x &&
      player.y < e.y + 30 &&
      player.y + player.height > e.y
    ) {
      if (shieldCount > 0) {
        shieldCount -= 1;
        updateHUD();
        enemies = enemies.filter(en => en !== e);
      } else {
        paused = true;
        alert("你被击中了！游戏结束！");
        document.getElementById("menuOverlay").style.display = "flex";
      }
    }
  });
}

function gameLoop() {
  if (paused) return requestAnimationFrame(gameLoop);

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawStarfield();

  // 🔳 添加画布边框
  ctx.strokeStyle = "#0ff";
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#00ffff";
  ctx.fillRect(player.x, player.y, player.width, player.height);

  if (hasWingmen) {
    ctx.fillStyle = "#ffaa00";
    wingmen.forEach(w => {
      ctx.fillRect(player.x + w.offsetX, player.y, 30, 30);
    });
  }

  ctx.fillStyle = "#fff";
  bullets.forEach((b, i) => {
    b.y -= 6;
    ctx.fillRect(b.x, b.y, 4, 10);
    if (b.y < 0) bullets.splice(i, 1);
  });

  enemies.forEach((e, ei) => {
    e.y += e.speed;
    if (e.fallback) {
      ctx.fillStyle = "#ff4444";
      ctx.fillRect(e.x, e.y, 30, 30);
    } else {
      ctx.drawImage(e.img, e.x, e.y, 30, 30);
    }

    bullets.forEach((b, bi) => {
      if (
        b.x < e.x + 30 && b.x + 4 > e.x &&
        b.y < e.y + 30 && b.y + 10 > e.y
      ) {
        bullets.splice(bi, 1);
        enemies.splice(ei, 1);
        score += 10;
        gold += 10;
        updateHUD();
      }
    });
  });

  checkPlayerCollision();
  updateHUD();
  requestAnimationFrame(gameLoop);
}

canvas.addEventListener("touchmove", (e) => {

  e.preventDefault();

  const rect = canvas.getBoundingClientRect();

  const touch = e.touches[0];

  player.x = touch.clientX - rect.left - player.width / 2;

  player.y = touch.clientY - rect.top - player.height / 2;

}, { passive: false });

canvas.addEventListener("mousedown", (e) => {

  const rect = canvas.getBoundingClientRect();

  player.x = e.clientX - rect.left - player.width / 2;

  player.y = e.clientY - rect.top - player.height / 2;

});

canvas.addEventListener("mousemove", (e) => {

  if (e.buttons === 1) {

    const rect = canvas.getBoundingClientRect();

    player.x = e.clientX - rect.left - player.width / 2;

    player.y = e.clientY - rect.top - player.height / 2;

  }

});

function openMenu() {

  paused = true;

  document.getElementById("menuOverlay").style.display = "flex";

}

function resumeGame() {

  paused = false;

  document.getElementById("menuOverlay").style.display = "none";

}

function restartGame() {

  bullets = [];

  enemies = [];

  score = 0;

  gold = 0;

  bulletInterval = 300;

  fireRateLevel = 1;

  shieldCount = 0;

  hasWingmen = false;

  wingmen = [];

  paused = false;

  player.x = 160;

  player.y = 500;

  document.getElementById("menuOverlay").style.display = "none";

  updateHUD();

}

function upgradeFireRate() {

  if (fireRateLevel >= 10) {

    alert("已达最大射速等级！");

    return;

  }

  if (gold >= 80) {

    fireRateLevel += 1;

    gold -= 80;

    if (fireRateLevel < 10) {

      bulletInterval = Math.max(50, bulletInterval - 30);

      alert("射速已升级！");

    } else {

      hasWingmen = true;

      wingmen = [

        { offsetX: -50 },

        { offsetX: 50 }

      ];

      alert("超级升级！僚机已部署！");

    }

    updateHUD();

  } else {

    alert("金币不足！");

  }

}

function buyShield() {

  if (gold >= 50) {

    shieldCount += 1;

    gold -= 50;

    alert("护盾 +1！");

    updateHUD();

  } else {

    alert("金币不足！");

  }

}

startShooting();

spawnEnemies();

gameLoop();