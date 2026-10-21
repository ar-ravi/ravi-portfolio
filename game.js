(() => {
  const STORAGE_KEY = "ravi-dino-run-best";
  const GROUND = 0.78;
  let canvas;
  let ctx;
  let section;
  let frame = 0;
  let lastTime = 0;
  let state = "ready";
  let score = 0;
  let best = 0;
  let speed = 250;
  let spawnIn = 1.25;
  let world = 0;
  let dino;
  let obstacles = [];
  let clouds = [];

  window.initBuildGame = function initBuildGame() {
    section = document.querySelector(".hero-game");
    canvas = document.querySelector("#buildCanvas");
    if (!section || !canvas) return;
    ctx = canvas.getContext("2d");
    try { best = Number(localStorage.getItem(STORAGE_KEY)) || 0; } catch { best = 0; }
    document.querySelector("#gameBest").textContent = String(best).padStart(2, "0");
    resetGame();
    fitCanvas();
    window.addEventListener("resize", fitCanvas, { passive: true });
    document.querySelector("#gameStart").addEventListener("click", onButton);
    document.querySelector('[data-action="jump"]').addEventListener("pointerdown", event => {
      event.preventDefault();
      canvas.focus({ preventScroll: true });
      jump();
    });
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && state === "running") pauseGame("Paused while you were away");
    });
  };

  function resetGame() {
    cancelAnimationFrame(frame);
    state = "ready";
    score = 0;
    speed = 250;
    spawnIn = 1.25;
    world = 0;
    obstacles = [];
    clouds = [{ x: .2, y: .19, s: 1 }, { x: .72, y: .31, s: .7 }, { x: 1.08, y: .14, s: .9 }];
    dino = { x: .14, y: 0, vy: 0, duck: false, run: 0 };
    updateHUD("Ready when you are", "READY");
    setButton("Start running", "↗");
    render();
  }

  function fitCanvas() {
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    render();
  }

  function onButton() {
    if (state === "running") pauseGame("Paused · press resume when ready");
    else if (state === "paused") startGame();
    else {
      if (state === "over") resetGame();
      startGame();
    }
  }

  function startGame() {
    state = "running";
    lastTime = 0;
    updateHUD("Keep running!", "RUNNING");
    setButton("Pause", "Ⅱ");
    canvas.focus({ preventScroll: true });
    frame = requestAnimationFrame(loop);
  }

  function pauseGame(message = "Paused") {
    if (state !== "running") return;
    state = "paused";
    cancelAnimationFrame(frame);
    updateHUD(message, "PAUSED");
    setButton("Resume", "↗");
    render();
  }

  function jump() {
    if (state === "ready") startGame();
    if (state !== "running") return;
    if (dino.y >= -1) {
      dino.vy = -560;
      dino.duck = false;
    }
  }

  function onKeyDown(event) {
    if (!section.contains(document.activeElement)) return;
    if (event.code === "Space" || event.key === "ArrowUp" || event.key.toLowerCase() === "w") {
      event.preventDefault();
      if (state === "paused") startGame();
      else jump();
    } else if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") {
      event.preventDefault();
      if (state === "running" && dino.y >= -1) dino.duck = true;
    } else if (event.key.toLowerCase() === "p" && ["running", "paused"].includes(state)) {
      if (state === "running") pauseGame(); else startGame();
    } else if (event.key === "Enter" && ["ready", "over"].includes(state)) {
      onButton();
    }
  }

  function onKeyUp(event) {
    if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") dino.duck = false;
  }

  function loop(now) {
    if (state !== "running") return;
    if (!lastTime) lastTime = now;
    const dt = Math.min((now - lastTime) / 1000, .05);
    lastTime = now;
    update(dt);
    render();
    frame = requestAnimationFrame(loop);
  }

  function update(dt) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    world += speed * dt;
    dino.run += dt * 12;
    speed = Math.min(speed + dt * 5, 390);
    const groundY = height * GROUND;
    dino.vy += 1500 * dt;
    dino.y = Math.min(0, dino.y + dino.vy * dt);
    if (dino.y >= 0) dino.vy = 0;

    spawnIn -= dt;
    if (spawnIn <= 0) {
      const bird = score > 4 && Math.random() < .25;
      obstacles.push({ x: width + 12, type: bird ? "bird" : "cactus", size: Math.random() < .4 ? 1 : 0 });
      spawnIn = Math.max(1.05, 1.5 + Math.random() * .9 - score * .012);
    }
    obstacles.forEach(obstacle => { obstacle.x -= speed * dt; });
    obstacles = obstacles.filter(obstacle => obstacle.x > -55);
    clouds.forEach(cloud => {
      cloud.x -= dt * (cloud.s * 10 + 4) / Math.max(width, 1);
      if (cloud.x < -.15) cloud.x = 1.12;
    });

    const player = playerBox(width, height);
    for (const obstacle of obstacles) {
      const box = obstacleBox(obstacle, height);
      if (overlaps(player, box)) { finishGame(); return; }
    }
    score = Math.floor(world / 80);
    document.querySelector("#gameScore").textContent = String(score).padStart(2, "0");
    if (score > best) {
      best = score;
      try { localStorage.setItem(STORAGE_KEY, String(best)); } catch { /* Storage can be unavailable. */ }
      document.querySelector("#gameBest").textContent = String(best).padStart(2, "0");
    }
  }

  function playerBox(width, height) {
    const x = width * dino.x;
    const h = dinoHeight();
    return { x: x + 3, y: height * GROUND - h + dino.y + 4, w: dino.duck ? 45 : 44, h: h - 7 };
  }

  function dinoHeight() { return dino?.duck ? 34 : 51; }

  function obstacleBox(obstacle, height) {
    if (obstacle.type === "bird") return { x: obstacle.x + 3, y: height * GROUND - 58, w: 30, h: 18 };
    return { x: obstacle.x + 3, y: height * GROUND - (obstacle.size ? 43 : 32), w: obstacle.size ? 22 : 16, h: obstacle.size ? 43 : 32 };
  }

  function overlaps(a, b) {
    return a.x < b.x + b.w - 4 && a.x + a.w - 4 > b.x && a.y < b.y + b.h - 3 && a.y + a.h > b.y + 3;
  }

  function finishGame() {
    state = "over";
    cancelAnimationFrame(frame);
    updateHUD(`Run over · score ${score}`, "GAME OVER");
    setButton("Run again", "↻");
    render();
  }

  function updateHUD(message, level) {
    document.querySelector("#gameScore").textContent = String(score).padStart(2, "0");
    document.querySelector("#gameStatus").textContent = message;
    document.querySelector("#gameLevel").textContent = level;
  }

  function setButton(label, icon) {
    document.querySelector("#gameStart").innerHTML = `${label} <span aria-hidden="true">${icon}</span>`;
  }

  function render() {
    if (!ctx || !canvas) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    const groundY = h * GROUND;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#dce8d4";
    ctx.fillRect(0, 0, w, h);
    drawBackdrop(w, h, groundY);
    ctx.fillStyle = "#657451";
    ctx.fillRect(0, groundY, w, 2);
    ctx.fillStyle = "#a8aa87";
    for (let x = -(world % 28); x < w; x += 28) ctx.fillRect(x, groundY + 7 + ((x / 28) % 2) * 3, 12, 2);
    obstacles.forEach(obstacle => drawObstacle(obstacle, h));
    drawDino(w, groundY);
    if (state === "ready") drawOverlay(w, h, "READY, SET, RUN!", "PRESS START OR SPACE");
    if (state === "paused") drawOverlay(w, h, "PAUSED", "PRESS P OR RESUME");
    if (state === "over") drawOverlay(w, h, "NICE RUN!", "PRESS RUN AGAIN TO RETRY");
  }

  function drawBackdrop(w, h, groundY) {
    ctx.fillStyle = "#2147a6";
    ctx.globalAlpha = .11;
    clouds.forEach(cloud => {
      const x = cloud.x * w;
      const y = cloud.y * h;
      ctx.fillRect(x, y, 29 * cloud.s, 5);
      ctx.fillRect(x + 7 * cloud.s, y - 4, 13 * cloud.s, 5);
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#c9ec69";
    ctx.beginPath();
    ctx.arc(w * .84, h * .21, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#a5b48f";
    ctx.globalAlpha = .42;
    ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(w * .18, groundY - 23); ctx.lineTo(w * .38, groundY); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w * .42, groundY); ctx.lineTo(w * .68, groundY - 29); ctx.lineTo(w, groundY); ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawDino(w, groundY) {
    const x = w * .14;
    const duck = dino.duck;
    const y = groundY - dinoHeight() + dino.y;
    const color = "#192235";
    ctx.fillStyle = color;
    if (duck) {
      ctx.fillRect(x + 2, y + 14, 39, 15);
      ctx.fillRect(x + 30, y + 4, 17, 14);
      ctx.fillRect(x + 41, y + 9, 10, 8);
      ctx.fillRect(x - 5, y + 19, 10, 7);
      ctx.fillRect(x + 17, y + 20, 13, 4);
      const leg = Math.sin(dino.run) > 0 ? 1 : 0;
      ctx.fillRect(x + 11, y + 27, 6, 5 + leg * 2);
      ctx.fillRect(x + 32, y + 27, 6, 5 + (1 - leg) * 2);
      ctx.fillStyle = "#f6f1e3";
      ctx.fillRect(x + 39, y + 7, 4, 4);
      ctx.fillStyle = "#e65335";
      ctx.fillRect(x + 44, y + 15, 5, 2);
    } else {
      ctx.fillRect(x + 10, y + 20, 29, 20);
      ctx.fillRect(x + 26, y + 11, 13, 20);
      ctx.fillRect(x + 29, y + 2, 18, 15);
      ctx.fillRect(x + 40, y + 9, 11, 8);
      ctx.fillRect(x + 2, y + 25, 12, 7);
      ctx.fillRect(x - 4, y + 22, 9, 5);
      ctx.fillRect(x + 29, y + 25, 11, 4);
      ctx.fillRect(x + 37, y + 28, 5, 6);
      ctx.fillStyle = "#c9ec69";
      ctx.fillRect(x + 14, y + 15, 6, 6);
      ctx.fillRect(x + 21, y + 12, 6, 7);
      ctx.fillRect(x + 28, y + 14, 6, 5);
      const leg = Math.sin(dino.run) > 0 ? 1 : 0;
      ctx.fillStyle = color;
      ctx.fillRect(x + 14, y + 38, 7, 9 - leg * 4);
      ctx.fillRect(x + 31, y + 38, 7, 5 + leg * 4);
      ctx.fillRect(x + 10, y + 46 - leg * 4, 13, 5);
      ctx.fillRect(x + 29, y + 42 + leg * 4, 13, 5);
      ctx.fillRect(x + 28, y + 19, 9, 4);
      ctx.fillRect(x + 36, y + 21, 4, 5);
      ctx.fillStyle = "#f6f1e3";
      ctx.fillRect(x + 41, y + 5, 4, 4);
      ctx.fillStyle = "#e65335";
      ctx.fillRect(x + 45, y + 15, 5, 2);
    }
  }

  function drawObstacle(obstacle, height) {
    const groundY = height * GROUND;
    ctx.fillStyle = "#e65335";
    if (obstacle.type === "bird") {
      const wing = Math.sin(world / 13) > 0 ? -5 : 2;
      ctx.fillRect(obstacle.x + 4, groundY - 58, 25, 7);
      ctx.fillRect(obstacle.x, groundY - 54 + wing, 15, 5);
      ctx.fillRect(obstacle.x + 20, groundY - 54 + wing, 13, 5);
    } else if (obstacle.size) {
      ctx.fillRect(obstacle.x + 7, groundY - 43, 10, 43);
      ctx.fillRect(obstacle.x, groundY - 32, 9, 6);
      ctx.fillRect(obstacle.x, groundY - 40, 5, 14);
      ctx.fillRect(obstacle.x + 15, groundY - 27, 8, 6);
      ctx.fillRect(obstacle.x + 18, groundY - 35, 5, 13);
    } else {
      ctx.fillRect(obstacle.x + 5, groundY - 32, 10, 32);
      ctx.fillRect(obstacle.x, groundY - 23, 6, 6);
      ctx.fillRect(obstacle.x, groundY - 29, 4, 12);
    }
  }

  function drawOverlay(w, h, title, subtitle) {
    ctx.fillStyle = "rgba(220, 232, 212, .86)";
    ctx.fillRect(0, h * .37, w, h * .28);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#192235";
    ctx.font = "700 13px ui-monospace, monospace";
    ctx.fillText(title, w / 2, h * .46);
    ctx.fillStyle = "#2147a6";
    ctx.font = "700 8px ui-monospace, monospace";
    ctx.fillText(subtitle, w / 2, h * .56);
  }
})();
