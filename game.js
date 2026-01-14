const game = document.getElementById("game");
const car = document.getElementById("car");
const scoreDisplay = document.getElementById("score");
const gameOverScreen = document.getElementById("gameOver");
const finalScore = document.getElementById("finalScore");

// Road tile elements for seamless looping background
let road1, road2;

let carX = 165;
let speed = 4;
let backgroundY = 0;
let isGameOver = false;
let isGameStarted = false;
let score = 0;
let carVelocity = 0;
let acceleration = 10;
let friction = 0.9;
let speedInterval;
let spawnInterval;
let highScore = localStorage.getItem('highScore') || 0;
document.getElementById('highScore').innerText = highScore;

// Sounds
const crashSound = new Audio("crash.mp3");
const engineSound = new Audio("engine.mp3");
engineSound.loop = true;
engineSound.volume = 0.2;

// Score-based sounds
const soundLow = new Audio("Sound 0-5.mp3");
const soundMid = new Audio("Sound 6-10.mp3");
const soundHigh = new Audio("Sound 11-20.mp3");
const soundLegend = new Audio("Sound 30-1000.mp3");

// Touch controls for left/right halves - discrete movement per tap
game.addEventListener("touchstart", e => {
  if (isGameOver || !isGameStarted) return;
  e.preventDefault();
  const touchX = e.touches[0].clientX - game.getBoundingClientRect().left;
  if (touchX < game.clientWidth / 2) {
    carX = Math.max(0, carX - 25);
  } else {
    carX = Math.min(350, carX + 25);
  }
  car.style.left = carX + "px";
});

// Mouse controls for left/right halves - discrete movement per click
game.addEventListener("mousedown", e => {
  if (isGameOver || !isGameStarted) return;
  e.preventDefault();
  const clickX = e.clientX - game.getBoundingClientRect().left;
  if (clickX < game.clientWidth / 2) {
    carX = Math.max(0, carX - 25);
  } else {
    carX = Math.min(350, carX + 25);
  }
  car.style.left = carX + "px";
});

// Keyboard control (PC) - hold to move
document.addEventListener("keydown", e => {
  if(isGameOver || !isGameStarted) return;
  if(e.key === "ArrowLeft") carVelocity = -acceleration;
  if(e.key === "ArrowRight") carVelocity = acceleration;
});
document.addEventListener("keyup", e => {
  if(isGameOver || !isGameStarted) return;
  if(e.key === "ArrowLeft" || e.key === "ArrowRight") carVelocity = 0;
});

// Movement loop
function moveCar() {
  if(isGameOver) return;
  carX += carVelocity;
  carX = Math.max(0, Math.min(350, carX)); // Keep car on road
  car.style.left = carX + "px";
  carVelocity *= friction;
  backgroundY += speed; // Scroll background down
  // Loop two road tiles so the background never shows seams
  if (road1 && road2) {
    const tileH = game.clientHeight || window.innerHeight;
    const offset = backgroundY % tileH;
    road1.style.transform = `translateY(${offset - tileH}px)`;
    road2.style.transform = `translateY(${offset}px)`;
  }
  requestAnimationFrame(moveCar);
}
// create road tiles behind other game elements
function initRoadTiles(){
  if (road1 || road2) return;
  road1 = document.createElement('div');
  road2 = document.createElement('div');
  road1.className = 'road-tile';
  road2.className = 'road-tile';
  // insert as first children so they sit under score/car (z-index controlled in CSS)
  game.insertBefore(road1, game.firstChild);
  game.insertBefore(road2, game.firstChild);
}

initRoadTiles();
moveCar();

// Obstacles images
const obstacleImages = ["obstacle1.png","obstacle2.png"];

