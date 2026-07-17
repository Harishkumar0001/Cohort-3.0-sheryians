/* =========================================================
   PRODUCTIVITY DASHBOARD — script.js
   Sections below follow the documentation's build order:
   1. Navigation  2. Todo  3. Planner  4. Goals
   5. Pomodoro    6. Motivation  7. Weather
   8. Date & Time 9. Theme Switch  10. Dynamic Background
   ========================================================= */

/* ---------------------------------------------------------
   1. DASHBOARD NAVIGATION
   Show/hide the dashboard vs. one full-screen feature panel.
   Only one section is ever visible at a time.
--------------------------------------------------------- */
const dashboardView = document.getElementById('dashboardView');
const featureView = document.getElementById('featureView');
const cardGrid = document.getElementById('cardGrid');
const backBtn = document.getElementById('backBtn');

let activeFeature = null;      // tracks which panel is open
let isNavigating = false;      // guards against rapid double-clicks

function openFeature(name) {
  if (isNavigating || activeFeature === name) return;
  isNavigating = true;

  document.querySelectorAll('.feature-panel').forEach(p => p.hidden = true);
  const panel = document.getElementById('panel-' + name);
  if (!panel) { isNavigating = false; return; }

  dashboardView.hidden = true;
  featureView.hidden = false;
  panel.hidden = false;
  activeFeature = name;

  // Lazy-init each feature the first time its card is opened
  if (name === 'motivation' && !quoteBox.dataset.loaded) fetchQuote();

  setTimeout(() => { isNavigating = false; }, 200);
}

function closeFeature() {
  featureView.hidden = true;
  dashboardView.hidden = false;
  activeFeature = null;
}

cardGrid.addEventListener('click', (e) => {
  const card = e.target.closest('.feature-card');
  if (!card) return;
  openFeature(card.dataset.feature);
});
backBtn.addEventListener('click', closeFeature);


/* ---------------------------------------------------------
   9. THEME SWITCH (light/dark, persisted, no-flash on load)
--------------------------------------------------------- */
const themeToggle = document.getElementById('themeToggle');
const root = document.documentElement;

function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
  localStorage.setItem('pd_theme', theme);
}
themeToggle.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
});


/* ---------------------------------------------------------
   10. DYNAMIC BACKGROUND (time-of-day gradient)
--------------------------------------------------------- */
function timeOfDayCategory(hour) {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}
function updateDynamicBackground() {
  const hour = new Date().getHours();
  root.setAttribute('data-time-of-day', timeOfDayCategory(hour));
}
updateDynamicBackground();
setInterval(updateDynamicBackground, 5 * 60 * 1000); // re-check every 5 min


/* ---------------------------------------------------------
   8. DATE & TIME (live, always visible)
--------------------------------------------------------- */
const dtTime = document.getElementById('dtTime');
const dtDate = document.getElementById('dtDate');

function pad2(n) { return n.toString().padStart(2, '0'); }

