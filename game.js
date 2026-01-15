const game = document.getElementById("game");
const car = document.getElementById("car");
const scoreDisplay = document.getElementById("score");
const gameOverScreen = document.getElementById("gameOver");
const finalScore = document.getElementById("finalScore");

// New UI Elements
const nitroBar = document.getElementById("nitro-bar-fill");
const xpBar = document.getElementById("xp-bar-fill");
const levelDisplay = document.getElementById("levelDisplay");
const levelBadge = document.getElementById("level-badge");
const comboElement = document.getElementById("comboDisplay");
const toastContainer = document.getElementById("toast-container");
const gameCoins = document.getElementById("gameCoins");
const startCoins = document.getElementById("startCoins");
const garageCoins = document.getElementById("garageCoins");

// Game State
let road1, road2;
let carX = 165;
let speed = 6;
let baseSpeed = 6;
let backgroundY = 0;
let isGameOver = false;
let isGameStarted = false;
let score = 0;
let carVelocity = 0;
let acceleration = 2; // Smoother acceleration
let friction = 0.92;
let speedInterval;
let spawnInterval;
let coinSpawnInterval;
let gameLoopId;

// New Systems State
let controlMode = localStorage.getItem('controlMode') || 'tap';
let difficulty = localStorage.getItem('difficulty') || 'medium';
let highScore = parseInt(localStorage.getItem('highScore')) || 0;
let xp = parseInt(localStorage.getItem('userXP')) || 0;
let coins = parseInt(localStorage.getItem('userCoins')) || 0;
let level = 1;
let nitro = 0;
let isNitroActive = false;
let combo = 0;
let comboTimer;
let earnedAchievements = JSON.parse(localStorage.getItem('achievements')) || [];
let isMuted = localStorage.getItem('isMuted') === 'true';

// Garage / Inventory
let selectedCarId = localStorage.getItem('selectedCarId') || 'car_default';
let ownedCars = JSON.parse(localStorage.getItem('ownedCars')) || ['car_default'];

// Car Database
const CAR_DB = [
  { id: 'car_default', name: 'Racer X', img: 'car.png', price: 0, levelReq: 1, speedMult: 1.0, sound: 'engine.mp3' },
  { id: 'car_sport', name: 'Red Fury', img: 'Red fury.png', price: 30, levelReq: 2, speedMult: 1.15, sound: 'Red fury engine sound.mp3' },
  { id: 'car_future', name: 'Cyber Z', img: 'Cyber Z.png', price: 70, levelReq: 5, speedMult: 1.3, sound: 'Cyber Z engine sound.mp3' },
  { id: 'car_gold', name: 'Gold Rush', img: 'Gold Rush.png', price: 100, levelReq: 10, speedMult: 1.5, sound: 'Gold Rush engine sound.mp3' }
];

// Difficulty Config
const DIFFICULTY_SETTINGS = {
  easy: { speed: 5, spawn: 1400, variance: 0 },
  medium: { speed: 7, spawn: 1100, variance: 1 },
  hard: { speed: 9, spawn: 900, variance: 2 },
  legendary: { speed: 12, spawn: 700, variance: 3 }
};

// Sounds
let engineSound = new Audio("engine.mp3"); // Changed to let to allow src updates
const crashSound = new Audio("crash.mp3");
const coinSound = new Audio("Coin collect.mp3");

engineSound.loop = true;

// Init
applyCarSettings(); // Apply immediately on load
updateLevelInfo();
updateCoins(0);
loadSettings();
document.getElementById('highScore').innerText = highScore;

// --- INPUT MANAGER ---
let touchStartX = 0;

