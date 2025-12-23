// Weekly Fitness Planner (Vanilla JS)
// - Drag from library into days
// - Create custom workouts
// - Save workouts + week plan to localStorage

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const LS_KEYS = {
  workouts: "wfp_workouts_v1",
  plan: "wfp_plan_v1",
};

const defaultWorkouts = [
  { id: cryptoId(), name: "Leg Day (Glutes + Quads)", category: "Legs", duration: 60, notes: "" },
  { id: cryptoId(), name: "Arms (Biceps + Triceps)", category: "Arms", duration: 45, notes: "" },
  { id: cryptoId(), name: "Back + Shoulders", category: "Back", duration: 55, notes: "" },
  { id: cryptoId(), name: "Pilates Flow", category: "Pilates", duration: 35, notes: "" },
  { id: cryptoId(), name: "Zone 2 Cardio", category: "Cardio", duration: 30, notes: "" },
  { id: cryptoId(), name: "Flexibility (Splits Focus)", category: "Flexibility", duration: 25, notes: "" },
  { id: cryptoId(), name: "Rest / Walk", category: "Rest", duration: 20, notes: "" },
];

let workouts = loadWorkouts();
let plan = loadPlan();

const elLibrary = document.getElementById("library");
const elWeek = document.getElementById("week");
const elSearch = document.getElementById("search");

const btnNewWorkout = document.getElementById("btnNewWorkout");
const btnClearWeek = document.getElementById("btnClearWeek");

const modal = document.getElementById("modal");
const backdrop = document.getElementById("modalBackdrop");
const btnCloseModal = document.getElementById("btnCloseModal");
const btnCancel = document.getElementById("btnCancel");
const form = document.getElementById("workoutForm");
const wName = document.getElementById("wName");
const wCategory = document.getElementById("wCategory");
const wDuration = document.getElementById("wDuration");
const wNotes = document.getElementById("wNotes");

// ---------- Init ----------
renderWeek();
renderLibrary();

elSearch.addEventListener("input", () => renderLibrary(elSearch.value));

btnNewWorkout.addEventListener("click", openModal);
btnCloseModal.addEventListener("click", closeModal);
btnCancel.addEventListener("click", closeModal);
backdrop.addEventListener("click", closeModal);

btnClearWeek.addEventListener("click", () => {
  plan = emptyPlan();
  savePlan(plan);
  renderWeek();
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = wName.value.trim();
  if (!name) return;

  const newW = {
    id: cryptoId(),
    name,
    category: wCategory.value,
    duration: wDuration.value ? Number(wDuration.value) : null,
    notes: wNotes.value.trim(),
    custom: true,
  };

  workouts.unshift(newW);
  saveWorkouts(workouts);
  renderLibrary(elSearch.value);
  closeModal();
});

// ---------- Rendering ----------
function renderWeek() {
  elWeek.innerHTML = "";
  DAYS.forEach((d) => {
    const dayCol = document.createElement("div");
    dayCol.className = "day";
    dayCol.dataset.day = d;

    const head = document.createElement("div");
    head.className = "day-head";

    const title = document.createElement("div");
    title.textContent = d;

    const count = document.createElement("span");
    count.className = "badge";
    const n = plan[d].length;
    count.textContent = n === 1 ? "1 workout" : `${n} workouts`;

    head.appendChild(title);
    head.appendChild(count);

    const body = document.createElement("div");
    body.className = "day-body";
    body.dataset.day = d;

    // DnD: allow drops
    body.addEventListener("dragover", (e) => {
      e.preventDefault();
      body.classList.add("drop-hover");
    });
    body.addEventListener("dragleave", () => body.classList.remove("drop-hover"));
    body.addEventListener("drop", (e) => {
      e.preventDefault();
      body.classList.remove("drop-hover");
      const workoutId = e.dataTransfer.getData("text/workoutId");
      if (!workoutId) return;
      addToDay(d, workoutId);
    });

    // Scheduled items
    plan[d].forEach((item, idx) => {
      const w = workouts.find(x => x.id === item.workoutId);
      const tile = document.createElement("div");
      tile.className = "scheduled";
      tile.title = "Click to remove";
      tile.innerHTML = `
        <div class="card-title">${escapeHtml(w?.name ?? "Unknown workout")}</div>
        <div class="card-meta">
          <span>${escapeHtml(w?.category ?? "—")}</span>
          ${w?.duration ? `<span>• ${w.duration} min</span>` : ""}
        </div>
      `;
      tile.addEventListener("click", () => {
        plan[d].splice(idx, 1);
        savePlan(plan);
        renderWeek();
      });
      body.appendChild(tile);
    });

    dayCol.appendChild(head);
    dayCol.appendChild(body);
    elWeek.appendChild(dayCol);
  });
}

