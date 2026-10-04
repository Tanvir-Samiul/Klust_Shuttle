/* =========================================================
   CampusShuttle — Admin: UC04 Manage Routes & Analytics
   Implements FR07 (CRUD routes + analytics dashboard)
   Edge cases:
     E1 — route conflict: overlapping schedule rejected
     E2 — insufficient data: analytics info banner
     E3 — delete blocked: route with active trips
   ========================================================= */

(function () {
  const STORAGE_KEY = "cs_admin_routes";

  let routes = [];
  let vehicles = [];
  let analytics = null;
  let currentFilter = "all";
  let editingId = null; // null = adding, else route id
  let pendingDeleteId = null;

  /* ---------- Element getters ---------- */
  const $ = (id) => document.getElementById(id);

  /* =========================================================
     INIT
     ========================================================= */
  function init() {
    const user = window.CS?.getSession?.();
    if (!user || user.role !== "admin") return;

    // Load routes — prefer localStorage (persisted edits) over seed
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      routes =
        Array.isArray(saved) && saved.length
          ? saved
          : (window.CS_ADMIN_ROUTES || []).slice();
    } catch {
      routes = (window.CS_ADMIN_ROUTES || []).slice();
    }

    vehicles = window.CS_ADMIN_VEHICLES || [];
    analytics = window.CS_ANALYTICS || {};

    wireTabs();
    wireAddButton();
    wireFilters();
    wireRouteForm();
    wireModals();
    wireDeleteModal();

    populateVehicleSelect();
    renderRoutes();
    renderAnalytics();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* =========================================================
     TABS
     ========================================================= */
  function wireTabs() {
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;

        document.querySelectorAll(".tab-btn").forEach((b) => {
          b.className =
            "tab-btn px-5 py-2.5 rounded-xl text-xs font-semibold text-muted hover:text-cream transition";
        });
        btn.className =
          "tab-btn px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-br from-routeB/25 to-routeA/15 text-cream border border-routeB/30";

        $("tab-routes").classList.toggle("hidden", tab !== "routes");
        $("tab-analytics").classList.toggle("hidden", tab !== "analytics");
      });
    });
  }

  /* =========================================================
     ROUTE LIST
     ========================================================= */
  function wireFilters() {
    document.querySelectorAll(".route-filter").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentFilter = btn.dataset.filter;
        document.querySelectorAll(".route-filter").forEach((b) => {
          b.className =
            "route-filter px-3 py-1.5 rounded-full text-[11px] font-semibold border border-white/10 bg-white/5 text-muted hover:text-cream transition";
        });
        btn.className =
          "route-filter px-3 py-1.5 rounded-full text-[11px] font-semibold border border-routeB/40 bg-routeB/10 text-cream";
        renderRoutes();
      });
    });
  }

  function renderRoutes() {
    const list = $("routesList");
    const filtered = routes.filter((r) => {
      if (currentFilter === "active") return r.active !== false;
      if (currentFilter === "inactive") return r.active === false;
      return true;
    });

    $("routeCount").textContent =
      `${filtered.length} route${filtered.length === 1 ? "" : "s"}`;

    if (!filtered.length) {
      list.innerHTML = `
        <div class="p-10 text-center text-sm text-muted bg-navy-900/40 border border-dashed border-white/10 rounded-2xl">
          No routes match this filter.
        </div>`;
      return;
    }

    list.innerHTML = filtered
      .map((r) => {
        const stopPath = (r.stops || []).join(" → ");
        const scheduleTags = (r.schedules || [])
          .map(
            (s) =>
              `<span style="font-size:10px;padding:2px 8px;border-radius:999px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#F5F1EA;">${s}</span>`,
          )
          .join(" ");
        const vehicleName =
          vehicles.find((v) => v.id === r.vehicle)?.id || r.vehicle || "—";

        const isActive = r.active !== false;

        return `
        <div style="background:rgba(15,30,55,0.6);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:20px;box-shadow:0 4px 24px -8px rgba(0,0,0,0.4);">
          <div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;">

            <!-- Icon -->
            <div style="width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;background:${r.color}22;border:1px solid ${r.color}55;">
              ${r.icon || "🚌"}
            </div>

            <!-- Info -->
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <h3 style="font-size:16px;font-weight:800;color:#F5F1EA;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.name}</h3>

                <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;padding:2px 10px;border-radius:999px;border:1px solid ${r.color}66;color:${r.color};background:${r.color}15;">
                  Route ${r.id}
                </span>

                <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;padding:2px 10px;border-radius:999px;${
                  isActive
                    ? "color:#41ee22;background:rgba(65,238,34,0.1);border:1px solid rgba(65,238,34,0.4);"
                    : "color:#8FA3BF;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);"
                }">
                  ${isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <p style="font-size:11px;color:#8FA3BF;margin:6px 0 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${stopPath}</p>

              <div style="margin-top:12px;display:flex;flex-wrap:wrap;align-items:center;gap:12px;font-size:11px;">
                <span style="color:#8FA3BF;">Fare <span style="color:#F5F1EA;font-weight:600;">RM ${Number(r.fare || 0).toFixed(2)}</span></span>
                <span style="color:#8FA3BF;">Duration <span style="color:#F5F1EA;font-weight:600;">${r.durationMin || "—"} min</span></span>
                <span style="color:#8FA3BF;">Bus <span style="color:#F5F1EA;font-weight:600;">${vehicleName}</span></span>
              </div>

              <div style="margin-top:12px;display:flex;flex-wrap:wrap;align-items:center;gap:6px;">
                ${scheduleTags || '<span style="font-size:10px;color:#8FA3BF;">No scheduled departures</span>'}
              </div>
            </div>

            <!-- Buttons (inline styles — guaranteed visible) -->
            <div style="display:flex;flex-direction:column;gap:8px;flex-shrink:0;">
              <button
                data-edit="${r.id}"
                style="
                  padding:10px 18px;
                  border-radius:12px;
                  border:1px solid rgba(245,241,234,0.25);
                  background:rgba(255,255,255,0.03);
                  color:#F5F1EA;
                  font-size:12px;
                  font-weight:600;
                  cursor:pointer;
                  transition:all 0.15s ease;
                  font-family:inherit;
                  display:inline-flex;
                  align-items:center;
                  gap:6px;
                "
                onmouseover="this.style.background='rgba(245,241,234,0.1)';this.style.borderColor='rgba(245,241,234,0.4)'"
                onmouseout="this.style.background='rgba(255,255,255,0.03)';this.style.borderColor='rgba(245,241,234,0.25)'">
                ✏️ Edit
              </button>

              <button
                data-toggle="${r.id}"
                style="
                  padding:10px 18px;
                  border-radius:12px;
                  border:1px solid ${
                    isActive ? "rgba(143,163,191,0.5)" : "rgba(65,238,34,0.5)"
                  };
                  background:${
                    isActive ? "rgba(143,163,191,0.06)" : "rgba(65,238,34,0.08)"
                  };
                  color:${isActive ? "#8FA3BF" : "#41ee22"};
                  font-size:12px;
                  font-weight:600;
                  cursor:pointer;
                  transition:all 0.15s ease;
                  font-family:inherit;
                  display:inline-flex;
                  align-items:center;
                  gap:6px;
                "
                onmouseover="this.style.background='${
                  isActive ? "rgba(143,163,191,0.15)" : "rgba(65,238,34,0.18)"
                }'"
                onmouseout="this.style.background='${
                  isActive ? "rgba(143,163,191,0.06)" : "rgba(65,238,34,0.08)"
                }'">
                ${isActive ? "⏸️ Deactivate" : "▶️ Activate"}
              </button>

              <button
                data-delete="${r.id}"
                style="
                  padding:10px 18px;
                  border-radius:12px;
                  border:1px solid rgba(239,68,68,0.5);
                  background:rgba(239,68,68,0.06);
                  color:#ef4444;
                  font-size:12px;
                  font-weight:600;
                  cursor:pointer;
                  transition:all 0.15s ease;
                  font-family:inherit;
                  display:inline-flex;
                  align-items:center;
                  gap:6px;
                "
                onmouseover="this.style.background='rgba(239,68,68,0.15)';this.style.borderColor='rgba(239,68,68,0.8)'"
                onmouseout="this.style.background='rgba(239,68,68,0.06)';this.style.borderColor='rgba(239,68,68,0.5)'">
                🗑️ Delete
              </button>
            </div>

          </div>
        </div>`;
      })
      .join("");

    // Wire edit + toggle + delete buttons
    list
      .querySelectorAll("[data-edit]")
      .forEach((btn) =>
        btn.addEventListener("click", () => openRouteModal(btn.dataset.edit)),
      );
    list
      .querySelectorAll("[data-toggle]")
      .forEach((btn) =>
        btn.addEventListener("click", () =>
          toggleRouteActive(btn.dataset.toggle),
        ),
      );
    list
      .querySelectorAll("[data-delete]")
      .forEach((btn) =>
        btn.addEventListener("click", () =>
          openDeleteModal(btn.dataset.delete),
        ),
      );
  }

  /* =========================================================
     TOGGLE ACTIVE / INACTIVE
     ========================================================= */
  function toggleRouteActive(id) {
    const r = routes.find((x) => x.id === id);
    if (!r) return;
    r.active = r.active === false ? true : false;
    persist();
    renderRoutes();
    toast(`Route ${id} ${r.active ? "activated" : "deactivated"}.`);
  }

  /* =========================================================
     ADD / EDIT MODAL
     ========================================================= */
  function wireAddButton() {
    $("addRouteBtn").addEventListener("click", () => openRouteModal(null));
  }

  function populateVehicleSelect() {
    const sel = $("fRouteVehicle");
    sel.innerHTML =
      `<option value="">— Select —</option>` +
      vehicles
        .map((v) => `<option value="${v.id}">${v.id} · ${v.plate}</option>`)
        .join("");
  }

  function openRouteModal(id) {
    editingId = id;
    const r = id ? routes.find((x) => x.id === id) : null;

    $("routeModalTitle").textContent = r
      ? `Edit Route ${r.id}`
      : "Add New Route";
    $("fRouteId").value = r?.id || "";
    $("fRouteId").disabled = !!r; // don't allow ID change when editing
    $("fRouteName").value = r?.name || "";
    $("fRouteFare").value = r?.fare ?? "";
    $("fRouteDuration").value = r?.durationMin ?? "";
    $("fRouteVehicle").value = r?.vehicle || "";
    $("fRouteSchedules").value = (r?.schedules || []).join(", ");
    $("routeFormError").classList.add("hidden");

    showModal("routeModal");
  }

  function wireRouteForm() {
    $("routeForm").addEventListener("submit", (e) => {
      e.preventDefault();
      saveRoute();
    });
  }

  function saveRoute() {
    const errBox = $("routeFormError");
    errBox.classList.add("hidden");

    const id = $("fRouteId").value.trim().toUpperCase();
    const name = $("fRouteName").value.trim();
    const fare = parseFloat($("fRouteFare").value);
    const durationMin = parseInt($("fRouteDuration").value, 10);
    const vehicle = $("fRouteVehicle").value;
    const schedulesRaw = $("fRouteSchedules").value.trim();

    /* ---------- Basic validation ---------- */
    if (!id || !name || isNaN(fare) || isNaN(durationMin) || !vehicle) {
      return showFormError("Please fill in all required fields.");
    }

    // Parse & validate schedule times
    const schedules = schedulesRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!schedules.length) {
      return showFormError("Please add at least one departure time.");
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    for (const t of schedules) {
      if (!timeRegex.test(t)) {
        return showFormError(`"${t}" is not a valid HH:MM time.`);
      }
    }

    /* ---------- E1: schedule conflict check ---------- */
    const conflict = findConflict({
      id,
      vehicle,
      schedules,
      durationMin,
    });
    if (conflict) {
      return showFormError(
        `Schedule conflict (E1): ${conflict}. Pick a different slot or vehicle.`,
      );
    }

    /* ---------- Duplicate ID check (only when adding) ---------- */
    if (!editingId && routes.some((r) => r.id === id)) {
      return showFormError(`Route ${id} already exists.`);
    }

    /* ---------- Save ---------- */
    if (editingId) {
      const idx = routes.findIndex((r) => r.id === editingId);
      routes[idx] = {
        ...routes[idx],
        name,
        fare,
        durationMin,
        vehicle,
        schedules,
      };
      toast(`Route ${editingId} updated.`);
    } else {
      routes.push({
        id,
        name,
        color: "#ef4444",
        icon: "🚌",
        fare,
        durationMin,
        vehicle,
        schedules,
        stops: [name.split("→")[0]?.trim() || "Origin", "KLUST"],
        active: true,
      });
      toast(`Route ${id} created.`);
    }

    persist();
    renderRoutes();
    hideModal("routeModal");
  }

  function showFormError(msg) {
    const box = $("routeFormError");
    box.textContent = msg;
    box.classList.remove("hidden");
    box.classList.remove("animate-shake");
    void box.offsetWidth;
    box.classList.add("animate-shake");
  }

  /* ---------- E1: schedule conflict detection ----------
     Rule: same vehicle cannot have overlapping scheduled windows.
     Overlap = |start₁ − start₂| < longer of the two durations.
  */
  function findConflict({ id, vehicle, schedules, durationMin }) {
    const others = routes.filter((r) => r.id !== id && r.vehicle === vehicle);

    for (const other of others) {
      for (const t1 of schedules) {
        for (const t2 of other.schedules || []) {
          const m1 = toMinutes(t1);
          const m2 = toMinutes(t2);
          const gap = Math.abs(m1 - m2);
          const longer = Math.max(durationMin, other.durationMin || 0);

          if (gap < longer) {
            return `Bus ${vehicle} is already scheduled on ${other.id} at ${t2} (${other.durationMin} min trip)`;
          }
        }
      }
    }
    return null;
  }

  function toMinutes(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  }

  /* =========================================================
     DELETE (E3 — block if has active trips / schedules)
     ========================================================= */
  function openDeleteModal(id) {
    pendingDeleteId = id;
    const r = routes.find((x) => x.id === id);
    if (!r) return;

    // E3 — blocked if active and has schedules
    const blocked = r.active !== false && (r.schedules || []).length > 0;

    if (blocked) {
      $("deleteTitle").textContent = "Cannot Delete Route";
      $("deleteBody").innerHTML = `
        Route <span class="font-bold text-cream">${r.id}</span> has
        <span class="font-bold text-cream">${(r.schedules || []).length}</span>
        upcoming trips assigned to it.<br><br>
        <span class="text-routeA font-semibold">E3 — delete blocked.</span><br>
        Click <span class="font-bold text-cream">⏸️ Deactivate</span> on the route card first, then try deleting again.
      `;
      $("deleteConfirmBtn").disabled = true;
      $("deleteConfirmBtn").classList.add("opacity-40", "cursor-not-allowed");
    } else {
      $("deleteTitle").textContent = "Delete Route?";
      $("deleteBody").innerHTML =
        `This will permanently remove route <span class="font-bold text-cream">${r.id}</span> and its schedules. This action cannot be undone.`;
      $("deleteConfirmBtn").disabled = false;
      $("deleteConfirmBtn").classList.remove(
        "opacity-40",
        "cursor-not-allowed",
      );
    }

    showModal("deleteModal");
  }

  function wireDeleteModal() {
    $("deleteConfirmBtn").addEventListener("click", () => {
      if (!pendingDeleteId) return;
      routes = routes.filter((r) => r.id !== pendingDeleteId);
      persist();
      renderRoutes();
      hideModal("deleteModal");
      toast(`Route ${pendingDeleteId} deleted.`);
      pendingDeleteId = null;
    });
  }

  /* =========================================================
     PERSISTENCE
     ========================================================= */
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
    } catch {}
  }

  /* =========================================================
     ANALYTICS
     ========================================================= */
  function renderAnalytics() {
    const a = analytics || {};

    /* E2 — not enough data → show info banner */
    if (!a.kpis || (a.dataWindowDays || 0) < 1) {
      $("analyticsInfo").classList.remove("hidden");
    } else if ((a.kpis?.totalTrips || 0) < 20) {
      $("analyticsInfo").classList.remove("hidden");
    }

    /* KPIs */
    const k = a.kpis || {};
    $("kpiTrips").textContent = k.totalTrips?.toLocaleString() ?? "—";
    $("kpiPassengers").textContent = k.totalPassengers?.toLocaleString() ?? "—";
    $("kpiLoad").textContent = k.avgLoadFactor
      ? `${Math.round(k.avgLoadFactor * 100)}%`
      : "—";
    $("kpiOntime").textContent = k.onTimePct
      ? `${Math.round(k.onTimePct * 100)}%`
      : "—";

    /* Peak hour chart */
    renderPeakChart(a.peakHours || []);

    /* Route load */
    renderRouteLoad(a.routeLoad || []);

    /* Congestion */
    renderCongestion(a.congestion || []);
  }

  function renderPeakChart(data) {
    const chart = $("peakChart");
    const labels = $("peakLabels");
    const badge = $("peakBadge");

    if (!data.length) {
      chart.innerHTML = `<p class="text-xs text-muted m-auto">No data yet.</p>`;
      labels.innerHTML = "";
      badge.textContent = "—";
      return;
    }

    const max = Math.max(...data.map((d) => d.passengers));
    const peak = data.find((d) => d.passengers === max);

    badge.textContent = `Peak ${peak.hour} · ${peak.passengers}`;

    chart.innerHTML = data
      .map((d) => {
        const pct = Math.round((d.passengers / max) * 100);
        const isPeak = d.passengers === max;
        const color = isPeak
          ? "linear-gradient(180deg,#ef4444,#b91c1c)"
          : "linear-gradient(180deg,#f76d0a,#8B5E3C)";
        return `
        <div class="flex-1 flex flex-col items-center justify-end h-full" title="${d.hour} · ${d.passengers} passengers">
          <div class="w-full rounded-t-md transition-all" style="height:${pct}%;background:${color};min-height:4px"></div>
        </div>`;
      })
      .join("");

    labels.innerHTML = data
      .map((d) => `<div class="flex-1 text-center">${d.hour}</div>`)
      .join("");
  }

  function renderRouteLoad(data) {
    const list = $("routeLoadList");
    if (!data.length) {
      list.innerHTML = `<p class="text-xs text-muted text-center py-6">No route load data yet.</p>`;
      return;
    }

    list.innerHTML = data
      .map((r) => {
        const pct = Math.round((r.avgLoad || 0) * 100);
        const color =
          pct >= 70
            ? "linear-gradient(90deg,#ef4444,#b91c1c)"
            : pct >= 40
              ? "linear-gradient(90deg,#f76d0a,#8B5E3C)"
              : "linear-gradient(90deg,#41ee22,#5c9a5c)";
        return `
        <div>
          <div class="flex items-center justify-between text-xs mb-1.5">
            <span class="text-cream font-semibold">Route ${r.routeId}</span>
            <span class="text-muted">${r.trips} trips · ${r.passengers} passengers · <span class="text-cream font-semibold">${pct}%</span></span>
          </div>
          <div class="h-2 rounded-full bg-white/5 overflow-hidden">
            <div class="h-full transition-all" style="width:${pct}%;background:${color}"></div>
          </div>
        </div>`;
      })
      .join("");
  }

  function renderCongestion(data) {
    const list = $("congestionList");
    if (!data.length) {
      list.innerHTML = `<p class="text-xs text-muted text-center py-6">No congestion data yet.</p>`;
      return;
    }

    const style = {
      low: {
        bg: "bg-lime/15",
        text: "text-lime",
        border: "border-lime/40",
        label: "Low",
      },
      medium: {
        bg: "bg-routeB/15",
        text: "text-routeB",
        border: "border-routeB/40",
        label: "Medium",
      },
      high: {
        bg: "bg-routeA/15",
        text: "text-routeA",
        border: "border-routeA/40",
        label: "High",
      },
    };

    list.innerHTML = data
      .map((c) => {
        const s = style[c.level] || style.low;
        return `
        <div class="flex items-center gap-3">
          <span class="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border ${s.bg} ${s.border} ${s.text}">
            ${s.label}
          </span>
          <span class="flex-1 text-xs text-cream truncate">${c.segment}</span>
          <span class="text-xs text-muted">+${c.delay} min</span>
        </div>`;
      })
      .join("");
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
