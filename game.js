const game = document.getElementById("game");
const car = document.getElementById("car");
const scoreDisplay = document.getElementById("score");
const gameOverScreen = document.getElementById("gameOver");
const finalScore = document.getElementById("finalScore");

let carX = 165;
let speed = 4;
let isGameOver = false;
let isGameStarted = false;
let score = 0;
let carVelocity = 0;
let acceleration = 10;
let friction = 0.9;
let speedInterval;
let spawnInterval;

// Sounds
const crashSound = new Audio("crash.mp3");
const engineSound = new Audio("engine.mp3");
engineSound.loop = true;
engineSound.volume = 0.2;

// Touch controls for left/right halves
game.addEventListener("touchstart", e => {
  if (isGameOver || !isGameStarted) return;
  const touchX = e.touches[0].clientX - game.getBoundingClientRect().left;
  if (touchX < 200) {
    carVelocity = -acceleration;
  } else {
    carVelocity = acceleration;
  }
});
game.addEventListener("touchend", e => {
  carVelocity = 0;
});

// Mouse controls for left/right halves
game.addEventListener("mousedown", e => {
  if (isGameOver || !isGameStarted) return;
  const clickX = e.clientX - game.getBoundingClientRect().left;
  if (clickX < 200) {
    carVelocity = -acceleration;
  } else {
    carVelocity = acceleration;
  }
});
game.addEventListener("mouseup", e => {
  carVelocity = 0;
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
  carX = Math.max(40, Math.min(250, carX)); // Keep car on road
  car.style.left = carX + "px";
  carVelocity *= friction;
  requestAnimationFrame(moveCar);
}
moveCar();

// Obstacles images
const obstacleImages = ["obstacle1.png","obstacle2.png"];

function createObstacle() {
  if(isGameOver || !isGameStarted) return;

  const obs = document.createElement("img");
  obs.src = obstacleImages[Math.floor(Math.random()*obstacleImages.length)];
  obs.classList.add("obstacle");
  obs.style.left = Math.random() * 240 + 40 + "px"; // Keep within road, assuming road is 320px wide, centered
  game.appendChild(obs);

  let obsY = -60;

  function moveObstacle() {
    if(isGameOver) return;

    obsY += speed;
    obs.style.top = obsY + "px";

    // Collision detection
    const carRect = car.getBoundingClientRect();
    const obsRect = obs.getBoundingClientRect();
    if (
      carRect.left < obsRect.right &&
      carRect.right > obsRect.left &&
      carRect.top < obsRect.bottom &&
      carRect.bottom > obsRect.top
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
  crashSound.play();
  engineSound.pause();
  finalScore.innerText = "Your Score: " + score;
  gameOverScreen.style.display = "flex";
}

// Start game
function startGame() {
  document.getElementById("startScreen").style.display = "none";
  game.style.display = "block";
  isGameStarted = true;
  isGameOver = false;
  // Start engine sound
  engineSound.play().catch(()=>{});
  // Start intervals
  speedInterval = setInterval(increaseSpeed, 3000);
  spawnInterval = setInterval(spawnObstacle, 1200);
}

// Restart without reload
function restartGame() {
  // Reset variables
  carX = 165;
  speed = 4;
  isGameOver = false;
  isGameStarted = true;
  score = 0;
  carVelocity = 0;
  scoreDisplay.innerText = "Score: 0";
  gameOverScreen.style.display = "none";

  // Remove remaining obstacles
  document.querySelectorAll(".obstacle").forEach(o=>o.remove());

  // Restart intervals if not running
  if (!speedInterval) speedInterval = setInterval(increaseSpeed, 3000);
  if (!spawnInterval) spawnInterval = setInterval(spawnObstacle, 1200);

  // Restart engine sound
  engineSound.play().catch(()=>{});
}