function tickClock() {
  const now = new Date();
  dtTime.textContent = `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
  dtDate.textContent = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
tickClock();
setInterval(tickClock, 1000);


/* ---------------------------------------------------------
   2. TODO LIST — add / mark important / complete / delete
   Persisted to Local Storage, rebuilt via event delegation.
--------------------------------------------------------- */
const TODO_KEY = 'pd_todos';
const todoInput = document.getElementById('todoInput');
const todoAddBtn = document.getElementById('todoAddBtn');
const todoList = document.getElementById('todoList');
const todoEmpty = document.getElementById('todoEmpty');

function loadTodos() {
  try { return JSON.parse(localStorage.getItem(TODO_KEY)) || []; }
  catch { return []; }
}
function saveTodos(todos) {
  localStorage.setItem(TODO_KEY, JSON.stringify(todos));
}
let todos = loadTodos();

function renderTodos() {
  todoList.innerHTML = '';
  todoEmpty.hidden = todos.length !== 0;
  todos.forEach(t => {
    const li = document.createElement('li');
    li.className = 'list-item' + (t.completed ? ' completed' : '') + (t.important ? ' important' : '');
    li.dataset.id = t.id;
    li.innerHTML = `
      <button class="check-btn ${t.completed ? 'checked' : ''}" data-act="complete" title="Mark complete">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </button>
      <span class="item-text">${escapeHtml(t.text)}</span>
      <button class="star-btn ${t.important ? 'active' : ''}" data-act="important" title="Mark important">★</button>
      <button class="del-btn" data-act="delete" title="Delete task">✕</button>`;
    todoList.appendChild(li);
  });
}
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function addTodo() {
  const text = todoInput.value.trim();
  if (!text) return;
  todos.push({ id: 'todo_' + Date.now(), text, completed: false, important: false });
  saveTodos(todos);
  renderTodos();
  todoInput.value = '';
  todoInput.focus();
}
todoAddBtn.addEventListener('click', addTodo);
todoInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(); });

// Event delegation: one listener handles every task's buttons
todoList.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const li = btn.closest('.list-item');
  const id = li.dataset.id;
  const todo = todos.find(t => t.id === id);
  if (!todo) return;

  if (btn.dataset.act === 'complete') todo.completed = !todo.completed;
  if (btn.dataset.act === 'important') todo.important = !todo.important;
  if (btn.dataset.act === 'delete') todos = todos.filter(t => t.id !== id);

  saveTodos(todos);
  renderTodos();
});
renderTodos();


/* ---------------------------------------------------------
   4. DAILY GOALS — add / complete / progress count
   Reuses the same list + Local Storage pattern as Todo.
--------------------------------------------------------- */
const GOAL_KEY = 'pd_goals';
const goalInput = document.getElementById('goalInput');
const goalAddBtn = document.getElementById('goalAddBtn');
const goalList = document.getElementById('goalList');
const goalEmpty = document.getElementById('goalEmpty');
const goalProgress = document.getElementById('goalProgress');

function loadGoals() {
  try { return JSON.parse(localStorage.getItem(GOAL_KEY)) || []; }
  catch { return []; }
}
function saveGoals(goals) {
  localStorage.setItem(GOAL_KEY, JSON.stringify(goals));
}
let goals = loadGoals();

function renderGoals() {
  goalList.innerHTML = '';
  goalEmpty.hidden = goals.length !== 0;
  const done = goals.filter(g => g.completed).length;
  goalProgress.textContent = `${done} of ${goals.length} completed`;

  goals.forEach(g => {
    const li = document.createElement('li');
    li.className = 'list-item' + (g.completed ? ' completed' : '');
    li.dataset.id = g.id;
    li.innerHTML = `
      <button class="check-btn ${g.completed ? 'checked' : ''}" data-act="complete" title="Mark complete">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </button>
      <span class="item-text">${escapeHtml(g.text)}</span>
      <button class="del-btn" data-act="delete" title="Delete goal">✕</button>`;
    goalList.appendChild(li);
  });
}
function addGoal() {
  const text = goalInput.value.trim();
  if (!text) return;
  goals.push({ id: 'goal_' + Date.now(), text, completed: false });
  saveGoals(goals);
  renderGoals();
  goalInput.value = '';
  goalInput.focus();
}
goalAddBtn.addEventListener('click', addGoal);
goalInput.addEventListener('keydown', e => { if (e.key === 'Enter') addGoal(); });

goalList.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const li = btn.closest('.list-item');
  const id = li.dataset.id;
  const goal = goals.find(g => g.id === id);
  if (!goal) return;

  if (btn.dataset.act === 'complete') goal.completed = !goal.completed;
  if (btn.dataset.act === 'delete') goals = goals.filter(g => g.id !== id);

  saveGoals(goals);
  renderGoals();
});
renderGoals();


/* ---------------------------------------------------------
   3. DAILY PLANNER — hourly slots, saved per-slot,
   current hour auto-highlighted using the Date object.
--------------------------------------------------------- */
const PLANNER_KEY = 'pd_planner';
const plannerSlots = document.getElementById('plannerSlots');
const START_HOUR = 6;   // 6:00
const END_HOUR = 22;    // 22:00 inclusive

function loadPlanner() {
  try { return JSON.parse(localStorage.getItem(PLANNER_KEY)) || {}; }
  catch { return {}; }
}
function savePlanner(data) {
  localStorage.setItem(PLANNER_KEY, JSON.stringify(data));
}
let plannerData = loadPlanner();

function hourLabel(h) {
  const period = h >= 12 ? 'PM' : 'AM';
  const hh = (h % 12) || 12;
  return `${hh}:00 ${period}`;
}
function renderPlanner() {
  plannerSlots.innerHTML = '';
  const currentHour = new Date().getHours();
  for (let h = START_HOUR; h <= END_HOUR; h++) {
    const row = document.createElement('div');
    row.className = 'slot' + (h === currentHour ? ' current-hour' : '');
    row.dataset.hour = h;
    row.innerHTML = `
      <span class="slot-time">${hourLabel(h)}</span>
      <input type="text" maxlength="80" placeholder="Nothing planned" value="${escapeHtml(plannerData[h] || '')}">`;
    plannerSlots.appendChild(row);
  }
}
// Save as the user types (debounced) so we don't hammer Local Storage
let plannerSaveTimeout = null;
plannerSlots.addEventListener('input', (e) => {
  const input = e.target;
  if (input.tagName !== 'INPUT') return;
  const hour = input.closest('.slot').dataset.hour;
  clearTimeout(plannerSaveTimeout);
  plannerSaveTimeout = setTimeout(() => {
    if (input.value.trim()) plannerData[hour] = input.value.trim();
    else delete plannerData[hour];
    savePlanner(plannerData);
  }, 300);
});
renderPlanner();
setInterval(() => {
  // re-highlight current hour if the panel is open and time has moved on
  if (activeFeature === 'planner') renderPlanner();
}, 60 * 1000);


/* ---------------------------------------------------------
   5. POMODORO TIMER — start / pause / reset, mode switch
--------------------------------------------------------- */
const pomodoroDisplay = document.getElementById('pomodoroDisplay');
const pomodoroLabel = document.getElementById('pomodoroLabel');
const pomodoroStart = document.getElementById('pomodoroStart');
const pomodoroPause = document.getElementById('pomodoroPause');
const pomodoroReset = document.getElementById('pomodoroReset');
const modeButtons = document.querySelectorAll('.mode-btn');

let pomodoroTotalSeconds = 25 * 60;
let pomodoroRemaining = pomodoroTotalSeconds;
let pomodoroIntervalId = null; // guarded so only one interval ever runs

function formatMMSS(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${pad2(m)}:${pad2(s)}`;
}
function renderPomodoro() {
  pomodoroDisplay.textContent = formatMMSS(pomodoroRemaining);
}
function startPomodoro() {
  if (pomodoroIntervalId !== null) return; // prevent overlapping intervals
  pomodoroIntervalId = setInterval(() => {
    pomodoroRemaining--;
    renderPomodoro();
    if (pomodoroRemaining <= 0) {
      clearInterval(pomodoroIntervalId);
      pomodoroIntervalId = null;
      renderPomodoro();
      alert(`${pomodoroLabel.textContent} complete! Time to switch it up.`);
    }
  }, 1000);
}
function pausePomodoro() {
  clearInterval(pomodoroIntervalId);
  pomodoroIntervalId = null;
}
function resetPomodoro() {
  pausePomodoro();
  pomodoroRemaining = pomodoroTotalSeconds;
  renderPomodoro();
}
pomodoroStart.addEventListener('click', startPomodoro);
pomodoroPause.addEventListener('click', pausePomodoro);
pomodoroReset.addEventListener('click', resetPomodoro);

modeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    modeButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    pausePomodoro();
    pomodoroTotalSeconds = Number(btn.dataset.mins) * 60;
    pomodoroRemaining = pomodoroTotalSeconds;
    pomodoroLabel.textContent = btn.dataset.mins === '25' ? 'Work Session' : 'Break';
    renderPomodoro();
  });
});
renderPomodoro();


/* ---------------------------------------------------------
   6. MOTIVATION QUOTE — Fetch API, loading + error states
--------------------------------------------------------- */
const quoteBox = document.getElementById('quoteBox');
const quoteText = document.getElementById('quoteText');
const quoteAuthor = document.getElementById('quoteAuthor');
const quoteBtn = document.getElementById('quoteBtn');

async function fetchQuote() {
  quoteBox.classList.remove('error');
  quoteBox.classList.add('loading');
  quoteText.textContent = 'Loading a fresh quote…';
  quoteAuthor.textContent = '';
  quoteBox.dataset.loaded = '1';

  try {
    const res = await fetch('https://dummyjson.com/quotes/random');
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();
    quoteBox.classList.remove('loading');
    quoteText.textContent = `"${data.quote}"`;
    quoteAuthor.textContent = `— ${data.author}`;
  } catch (err) {
    console.warn('Motivation quote fetch failed:', err);
    quoteBox.classList.remove('loading');
    quoteBox.classList.add('error');
    quoteText.textContent = 'Could not load a quote right now — but you\'ve got this anyway.';
    quoteAuthor.textContent = '';
  }
}
quoteBtn.addEventListener('click', fetchQuote);