function initInputs() {
  document.onkeydown = null;
  document.onkeyup = null;
  game.ontouchstart = null;
  game.ontouchmove = null;
  game.onmousedown = null;
  window.ondeviceorientation = null;

  // KEYBOARD
  document.addEventListener("keydown", e => {
    if (isGameOver || !isGameStarted) return;
    if (e.key === "ArrowLeft") carVelocity = -acceleration * 2;
    if (e.key === "ArrowRight") carVelocity = acceleration * 2;
    if (e.key === " " || e.key === "Shift") activateNitro();
  });
  document.addEventListener("keyup", e => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") carVelocity = 0;
  });

  // TOUCH / MOUSE
  if (controlMode === 'tap') {
    game.addEventListener("touchstart", handleTap);
    game.addEventListener("mousedown", handleTap);
  } else if (controlMode === 'swipe') {
    game.addEventListener("touchstart", e => {
      touchStartX = e.touches[0].clientX;
    });
    game.addEventListener("touchmove", e => {
      e.preventDefault();
      const touchX = e.touches[0].clientX;
      const delta = touchX - touchStartX;
      carVelocity = delta * 0.15;
      touchStartX = touchX;
    });
    game.addEventListener("touchend", () => carVelocity = 0);
  } else if (controlMode === 'tilt') {
    window.addEventListener("deviceorientation", handleTilt);
  }
}

function handleTap(e) {
  if (isGameOver || !isGameStarted) return;
  e.preventDefault();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const gameRect = game.getBoundingClientRect();
  const clickX = clientX - gameRect.left;

  if (clickX < gameRect.width / 2) {
    carVelocity = -acceleration * 3;
  } else {
    carVelocity = acceleration * 3;
  }
  setTimeout(() => carVelocity *= 0.5, 100);
}

function handleTilt(e) {
  if (isGameOver || !isGameStarted) return;
  const tilt = e.gamma;
  if (Math.abs(tilt) > 5) {
    carVelocity = tilt * 0.3;
  } else {
    carVelocity = 0;
  }
}

function setControlMode(mode) {
  controlMode = mode;
  localStorage.setItem('controlMode', mode);
  document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('btn' + mode.charAt(0).toUpperCase() + mode.slice(1)).classList.add('active');
  initInputs();
}

function setDifficulty(val) {
  difficulty = val;
  localStorage.setItem('difficulty', val);
  baseSpeed = DIFFICULTY_SETTINGS[difficulty].speed;
}

function setMute(val) {
  isMuted = val;
  localStorage.setItem('isMuted', val);
  engineSound.muted = val;
  crashSound.muted = val;
  coinSound.muted = val;

  document.getElementById('btnSoundOn').classList.toggle('active', !val);
  document.getElementById('btnSoundOff').classList.toggle('active', val);

  // Immediate effect
  if (isGameStarted && !isGameOver) {
    if (val) engineSound.pause();
    else engineSound.play().catch(() => { });
  }
}

function loadSettings() {
  setControlMode(controlMode);
  document.getElementById('diffSelect').value = difficulty;
  setDifficulty(difficulty);
  setMute(isMuted);
}


// --- CORE GAME LOOP ---

function moveCar() {
  if (isGameOver) return;
  if (isPaused) {
    gameLoopId = requestAnimationFrame(moveCar);
    return;
  }

  carX += carVelocity;
  carX = Math.max(0, Math.min(game.offsetWidth - 60, carX));
  car.style.left = carX + "px";

  if (controlMode !== 'swipe') {
    carVelocity *= friction;
  } else {
    carVelocity *= 0.5;
  }

  car.classList.remove('tilt-left', 'tilt-right');
  if (carVelocity < -1) car.classList.add('tilt-left');
  if (carVelocity > 1) car.classList.add('tilt-right');

  // Apply Car Speed Multiplier
  const carData = CAR_DB.find(c => c.id === selectedCarId) || CAR_DB[0];
  let currentSpeed = (isNitroActive ? speed * 2 : speed) * carData.speedMult;

  // Dynamic Engine Pitch
  if (!isPaused && !isGameOver) {
    // Base rate 0.8, max 1.5 based on speed
    engineSound.playbackRate = 0.8 + (currentSpeed / 40);
  }

  backgroundY += currentSpeed;

  if (road1 && road2) {
    const tileH = game.clientHeight || window.innerHeight;
    const offset = backgroundY % tileH;
    road1.style.transform = `translateY(${offset - tileH}px)`;
    road2.style.transform = `translateY(${offset}px)`;
  }

  // Nitro Drain
  if (isNitroActive) {
    nitro -= 0.5;
    if (nitro <= 0) {
      nitro = 0;
      isNitroActive = false;
    }
    updateHUD();
  }

  gameLoopId = requestAnimationFrame(moveCar);
}

