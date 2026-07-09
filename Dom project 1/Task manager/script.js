/* ============================================================
   TASK MANAGER — script.js
   ============================================================ */

/* ============================================================
   LOCAL STORAGE
   ============================================================ */
const LS_TASKS   = "tm_tasks";
const LS_NEXT_ID = "tm_next_id";
const LS_THEME   = "tm_theme";

const SEED_TASKS = [
  { id: 1, name: "Complete JavaScript Project", category: "Work",     priority: "High",   date: "2024-06-20", done: false },
 
];

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(LS_TASKS);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveTasks() {
  try {
    localStorage.setItem(LS_TASKS,   JSON.stringify(tasks));
    localStorage.setItem(LS_NEXT_ID, String(nextId));
  } catch (e) {
    console.warn("localStorage save failed:", e);
  }
}

function saveTheme(t) {
  try { localStorage.setItem(LS_THEME, t); } catch {}
}

function loadTheme() {
  try { return localStorage.getItem(LS_THEME) || "dark"; } catch { return "dark"; }
}

/* ---------- Bootstrap data: saved data OR seed on first visit ---------- */
const _saved = loadFromStorage();
let tasks  = _saved || SEED_TASKS.map(t => ({ ...t }));
let nextId = parseInt(localStorage.getItem(LS_NEXT_ID) || "13", 10);
let activeFilter = "All";
let searchQuery  = "";
let editingId    = null;

/* ---------- Utility ---------- */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const today = () => new Date().toISOString().slice(0, 10);