function createObstacle() {
  if(isGameOver || !isGameStarted) return;

  const obs = document.createElement("img");
  obs.src = obstacleImages[Math.floor(Math.random()*obstacleImages.length)];
  obs.classList.add("obstacle");
  obs.style.left = Math.random() * 200 + 40 + "px"; // Keep within road
  game.appendChild(obs);

  let obsY = -60;
  let isMoving = false;
  let obsX, hDirection;
  if (obs.src.includes('obstacle2.png') && Math.random() < 0.1) {
    isMoving = true;
    obsX = parseInt(obs.style.left);
    hDirection = Math.random() > 0.5 ? 1 : -1;
  }

  function moveObstacle() {
    if(isGameOver) return;

    obsY += speed;
    obs.style.top = obsY + "px";
    if (isMoving) {
      obsX += hDirection * 2;
      if (obsX < 40 || obsX > 240) hDirection *= -1;
      obs.style.left = obsX + 'px';
    }

    // Collision detection with buffer to make it less sensitive
    const carRect = car.getBoundingClientRect();
    const obsRect = obs.getBoundingClientRect();
    const buffer = 5; // pixels
    if (
      carRect.left + buffer < obsRect.right - buffer &&
      carRect.right - buffer > obsRect.left + buffer &&
      carRect.top + buffer < obsRect.bottom - buffer &&
      carRect.bottom - buffer > obsRect.top + buffer
    ) {
      endGame();
    }

    // Remove offscreen obstacles & increase score
    if(obsY < 700){
      requestAnimationFrame(moveObstacle);
    } else {
      obs.remove();
      if(!isGameOver) score++;
      scoreDisplay.innerText = "Score: " + score;
    }
  }
  moveObstacle();
}

// Increase speed over time
function increaseSpeed() {
  if(!isGameOver && isGameStarted) speed += 0.5;
}

// Spawn obstacles periodically
function spawnObstacle() {
  if(!isGameOver && isGameStarted) createObstacle();
}

// End game
function endGame() {
  if(isGameOver) return;
  isGameOver = true;
  clearInterval(speedInterval);
  clearInterval(spawnInterval);
  speedInterval = undefined;
  spawnInterval = undefined;
  crashSound.play();
  engineSound.pause();
  // Exit fullscreen/mobile playing state
  document.body.classList.remove('playing');

  // Play score-based sound after crash
  crashSound.onended = () => {
    if (score <= 5) {
      soundLow.play();
    } else if (score <= 10) {
      soundMid.play();
    } else if (score <= 20) {
      soundHigh.play();
    } else if (score >= 30) {
      soundLegend.play();
    }
  };
  finalScore.innerText = "Your Score: " + score;
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('highScore', highScore);
  }

  // Set quote based on score
  let quote = "";
  if (score == 0) {
    quote = "You are Gay";
  } else if (score <= 5) {
    quote = "You are a Bot";
  } else if (score <= 10) {
    quote = "You are a Noob";
  } else if (score <= 19) {
    quote = "You are cooking";
  } else if (score <= 30) {
    quote = "You are a Pro Sigma";
  } else if (score <= 100) {
    quote = "You are a Legend";
  } else {
    quote = "You are God";
  }
  document.getElementById('quote').innerText = quote;

  gameOverScreen.style.display = "flex";
}

// Start game
function startGame() {
  document.getElementById("startScreen").style.display = "none";
  game.style.display = "block";
  // Enable playing/fullscreen mobile mode
  document.body.classList.add('playing');
  isGameStarted = true;
  isGameOver = false;
  // Start engine sound
  engineSound.play().catch(()=> {});
  // Start intervals
  speedInterval = setInterval(increaseSpeed, 3000);
  spawnInterval = setInterval(spawnObstacle, 1200);
}

// Restart without reload
function restartGame() {
  // Reset variables
  carX = 165;
  speed = 4;
  backgroundY = 0;
  isGameOver = false;
  isGameStarted = true;
  // Keep mobile fullscreen/playing state
  document.body.classList.add('playing');
  score = 0;
  carVelocity = 0;
  scoreDisplay.innerText = "Score: 0";
  gameOverScreen.style.display = "none";
  // Reset road tile positions
  backgroundY = 0;
  if (road1 && road2) {
    const tileH = game.clientHeight || window.innerHeight;
    road1.style.transform = `translateY(${ -tileH }px)`;
    road2.style.transform = `translateY(0px)`;
  }

  // Remove remaining obstacles
  document.querySelectorAll(".obstacle").forEach(o=>o.remove());

  // Restart intervals if not running
  if (!speedInterval) speedInterval = setInterval(increaseSpeed, 3000);
  if (!spawnInterval) spawnInterval = setInterval(spawnObstacle, 1200);

  // Restart animation loop
  moveCar();

  // Spawn first obstacle immediately
  spawnObstacle();

  // Restart engine sound
  engineSound.play().catch(()=>{});
}
