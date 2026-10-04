/* =========================================================
   CampusShuttle — Driver: UC12 Send Delay or SOS Alert
   Implements FR27–FR31 (driver ops) + UC12 edge cases E1–E4
   NOTE: Alert log rendering moved to driver/alerts.html
   ========================================================= */

(function () {
  /* ---------- Constants ---------- */
  const STATE_KEY = "cs_driver_trip_state";
  const ALERTS_KEY = "cs_driver_alerts";
  const UNDO_WINDOW_MS = 5000;

  /* ---------- State ---------- */
  let tripState = {
    active: false,
    startedAt: null,
    elapsedSec: 0,
  };
  let pendingAlert = null;
  let undoTimer = null;
  let tickHandle = null;
  let selectedDelay = null;

  /* ---------- Element getters ---------- */
  const $ = (id) => document.getElementById(id);

  /* =========================================================
     INIT
     ========================================================= */
  function init() {
    const user = window.CS?.getSession?.();
    if (!user) return;

    // Restore persisted trip state
    try {
      const saved = JSON.parse(localStorage.getItem(STATE_KEY));
      if (saved && typeof saved.active === "boolean") tripState = saved;
    } catch {}

    renderDriverHeader(user);
    renderTripCard();
    renderAlertButtonsState();
    wireTripControls();
    wireAlertControls();
    wireDelayOptions();
    wireModals();
    wireConnectivity();
    startTimer();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* =========================================================
     HEADER
     ========================================================= */
  function renderDriverHeader(user) {
    const el = $("driverInfo");
    if (!el) return;
    el.textContent = `${user.name || user.id} · ${user.assignedBus || "BUS-07"}`;
  }

  /* =========================================================
     TRIP CARD
     ========================================================= */
  function renderTripCard() {
    const trip = window.CS_DRIVER_TRIP || {};
    const stops = trip.stops || [];

    $("tripRoute").textContent = trip.routeName || "—";
    $("tripVehicle").textContent =
      `${trip.bus || "—"} · Trip ${trip.tripId || "—"}`;
    $("tripSchedule").textContent =
      `${trip.scheduledDepart || "—"} → ${trip.scheduledArrive || "—"}`;
    $("tripStudents").textContent =
      `${trip.studentsOnBoard || 0} students on board`;

    // Status pill
    const pill = $("tripStatusPill");
    if (tripState.active) {
      pill.textContent = "In Progress";
      pill.className =
        "text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full bg-lime/15 border border-lime/40 text-lime";
    } else {
      pill.textContent = "Not Started";
      pill.className =
        "text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full bg-white/5 border border-white/15 text-muted";
    }

    // Timer
    renderTimer();

    // Stop list
    const stopList = $("stopList");
    stopList.innerHTML = stops
      .map((s) => {
        const dot =
          s.status === "departed"
            ? `<span class="w-3 h-3 rounded-full bg-lime"></span>`
            : s.status === "next"
              ? `<span class="w-3 h-3 rounded-full bg-routeB animate-pulse"></span>`
              : `<span class="w-3 h-3 rounded-full bg-white/20 border border-white/40"></span>`;
        const txt =
          s.status === "departed"
            ? "text-muted line-through"
            : s.status === "next"
              ? "text-cream font-semibold"
              : "text-muted";
        return `
          <div class="flex items-center gap-3">
            ${dot}
            <span class="text-xs ${txt} flex-1 truncate">${s.name}</span>
          </div>
        `;
      })
      .join("");

    // Start / End button
    const btn = $("tripToggleBtn");
    if (tripState.active) {
      btn.textContent = "End Trip";
      btn.className =
        "w-full py-3 rounded-xl border border-routeA/50 text-routeA font-semibold text-sm hover:bg-routeA/10 transition";
    } else {
      btn.textContent = "Start Trip";
      btn.className =
        "w-full py-3 rounded-xl bg-gradient-to-br from-lime/80 to-lime text-navy-950 font-bold text-sm hover:opacity-90 transition";
    }
  }

  /* =========================================================
     TIMER
     ========================================================= */
  function renderTimer() {
    const el = $("tripTimer");
    if (!el) return;
    if (!tripState.active) {
      el.textContent = "00:00";
      return;
    }
    const elapsed = Math.floor((Date.now() - tripState.startedAt) / 1000);
    const m = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const s = String(elapsed % 60).padStart(2, "0");
    el.textContent = `${m}:${s}`;
  }

  function startTimer() {
    if (tickHandle) clearInterval(tickHandle);
    tickHandle = setInterval(renderTimer, 1000);
  }

  /* =========================================================
     TRIP CONTROLS
     ========================================================= */
  function wireTripControls() {
    $("tripToggleBtn").addEventListener("click", () => {
      if (tripState.active) {
        if (
          !confirm("End this trip? This will close the trip and free up seats.")
        )
          return;
        tripState.active = false;
        tripState.startedAt = null;
        toast("Trip ended. Seats have been released.");
      } else {
        tripState.active = true;
        tripState.startedAt = Date.now();
        toast("Trip started. Alerts are now enabled.");
      }
      persistState();
      renderTripCard();
      renderAlertButtonsState();
    });
  }

  function persistState() {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(tripState));
    } catch {}
  }

  /* =========================================================
     ALERT BUTTON STATE (E3 — no active trip)
     ========================================================= */
  function renderAlertButtonsState() {
    const sosBtn = $("sosBtn");
    const delayBtn = $("delayBtn");
    const note = $("alertDisabledNote");

    if (tripState.active) {
      sosBtn.disabled = false;
      delayBtn.disabled = false;
      sosBtn.classList.remove("opacity-40", "cursor-not-allowed");
      delayBtn.classList.remove("opacity-40", "cursor-not-allowed");
      note.classList.add("hidden");
    } else {
      sosBtn.disabled = true;
      delayBtn.disabled = true;
      sosBtn.classList.add("opacity-40", "cursor-not-allowed");
      delayBtn.classList.add("opacity-40", "cursor-not-allowed");
      note.classList.remove("hidden");
    }
  }

  /* =========================================================
     ALERT CONTROLS
     ========================================================= */
  function wireAlertControls() {
    $("sosBtn").addEventListener("click", () => openSosModal());
    $("delayBtn").addEventListener("click", () => openDelayModal());

    $("sosConfirmBtn").addEventListener("click", () => sendAlert("sos"));
    $("delaySendBtn").addEventListener("click", () => sendAlert("delay"));
  }

  /* ---------- SOS modal ---------- */
  function openSosModal() {
    if (!tripState.active) return;
    $("sosNote").value = "";
    showModal("sosModal");
  }

  /* ---------- Delay modal ---------- */
  function openDelayModal() {
    if (!tripState.active) return;
    selectedDelay = null;
    $("delayNote").value = "";
    $("delayCustom").value = "";
    document.querySelectorAll(".delay-opt").forEach((b) => {
      b.classList.remove("border-routeB", "bg-routeB/15", "text-cream");
      b.classList.add("border-white/10", "bg-white/5");
    });
    updateDelaySendState();
    showModal("delayModal");
  }

  function updateDelaySendState() {
    const custom = parseFloat($("delayCustom").value) || 0;
    const valid = selectedDelay || custom > 0;
    $("delaySendBtn").disabled = !valid;
  }

  /* ---------- Wire delay option buttons + custom input ---------- */
  function wireDelayOptions() {
    document.addEventListener("click", (e) => {
      const opt = e.target.closest(".delay-opt");
      if (opt) {
        selectedDelay = Number(opt.dataset.min);
        $("delayCustom").value = "";
        document.querySelectorAll(".delay-opt").forEach((b) => {
          b.classList.remove("border-routeB", "bg-routeB/15", "text-cream");
          b.classList.add("border-white/10", "bg-white/5");
        });
        opt.classList.remove("border-white/10", "bg-white/5");
        opt.classList.add("border-routeB", "bg-routeB/15", "text-cream");
        updateDelaySendState();
      }
    });

    document.addEventListener("input", (e) => {
      if (e.target && e.target.id === "delayCustom") {
        selectedDelay = null;
        document.querySelectorAll(".delay-opt").forEach((b) => {
          b.classList.remove("border-routeB", "bg-routeB/15", "text-cream");
          b.classList.add("border-white/10", "bg-white/5");
        });
        updateDelaySendState();
      }
    });
  }

  /* =========================================================
     MODAL HELPERS
     ========================================================= */
  function showModal(id) {
    const el = $(id);
    el.classList.remove("hidden");
    el.classList.add("flex");
  }
  function hideModal(id) {
    const el = $(id);
    el.classList.add("hidden");
    el.classList.remove("flex");
  }

  function wireModals() {
    document.querySelectorAll("[data-close]").forEach((b) => {
      b.addEventListener("click", (e) => {
        const modal = e.target.closest(".modal-root");
        if (modal) {
          modal.classList.add("hidden");
          modal.classList.remove("flex");
        }
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        document.querySelectorAll(".modal-root.flex").forEach((m) => {
          m.classList.add("hidden");
          m.classList.remove("flex");
        });
      }
    });
  }

  /* =========================================================
     SEND ALERT — main flow (UC12 steps 5–7)
     E1: undo window  · E2: offline queue  · E4: retry
     ========================================================= */
  function sendAlert(type) {
    const students = window.CS_TRIP_STUDENTS || [];
    const note =
      type === "sos" ? $("sosNote").value.trim() : $("delayNote").value.trim();
    const minutes =
      type === "delay"
        ? selectedDelay || parseFloat($("delayCustom").value) || 0
        : null;

    const alert = {
      id: `ALR-${Date.now()}`,
      type,
      minutes,
      note,
      sentAt: new Date().toLocaleString([], {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
      recipients: students.length,
      status: navigator.onLine ? "sending" : "queued",
    };

    pendingAlert = alert;
    hideModal(type === "sos" ? "sosModal" : "delayModal");

    // Send (or queue) → show success modal → start undo window
    simulateDelivery(alert, () => {
      showSuccessModal(alert);
      startUndoWindow(alert);
    });
  }

  /* ---------- Simulate delivery with E4 retry ---------- */
  function simulateDelivery(alert, onDone) {
    if (!navigator.onLine) {
      // E2 — no connectivity → queue
      alert.status = "queued";
      pushAlert(alert);
      toast("Offline — alert queued and will send when back online.");
      onDone();
      return;
    }

    // Simulate occasional delivery failure (E4) — 15% chance
    const fails = Math.random() < 0.15;
    if (fails) {
      setTimeout(() => {
        alert.status = "delivered";
        alert.retried = true;
        pushAlert(alert);
        toast("Delivery failed — auto-retried successfully.");
        onDone();
      }, 900);
    } else {
      setTimeout(() => {
        alert.status = "delivered";
        pushAlert(alert);
        onDone();
      }, 600);
    }
  }

  /* ---------- Success modal ---------- */
  function showSuccessModal(alert) {
    const students = window.CS_TRIP_STUDENTS || [];
    $("successTitle").textContent =
      alert.type === "sos" ? "🚨 SOS Alert Sent" : "⏰ Delay Alert Sent";
    $("successRecipients").textContent =
      `Alert sent to ${students.length} students on this trip`;
    $("successDetail").textContent =
      alert.type === "delay"
        ? `Delayed by ${alert.minutes} minutes${alert.note ? " · " + alert.note : ""}`
        : alert.note || "Emergency alert dispatched to all affected students.";
    showModal("successModal");

    setTimeout(() => hideModal("successModal"), 2600);
  }

  /* =========================================================
     E1 — UNDO WINDOW
     ========================================================= */
  function startUndoWindow(alert) {
    const bar = $("undoBar");
    bar.classList.remove("hidden");

    if (undoTimer) clearTimeout(undoTimer);
    undoTimer = setTimeout(() => {
      bar.classList.add("hidden");
      pendingAlert = null;
    }, UNDO_WINDOW_MS);

    $("undoBtn").onclick = () => {
      if (!pendingAlert) return;
      clearTimeout(undoTimer);
      removeAlert(pendingAlert.id);
      bar.classList.add("hidden");
      toast("Alert cancelled.");
      pendingAlert = null;
    };
  }

  /* =========================================================
     ALERT PERSISTENCE (no rendering — alerts.html reads this)
     ========================================================= */
  function pushAlert(alert) {
    let list = [];
    try {
      const saved = JSON.parse(localStorage.getItem(ALERTS_KEY));
      if (Array.isArray(saved)) list = saved;
    } catch {}

    list.unshift(alert);
    try {
      localStorage.setItem(ALERTS_KEY, JSON.stringify(list));
    } catch {}

    // Notify admin (in a real system — simulated here)
    console.log("[UC12] Alert logged for admin review:", alert);
  }

  function removeAlert(id) {
    let list = [];
    try {
      const saved = JSON.parse(localStorage.getItem(ALERTS_KEY));
      if (Array.isArray(saved)) list = saved;
    } catch {}

    list = list.filter((a) => a.id !== id);
    try {
      localStorage.setItem(ALERTS_KEY, JSON.stringify(list));
    } catch {}
  }

  /* =========================================================
     E2 — CONNECTIVITY
     ========================================================= */
  function wireConnectivity() {
    window.addEventListener("online", () => {
      let list = [];
      try {
        const saved = JSON.parse(localStorage.getItem(ALERTS_KEY));
        if (Array.isArray(saved)) list = saved;
      } catch {}

      const queued = list.filter((a) => a.status === "queued");
      if (queued.length) {
        queued.forEach((a) => (a.status = "delivered"));
        try {
          localStorage.setItem(ALERTS_KEY, JSON.stringify(list));
        } catch {}
        toast(
          `${queued.length} queued alert${queued.length > 1 ? "s" : ""} sent.`,
        );
      }
    });
  }

  /* =========================================================
     TOAST
     ========================================================= */
  function toast(msg) {
    const el = $("toast");
    const txt = $("toastText");
    if (!el || !txt) return;
    txt.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.add("hidden"), 3000);
  }
})();
