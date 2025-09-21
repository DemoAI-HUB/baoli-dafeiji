const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 图像资源加载
const playerImg = new Image();
playerImg.src = "assets/images/player.png";

const wingmanImg = new Image();
wingmanImg.src = "assets/images/wingman.png";

const enemyImageSources = [
  "assets/images/enemy_stone_1.png",
  "assets/images/enemy_stone_2.png",
  "assets/images/enemy_stone_3.png",
  "assets/images/enemy_silver_node.png",
  "assets/images/enemy_mystrile_node.png",
  "assets/images/enemy_gold_node.png",
  "assets/images/enemy_copper_node.png"
];

const enemyImages = enemyImageSources.map((src) => {
  const img = new Image();
  img.src = src;
  return img;
});

// 游戏状态变量
const playerScale = 2;
let player = {
  x: 160,
  y: 500,
  width: 40 * playerScale,
  height: 40 * playerScale
};
let bullets = [], enemies = [];
let score = 0, gold = 0;
let bulletInterval = 300;
let fireRateLevel = 1;
let shieldCount = 0;
let paused = false;
let hasWingmen = false;
let wingmen = [];

// 星空粒子类
class StarParticle {
  constructor() {
    this.reset();
  }
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
    if (
      this.alpha < 0.1 ||
      this.alpha > 1 ||
      this.x < 0 ||
      this.x > canvas.width ||
      this.y < 0 ||
      this.y > canvas.height
    ) {
      this.reset();
    }
  }
  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${this.alpha})`;
    ctx.fill();
  }
}

const starParticles = [];
for (let i = 0; i < 300; i++) {
  starParticles.push(new StarParticle());
}

function drawStarfield() {
  starParticles.forEach((p) => {
    p.update();
    p.draw(ctx);
  });
}

// 敌人生成逻辑（含 fallback）
function spawnEnemies() {
  setInterval(() => {
    if (!paused) {
      const scale = Math.random() * 2 + 1;
      const speed = 5 / scale;
      const randomImg = enemyImages[Math.floor(Math.random() * enemyImages.length)];
      const enemy = {
        x: Math.random() * canvas.width,
        y: -30,
        speed: speed,
        img: randomImg,
        fallback: false,
        scale: scale
      };
      if (!randomImg.complete || randomImg.naturalWidth === 0) {
        enemy.fallback = true;
      }
      enemies.push(enemy);
    }
  }, 1000);
}

// HUD 更新
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

function startShooting() {
  function shootLoop() {
    if (!paused) {
      // 主机子弹
      bullets.push({ x: player.x + player.width / 2 - 2, y: player.y });

      // 撩机子弹
      if (hasWingmen) {
        wingmen.forEach((w) => {
          bullets.push({
            x: player.x + w.offsetX + player.width / 2 - 2,
            y: player.y + 10
          });
        });
      }
    }
    setTimeout(shootLoop, bulletInterval);
  }

  shootLoop();
}

function checkPlayerCollision() {
  enemies.forEach((e) => {
    const size = 30 * e.scale;
    if (
      player.x < e.x + size &&
      player.x + player.width > e.x &&
      player.y < e.y + size &&
      player.y + player.height > e.y
    ) {
      if (shieldCount > 0) {
        shieldCount -= 1;
        updateHUD();
        enemies = enemies.filter((en) => en !== e);
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

  // 玩家图像或方块
  if (playerImg.complete && playerImg.naturalWidth !== 0) {
    ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);
  } else {
    ctx.fillStyle = "#00f";
    ctx.fillRect(player.x, player.y, player.width, player.height);
  }

  // 撩机图像或方块
  if (hasWingmen) {
    const wingmanWidth = player.width * 0.6;
    const wingmanHeight = player.height * 0.6;

    wingmen.forEach((w) => {
      const wx = player.x + w.offsetX;
      const wy = player.y + 10;

      if (wingmanImg.complete && wingmanImg.naturalWidth !== 0) {
        ctx.drawImage(wingmanImg, wx, wy, wingmanWidth, wingmanHeight);
      } else {
        ctx.fillStyle = "#ffaa00";
        ctx.fillRect(wx, wy, wingmanWidth, wingmanHeight);
      }
    });
  }

  // 子弹绘制与移动
  ctx.fillStyle = "#fff";
  bullets.forEach((b, i) => {
    b.y -= 6;
    ctx.fillRect(b.x, b.y, 4, 10);
    if (b.y < 0) bullets.splice(i, 1);
  });

  // 敌人绘制与碰撞检测
  enemies.forEach((e, ei) => {
    const size = 30 * e.scale;
    e.y += e.speed;

    if (e.fallback) {
      ctx.fillStyle = "#ff4444";
      ctx.fillRect(e.x, e.y, size, size);
    } else {
      ctx.drawImage(e.img, e.x, e.y, size, size);
    }

    bullets.forEach((b, bi) => {
      if (
        b.x < e.x + size &&
        b.x + 4 > e.x &&
        b.y < e.y + size &&
        b.y + 10 > e.y
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

// 触控控制
canvas.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    player.x = touch.clientX - rect.left - player.width / 2;
    player.y = touch.clientY - rect.top - player.height / 2;
  },
  { passive: false }
);

// 鼠标控制
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

// 菜单控制
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

// 升级射速
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
      wingmen = [{ offsetX: -50 }, { offsetX: 50 }];
      alert("超级升级！僚机已部署！");
    }

    updateHUD();
  } else {
    alert("金币不足！");
  }
}

// 购买护盾
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

// 启动游戏
startShooting();
spawnEnemies();
gameLoop();