function createObstacle() {
  if (isGameOver || !isGameStarted) return;

  const gameWidth = game.offsetWidth;
  let spawnX;
  let attempts = 0;
  let hasOverlap = true;

  // Try to find a non-overlapping spot
  while (hasOverlap && attempts < 5) {
    spawnX = Math.random() * (gameWidth - 80);
    hasOverlap = false;

    // Check against Coins
    document.querySelectorAll('.coin').forEach(coin => {
      const cx = parseFloat(coin.style.left);
      const cy = parseFloat(coin.style.top);
      if (cy < 150 && Math.abs(spawnX - cx) < 90) { // 80obs + 48coin + buffer
        hasOverlap = true;
      }
    });
    attempts++;
  }

  if (hasOverlap) return; // Skip spawn if crowded

  const obs = document.createElement("img");
  const types = ["obstacle1.png", "obstacle2.png"];
  obs.src = types[Math.floor(Math.random() * types.length)];
  obs.classList.add("obstacle");
  obs.style.left = spawnX + "px";
  game.appendChild(obs);

  let type = 'static';
  if (difficulty === 'medium' && Math.random() > 0.7) type = 'drifter';
  if ((difficulty === 'hard' || difficulty === 'legendary') && Math.random() > 0.5) {
    type = Math.random() > 0.5 ? 'weaver' : 'drifter';
  }

  let obsY = -100;
  let driftDir = Math.random() > 0.5 ? 1 : -1;
  let obsX = spawnX;

  function moveObstacle() {
    if (isGameOver) return;
    if (isPaused) {
      requestAnimationFrame(moveObstacle);
      return;
    }

    const carData = CAR_DB.find(c => c.id === selectedCarId) || CAR_DB[0];
    let currentSpeed = (isNitroActive ? speed * 2 : speed) * carData.speedMult;

    obsY += currentSpeed;

    if (type === 'drifter') {
      obsX += driftDir * 1;
      if (obsX <= 0 || obsX >= gameWidth - 80) driftDir *= -1;
    } else if (type === 'weaver') {
      obsX += Math.sin(obsY * 0.05) * 3;
    }

    obs.style.top = obsY + "px";
    obs.style.left = obsX + "px";

    const carRect = car.getBoundingClientRect();
    const obsRect = obs.getBoundingClientRect();
    const buffer = 10;

    if (
      carRect.left + buffer < obsRect.right - buffer &&
      carRect.right - buffer > obsRect.left + buffer &&
      carRect.top + buffer < obsRect.bottom - buffer &&
      carRect.bottom - buffer > obsRect.top + buffer
    ) {
      crash();
      return;
    }

    if (obsY > game.clientHeight + 100) {
      obs.remove();
      if (!isGameOver) {
        addScore();
      }
    } else {
      requestAnimationFrame(moveObstacle);
    }
  }
  moveObstacle();
}