function renderLibrary(search = "") {
  const q = search.trim().toLowerCase();

  // group by category
  const grouped = groupBy(workouts.filter(w =>
    !q ||
    w.name.toLowerCase().includes(q) ||
    (w.notes || "").toLowerCase().includes(q) ||
    w.category.toLowerCase().includes(q)
  ), "category");

  elLibrary.innerHTML = "";

  const categories = Object.keys(grouped).sort((a,b) => a.localeCompare(b));
  categories.forEach((cat) => {
    const group = document.createElement("div");
    group.className = "group";

    const title = document.createElement("div");
    title.className = "group-title";
    const left = document.createElement("span");
    left.textContent = cat;
    const right = document.createElement("span");
    right.className = "badge";
    right.textContent = grouped[cat].length;
    title.appendChild(left);
    title.appendChild(right);

    const list = document.createElement("div");
    list.className = "group-list";

    grouped[cat].forEach((w) => {
      const card = document.createElement("div");
      card.className = "card";
      card.draggable = true;
      card.dataset.workoutId = w.id;

      card.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/workoutId", w.id);
      });

      card.innerHTML = `
        <div class="card-title">${escapeHtml(w.name)}</div>
        <div class="card-meta">
          ${w.duration ? `<span>${w.duration} min</span>` : "<span>—</span>"}
          ${w.custom ? `<span class="badge">custom</span>` : ""}
        </div>
      `;

      list.appendChild(card);
    });

    group.appendChild(title);
    group.appendChild(list);
    elLibrary.appendChild(group);
  });

  if (categories.length === 0) {
    const empty = document.createElement("div");
    empty.className = "hint";
    empty.textContent = "No workouts match your search.";
    elLibrary.appendChild(empty);
  }
}

// ---------- State updates ----------
function addToDay(day, workoutId) {
  plan[day].push({ workoutId });
  savePlan(plan);
  renderWeek();
}

// ---------- Storage ----------
function loadWorkouts() {
  const raw = localStorage.getItem(LS_KEYS.workouts);
  if (!raw) return defaultWorkouts;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultWorkouts;
    return parsed;
  } catch {
    return defaultWorkouts;
  }
}

function saveWorkouts(ws) {
  localStorage.setItem(LS_KEYS.workouts, JSON.stringify(ws));
}

function emptyPlan() {
  return Object.fromEntries(DAYS.map(d => [d, []]));
}

function loadPlan() {
  const raw = localStorage.getItem(LS_KEYS.plan);
  if (!raw) return emptyPlan();
  try {
    const parsed = JSON.parse(raw);
    // basic shape check
    for (const d of DAYS) if (!Array.isArray(parsed[d])) return emptyPlan();
    return parsed;
  } catch {
    return emptyPlan();
  }
}

function savePlan(p) {
  localStorage.setItem(LS_KEYS.plan, JSON.stringify(p));
}

// ---------- Modal ----------
function openModal() {
  wName.value = "";
  wCategory.value = "Legs";
  wDuration.value = "";
  wNotes.value = "";
  modal.classList.remove("hidden");
  backdrop.classList.remove("hidden");
  wName.focus();
}
function closeModal() {
  modal.classList.add("hidden");
  backdrop.classList.add("hidden");
}

// ---------- Helpers ----------
function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key] || "Other";
    acc[k] ||= [];
    acc[k].push(item);
    return acc;
  }, {});
}

function cryptoId() {
  // simple unique id
  if (window.crypto?.randomUUID) return crypto.randomUUID();
  return "id_" + Math.random().toString(16).slice(2) + "_" + Date.now();
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}