function formatDate(d) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[+m - 1]} ${parseInt(day, 10)}, ${y}`;
}

/* ---------- Category colours ---------- */
const CAT_COLORS = {
  Work:     { dot: "#3b82f6", text: "#60a5fa" },
  Personal: { dot: "#a78bfa", text: "#a78bfa" },
  Shopping: { dot: "#eeae40", text: "#fbbf24" },
  Urgent:   { dot: "#ef4444", text: "#f87171" },
};
const CAT_ICONS = {
  Work: "ri-folder-2-line",
  Personal: "ri-user-line",
  Shopping: "ri-shopping-bag-line",
  Urgent: "ri-alarm-warning-line",
};

/* ============================================================
   STATS
   ============================================================ */
function getStats() {
  const total     = tasks.length;
  const done      = tasks.filter(t => t.done).length;
  const pending   = total - done;
  const todayDate = today();
  const todayCount = tasks.filter(t => t.date === todayDate).length;
  const pct       = total ? Math.round((done / total) * 100) : 0;

  const byPriority = { High: 0, Medium: 0, Low: 0 };
  tasks.forEach(t => { if (byPriority[t.priority] !== undefined) byPriority[t.priority]++; });

  const byCat = {};
  tasks.forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + 1; });

  return { total, done, pending, todayCount, pct, byPriority, byCat };
}

/* ============================================================
   RENDER — STAT CARDS
   ============================================================ */
function renderStatCards() {
  const s = getStats();
  // Total
  const totalEl = $(".box3 .inner-text");
  if (totalEl) totalEl.innerHTML = `<p>Total Tasks</p><h1>${s.total}</h1><p>All Time Tasks</p>`;

  // Pending
  const pendEl = $(".box4 .inner-text");
  if (pendEl) pendEl.innerHTML = `<p>Pending</p><h1>${s.pending}</h1><p>Tasks to do</p>`;

  // Completed
  const compEl = $(".box5 .inner-text");
  if (compEl) compEl.innerHTML = `<p>Completed</p><h1>${s.done}</h1><p>Tasks Done</p>`;

  // Today
  const todEl = $(".box6 .inner-text");
  if (todEl) todEl.innerHTML = `<p>Today</p><h1>${s.todayCount}</h1><p>Tasks For Today</p>`;
}

/* ============================================================
   RENDER — RIGHT PANEL (box8 = progress, box9 = priority)
   ============================================================ */
function renderRightPanel() {
  const s = getStats();

  /* ---- Progress ring (box8) ---- */
  const box8 = $(".box8");
  if (box8) {
    const r = 54, circ = 2 * Math.PI * r;
    const dash = (s.pct / 100) * circ;
    box8.innerHTML = `
      <div class="progress-panel">
        <h3 class="panel-title">Progress Overview</h3>
        <div class="ring-wrap">
          <svg viewBox="0 0 130 130" class="ring-svg">
            <circle cx="65" cy="65" r="${r}" fill="none" stroke="var(--border)" stroke-width="10"/>
            <circle cx="65" cy="65" r="${r}" fill="none"
              stroke="url(#ringGrad)" stroke-width="10"
              stroke-dasharray="${dash} ${circ}"
              stroke-dashoffset="${circ / 4}"
              stroke-linecap="round"/>
            <defs>
              <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#7c5cfc"/>
                <stop offset="100%" stop-color="#60a5fa"/>
              </linearGradient>
            </defs>
          </svg>
          <div class="ring-label">
            <span class="ring-pct">${s.pct}%</span>
            <span class="ring-sub">Completed</span>
          </div>
        </div>
        <p class="ring-detail">${s.done} of ${s.total} tasks completed</p>
        <div class="prog-bar-wrap">
          <div class="prog-bar-inner" style="width:${s.pct}%"></div>
        </div>
      </div>`;
  }

  /* ---- Priority breakdown (box9) ---- */
  const box9 = $(".box9");
  if (box9) {
    const rows = ["High","Medium","Low"].map(p => {
      const col = p === "High" ? "#ef4444" : p === "Medium" ? "#f59e0b" : "#22c55e";
      return `<div class="pri-row">
        <span class="pri-dot" style="background:${col}"></span>
        <span class="pri-label">${p} Priority</span>
        <span class="pri-count" style="background:${col}22;color:${col}">${s.byPriority[p]}</span>
      </div>`;
    }).join("");
    box9.innerHTML = `<div class="priority-panel"><h3 class="panel-title">Tasks by Priority</h3>${rows}</div>`;
  }
}

/* ============================================================
   RENDER — SIDEBAR CATEGORY COUNTS
   ============================================================ */
function renderCategoryCounts() {
  const s = getStats();
  document.querySelectorAll(".cat-item").forEach(el => {
    const label = el.childNodes[1]?.textContent?.trim() ||
                  el.querySelector(".cat-dot")?.nextSibling?.textContent?.trim();
    const countEl = el.querySelector(".cat-count");
    if (countEl && s.byCat[label] !== undefined) {
      countEl.textContent = s.byCat[label] || 0;
    }
  });
}

/* ============================================================
   RENDER — UPCOMING TASKS (box10)
   ============================================================ */
function renderUpcoming() {
  const box10 = $(".box10");
  if (!box10) return;
  const upcoming = tasks
    .filter(t => !t.done && t.date >= today())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  const items = upcoming.map(t => {
    const [,m,d] = t.date.split("-");
    const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
    return `<div class="upcoming-item">
      <div class="upcoming-date">
        <div class="month">${months[+m-1]}</div>
        <div class="day">${parseInt(d)}</div>
      </div>
      <div class="upcoming-info">
        <div class="task-title">${t.name}</div>
        <div class="upcoming-meta"><span>${t.category}</span> • ${t.priority} Priority</div>
      </div>
    </div>`;
  }).join("") || `<p style="color:var(--text-muted);font-size:13px;padding:8px 0">No upcoming tasks 🎉</p>`;

  box10.innerHTML = `<div class="panel-card">
    <h3>Upcoming Tasks</h3>
    <div class="upcoming-list">${items}</div>
    <a class="view-cal" href="#">View Calendar <i class="ri-arrow-right-line"></i></a>
  </div>`;
}

/* ============================================================
   RENDER — TASK LIST
   ============================================================ */
function getFilteredTasks() {
  return tasks.filter(t => {
    const matchCat = activeFilter === "All" || t.category === activeFilter;
    const matchSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });
}

function renderTaskList() {
  const list = $(".task-list");
  if (!list) return;
  const filtered = getFilteredTasks();

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state">
      <i class="ri-checkbox-circle-line" style="font-size:40px;color:var(--text-muted)"></i>
      <p style="color:var(--text-muted);margin-top:8px">No tasks found</p>
    </div>`;
    updateTaskCount(0, tasks.length);
    return;
  }

  list.innerHTML = filtered.map(t => taskRowHTML(t)).join("");
  updateTaskCount(filtered.length, tasks.length);
  attachTaskEvents();
}