function createCoin() {
  if (isGameOver || !isGameStarted) return;

  const gameWidth = game.offsetWidth;
  let spawnX;
  let attempts = 0;
  let hasOverlap = true;

  // Try to find a non-overlapping spot
  while (hasOverlap && attempts < 5) {
    spawnX = Math.random() * (gameWidth - 48);
    hasOverlap = false;

    // Check against Obstacles
    document.querySelectorAll('.obstacle').forEach(obs => {
      const ox = parseFloat(obs.style.left);
      const oy = parseFloat(obs.style.top);
      if (oy < 150 && Math.abs(spawnX - ox) < 90) {
        hasOverlap = true;
      }
    });
    attempts++;
  }

  if (hasOverlap) return; // Skip

  const coin = document.createElement("img");
  coin.src = "Coin.png"; // Capitalized
  coin.classList.add("coin");
  coin.style.left = spawnX + "px";
  game.appendChild(coin);

  let coinY = -50;

  function moveCoin() {
    if (isGameOver) { coin.remove(); return; }
    if (isPaused) {
      requestAnimationFrame(moveCoin);
      return;
    }

    // Coins also move faster if car is faster? usually relative speed.
    // Yes, objects move "down" at the speed of the car moving "up".
    const carData = CAR_DB.find(c => c.id === selectedCarId) || CAR_DB[0];
    let currentSpeed = (isNitroActive ? speed * 2 : speed) * carData.speedMult;

    coinY += currentSpeed;
    coin.style.top = coinY + "px";

    // Collision
    const carRect = car.getBoundingClientRect();
    const coinRect = coin.getBoundingClientRect();

    if (
      carRect.left < coinRect.right &&
      carRect.right > coinRect.left &&
      carRect.top < coinRect.bottom &&
      carRect.bottom > coinRect.top
    ) {
      collectCoin(coin);
      return;
    }

    if (coinY > game.clientHeight + 50) {
      coin.remove();
    } else {
      requestAnimationFrame(moveCoin);
    }
  }
  moveCoin();
}

function collectCoin(coinEl) {
  coinEl.remove();
  updateCoins(1);
  if (!isMuted) coinSound.play().catch(() => { });
}

function updateCoins(amount) {
  coins += amount;
  startCoins.innerText = coins;
  gameCoins.innerText = coins;
  garageCoins.innerText = coins;
  localStorage.setItem('userCoins', coins);
}

function addScore() {
  score++; // Simple count of obstacles overtaken

  // Update combos for visual only or XP multiplier? 
  // User asked to remove multiplier display, but maybe kept XP bonus?
  // Let's keep XP bonus based on combo but Score is just count.
  const comboMult = 1 + (combo * 0.1);
  const pointGain = Math.floor(10 * comboMult);

  combo++;
  clearTimeout(comboTimer);
  showCombo();
  comboTimer = setTimeout(() => {
    combo = 0;
    comboElement.classList.remove('show');
  }, 2500);

  // Fixed XP per obstacle
  addXP(100);

  if (!isNitroActive && nitro < 100) {
    nitro = Math.min(100, nitro + 10);

    // Visual Pulse for Nitro Button
    const btn = document.getElementById('nitroBtn');
    if (nitro >= 50) btn.classList.add('ready');
    else btn.classList.remove('ready');

    // Achievement check
    if (nitro >= 50 && !earnedAchievements.includes('nitro_ready')) {
      // Silent check or hint if needed
    }
  }
  updateHUD();
}

function addXP(amount) {
  xp += amount;
  const maxXP = level * 1000;
  if (xp >= maxXP) {
    xp -= maxXP;
    level++;
    showToast(`Level Up! Welcome to Level ${level}`);
  }
  updateLevelInfo();
}

function updateLevelInfo() {
  // XP based level calculation
  // Simple for now: just visual, logic handled elsewhere
  const maxXp = level * 1000;
  const pct = (xp / maxXp) * 100;
  xpBar.style.width = pct + "%";
  levelDisplay.innerText = level;
  levelBadge.innerText = "LVL " + level;
  localStorage.setItem('userXP', xp);
}

function activateNitro() {
  if (nitro >= 50 && !isNitroActive) {
    isNitroActive = true;
    showToast("NITRO BOOST!");
    unlockAchievement('first_nitro');
  }
}

function showCombo() {
  // Visual removed as per request
  // comboElement.innerText = "x" + (1 + combo * 0.1).toFixed(1);
  // comboElement.classList.add('show');
  // ...
}

function updateHUD() {
  scoreDisplay.innerText = score;
  nitroBar.style.height = nitro + "%";
}


