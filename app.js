/* Pal-Match — front-end logic (no frameworks).
   Data lives in localStorage for now. To add a back end later, replace
   getProfile() / saveProfile() with fetch() calls to your API (PHP, Node, etc.). */

const KEY = "palmatch_profile";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIMES = ["Morning", "Afternoon", "Evening", "Night"];

function getProfile() {
  try { return JSON.parse(localStorage.getItem(KEY)) || null; }
  catch (e) { return null; }
}
function saveProfile(p) { localStorage.setItem(KEY, JSON.stringify(p)); }

const REQUIRED = ["name", "email", "city", "school", "major", "courses", "mode"];
function completeness(p) {
  if (!p) return 0;
  let done = REQUIRED.filter(k => p[k] && String(p[k]).trim()).length;
  if (p.availability && p.availability.length) done++;
  return Math.round((done / (REQUIRED.length + 1)) * 100);
}
function initials(name) {
  return (name || "?").split(/\s+/).map(s => s[0]).slice(0, 2).join("").toUpperCase();
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------- Nav user pill (all pages) ---------- */
function renderNavUser() {
  const el = document.getElementById("navUser");
  if (!el) return;
  const p = getProfile();
  el.innerHTML = p && p.name
    ? `<a class="pill-user" href="profile.html">${esc(p.name.split(" ")[0])}</a><span class="avatar">${esc(initials(p.name))}</span>`
    : `<a class="btn btn-sm" href="profile.html">Create profile</a>`;
}

/* ---------- Profile page ---------- */
function initProfile() {
  const form = document.getElementById("profileForm");
  const p = getProfile() || {};

  // build availability grid
  const grid = document.getElementById("availGrid");
  grid.innerHTML = `<div></div>` + TIMES.map(t => `<div class="head">${t}</div>`).join("");
  DAYS.forEach(d => {
    grid.insertAdjacentHTML("beforeend", `<div class="day">${d}</div>`);
    TIMES.forEach(t => {
      const key = `${d}-${t}`;
      const on = (p.availability || []).includes(key) ? " on" : "";
      grid.insertAdjacentHTML("beforeend", `<button type="button" class="slot${on}" data-key="${key}" aria-label="${d} ${t}"></button>`);
    });
  });
  grid.addEventListener("click", e => {
    const b = e.target.closest(".slot");
    if (b) b.classList.toggle("on");
  });

  // fill saved values
  ["name", "email", "city", "zip", "school", "major", "year", "courses", "goals", "radius", "mode", "pace"].forEach(k => {
    if (form.elements[k] && p[k] != null) form.elements[k].value = p[k];
  });
  ["styles", "vibe"].forEach(group => {
    (p[group] || []).forEach(v => {
      const input = form.querySelector(`input[name="${group}"][value="${v}"]`);
      if (input) input.checked = true;
    });
  });
  if (p.coords) document.getElementById("geoStatus").textContent = "Location saved ✓";

  // geolocation (optional — stays on this device until you add a back end)
  document.getElementById("geoBtn").addEventListener("click", () => {
    const status = document.getElementById("geoStatus");
    if (!navigator.geolocation) { status.textContent = "Not supported in this browser."; return; }
    status.textContent = "Locating…";
    navigator.geolocation.getCurrentPosition(
      pos => {
        form.dataset.lat = pos.coords.latitude.toFixed(3);
        form.dataset.lng = pos.coords.longitude.toFixed(3);
        status.textContent = "Location captured ✓";
      },
      () => { status.textContent = "Couldn't get location — you can still pick a city."; }
    );
  });

  form.addEventListener("submit", e => {
    e.preventDefault();
    const f = form.elements;
    const data = {
      name: f.name.value.trim(), email: f.email.value.trim(),
      city: f.city.value, zip: f.zip.value.trim(),
      school: f.school.value.trim(), major: f.major.value.trim(), year: f.year.value,
      courses: f.courses.value.trim(), goals: f.goals.value.trim(),
      radius: f.radius.value, mode: f.mode.value, pace: f.pace.value,
      styles: [...form.querySelectorAll('input[name="styles"]:checked')].map(i => i.value),
      vibe: [...form.querySelectorAll('input[name="vibe"]:checked')].map(i => i.value),
      availability: [...grid.querySelectorAll(".slot.on")].map(b => b.dataset.key),
      coords: form.dataset.lat ? { lat: form.dataset.lat, lng: form.dataset.lng } : (p.coords || null),
      updated: new Date().toISOString()
    };
    saveProfile(data);
    renderNavUser();
    const t = document.getElementById("toast");
    t.classList.add("show");
    setTimeout(() => (window.location.href = "dashboard.html"), 800);
  });
}

/* ---------- Dashboard ---------- */
function initDashboard() {
  const p = getProfile();
  const root = document.getElementById("dashRoot");
  if (!p) {
    root.innerHTML = `
      <div class="card" style="text-align:center;padding:56px 28px">
        <h2>Let's set up your profile first</h2>
        <p class="sub">Tell us where you study, what you're taking and when you're free.</p>
        <a class="btn" href="profile.html">Create profile →</a>
      </div>`;
    return;
  }
  const pct = completeness(p);
  const avail = new Set(p.availability || []);
  const mini = `<div></div>` + TIMES.map(t => `<div class="head">${t[0]}</div>`).join("") +
    DAYS.map(d => `<div class="day">${d}</div>` + TIMES.map(t => `<div class="cell${avail.has(d + "-" + t) ? " on" : ""}"></div>`).join("")).join("");
  const tags = arr => (arr && arr.length ? arr.map(x => `<span class="tag">${esc(x)}</span>`).join("") : "—");
  const courses = (p.courses || "").split(",").map(s => s.trim()).filter(Boolean);

  root.innerHTML = `
    <div class="page-head">
      <h1>Hey ${esc((p.name || "there").split(" ")[0])} 👋</h1>
      <p>Here's where your Pal-Match search stands.</p>
    </div>

    <div class="stats">
      <div class="stat"><div class="k">Profile complete</div><div class="v">${pct}%</div></div>
      <div class="stat"><div class="k">Open time slots</div><div class="v">${avail.size}</div></div>
      <div class="stat"><div class="k">Groups joined</div><div class="v">0</div></div>
    </div>

    <div class="dash-grid">
      <div class="stack">
        <div class="card">
          <h2><span class="status-dot"></span>Your study group</h2>
          <p class="sub">${pct >= 80 ? "You're ready to be matched. We'll look for 4–5 people near you." : "Finish your profile to unlock matching."}</p>
          <div class="seats">
            <div class="seat you">${esc(initials(p.name))}</div>
            <div class="seat">+</div><div class="seat">+</div><div class="seat">+</div>
            <div class="seat optional">+</div>
          </div>
          <button class="btn btn-tan btn-sm" id="findBtn" ${pct < 80 ? "disabled style='opacity:.5;cursor:not-allowed'" : ""}>Find my group</button>
          <p class="hint" id="findMsg" style="margin-top:12px"></p>
        </div>

        <div class="card">
          <h2>Upcoming sessions</h2>
          <p class="sub">Study sessions with your group will show up here.</p>
          <div class="empty">Nothing scheduled yet.</div>
        </div>

        <div class="card">
          <h2>Weekly availability</h2>
          <p class="sub">Used to line up schedules with your pals.</p>
          <div class="mini-avail">${mini}</div>
        </div>
      </div>

      <div class="stack">
        <div class="card">
          <h2>Profile progress</h2>
          <div class="progress"><div style="width:${pct}%"></div></div>
          <a class="btn btn-ghost btn-sm" href="profile.html" style="margin-top:10px">Edit profile</a>
        </div>
        <div class="card">
          <h2>Your details</h2>
          <p class="sub">What we'll match on.</p>
          <div class="summary">
            <div class="summary-row"><span class="k">City</span><span class="v">${esc(p.city || "—")}</span></div>
            <div class="summary-row"><span class="k">School</span><span class="v">${esc(p.school || "—")}</span></div>
            <div class="summary-row"><span class="k">Major</span><span class="v">${esc(p.major || "—")}</span></div>
            <div class="summary-row"><span class="k">Meeting</span><span class="v">${esc(p.mode || "—")}</span></div>
            <div class="summary-row"><span class="k">Travel radius</span><span class="v">${p.radius ? esc(p.radius) + " mi" : "—"}</span></div>
            <div class="summary-row"><span class="k">Courses</span><span class="v">${tags(courses)}</span></div>
            <div class="summary-row"><span class="k">Study style</span><span class="v">${tags(p.styles)}</span></div>
            <div class="summary-row"><span class="k">Vibe</span><span class="v">${tags(p.vibe)}</span></div>
          </div>
        </div>
      </div>
    </div>`;

  const btn = document.getElementById("findBtn");
  if (btn && pct >= 80) {
    btn.addEventListener("click", () => {
      // TODO: call matching algorithm / API here
      document.getElementById("findMsg").textContent = "Matching isn't built yet — this is where your algorithm will plug in.";
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderNavUser();
  const page = document.body.dataset.page;
  if (page === "profile") initProfile();
  if (page === "dashboard") initDashboard();
});