function taskRowHTML(t) {
  const catColor = CAT_COLORS[t.category] || { dot: "#888", text: "#aaa" };
  const catIcon  = CAT_ICONS[t.category]  || "ri-folder-2-line";
  const priClass = t.priority.toLowerCase();
  const doneClass = t.done ? "done" : "";
  const checkClass = t.done ? "checked" : "";

  return `<div class="task-row ${doneClass}" data-id="${t.id}">
    <div class="task-check ${checkClass}" data-action="toggle" data-id="${t.id}">
      ${t.done ? '<i class="ri-check-line" style="font-size:12px;color:#fff;margin:auto"></i>' : ""}
    </div>
    <div class="task-info">
      <div class="task-name">${t.name}</div>
      <div class="task-category-tag" style="color:${catColor.text}">
        <i class="${catIcon}"></i> ${t.category}
      </div>
    </div>
    <span class="priority-badge ${priClass}">
      <i class="ri-arrow-${priClass === 'high' ? 'up' : priClass === 'medium' ? 'right' : 'down'}-line"></i>
      ${t.priority}
    </span>
    <div class="task-date">
      <i class="ri-calendar-2-line"></i>${formatDate(t.date)}
    </div>
    <div class="task-actions">
      <button class="task-action-btn" data-action="edit"   data-id="${t.id}" title="Edit"><i class="ri-edit-2-line"></i></button>
      <button class="task-action-btn" data-action="delete" data-id="${t.id}" title="Delete"><i class="ri-delete-bin-6-line"></i></button>
    </div>
  </div>`;
}

function updateTaskCount(showing, total) {
  let el = document.getElementById("task-count-label");
  if (!el) {
    el = document.createElement("p");
    el.id = "task-count-label";
    el.style.cssText = "color:var(--text-muted);font-size:13px;text-align:center;padding:10px 20px 4px";
    $(".task-list")?.before(el);
  }
  el.textContent = `Showing ${showing} of ${total} tasks`;
}

function attachTaskEvents() {
  document.querySelectorAll("[data-action]").forEach(btn => {
    btn.addEventListener("click", e => {
      const id = +btn.dataset.id;
      const action = btn.dataset.action;
      if (action === "toggle") toggleTask(id);
      if (action === "edit")   openEditModal(id);
      if (action === "delete") deleteTask(id);
    });
  });
}

/* ============================================================
   TASK CRUD
   ============================================================ */
function addTask() {
  const input  = $(".task-input");
  const catSel = document.querySelectorAll(".select-drop")[0];
  const priSel = document.querySelectorAll(".select-drop")[1];

  const name = input.value.trim();
  const cat  = catSel.value;
  const pri  = priSel.value;

  if (!name) { shake(input); return; }
  if (cat === "Select Category") { shake(catSel); return; }
  if (pri === "Select Prioirty") { shake(priSel); return; }

  tasks.push({ id: nextId++, name, category: cat, priority: pri, date: today(), done: false });
  saveTasks();
  input.value = "";
  catSel.value = "Select Category";
  priSel.value = "Select Prioirty";
  renderAll();
  showToast("Task added ✅");
}

function toggleTask(id) {
  const t = tasks.find(t => t.id === id);
  if (t) t.done = !t.done;
  saveTasks();
  renderAll();
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderAll();
  showToast("Task deleted 🗑️");
}

/* ============================================================
   EDIT MODAL
   ============================================================ */
