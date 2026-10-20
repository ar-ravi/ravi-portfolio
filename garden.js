(() => {
  const palettes = {
    pond: {
      sky: "#e8dfc4", skyGlow: "#f5edcf", water: "#72938c", waterDeep: "#375f62",
      tree: ["#506f61", "#6e8465", "#a0a36d", "#c1af72"],
      waterStrokes: ["#a9b58c", "#d5c792", "#81a69a", "#547b7a", "#d2d2b1"],
      paint: ["#d8d39c", "#aec5a0", "#8db6af", "#efcfb1", "#7e9c91"],
      lily: "#718c63", flower: "#f6e8d0", petal: "#d98572", center: "#d9ad59", text: "#465a4d"
    },
    morning: {
      sky: "#d8e7dc", skyGlow: "#fff0c9", water: "#719a9d", waterDeep: "#436a77",
      tree: ["#557b70", "#819774", "#c2b978", "#e5c98e"],
      waterStrokes: ["#c4d1ae", "#e8d8a2", "#8dc0b8", "#5f8e97", "#e8e5c9"],
      paint: ["#c7d7ad", "#f3d793", "#9bcfc4", "#f3ded0", "#7cabb0"],
      lily: "#82996d", flower: "#fff1d9", petal: "#edaa8f", center: "#e2bd68", text: "#49645c"
    },
    evening: {
      sky: "#edc7b2", skyGlow: "#f5d9a7", water: "#8d777c", waterDeep: "#514f67",
      tree: ["#58685c", "#7c7664", "#bd8f78", "#d7aa76"],
      waterStrokes: ["#d6a188", "#efc895", "#a68b93", "#657c78", "#ebd1b1"],
      paint: ["#e5ab91", "#f0cf9c", "#bd9ca0", "#d8d7b2", "#8da79a"],
      lily: "#77846a", flower: "#ffe7d4", petal: "#dc8c8b", center: "#e6bb73", text: "#66565a"
    }
  };

  let profile;
  let canvas;
  let ctx;
  let observer;
  let currentPalette = "pond";
  let marks = [];
  let lilyPositions = [];
  let drawing = false;
  let previousPoint = null;
  let activeProject = null;
  let canvasWidth = 0;
  let canvasHeight = 0;

  window.initGarden = function initGarden(config) {
    profile = config;
    canvas = document.querySelector("#gardenCanvas");
    if (!canvas) return;
    ctx = canvas.getContext("2d", { alpha: false });
    bindControls();
    observer = new ResizeObserver(resize);
    observer.observe(canvas);
    renderProjectLinks();
  };

  function bindControls() {
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", endStroke);
    canvas.addEventListener("pointercancel", endStroke);
    canvas.addEventListener("pointerleave", event => {
      if (drawing && event.buttons === 0) endStroke();
      if (!drawing) canvas.style.cursor = "crosshair";
    });

    document.querySelectorAll(".garden-palette").forEach(button => {
      button.addEventListener("click", () => {
        currentPalette = button.dataset.palette;
        document.querySelectorAll(".garden-palette").forEach(item => {
          const active = item === button;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-pressed", String(active));
        });
        marks = [];
        draw();
      });
    });

    document.querySelector("#gardenReset").addEventListener("click", () => {
      marks = [];
      activeProject = null;
      document.querySelector("#gardenSelection").hidden = true;
      draw();
      announce("Your brushstrokes have been cleared.");
    });

    document.querySelector("#gardenProjects").addEventListener("click", event => {
      const button = event.target.closest("[data-project-id]");
      if (button) selectProject(button.dataset.projectId);
    });
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    canvasWidth = rect.width;
    canvasHeight = rect.height;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvasWidth * ratio);
    canvas.height = Math.round(canvasHeight * ratio);
    ctx = canvas.getContext("2d", { alpha: false });
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    setLilyPositions();
    draw();
  }

  function setLilyPositions() {
    const projects = profile.projects || [];
    const count = Math.min(projects.length, 5);
    const slots = count === 1 ? [.55] : count === 2 ? [.35, .7] : count === 3 ? [.24, .53, .79] : [.18, .39, .61, .82, .5];
    lilyPositions = projects.slice(0, 5).map((project, index) => ({
      project,
      x: canvasWidth * slots[index],
      y: canvasHeight * (.64 + (index % 2) * .115),
      r: Math.max(22, Math.min(36, canvasWidth * .035))
    }));
  }

  function draw() {
    if (!ctx || !canvasWidth || !canvasHeight) return;
    const palette = palettes[currentPalette] || palettes.pond;
    const w = canvasWidth;
    const h = canvasHeight;
    const horizon = h * .37;
    drawSky(palette, w, horizon);
    drawDistantGarden(palette, w, horizon);
    drawWater(palette, w, h, horizon);
    drawBanks(palette, w, h, horizon);
    drawLilies(palette, h);
    drawMarks();
  }

  function drawSky(p, w, horizon) {
    const gradient = ctx.createLinearGradient(0, 0, 0, horizon);
    gradient.addColorStop(0, p.sky);
    gradient.addColorStop(.72, p.skyGlow);
    gradient.addColorStop(1, "#efe5c8");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, horizon + 2);
    const wash = ctx.createRadialGradient(w * .72, horizon * .68, 2, w * .72, horizon * .68, w * .42);
    wash.addColorStop(0, `${p.skyGlow}99`);
    wash.addColorStop(1, `${p.skyGlow}00`);
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, horizon);
    const random = seededRandom(31);
    for (let i = 0; i < 85; i++) {
      const x = random() * w;
      const y = random() * horizon * .86;
      const color = i % 3 ? p.skyGlow : "#fff7dc";
      brushDab(x, y, 8 + random() * 26, 2 + random() * 6, random() * .34, color, random() * .12);
    }
  }

  function drawDistantGarden(p, w, horizon) {
    const random = seededRandom(57);
    ctx.fillStyle = "#a09b76";
    ctx.fillRect(0, horizon - 2, w, 7);
    for (let i = 0; i < 165; i++) {
      const x = random() * w;
      const y = horizon - 4 - random() * 26;
      brushDab(x, y, 9 + random() * 29, 5 + random() * 18, random() * .72, p.tree[Math.floor(random() * p.tree.length)], random() * .5 - .25);
    }
    // A few distant vertical trunks break up the garden's soft edge.
    for (let i = 0; i < 12; i++) {
      const x = random() * w;
      ctx.beginPath();
      ctx.moveTo(x, horizon - 5);
      ctx.lineTo(x + (random() - .5) * 8, horizon - 20 - random() * 33);
      ctx.strokeStyle = `${p.tree[0]}99`;
      ctx.lineWidth = 2 + random() * 3;
      ctx.stroke();
    }
  }

  function drawWater(p, w, h, horizon) {
    const gradient = ctx.createLinearGradient(0, horizon, 0, h);
    gradient.addColorStop(0, p.water);
    gradient.addColorStop(1, p.waterDeep);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, horizon, w, h - horizon);
    const random = seededRandom(93);
    for (let i = 0; i < 520; i++) {
      const y = horizon + random() * (h - horizon);
      const depth = (y - horizon) / (h - horizon);
      const length = 5 + random() * (w * (.045 + depth * .1));
      const color = p.waterStrokes[Math.floor(random() * p.waterStrokes.length)];
      brushDab(random() * (w + 40) - 20, y, length, 1.4 + random() * 4.6, .12 + random() * .32, color, random() * .06 - .03);
    }
    // Reflected tree color gathers in soft columns beneath the far bank.
    for (let column = 0; column < 14; column++) {
      const x = (column + .5) * w / 14;
      const color = p.tree[column % p.tree.length];
      ctx.beginPath();
      ctx.moveTo(x, horizon + 3);
      ctx.bezierCurveTo(x + 13, horizon + 46, x - 11, h * .55, x + 7, h * .72);
      ctx.strokeStyle = `${color}30`;
      ctx.lineWidth = 7 + (column % 4) * 4;
      ctx.stroke();
    }
  }

  function drawBanks(p, w, h, horizon) {
    const random = seededRandom(117);
    for (const side of ["left", "right"]) {
      const direction = side === "left" ? 1 : -1;
      const edge = side === "left" ? 0 : w;
      for (let i = 0; i < 120; i++) {
        const x = edge + direction * random() * w * .14;
        const y = horizon + random() * h * .42;
        brushDab(x, y, 3 + random() * 12, 2 + random() * 8, random() * .55, p.tree[Math.floor(random() * p.tree.length)], random() * .8 - .4);
      }
      // Reed strokes at the waterline.
      for (let i = 0; i < 22; i++) {
        const x = edge + direction * random() * w * .13;
        const y = horizon + h * (.28 + random() * .2);
        ctx.beginPath();
        ctx.moveTo(x, y + 12);
        ctx.quadraticCurveTo(x + direction * 5, y - 5, x + direction * (8 + random() * 12), y - 14 - random() * 17);
        ctx.strokeStyle = `${p.tree[i % p.tree.length]}bb`;
        ctx.lineWidth = 1 + random() * 2;
        ctx.stroke();
      }
    }
  }

  function drawLilies(p, h) {
    const random = seededRandom(151);
    // Decorative pads drift through the scene; project-linked pads are drawn last.
    const decorative = [
      [canvasWidth * .13, h * .81, 16], [canvasWidth * .87, h * .72, 14],
      [canvasWidth * .78, h * .88, 12], [canvasWidth * .3, h * .58, 11]
    ];
    for (const [x, y, r] of decorative) drawPad(p, x, y, r, random, false);
    for (const lily of lilyPositions) {
      drawPad(p, lily.x, lily.y, lily.r, random, lily.project.id === activeProject);
      drawFlower(p, lily.x + lily.r * .42, lily.y - lily.r * .28, lily.r * .62, random);
    }
  }

  function drawPad(p, x, y, r, random, selected) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-.08 + random() * .16);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.25, r * .55, 0, .16, Math.PI * 1.86);
    ctx.lineTo(0, 0);
    ctx.closePath();
    const fill = ctx.createLinearGradient(0, -r, 0, r);
    fill.addColorStop(0, selected ? "#a0a970" : p.lily);
    fill.addColorStop(1, "#526f5a");
    ctx.fillStyle = fill;
    ctx.globalAlpha = .93;
    ctx.fill();
    ctx.strokeStyle = "#d2c78688";
    ctx.lineWidth = Math.max(1, r * .045);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(r * 1.22, -r * .25);
    ctx.stroke();
    ctx.restore();
  }

  function drawFlower(p, x, y, r, random) {
    ctx.save();
    ctx.translate(x, y);
    for (let i = 0; i < 7; i++) {
      ctx.save();
      ctx.rotate((Math.PI * 2 * i) / 7 + .1);
      ctx.beginPath();
      ctx.ellipse(0, -r * .4, r * .24, r * .56, 0, 0, Math.PI * 2);
      ctx.fillStyle = i % 3 === 0 ? p.petal : p.flower;
      ctx.globalAlpha = .88 + random() * .12;
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, r * .16, 0, Math.PI * 2);
    ctx.fillStyle = p.center;
    ctx.fill();
    ctx.restore();
  }

  function drawMarks() {
    for (const mark of marks) paintMark(mark);
  }

  function paintMark(mark) {
    brushDab(mark.x * canvasWidth, mark.y * canvasHeight, mark.rx * canvasWidth, mark.ry * canvasHeight, mark.alpha, mark.color, mark.rotation);
    if (mark.highlight) brushDab((mark.x + .002) * canvasWidth, (mark.y - .003) * canvasHeight, mark.rx * canvasWidth * .43, mark.ry * canvasHeight * .45, mark.alpha * .48, mark.highlight, mark.rotation - .08);
  }

  function brushDab(x, y, rx, ry, alpha, color, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation || 0);
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(.5, rx), Math.max(.5, ry), 0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fill();
    ctx.restore();
  }

  function onPointerDown(event) {
    const point = pointerPosition(event);
    const lily = lilyPositions.find(item => Math.hypot(point.x - item.x, point.y - item.y) <= item.r * 1.55);
    if (lily) {
      selectProject(lily.project.id);
      return;
    }
    if (point.y < canvasHeight * .39) return;
    drawing = true;
    previousPoint = point;
    canvas.setPointerCapture(event.pointerId);
    addMark(point.x, point.y);
  }

  function onPointerMove(event) {
    const point = pointerPosition(event);
    if (!drawing) {
      const overLily = lilyPositions.some(item => Math.hypot(point.x - item.x, point.y - item.y) <= item.r * 1.55);
      canvas.style.cursor = overLily ? "pointer" : "crosshair";
      return;
    }
    if (point.y < canvasHeight * .39) { previousPoint = point; return; }
    if (previousPoint) {
      const distance = Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y);
      const steps = Math.max(1, Math.ceil(distance / 9));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        addMark(previousPoint.x + (point.x - previousPoint.x) * t, previousPoint.y + (point.y - previousPoint.y) * t);
      }
    }
    previousPoint = point;
  }

  function endStroke() { drawing = false; previousPoint = null; }

  function addMark(x, y) {
    const trimmed = marks.length > 1800;
    if (trimmed) marks.splice(0, 40);
    const p = palettes[currentPalette];
    const colors = p.paint;
    const newMarks = [];
    for (let i = 0; i < 3; i++) {
      const radius = 3 + Math.random() * 12;
      const mark = {
        x: (x + (Math.random() - .5) * 12) / canvasWidth,
        y: (y + (Math.random() - .5) * 6) / canvasHeight,
        rx: radius / canvasWidth,
        ry: (1.2 + Math.random() * 3.8) / canvasHeight,
        alpha: .26 + Math.random() * .36,
        color: colors[Math.floor(Math.random() * colors.length)],
        highlight: Math.random() > .67 ? "#f8edcb" : null,
        rotation: (Math.random() - .5) * .08
      };
      marks.push(mark);
      newMarks.push(mark);
    }
    if (trimmed) draw();
    else newMarks.forEach(paintMark);
  }

  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function selectProject(id) {
    const project = profile.projects.find(item => item.id === id);
    if (!project) return;
    activeProject = id;
    draw();
    const panel = document.querySelector("#gardenSelection");
    const title = document.createElement("strong");
    title.textContent = project.name;
    const description = document.createElement("span");
    description.textContent = project.summary || "A project from my portfolio.";
    const link = document.createElement("a");
    link.href = `#project-${safeId(project.id)}`;
    link.textContent = "Explore this project ↗";
    panel.replaceChildren(title, description, link);
    panel.hidden = false;
    announce(`${project.name} selected. Its project summary is below the garden.`);
  }

  function renderProjectLinks() {
    const host = document.querySelector("#gardenProjects");
    const projects = (profile.projects || []).slice(0, 5);
    host.replaceChildren();
    projects.forEach((project, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.projectId = project.id;
      button.textContent = `0${index + 1} ${project.name}`;
      host.append(button);
    });
    if (!projects.length) host.textContent = "Projects will bloom here.";
  }

  function announce(message) {
    document.querySelector("#gardenInstructions").textContent = message;
  }

  function seededRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6D2B79F5;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
})();