// --- GAME MANAGEMENT ---

let isPaused = false;

function togglePause() {
  if (isGameOver || !isGameStarted) return;

  isPaused = !isPaused;
  const modal = document.getElementById('pauseModal');

  if (isPaused) {
    modal.style.display = 'flex';
    engineSound.pause();
    cancelAnimationFrame(gameLoopId);
    clearInterval(spawnInterval);
    clearInterval(speedInterval);
    clearInterval(coinSpawnInterval);
  } else {
    modal.style.display = 'none';
    if (!isMuted) engineSound.play().catch(() => { });
    requestAnimationFrame(moveCar);

    // Resume intervals
    const spawnRate = DIFFICULTY_SETTINGS[difficulty].spawn;
    spawnInterval = setInterval(createObstacle, spawnRate);
    coinSpawnInterval = setInterval(createCoin, 2000);
    speedInterval = setInterval(() => {
      if (!isGameOver && speed < 25) speed += 0.2;
    }, 5000);
  }
}

function startGame() {
  document.getElementById("startScreen").style.display = "none";
  game.style.display = "block";
  document.body.classList.add('playing');

  isGameStarted = true;
  isGameOver = false;
  isPaused = false;
  score = 0;
  nitro = 0;
  combo = 0;
  speed = DIFFICULTY_SETTINGS[difficulty].speed;

  updateHUD();
  if (!isMuted) engineSound.play().catch(() => { });

  initRoadTiles();
  moveCar();
  initInputs();

  const spawnRate = DIFFICULTY_SETTINGS[difficulty].spawn;
  spawnInterval = setInterval(createObstacle, spawnRate);
  coinSpawnInterval = setInterval(createCoin, 2000); // Coins every 2s
  speedInterval = setInterval(() => {
    if (!isGameOver && speed < 25) speed += 0.2;
  }, 5000);
}

// Score-based sounds
const soundLow = new Audio("Sound 0-5.mp3");
const soundMid = new Audio("Sound 6-10.mp3");
const soundHigh = new Audio("Sound 11-20.mp3");
const soundLegend = new Audio("Sound 30-1000.mp3");

function crash() {
  if (isGameOver) return;
  isGameOver = true;

  game.classList.add('shake');
  setTimeout(() => game.classList.remove('shake'), 400);

  engineSound.pause();

  if (!isMuted) {
    crashSound.play();
    // Play score sound after crash finishes
    crashSound.onended = () => {
      if (score <= 5) soundLow.play();
      else if (score <= 10) soundMid.play();
      else if (score <= 20) soundHigh.play();
      else soundLegend.play();
    };
  }

  clearInterval(spawnInterval);
  clearInterval(speedInterval);
  clearInterval(coinSpawnInterval);
  cancelAnimationFrame(gameLoopId);

  if (score === 0) unlockAchievement('instant_regret');

  setTimeout(() => {
    document.body.classList.remove('playing');
    finalScore.innerText = score;
    document.getElementById('xpGain').innerText = `+${score} XP Gained`;

    let quote = "Good Effort!";
    if (score < 50) quote = "Keep Practicing!";
    else if (score > 500) quote = "Legendary Driving!";

    document.getElementById('quote').innerText = quote;
    gameOverScreen.style.display = "flex";

    if (score > highScore) {
      highScore = score;
      localStorage.setItem('highScore', highScore);
      document.getElementById('highScore').innerText = highScore;
      showToast("New High Score!");
    }

  }, 1000);
}

function restartGame() {
  carVelocity = 0;
  carX = game.offsetWidth / 2 - 35;
  nitro = 0;
  isNitroActive = false;

  document.querySelectorAll('.obstacle').forEach(e => e.remove());
  document.querySelectorAll('.coin').forEach(e => e.remove());

  gameOverScreen.style.display = "none";
  startGame();
}