function openEditModal(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  editingId = id;

  let modal = document.getElementById("edit-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "edit-modal";
    modal.innerHTML = `
      <div class="modal-overlay" id="modal-overlay"></div>
      <div class="modal-box">
        <h3 class="modal-title"><i class="ri-edit-2-line"></i> Edit Task</h3>
        <label class="modal-label">Task Name</label>
        <input id="edit-name" class="modal-input" type="text" placeholder="Task name">
        <label class="modal-label">Category</label>
        <select id="edit-cat" class="modal-select">
          <option>Work</option><option>Personal</option><option>Shopping</option><option>Urgent</option>
        </select>
        <label class="modal-label">Priority</label>
        <select id="edit-pri" class="modal-select">
          <option>High</option><option>Medium</option><option>Low</option>
        </select>
        <label class="modal-label">Due Date</label>
        <input id="edit-date" class="modal-input" type="date">
        <div class="modal-actions">
          <button id="modal-cancel" class="modal-btn cancel">Cancel</button>
          <button id="modal-save"   class="modal-btn save">Save Changes</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById("modal-cancel").addEventListener("click", closeModal);
    document.getElementById("modal-overlay").addEventListener("click", closeModal);
    document.getElementById("modal-save").addEventListener("click", saveEdit);
  }

  document.getElementById("edit-name").value  = t.name;
  document.getElementById("edit-cat").value   = t.category;
  document.getElementById("edit-pri").value   = t.priority;
  document.getElementById("edit-date").value  = t.date;
  modal.classList.add("open");
}

function closeModal() {
  const modal = document.getElementById("edit-modal");
  if (modal) modal.classList.remove("open");
  editingId = null;
}

function saveEdit() {
  const t = tasks.find(t => t.id === editingId);
  if (!t) return;
  t.name     = document.getElementById("edit-name").value.trim() || t.name;
  t.category = document.getElementById("edit-cat").value;
  t.priority = document.getElementById("edit-pri").value;
  t.date     = document.getElementById("edit-date").value || t.date;
  saveTasks();
  closeModal();
  renderAll();
  showToast("Task updated ✏️");
}

/* ============================================================
   FILTER BUTTONS
   ============================================================ */
function initFilters() {
  document.querySelectorAll(".sub-category button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".sub-category button").forEach(b => b.classList.remove("active-filter"));
      btn.classList.add("active-filter");
      activeFilter = btn.textContent.trim();
      renderTaskList();
    });
  });
}

/* ============================================================
   SEARCH
   ============================================================ */
function initSearch() {
  const searchInput = $(".sub-search input");
  if (searchInput) {
    searchInput.addEventListener("input", e => {
      searchQuery = e.target.value;
      renderTaskList();
    });
  }
}

/* ============================================================
   DARK / LIGHT THEME  (the two buttons already in HTML)
   ============================================================ */
function initTheme() {
  // Restore saved theme immediately
  setTheme(loadTheme());

  const btns = document.querySelectorAll("#theme-button");
  if (btns.length >= 2) {
    btns[0].addEventListener("click", () => { setTheme("light"); saveTheme("light"); }); // ☀️
    btns[1].addEventListener("click", () => { setTheme("dark");  saveTheme("dark");  }); // 🌙
  }
}

function setTheme(t) {
  const root = document.documentElement;
  if (t === "light") {
    root.style.setProperty("--bg-base",        "#eef0f7");
    root.style.setProperty("--bg-card",        "#ffffff");
    root.style.setProperty("--bg-card2",       "#f0f2fb");
    root.style.setProperty("--bg-sidebar",     "#f5f6ff");
    root.style.setProperty("--text-primary",   "#1a1d27");
    root.style.setProperty("--text-secondary", "#4a4f6a");
    root.style.setProperty("--text-muted",     "#8b90a7");
    root.style.setProperty("--border",         "#d4d7eb");
    // keep accent vivid in light mode
    root.style.setProperty("--accent",         "#6c48f5");
    root.style.setProperty("--accent-light",   "#8b6dfd");
  } else {
    root.style.setProperty("--bg-base",        "#0f1117");
    root.style.setProperty("--bg-card",        "#1a1d27");
    root.style.setProperty("--bg-card2",       "#1e2130");
    root.style.setProperty("--bg-sidebar",     "#13151f");
    root.style.setProperty("--text-primary",   "#e8eaf0");
    root.style.setProperty("--text-secondary", "#8b90a7");
    root.style.setProperty("--text-muted",     "#555a72");
    root.style.setProperty("--border",         "#2a2d3e");
    root.style.setProperty("--accent",         "#7c5cfc");
    root.style.setProperty("--accent-light",   "#9b7dfd");
  }
}

/* ============================================================
   TOAST
   ============================================================ */
function showToast(msg) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 2400);
}

/* ============================================================
   SHAKE HELPER
   ============================================================ */
function shake(el) {
  el.classList.add("shake");
  setTimeout(() => el.classList.remove("shake"), 500);
}

/* ============================================================
   INJECT EXTRA STYLES (modal, toast, panel, right-panel)
   ============================================================ */
function injectStyles() {
  const style = document.createElement("style");
  style.textContent = `
    /* ---------- Active filter ---------- */
    .sub-category button.active-filter {
      background: var(--accent);
      border-color: var(--accent);
      color: #fff;
    }

    /* ---------- Input placeholders ---------- */
    ::placeholder { color: var(--text-muted); opacity: 1; }

    /* ---------- Task row hover works in both themes ---------- */
    .task-row:hover { background: var(--bg-card2); filter: brightness(0.95); }

    /* ---------- Empty state ---------- */
    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      padding: 40px 0;
    }

    /* ---------- Toast ---------- */
    #toast {
      position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%) translateY(20px);
      background: #1e2130; color: var(--text-primary);
      padding: 10px 22px; border-radius: 10px; font-size: 14px;
      border: 1px solid var(--border);
      opacity: 0; pointer-events: none;
      transition: opacity .25s, transform .25s;
      z-index: 9999;
      white-space: nowrap;
    }
    #toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

    /* ---------- Shake ---------- */
    @keyframes shake {
      0%,100%{ transform:translateX(0) }
      20%{ transform:translateX(-6px) }
      40%{ transform:translateX(6px) }
      60%{ transform:translateX(-4px) }
      80%{ transform:translateX(4px) }
    }
    .shake { animation: shake .45s ease; border-color: var(--red) !important; }

    /* ---------- Edit Modal ---------- */
    #edit-modal { display:none; }
    #edit-modal.open { display:block; }
    .modal-overlay {
      position:fixed; inset:0; background:rgba(0,0,0,.6);
      z-index:1000; backdrop-filter:blur(3px);
    }
    .modal-box {
      position:fixed; top:50%; left:50%;
      transform:translate(-50%,-50%);
      background:var(--bg-card); border:1px solid var(--border);
      border-radius:14px; padding:28px 32px;
      z-index:1001; width:min(420px,90vw);
      box-shadow:0 20px 60px rgba(0,0,0,.5);
    }
    .modal-title { font-size:18px; font-weight:700; margin-bottom:18px;
      display:flex; align-items:center; gap:8px; color:var(--text-primary); }
    .modal-label { font-size:12px; color:var(--text-muted); font-weight:600;
      letter-spacing:.05em; text-transform:uppercase; margin-bottom:5px; display:block; }
    .modal-input, .modal-select {
      width:100%; background:var(--bg-base); border:1px solid var(--border);
      border-radius:8px; padding:9px 12px; color:var(--text-primary);
      font-size:14px; margin-bottom:14px; outline:none;
    }
    .modal-input:focus,.modal-select:focus { border-color:var(--accent); }
    .modal-actions { display:flex; gap:10px; justify-content:flex-end; margin-top:6px; }
    .modal-btn { padding:9px 22px; border-radius:8px; font-size:14px;
      font-weight:600; cursor:pointer; border:none; }
    .modal-btn.cancel { background:var(--bg-base); color:var(--text-muted);
      border:1px solid var(--border); }
    .modal-btn.cancel:hover { border-color:var(--accent); color:var(--accent); }
    .modal-btn.save { background:var(--accent); color:#fff; }
    .modal-btn.save:hover { background:var(--accent-light); }

    /* ---------- Progress panel (box8) ---------- */
    .box8 { background:var(--bg-card) !important; }
    .box9 { background:var(--bg-card) !important; }
    .progress-panel, .priority-panel {
      padding: 18px 20px; height:100%; box-sizing:border-box;
      display:flex; flex-direction:column;
    }
    .panel-title { font-size:15px; font-weight:700; color:var(--text-primary);
      margin-bottom:12px; }
    .ring-wrap {
      position:relative; width:130px; height:130px;
      margin: 0 auto 8px;
    }
    .ring-svg { width:100%; height:100%; }
    .ring-label {
      position:absolute; top:50%; left:50%;
      transform:translate(-50%,-50%);
      text-align:center;
    }
    .ring-pct { display:block; font-size:22px; font-weight:800; color:var(--text-primary); }
    .ring-sub { display:block; font-size:10px; color:var(--text-muted); margin-top:2px; }
    .ring-detail { font-size:12px; color:var(--text-muted); text-align:center; margin-bottom:8px; }
    .prog-bar-wrap {
      height:6px; background:var(--border); border-radius:10px; overflow:hidden;
    }
    .prog-bar-inner {
      height:100%; background:linear-gradient(90deg,var(--accent),#60a5fa);
      border-radius:10px; transition:width .5s ease;
    }

    /* ---------- Priority panel (box9) ---------- */
    .pri-row {
      display:flex; align-items:center; gap:10px;
      padding:8px 0; border-bottom:1px solid var(--border);
    }
    .pri-row:last-child { border-bottom:none; }
    .pri-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
    .pri-label { flex:1; font-size:13px; color:var(--text-primary); }
    .pri-count {
      font-size:13px; font-weight:700;
      padding:2px 10px; border-radius:8px;
    }

    /* ---------- Sidebar nav active state ---------- */
    .nav-item { display:flex; align-items:center; gap:10px;
      padding:9px 12px; border-radius:10px; transition:background .15s;
      color:var(--text-secondary); }
    .nav-item.active, .nav-item:hover {
      background:var(--accent); color:#fff;
    }
    .nav-item i { font-size:20px; }

    /* ---------- task name overflow ---------- */
    .task-name { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:280px; }

    /* ---------- Clear data button ---------- */
    #clear-data-btn {
      display:block; width:calc(100% - 40px); margin: 8px 20px 16px;
      padding: 8px; border-radius: 8px; font-size: 12px; font-weight: 600;
      background: transparent; border: 1px solid var(--red);
      color: var(--red); cursor: pointer; text-align: center;
      transition: all .15s;
    }
    #clear-data-btn:hover { background: rgba(239,68,68,0.12); }

    /* ---------- LS badge on topbar ---------- */
    #ls-badge {
      font-size: 11px; color: var(--green);
      display:flex; align-items:center; gap:4px;
      padding: 4px 10px; border-radius: 20px;
      background: rgba(34,197,94,0.1);
      border: 1px solid rgba(34,197,94,0.25);
      white-space: nowrap;
    }
  `;
  document.head.appendChild(style);
}

/* ============================================================
   CLEAR ALL DATA
   ============================================================ */
function clearAllData() {
  if (!confirm("Reset all tasks to default? This cannot be undone.")) return;
  localStorage.removeItem(LS_TASKS);
  localStorage.removeItem(LS_NEXT_ID);
  tasks  = SEED_TASKS.map(t => ({ ...t }));
  nextId = 13;
  saveTasks();
  renderAll();
  showToast("Tasks reset to default 🔄");
}

function injectDOMExtras() {
  // Clear data button inside sidebar
  const box1 = document.querySelector(".box1");
  if (box1 && !document.getElementById("clear-data-btn")) {
    const btn = document.createElement("button");
    btn.id = "clear-data-btn";
    btn.innerHTML = `<i class="ri-delete-bin-2-line"></i> Reset to Default`;
    btn.addEventListener("click", clearAllData);
    box1.appendChild(btn);
  }

  // LocalStorage badge in topbar
  const icons = document.querySelector(".topbar_icons");
  if (icons && !document.getElementById("ls-badge")) {
    const badge = document.createElement("div");
    badge.id = "ls-badge";
    badge.innerHTML = `<i class="ri-save-line"></i> Auto-saved`;
    icons.prepend(badge);
  }
}

/* ============================================================
   ADD BUTTON WIRING
   ============================================================ */
function initAddButton() {
  const addBtn = $(".add-btn");
  if (addBtn) addBtn.addEventListener("click", addTask);

  const taskInput = $(".task-input");
  if (taskInput) {
    taskInput.addEventListener("keydown", e => {
      if (e.key === "Enter") addTask();
    });
  }
}

/* ============================================================
   GREETING (time-aware)
   ============================================================ */
function renderGreeting() {
  const h = new Date().getHours();
  const greet = h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening";
  const el = $(".topbar_greeting h6");
  if (el) el.textContent = `${greet}, Harish 👋`;

  const s = getStats();
  const sub = $(".topbar_greeting p");
  if (sub) sub.textContent = `You have ${s.pending} pending task${s.pending !== 1 ? "s" : ""} and ${s.done} completed task${s.done !== 1 ? "s" : ""} today.`;
}

/* ============================================================
   RENDER ALL
   ============================================================ */
function renderAll() {
  renderStatCards();
  renderRightPanel();
  renderCategoryCounts();
  renderTaskList();
  renderUpcoming();
  renderGreeting();
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  injectStyles();
  injectDOMExtras();
  initAddButton();
  initFilters();
  initSearch();
  initTheme();
  renderAll();
});