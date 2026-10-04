/* =========================================================
   CampusShuttle — UC08 Reserve Seat
   Flow: pick route → pick trip → pick seat → confirm
   Handles: wallet deduction (FR18), loan fallback (FR22–FR26),
            seat lock check (FR16, FR17), confirmation
   ========================================================= */

(function () {
  /* ---------- State ---------- */
  let currentRoute = null;
  let currentTrip = null;
  let currentSeat = null;
  let seatsForTrip = null;

  let user = null;
  let wallet = 0;
  let loanUsed = 0;
  const LOAN_LIMIT = 3;

  /* ---------- Element getters ---------- */
  const $routePicker = () => document.getElementById("routePicker");
  const $tripPicker = () => document.getElementById("tripPicker");
  const $seatGrid = () => document.getElementById("seatGrid");
  const $seatSummary = () => document.getElementById("seatMapSummary");
  const $sumRoute = () => document.getElementById("sumRoute");
  const $sumDepart = () => document.getElementById("sumDepart");
  const $sumSeat = () => document.getElementById("sumSeat");
  const $sumFare = () => document.getElementById("sumFare");
  const $walletBal = () => document.getElementById("walletBalance");
  const $walletNote = () => document.getElementById("walletNote");
  const $loanBox = () => document.getElementById("loanBox");
  const $loanCount = () => document.getElementById("loanCount");
  const $confirmBtn = () => document.getElementById("confirmBtn");
  const $errorBox = () => document.getElementById("errorBox");

  /* =========================================================
     INIT — run immediately on DOM ready
     ========================================================= */
  function init() {
    user = window.CS?.getSession?.();
    if (!user) return;

    wallet = Number(user.wallet || 0);
    loanUsed = Number(user.loanUsed || 0);

    renderRoutePicker();
    renderTripPicker();
    renderSeatGrid();
    updateSummary();
    updateWallet();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* =========================================================
     STEP 1 — Route picker
     ========================================================= */
  function renderRoutePicker() {
    const wrap = $routePicker();
    if (!wrap) return;

    wrap.innerHTML = window.CS_ROUTES.map(
      (r) => `
      <button data-route="${r.id}"
        class="route-btn text-left px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:border-white/20 transition">
        <div class="flex items-center gap-3">
          <span class="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                style="background:${r.color}22; border:1px solid ${r.color}55">
            ${r.icon}
          </span>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-cream truncate">${r.name}</p>
            <p class="text-[10px] text-muted">Route ${r.id}</p>
          </div>
        </div>
      </button>
    `,
    ).join("");

    wrap.querySelectorAll(".route-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentRoute = btn.dataset.route;
        currentTrip = null;
        currentSeat = null;
        seatsForTrip = null;
        highlightRoute(btn);
        renderTripPicker();
        renderSeatGrid();
        updateSummary();
        clearError();
      });
    });
  }

  function highlightRoute(activeBtn) {
    document.querySelectorAll(".route-btn").forEach((b) => {
      b.classList.remove("border-white/60", "bg-white/10");
      b.classList.add("border-white/10", "bg-white/5");
    });
    activeBtn.classList.remove("border-white/10", "bg-white/5");
    activeBtn.classList.add("border-white/60", "bg-white/10");
  }

  /* =========================================================
     STEP 1b — Trip (departure) picker
     ========================================================= */
  function renderTripPicker() {
    const wrap = $tripPicker();
    if (!wrap) return;

    if (!currentRoute) {
      wrap.innerHTML = `<p class="text-xs text-muted col-span-full">Pick a route first.</p>`;
      return;
    }

    const trips = window.CS_SCHEDULES.filter((t) => t.routeId === currentRoute);

    wrap.innerHTML = trips
      .map(
        (t) => `
      <button data-trip="${t.id}"
        class="trip-btn text-left px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:border-white/20 transition">
        <p class="text-base font-bold text-cream">${t.departTime}</p>
        <p class="text-[10px] text-muted mt-0.5">Arrives ${t.arriveTime}</p>
        <p class="text-[10px] text-routeB font-semibold mt-1">RM ${t.fare.toFixed(2)}</p>
      </button>
    `,
      )
      .join("");

    wrap.querySelectorAll(".trip-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentTrip = window.CS_SCHEDULES.find(
          (t) => t.id === btn.dataset.trip,
        );
        currentSeat = null;
        seatsForTrip = { ...(window.CS_SEATS[currentTrip.id] || {}) };
        highlightTrip(btn);
        renderSeatGrid();
        updateSummary();
        clearError();
      });
    });
  }

  function highlightTrip(activeBtn) {
    document.querySelectorAll(".trip-btn").forEach((b) => {
      b.classList.remove("border-white/60", "bg-white/10");
      b.classList.add("border-white/10", "bg-white/5");
    });
    activeBtn.classList.remove("border-white/10", "bg-white/5");
    activeBtn.classList.add("border-white/60", "bg-white/10");
  }

  /* =========================================================
     STEP 2 — Seat map
     ========================================================= */
  function renderSeatGrid() {
    const grid = $seatGrid();
    if (!grid) return;

    if (!seatsForTrip) {
      grid.innerHTML = `<p class="col-span-5 text-center text-xs text-muted py-6">Pick a trip to see the seat map.</p>`;
      $seatSummary().textContent = "";
      return;
    }

    const seatKeys = Object.keys(seatsForTrip);
    const total = seatKeys.length;
    const taken = seatKeys.filter((k) => seatsForTrip[k] !== null).length;
    $seatSummary().textContent = `${total - taken} of ${total} available`;

    const rows = ["A", "B", "C", "D"];
    grid.innerHTML = rows
      .map((row) => {
        const seatRow = [1, 2, 3, 4, 5]
          .map((n) => {
            const id = row + n;
            const occupant = seatsForTrip[id];

            let classes =
              "seat w-10 h-10 sm:w-11 sm:h-11 rounded-lg text-[11px] font-bold flex items-center justify-center border transition";
            let label = id;

            if (occupant === null) {
              classes +=
                " bg-navy-800 border-white/20 text-muted hover:border-routeB hover:text-cream cursor-pointer";
            } else if (occupant === "M") {
              classes +=
                " bg-routeA border-routeA/60 text-white cursor-not-allowed";
              label = "M";
            } else if (occupant === "F") {
              classes +=
                " bg-routeB border-routeB/60 text-white cursor-not-allowed";
              label = "F";
            }

            const aisle = n === 3 ? "ml-6 sm:ml-8" : "";

            return `
          <button data-seat="${id}" data-occupant="${occupant || ""}"
            class="${classes} ${aisle}" ${occupant ? "disabled" : ""}>
            ${label}
          </button>
        `;
          })
          .join("");

        return seatRow;
      })
      .join("");

    grid.querySelectorAll(".seat:not([disabled])").forEach((btn) => {
      btn.addEventListener("click", () => {
        const seatId = btn.dataset.seat;
        currentSeat = currentSeat === seatId ? null : seatId;
        refreshSeatSelection();
        updateSummary();
        clearError();
      });
    });

    refreshSeatSelection();
  }

  function refreshSeatSelection() {
    document.querySelectorAll(".seat:not([disabled])").forEach((btn) => {
      if (btn.dataset.seat === currentSeat) {
        btn.classList.remove("bg-navy-800", "border-white/20", "text-muted");
        btn.classList.add("bg-lime", "border-lime", "text-navy-950");
      } else {
        btn.classList.add("bg-navy-800", "border-white/20", "text-muted");
        btn.classList.remove("bg-lime", "border-lime", "text-navy-950");
      }
    });
  }

  /* =========================================================
     STEP 3 — Summary + wallet
     ========================================================= */
  function updateSummary() {
    const route = currentRoute
      ? window.CS_ROUTES.find((r) => r.id === currentRoute)
      : null;

    $sumRoute().textContent = route ? route.name : "—";
    $sumDepart().textContent = currentTrip
      ? `${currentTrip.departTime} (${currentTrip.bus})`
      : "—";
    $sumSeat().textContent = currentSeat || "—";
    $sumFare().textContent = currentTrip
      ? `RM ${currentTrip.fare.toFixed(2)}`
      : "RM —";

    updateWallet();

    const canConfirm = !!(currentTrip && currentSeat);
    $confirmBtn().disabled = !canConfirm;
  }

  function updateWallet() {
    $walletBal().textContent = `RM ${wallet.toFixed(2)}`;

    if (!currentTrip) {
      $walletNote().textContent = "Select a trip to see the fare.";
      $walletNote().className = "text-[11px] text-muted mt-1";
      $loanBox().classList.add("hidden");
      return;
    }

    const fare = currentTrip.fare;
    const short = wallet < fare;
    const remainingLoan = LOAN_LIMIT - loanUsed;

    if (!short) {
      $walletNote().textContent = `Sufficient balance for RM ${fare.toFixed(2)} fare.`;
      $walletNote().className = "text-[11px] text-lime mt-1";
      $loanBox().classList.add("hidden");
    } else if (remainingLoan > 0) {
      $walletNote().textContent = `Short by RM ${(fare - wallet).toFixed(2)} — loan available.`;
      $walletNote().className = "text-[11px] text-routeB mt-1";
      $loanBox().classList.remove("hidden");
      $loanCount().textContent = `${loanUsed} / ${LOAN_LIMIT}`;
    } else {
      $walletNote().textContent = `Balance short and loan limit reached. Top up to continue.`;
      $walletNote().className = "text-[11px] text-routeA mt-1";
      $loanBox().classList.remove("hidden");
      $loanCount().textContent = `${LOAN_LIMIT} / ${LOAN_LIMIT} (max)`;
    }
  }

  /* =========================================================
     CONFIRM
     ========================================================= */
  document.addEventListener("click", (e) => {
    if (e.target && e.target.id === "confirmBtn") {
      handleConfirm();
    }
  });

  function handleConfirm() {
    clearError();

    if (!currentTrip || !currentSeat) {
      showError("Please select a trip and a seat first.");
      return;
    }
    if (!seatsForTrip || seatsForTrip[currentSeat] !== null) {
      showError("That seat was just taken. Please pick a different seat.");
      return;
    }

    const fare = currentTrip.fare;
    const remainingLoan = LOAN_LIMIT - loanUsed;
    let usedLoan = false;
    let loanAmount = 0;

    if (wallet < fare) {
      if (remainingLoan <= 0) {
        showError(
          "Wallet balance is too low and you've reached the trip loan limit. Top up to continue.",
        );
        return;
      }
      loanAmount = fare - wallet;
      usedLoan = true;
    }

    wallet -= fare;
    if (usedLoan) {
      loanUsed += 1;
      user.loan = (user.loan || 0) + loanAmount;
    }
    user.wallet = wallet;
    user.loanUsed = loanUsed;

    window.CS.saveSession(user);
    seatsForTrip[currentSeat] = user.gender || "M";

    document.getElementById("okRoute").textContent =
      window.CS_ROUTES.find((r) => r.id === currentRoute)?.name || "—";
    document.getElementById("okSeat").textContent = currentSeat;
    document.getElementById("okFare").textContent =
      `RM ${fare.toFixed(2)}` + (usedLoan ? " (loan)" : "");
    document.getElementById("okBalance").textContent =
      `RM ${wallet.toFixed(2)}`;

    showModal();
  }

  /* =========================================================
     MODAL
     ========================================================= */
  function showModal() {
    const modal = document.getElementById("successModal");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    modal.querySelectorAll("[data-close]").forEach((el) => {
      el.addEventListener(
        "click",
        () => {
          modal.classList.add("hidden");
          modal.classList.remove("flex");
          location.reload();
        },
        { once: true },
      );
    });
  }

  /* =========================================================
     ERROR
     ========================================================= */
  function showError(msg) {
    const box = $errorBox();
    box.textContent = msg;
    box.classList.remove("hidden");
    box.classList.remove("animate-shake");
    void box.offsetWidth;
    box.classList.add("animate-shake");
  }
  function clearError() {
    $errorBox().classList.add("hidden");
  }
})();
