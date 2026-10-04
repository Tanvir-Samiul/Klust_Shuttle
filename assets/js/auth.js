/* =========================================================
   CampusShuttle — authentication + role tabs
   Handles: role switching, floating pill, login validation,
            session persistence, redirect by role.
   Aligns with: FR04 (student login), FR05 (driver login),
                UC02 (Log In), NFR-01/02 (secure logout),
                NFR-05 (login ≤2s), NFR-12 (clear messages)
   ========================================================= */

const SESSION_KEY = "cs_session";

/* ---------- Role config ---------- */
const ROLE_LABELS = {
  student: { label: "KLUST Student ID", placeholder: "e.g. 253926139" },
  driver: { label: "Driver ID", placeholder: "e.g. DRV-001" },
  admin: { label: "Admin ID", placeholder: "e.g. ADM-001" },
};

const ROLE_INDEX = { student: 0, driver: 1, admin: 2 };

let currentRole = "student";

/* =========================================================
   ROLE TABS
   ========================================================= */
function setRole(role) {
  currentRole = role;

  // Move sliding pill
  const pill = document.getElementById("rolePill");
  const idx = ROLE_INDEX[role] ?? 0;
  pill.style.transform = `translateX(${idx * 100}%)`;

  // Update ID label + placeholder
  const conf = ROLE_LABELS[role] || ROLE_LABELS.student;
  const labelEl = document.getElementById("userIdLabel");
  const inputEl = document.getElementById("userId");
  if (labelEl) labelEl.textContent = conf.label;
  if (inputEl) inputEl.placeholder = conf.placeholder;

  hideError();
}

/* =========================================================
   PASSWORD VISIBILITY
   ========================================================= */
function togglePassword() {
  const pw = document.getElementById("password");
  const btn = document.getElementById("togglePw");
  if (!pw || !btn) return;
  const show = pw.type === "password";
  pw.type = show ? "text" : "password";
  btn.textContent = show ? "Hide" : "Show";
}

/* =========================================================
   ERROR HELPERS
   ========================================================= */
function showError(msg) {
  const box = document.getElementById("errorBox");
  if (!box) return;
  box.textContent = msg;
  box.classList.remove("hidden");

  // Re-trigger shake animation
  box.classList.remove("animate-shake");
  void box.offsetWidth; // force reflow
  box.classList.add("animate-shake");
}

function hideError() {
  const box = document.getElementById("errorBox");
  if (box) box.classList.add("hidden");
}

/* =========================================================
   SESSION HELPERS
   ========================================================= */
function saveSession(user) {
  const safe = { ...user };
  delete safe.password; // never persist passwords
  localStorage.setItem(SESSION_KEY, JSON.stringify(safe));
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY); // NFR-01 / NFR-02
}

/* =========================================================
   BUTTON RIPPLE (micro-interaction)
   ========================================================= */
function createRipple(e) {
  const btn = e.currentTarget;
  const circle = document.createElement("span");
  const diameter = Math.max(btn.clientWidth, btn.clientHeight);
  const radius = diameter / 2;

  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${e.clientX - btn.getBoundingClientRect().left - radius}px`;
  circle.style.top = `${e.clientY - btn.getBoundingClientRect().top - radius}px`;
  circle.classList.add("ripple");

  const existing = btn.querySelector(".ripple");
  if (existing) existing.remove();

  btn.appendChild(circle);
  setTimeout(() => circle.remove(), 600);
}

/* =========================================================
   BUTTON STATE HELPERS
   ========================================================= */
function setLoading(isLoading) {
  const btn = document.getElementById("loginBtn");
  const txt = document.getElementById("btnText");
  const spin = document.getElementById("btnSpinner");
  if (!btn) return;

  btn.disabled = isLoading;
  if (isLoading) {
    txt.classList.add("opacity-0");
    spin.classList.remove("hidden");
  } else {
    txt.classList.remove("opacity-0");
    spin.classList.add("hidden");
  }
}

function setSuccess() {
  const btn = document.getElementById("loginBtn");
  const txt = document.getElementById("btnText");
  const spin = document.getElementById("btnSpinner");
  if (!btn) return;

  spin.classList.add("hidden");
  txt.classList.remove("opacity-0");
  txt.textContent = "Success ✓";
  btn.classList.add("btn-success");
}

/* =========================================================
   LOGIN HANDLER
   ========================================================= */
function handleLogin(e) {
  e.preventDefault();
  hideError();

  const userId = document.getElementById("userId").value.trim();
  const password = document.getElementById("password").value;

  // Basic validation
  if (!userId || !password) {
    showError("Please enter both your ID and password.");
    return;
  }

  setLoading(true);

  // Simulate network latency (NFR-05: ≤2s feel)
  setTimeout(() => {
    const user = MOCK_USERS.find(
      (u) =>
        u.id.toLowerCase() === userId.toLowerCase() &&
        u.password === password &&
        u.role === currentRole,
    );

    if (!user) {
      // Don't reveal which field was wrong (security best practice)
      showError("Invalid credentials. Please check your ID and password.");
      setLoading(false);
      return;
    }

    // Persist session + show success
    saveSession(user);
    setSuccess();

    // Redirect by role after brief success animation
    const redirects = {
      student: "student/dashboard.html",
      driver: "driver/trip.html",
      admin: "admin/routes.html",
    };

    // Fade out whole page then navigate
    document.body.classList.add("fade-out-page");
    setTimeout(() => {
      window.location.href = redirects[user.role] || "login.html";
    }, 400);
  }, 700);
}

/* =========================================================
   WIRE UP ON DOM READY
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  // Only run login-page wiring if we're actually on the login page
  const isLoginPage = !!document.getElementById("loginForm");
  if (!isLoginPage) return;

  document.querySelectorAll(".role-tab").forEach((btn) => {
    btn.addEventListener("click", () => setRole(btn.dataset.role));
  });

  const toggle = document.getElementById("togglePw");
  if (toggle) toggle.addEventListener("click", togglePassword);

  const form = document.getElementById("loginForm");
  if (form) form.addEventListener("submit", handleLogin);

  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) loginBtn.addEventListener("click", createRipple);

  setRole("student");
});

/* =========================================================
   EXPOSE FOR OTHER PAGES (dashboard.js will reuse getSession)
   ========================================================= */
window.CS = { getSession, clearSession, saveSession, MOCK_USERS };