/* ---------------------------------------------------------
   7. WEATHER WIDGET — Geolocation + Fetch API (Open-Meteo,
   no key required), with humidity / wind / precipitation.
--------------------------------------------------------- */
const weatherBody = document.getElementById('weatherBody');
const weatherLocBtn = document.getElementById('weatherLocBtn');

const WMO_MAP = {
  0: ['☀️', 'Clear sky'], 1: ['🌤️', 'Mainly clear'], 2: ['⛅', 'Partly cloudy'], 3: ['☁️', 'Overcast'],
  45: ['🌫️', 'Fog'], 48: ['🌫️', 'Fog'], 51: ['🌦️', 'Light drizzle'], 61: ['🌧️', 'Light rain'],
  63: ['🌧️', 'Rain'], 65: ['🌧️', 'Heavy rain'], 71: ['🌨️', 'Light snow'], 73: ['🌨️', 'Snow'],
  75: ['❄️', 'Heavy snow'], 80: ['🌦️', 'Showers'], 95: ['⛈️', 'Thunderstorm'],
};
function weatherIcon(code) { return (WMO_MAP[code] || ['🌡️', 'Unknown'])[0]; }
function weatherLabel(code) { return (WMO_MAP[code] || ['🌡️', 'Unknown'])[1]; }

function renderWeatherLoading() {
  weatherBody.innerHTML = `<p class="loading">Loading weather…</p>`;
}
function renderWeatherError(msg) {
  weatherBody.innerHTML = `<p class="error">${escapeHtml(msg)}</p>`;
}
async function fetchWeather(lat, lon, cityLabel) {
  renderWeatherLoading();
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m,precipitation&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Weather request failed');
    const data = await res.json();
    const c = data.current;
    weatherBody.innerHTML = `
      <div class="w-main">
        <span class="w-icon">${weatherIcon(c.weather_code)}</span>
        <div>
          <div class="w-temp">${Math.round(c.temperature_2m)}°F</div>
          <div class="w-city">${escapeHtml(cityLabel)}</div>
        </div>
      </div>
      <div class="w-cond">${weatherLabel(c.weather_code)}</div>
      <div class="w-stats">
        <div class="w-stat"><b>${Math.round(c.relative_humidity_2m)}%</b>Humidity</div>
        <div class="w-stat"><b>${Math.round(c.wind_speed_10m)} mph</b>Wind</div>
        <div class="w-stat"><b>${c.precipitation}"</b>Precip.</div>
      </div>`;
  } catch (err) {
    console.warn('Weather fetch failed:', err);
    renderWeatherError('Could not load weather right now. Try again later.');
  }
}
function initWeather() {
  if (!navigator.geolocation) {
    fetchWeather(40.7128, -74.006, 'New York, NY (default)');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => fetchWeather(pos.coords.latitude, pos.coords.longitude, 'Your location'),
    () => fetchWeather(40.7128, -74.006, 'New York, NY (default)'),
    { timeout: 6000 }
  );
}
weatherLocBtn.addEventListener('click', initWeather);
initWeather();
