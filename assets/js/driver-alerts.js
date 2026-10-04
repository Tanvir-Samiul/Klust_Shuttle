/* =========================================================
   CampusShuttle — Driver: Alert History page
   Reads/writes the same localStorage key as driver-trip.js
   Key: "cs_driver_alerts"
   ========================================================= */

(function () {
  const ALERTS_KEY = "cs_driver_alerts";

  let alerts = [];
  let currentFilter = "all";

  /* ---------- Element getters ---------- */
  const $ = (id) => document.getElementById(id);

  /* =========================================================
     INIT
     ========================================================= */
  function init() {
    const user = window.CS?.getSession?.();
    if (!user) return;

    // Load from localStorage; fall back to seed data
    try {
      const saved = JSON.parse(localStorage.getItem(ALERTS_KEY));
      alerts = Array.isArray(saved) ? saved : (window.CS_ALERTS || []).slice();
    } catch {
      alerts = (window.CS_ALERTS || []).slice();
    }

    renderStats();
    renderList();
    wireFilters();
    wireClear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* =========================================================
     STATS
     ========================================================= */
  function renderStats() {
    const total = alerts.length;
    const sos = alerts.filter((a) => a.type === "sos").length;
    const delay = alerts.filter((a) => a.type === "delay").length;
    const recipients = alerts.reduce((sum, a) => sum + (a.recipients || 0), 0);

    $("statTotal").textContent = total;
    $("statSos").textContent = sos;
    $("statDelay").textContent = delay;
    $("statRecipients").textContent = recipients;

    $("alertCount").textContent =
      total === 0 ? "No alerts yet" : `${total} alert${total > 1 ? "s" : ""}`;
  }

  /* =========================================================
     LIST
     ========================================================= */
  function renderList() {
    const list = $("alertsList");
    if (!list) return;

    let filtered = alerts;
    if (currentFilter === "sos")
      filtered = alerts.filter((a) => a.type === "sos");
    else if (currentFilter === "delay")
      filtered = alerts.filter((a) => a.type === "delay");
    else if (currentFilter === "queued")
      filtered = alerts.filter((a) => a.status === "queued");

    if (!filtered.length) {
      list.innerHTML = `
        <div class="p-10 text-center text-sm text-muted">
          No alerts match this filter.
        </div>
      `;
      return;
    }

    list.innerHTML = filtered
      .map((a) => {
        const isSos = a.type === "sos";
        const badge = isSos
          ? `<span class="text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full bg-routeA/15 border border-routeA/40 text-routeA">SOS</span>`
          : `<span class="text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full bg-routeB/15 border border-routeB/40 text-routeB">DELAY ${a.minutes ? a.minutes + "M" : ""}</span>`;

        const status =
          a.status === "queued"
            ? `<span class="inline-flex items-center gap-1 text-[11px] font-semibold text-routeB">⏳ Queued</span>`
            : a.retried
              ? `<span class="inline-flex items-center gap-1 text-[11px] font-semibold text-lime">↻ Retried ✓</span>`
              : `<span class="inline-flex items-center gap-1 text-[11px] font-semibold text-lime">✓ Delivered</span>`;

        const icon = isSos ? "🚨" : "⏰";
        const bg = isSos ? "bg-routeA/15" : "bg-routeB/15";

        return `
          <div class="flex items-start gap-4 px-5 sm:px-6 py-4">
            <div class="w-10 h-10 rounded-xl ${bg} flex items-center justify-center text-lg shrink-0">
              ${icon}
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                ${badge}
                <span class="text-xs text-muted">${a.sentAt || "—"}</span>
              </div>
              <p class="mt-2 text-sm font-semibold text-cream">
                ${a.note || (isSos ? "Emergency alert" : "Delay notification")}
              </p>
              <p class="text-[11px] text-muted mt-1">
                Sent to <span class="text-cream font-semibold">${a.recipients || 0}</span> students on this trip
              </p>
            </div>

            <div class="shrink-0 text-right">
              ${status}
              <p class="text-[10px] text-muted mt-1">ID ${a.id || "—"}</p>
            </div>
          </div>
        `;
      })
      .join("");
  }

  /* =========================================================
     FILTERS
     ========================================================= */
  function wireFilters() {
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentFilter = btn.dataset.filter;

        document.querySelectorAll(".filter-btn").forEach((b) => {
          b.className =
            "filter-btn px-4 py-2 rounded-xl text-xs font-semibold border border-white/10 bg-white/5 text-muted hover:text-cream transition";
        });

        btn.className =
          "filter-btn px-4 py-2 rounded-xl text-xs font-semibold border border-routeB/40 bg-routeB/10 text-cream";

        renderList();
      });
    });
  }

  /* =========================================================
     CLEAR ALL
     ========================================================= */
  function wireClear() {
    $("clearAlertsBtn").addEventListener("click", () => {
      if (!alerts.length) return;
      if (!confirm("Clear all alert history? This cannot be undone.")) return;
      alerts = [];
      localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
      renderStats();
      renderList();
    });
  }
})();
