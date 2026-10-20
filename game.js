(() => {
  const COLS = 27;
  const ROWS = 18;
  const TOKENS = ["AI", "MCP", "API", "SHIP"];
  const STORAGE_KEY = "ravi-build-loop-best";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let canvas;
  let ctx;
  let section;
  let frame = 0;
  let lastTime = 0;
  let accumulator = 0;
  let tickMs = 145;
  let state = "ready";
  let launched = false;
  let snake = [];
  let direction = { x: 1, y: 0 };
  let nextDirection = { x: 1, y: 0 };
  let food = { x: 0, y: 0, token: TOKENS[0] };
  let score = 0;
  let best = 0;

  window.initBuildGame = function initBuildGame() {
    section = document.querySelector(".build-section");
    canvas = document.querySelector("#buildCanvas");
    if (!section || !canvas) return;
    ctx = canvas.getContext("2d");
    try { best = Number(localStorage.getItem(STORAGE_KEY)) || 0; } catch { best = 0; }
    document.querySelector("#gameBest").textContent = String(best).padStart(2, "0");
    fitCanvas();
    newGame();
    window.addEventListener("resize", fitCanvas, { passive: true });
    document.querySelector("#gameStart").addEventListener("click", toggleGame);
    document.querySelectorAll("[data-direction]").forEach(button => {
      button.addEventListener("pointerdown", event => {
        event.preventDefault();
        setDirection(button.dataset.direction);
        canvas.focus({ preventScroll: true });
      });
    });
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && state === "running") pauseGame("Paused while you were away");
    });
  };

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

  function newGame() {
    cancelAnimationFrame(frame);
    state = "ready";
    launched = false;
    score = 0;
    direction = { x: 1, y: 0 };
    nextDirection = { ...direction };
    snake = [{ x: 8, y: 9 }, { x: 7, y: 9 }, { x: 6, y: 9 }];
    tickMs = reducedMotion.matches ? 205 : 145;
    placeFood();
    updateHUD("Ready when you are", "READY");
    setButton("Start building", "↗");
    render();
  }

  function toggleGame() {
    if (state === "running") {
      pauseGame("Paused · press resume when ready");
      return;
    }
    if (state === "over") newGame();
    state = "running";
    lastTime = 0;
    accumulator = 0;
    updateHUD(launched ? "Collect the next tool" : "Choose a direction to start", `LEVEL ${String(1 + Math.floor(score / 5)).padStart(2, "0")}`);
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

  function loop(now) {
    if (state !== "running") return;
    if (!launched) {
      render();
      frame = requestAnimationFrame(loop);
      return;
    }
    if (!lastTime) lastTime = now;
    accumulator += Math.min(now - lastTime, 250);
    lastTime = now;
    while (accumulator >= tickMs && state === "running") {
      advance();
      accumulator -= tickMs;
    }
    render();
    frame = requestAnimationFrame(loop);
  }

  function advance() {
    direction = nextDirection;
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    const found = head.x === food.x && head.y === food.y;
    const body = found ? snake : snake.slice(0, -1);
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS || body.some(part => part.x === head.x && part.y === head.y)) {
      finishGame();
      return;
    }
    snake.unshift(head);
    if (found) {
      score++;
      if (score > best) {
        best = score;
        try { localStorage.setItem(STORAGE_KEY, String(best)); } catch { /* Private browsing can disable storage. */ }
        document.querySelector("#gameBest").textContent = String(best).padStart(2, "0");
      }
      tickMs = Math.max(reducedMotion.matches ? 125 : 92, tickMs - 2.5);
      placeFood();
      updateHUD(`${food.token} added to the pipeline`, `LEVEL ${String(1 + Math.floor(score / 5)).padStart(2, "0")}`);
    } else {
      snake.pop();
    }
  }

  function finishGame() {
    state = "over";
    cancelAnimationFrame(frame);
    updateHUD(`Pipeline stopped · ${score} ${score === 1 ? "tool" : "tools"} collected`, "RUN COMPLETE");
    setButton("Build again", "↻");
  }

  function placeFood() {
    const empty = [];
    for (let y = 1; y < ROWS - 1; y++) {
      for (let x = 1; x < COLS - 1; x++) {
        if (!snake.some(part => part.x === x && part.y === y)) empty.push({ x, y });
      }
    }
    const spot = empty[Math.floor(Math.random() * empty.length)] || { x: 13, y: 9 };
    food = { ...spot, token: TOKENS[score % TOKENS.length] };
  }

  function onKeyDown(event) {
    if (!section.contains(document.activeElement)) return;
    const keys = { ArrowUp: "up", w: "up", W: "up", ArrowDown: "down", s: "down", S: "down", ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right" };
    if (keys[event.key] && state === "running") {
      event.preventDefault();
      setDirection(keys[event.key]);
    } else if (event.code === "Space" && ["running", "paused"].includes(state)) {
      event.preventDefault();
      toggleGame();
    } else if (event.key === "Enter" && ["ready", "over"].includes(state)) {
      toggleGame();
    }
  }

  function setDirection(value) {
    const turns = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
    const next = turns[value];
    if (!next || (next.x + nextDirection.x === 0 && next.y + nextDirection.y === 0)) return;
    nextDirection = next;
    if (state === "running" && !launched) {
      launched = true;
      updateHUD("Collect the next tool", `LEVEL ${String(1 + Math.floor(score / 5)).padStart(2, "0")}`);
    }
  }

  function updateHUD(message, level) {
    document.querySelector("#gameScore").textContent = String(score).padStart(2, "0");
    document.querySelector("#gameStatus").textContent = message;
    document.querySelector("#gameLevel").textContent = level;
  }

  function setButton(label, icon) {
    const button = document.querySelector("#gameStart");
    button.innerHTML = `${label} <span aria-hidden="true">${icon}</span>`;
  }

  function render() {
    if (!ctx || !canvas) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    const cell = Math.min(width / COLS, height / ROWS);
    const boardW = cell * COLS;
    const boardH = cell * ROWS;
    const offsetX = (width - boardW) / 2;
    const offsetY = (height - boardH) / 2;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#1a211d";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#303a32";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= COLS; x++) {
      const px = offsetX + x * cell;
      ctx.moveTo(px, offsetY);
      ctx.lineTo(px, offsetY + boardH);
    }
    for (let y = 0; y <= ROWS; y++) {
      const py = offsetY + y * cell;
      ctx.moveTo(offsetX, py);
      ctx.lineTo(offsetX + boardW, py);
    }
    ctx.stroke();
    ctx.strokeStyle = "#65745c";
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX + 1, offsetY + 1, boardW - 2, boardH - 2);
    drawToken(offsetX + food.x * cell, offsetY + food.y * cell, cell, food.token);
    snake.forEach((part, index) => {
      const inset = Math.max(2, cell * .13);
      ctx.fillStyle = index === 0 ? "#c6d49f" : `rgba(145, 169, 122, ${Math.max(.45, .9 - index / (snake.length * 1.35))})`;
      roundedRect(offsetX + part.x * cell + inset, offsetY + part.y * cell + inset, cell - inset * 2, cell - inset * 2, Math.max(2, cell * .22));
      if (index === 0) {
        ctx.fillStyle = "#243023";
        const eyeX = offsetX + part.x * cell + cell * (direction.x >= 0 ? .68 : .3);
        const eyeY = offsetY + part.y * cell + cell * (direction.y >= 0 ? .68 : .3);
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, Math.max(1.4, cell * .055), 0, Math.PI * 2);
        ctx.fill();
      }
    });
    if (state === "ready") drawOverlay(width, height, "IDEA → TOOL → SHIP", "PRESS START TO BEGIN");
    if (state === "running" && !launched) drawOverlay(width, height, "PIPELINE READY", "CHOOSE A DIRECTION TO START");
    if (state === "paused") drawOverlay(width, height, "PAUSED", "YOUR PIPELINE IS SAFE");
    if (state === "over") drawOverlay(width, height, "RUN COMPLETE", "RESET AND KEEP BUILDING");
  }

  function drawToken(x, y, cell, label) {
    const inset = Math.max(2, cell * .12);
    ctx.fillStyle = "#e7b968";
    roundedRect(x + inset, y + inset, cell - inset * 2, cell - inset * 2, Math.max(3, cell * .28));
    ctx.fillStyle = "#382e20";
    ctx.font = `600 ${Math.max(7, cell * .29)}px ui-monospace, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + cell / 2, y + cell / 2 + .5);
  }

  function drawOverlay(width, height, title, subtitle) {
    const boxW = Math.min(width - 34, 290);
    const boxH = 76;
    const x = (width - boxW) / 2;
    const y = (height - boxH) / 2;
    ctx.fillStyle = "rgba(22, 30, 24, .92)";
    roundedRect(x, y, boxW, boxH, 5);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#e8eadc";
    ctx.font = "500 14px Georgia, serif";
    ctx.fillText(title, width / 2, y + 27);
    ctx.fillStyle = "#aeb79f";
    ctx.font = "8px ui-monospace, monospace";
    ctx.fillText(subtitle, width / 2, y + 51);
  }

  function roundedRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
  }
})();