function exitToMenu() {
  gameOverScreen.style.display = "none";
  document.getElementById('pauseModal').style.display = 'none'; // Fix: Hide pause menu
  game.style.display = "none";
  document.getElementById("startScreen").style.display = "block";
  document.body.classList.remove('playing');
  document.querySelectorAll('.obstacle').forEach(e => e.remove());
  document.querySelectorAll('.coin').forEach(e => e.remove());
  isGameStarted = false;
  isGameOver = false;
  isPaused = false; // Ensure paused state is reset
  updateCoins(0); // Refresh UI
}

function initRoadTiles() {
  if (road1) return;
  road1 = document.createElement('div');
  road2 = document.createElement('div');
  road1.className = 'road-tile';
  road2.className = 'road-tile';
  game.insertBefore(road1, game.firstChild);
  game.insertBefore(road2, game.firstChild);
}

// --- GARAGE SYSTEM ---

function openGarage() {
  const grid = document.getElementById('carGrid');
  grid.innerHTML = '';
  document.getElementById('garageModal').style.display = 'flex';

  CAR_DB.forEach(c => {
    const owned = ownedCars.includes(c.id);
    const locked = level < c.levelReq && !owned;
    const selected = selectedCarId === c.id;

    const div = document.createElement('div');
    div.className = `car-card ${selected ? 'selected' : ''}`;

    let actionBtn = '';
    if (selected) {
      actionBtn = `<button class="status-btn selected">Selected</button>`;
    } else if (owned) {
      actionBtn = `<button class="status-btn select" onclick="selectCar('${c.id}')">Select</button>`;
    } else {
      // Removed Level Lock, allowed buying with coins
      actionBtn = `<button class="status-btn buy" onclick="buyCar('${c.id}', ${c.price})">Buy ${c.price} 💰</button>`;
    }

    div.innerHTML = `
            <h3>${c.name}</h3>
            <img src="${c.img}">
            ${actionBtn}
        `;
    grid.appendChild(div);
  });
}

function closeGarage() {
  document.getElementById('garageModal').style.display = 'none';
}

function buyCar(id, price) {
  if (coins >= price) {
    updateCoins(-price);
    ownedCars.push(id);
    localStorage.setItem('ownedCars', JSON.stringify(ownedCars));

    coinSound.cloneNode(true).play().catch(() => { });
    showToast("Car Purchased!");
    openGarage(); // Refresh
  } else {
    showToast("Not enough coins!");
  }
}

function selectCar(id) {
  selectedCarId = id;
  localStorage.setItem('selectedCarId', id);
  applyCarSettings();
  openGarage(); // Refresh UI
}

function applyCarSettings() {
  const carData = CAR_DB.find(c => c.id === selectedCarId) || CAR_DB[0];
  if (carData) {
    car.src = carData.img;

    // Update sound if changed
    // NOTE: We only want to restart sound if game is running or if we want to preview?
    // Let's just update the src property. It won't play until .play() is called.
    // If game is running, we might need to hotswap.
    if (engineSound.src.indexOf(carData.sound) === -1) {
      const wasPlaying = !engineSound.paused;
      engineSound.src = carData.sound;
      if (wasPlaying && !isMuted) engineSound.play().catch(() => { });
    }
  }
}

// --- UTILS ---

function showToast(msg) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<span>🔔</span> ${msg}`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function unlockAchievement(id) {
  if (!earnedAchievements.includes(id)) {
    earnedAchievements.push(id);
    localStorage.setItem('achievements', JSON.stringify(earnedAchievements));
    showToast(`Achievement Unlocked!`);
  }
}

function toggleSettings() {
  const modal = document.getElementById('settingsModal');
  modal.style.display = 'flex';
}
function closeSettings() {
  document.getElementById('settingsModal').style.display = 'none';
}
function showAchievements() { showToast(`Achievements: ${earnedAchievements.length}`); }

let lastTap = 0;
game.addEventListener('touchstart', (e) => {
  const currentTime = new Date().getTime();
  if (currentTime - lastTap < 500) {
    activateNitro();
    e.preventDefault();
  }
  lastTap = currentTime;
});
