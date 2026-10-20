const CONFIG_URL = "portfolio-config.json";
const $ = (selector, root = document) => root.querySelector(selector);
let config;
let stars = [];
let selectedStar = null;
let resizeObserver;

async function start() {
  try {
    const response = await fetch(CONFIG_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not load ${CONFIG_URL}`);
    config = await response.json();
    validateConfig(config);
    render();
    initCanvas();
    if (typeof window.initBuildGame === "function") window.initBuildGame(config);
    bindEvents();
  } catch (error) {
    document.querySelector("main").innerHTML = `<section class="error-state"><p class="eyebrow">PORTFOLIO CONFIGURATION</p><h1>Couldn’t load the profile.</h1><p>${escapeHtml(error.message)}. Open this site through a local web server and check portfolio-config.json.</p></section>`;
  }
}

function validateConfig(data) {
  const required = ["profile", "experience", "projects", "skills", "education", "certifications"];
  for (const key of required) if (!(key in data)) throw new Error(`Missing required section: ${key}`);
  if (!data.profile.name || !data.profile.email) throw new Error("Profile name and email are required.");
  if (!Array.isArray(data.experience) || !Array.isArray(data.projects)) throw new Error("Experience and projects must be lists.");
  const ids = [...data.experience, ...data.projects].map(item => item.id);
  if (ids.some(id => !id) || new Set(ids).size !== ids.length) throw new Error("Every experience and project needs a unique id.");
}

function render() {
  const p = config.profile;
  document.title = `${p.name} — ${p.headline || "Portfolio"}`;
  document.querySelectorAll('[data-profile="name"]').forEach(el => el.textContent = p.name);
  $("#headline").textContent = (p.headline || "SOFTWARE ENGINEER").toUpperCase();
  $("#location").textContent = (p.location || "").toUpperCase();
  $("#intro").textContent = p.intro || "Software engineer building thoughtful, reliable systems.";
  $("#aboutCopy").textContent = p.about || p.intro || "";
  for (const id of ["emailLink", "footerEmail"]) { const link = $(`#${id}`); link.href = `mailto:${p.email}`; }
  $("#skyCount").textContent = `${String(config.projects.length + config.experience.length).padStart(2,"0")} SYSTEMS`;
  $("#projectCount").textContent = `${String(config.projects.length).padStart(2,"0")} PROJECT${config.projects.length === 1 ? "" : "S"}`;
  $("#year").textContent = new Date().getFullYear();
  $("#projectGrid").innerHTML = config.projects.map((project, index) => `<article class="project-card" id="project-${safeId(project.id)}"><div><div class="project-top"><span class="project-type">${escapeHtml(project.type || "PROJECT")}</span><span class="project-index">0${index + 1}</span></div><h3>${escapeHtml(project.name)}</h3><p>${escapeHtml(project.summary || "")}</p></div><div class="project-footer"><div class="project-tags">${(project.tags || []).map(tag => `<span>${escapeHtml(tag)}</span>`).join("")}</div>${project.url ? `<a class="project-arrow" href="${safeUrl(project.url)}" target="_blank" rel="noreferrer" aria-label="Open ${escapeHtml(project.name)}">↗</a>` : "<span class=\"project-arrow\">✳</span>"}</div></article>`).join("");
  $("#experienceList").innerHTML = config.experience.map((job,index) => `<article class="experience-card" id="experience-${safeId(job.id)}"><div class="experience-top"><span class="experience-number">0${index+1}</span><div><h3>${escapeHtml(job.title)}</h3><p>${escapeHtml(job.company)}</p></div><span class="experience-date">${escapeHtml(formatDate(job.startDate))} — ${escapeHtml(job.endDate ? formatDate(job.endDate) : "PRESENT")}</span></div><ul>${(job.highlights || []).map(item => `<li>${escapeHtml(item.text)}${item.metric ? `<span class="metric">${escapeHtml(item.metric.value)}${escapeHtml(item.metric.unit)} <small>${escapeHtml(item.metric.label)}</small></span>` : ""}</li>`).join("")}</ul></article>`).join("");
  const skills = [...(config.skills.languages || []), ...(config.skills.frameworksAndLibraries || [])];
  $("#skillList").innerHTML = skills.map(skill => `<span>${escapeHtml(skill)}</span>`).join("");
  const education = (config.education || []).map(item => `<div class="credential-item"><span class="skill-label">EDUCATION</span><h3>${escapeHtml(item.degree)}</h3><p>${escapeHtml(item.institution)} · ${escapeHtml(item.location || "")} · ${escapeHtml(item.grade || "")}</p></div>`).join("");
  const certifications = (config.certifications || []).length ? `<div class="credential-item"><span class="skill-label">CERTIFICATIONS</span><p>${config.certifications.map(escapeHtml).join("<br>")}</p></div>` : "";
  $("#credentials").innerHTML = `${education}${certifications}`;
  $("#suggestions").innerHTML = (config.questions || []).map(q => `<button class="suggestion" type="button">${escapeHtml(q)}</button>`).join("");
}

function bindEvents() {
  $("#askForm").addEventListener("submit", event => { event.preventDefault(); answerQuestion($("#questionInput").value); });
  $("#suggestions").addEventListener("click", event => { const button = event.target.closest("button"); if (!button) return; $("#questionInput").value = button.textContent; answerQuestion(button.textContent); });
  $("#themeToggle").addEventListener("click", () => { const dark = document.body.classList.toggle("dark"); $("#themeToggle").setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme"); if (stars.length) drawStars(); });
  const canvas = $("#constellation");
  canvas.addEventListener("pointermove", event => { const rect = canvas.getBoundingClientRect(); const x = event.clientX - rect.left, y = event.clientY - rect.top; selectedStar = stars.find(star => Math.hypot(star.x - x, star.y - y) < 18) || null; canvas.style.cursor = selectedStar ? "pointer" : "default"; drawStars(); });
  canvas.addEventListener("pointerleave", () => { selectedStar = null; drawStars(); });
  canvas.addEventListener("click", event => { const rect = canvas.getBoundingClientRect(); const star = stars.find(s => Math.hypot(s.x - (event.clientX - rect.left), s.y - (event.clientY - rect.top)) < 18); if (star) { const target = star.kind === "project" ? `#project-${safeId(star.item.id)}` : `#experience-${safeId(star.item.id)}`; document.querySelector(target)?.scrollIntoView({ behavior: "smooth" }); } });
  if (window.matchMedia) window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", drawStars);
}

function answerQuestion(raw) {
  const q = raw.trim().toLowerCase();
  const panel = $("#answerPanel");
  if (!q) { showToast("Type a question first."); return; }
  const corpus = [...config.experience.flatMap(item => item.highlights.map(h => ({ kind: "experience", parent: item, text: h.text, tags: h.tags || [] }))), ...config.projects.map(item => ({ kind: "project", parent: item, text: `${item.summary} ${item.details || ""}`, tags: item.tags || [] }))];
  const tokens = q.replace(/[^a-z0-9+#.% ]/g, " ").split(/\s+/).filter(token => token.length > 2);
  const ranked = corpus.map(item => ({ item, score: tokens.reduce((n, token) => n + ((`${item.text} ${item.parent.company || ""} ${item.parent.name || ""} ${item.tags.join(" ")}`).toLowerCase().includes(token) ? 1 : 0), 0) })).sort((a,b) => b.score - a.score);
  let matches = ranked.filter(row => row.score > 0).slice(0, 3);
  if (/amazon|payment|fulfillment|latency|2fa|upi/.test(q)) matches = ranked.filter(row => row.item.parent.company === "Amazon").slice(0,3);
  else if (/oracle|data|pyspark|yaml|replication/.test(q)) matches = ranked.filter(row => row.item.parent.company === "Oracle").slice(0,3);
  else if (/searchlocal|local.?first|ollama|project/.test(q)) matches = ranked.filter(row => row.item.parent.name === "SearchLocal").slice(0,3);
  if (!matches.length) matches = ranked.slice(0,2);
  const first = matches[0]?.item;
  const heading = first?.parent.company ? `${first.parent.title} · ${first.parent.company}` : first?.parent.name || "A little about my work";
  const detail = matches.map(row => row.item.text).join(" ");
  const refs = [...new Map(matches.map(row => [row.item.parent.id, row.item.parent])).values()];
  panel.innerHTML = `<h3>${escapeHtml(heading)}</h3><p>${escapeHtml(detail)}${matches.length === 1 && ranked[0]?.score === 0 ? " This is the closest match in my current profile." : ""}</p><div class="answer-tags">${refs.map(ref => `<a href="#${ref.company ? "work" : `project-${safeId(ref.id)}`}">${escapeHtml(ref.company || ref.name)} ↗</a>`).join("")}</div>`;
  panel.hidden = false;
}

function initCanvas() {
  const canvas = $("#constellation");
  resizeObserver = new ResizeObserver(() => { const rect = canvas.getBoundingClientRect(), ratio = window.devicePixelRatio || 1; canvas.width = Math.round(rect.width * ratio); canvas.height = Math.round(rect.height * ratio); canvas.getContext("2d").setTransform(ratio,0,0,ratio,0,0); makeStars(rect.width, rect.height); drawStars(); });
  resizeObserver.observe(canvas);
}
function makeStars(width,height) {
  const items = [...config.projects.map(item => ({item,kind:"project"})), ...config.experience.map(item => ({item,kind:"experience"}))];
  const positions = [[.19,.36],[.43,.23],[.69,.31],[.83,.51],[.64,.69],[.39,.74],[.21,.61],[.52,.48],[.78,.79],[.31,.48],[.61,.16],[.12,.78]];
  stars = items.map((entry,i) => { const pos = positions[i % positions.length]; return { ...entry, x: width*pos[0], y: height*pos[1], r: i === 0 ? 3.4 : 2 + (i%3)*.35 }; });
}
function drawStars() {
  const canvas = $("#constellation"); if (!canvas || !stars.length) return;
  const ctx = canvas.getContext("2d"), dark = document.body.classList.contains("dark");
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const edge = dark ? "#666d5d" : "#a4a18f";
  ctx.lineWidth = .7; ctx.setLineDash([2,5]);
  for(let i=0;i<stars.length;i++){ const next=stars[(i+1)%stars.length]; if(Math.hypot(stars[i].x-next.x,stars[i].y-next.y)<190){ctx.beginPath();ctx.moveTo(stars[i].x,stars[i].y);ctx.lineTo(next.x,next.y);ctx.strokeStyle=edge+"66";ctx.stroke();} }
  ctx.setLineDash([]);
  stars.forEach((star,i)=>{const active=star===selectedStar;ctx.beginPath();ctx.arc(star.x,star.y,active?star.r+3:star.r,0,Math.PI*2);ctx.fillStyle=active?(dark?"#e08b70":"#b8553e"):(i===0?(dark?"#d17a61":"#b8553e"):(dark?"#c4c2b0":"#7c806e"));ctx.shadowColor=active?"#b8553e":"transparent";ctx.shadowBlur=active?14:0;ctx.fill();ctx.shadowBlur=0;if(active){ctx.font="10px 'DM Mono', monospace";ctx.fillStyle=dark?"#eeeade":"#3b3c32";const label=star.kind==="project"?star.item.name:star.item.company;ctx.fillText(label,star.x+10,star.y-9);}});
}
function safeId(value){return String(value).toLowerCase().replace(/[^a-z0-9-]/g,"");}
function formatDate(value){if(!value)return "";const [year,month]=value.split("-");return `${new Intl.DateTimeFormat("en",{month:"short"}).format(new Date(Number(year),Number(month)-1,1))} ${year}`;}
function safeUrl(value){try{const url=new URL(value);return ["http:","https:"].includes(url.protocol)?url.href:"#";}catch{return "#";}}
function escapeHtml(value){return String(value ?? "").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));}
let toastTimer;
function showToast(message){const toast=$("#toast");toast.textContent=message;toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove("show"),1800);}
start();
