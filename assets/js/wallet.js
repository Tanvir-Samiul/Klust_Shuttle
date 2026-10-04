/* =========================================================
   CampusShuttle — Wallet page
   FR19 wallet · FR20–FR21 top-up + gateway
   FR22–FR26 trip loan + auto repayment
   + Simulated payment-app overlays (TnG / DuitNow / FPX)
   ========================================================= */

(function () {
  let user = null;
  let wallet = 0;
  let loanUsed = 0;
  const LOAN_LIMIT = 3;

  let transactions = [];
  let currentFilter = "all";
  let selectedAmount = 0;
  let pendingMethod = "Touch n Go";
  let selectedBank = null;

  /* Bank brand colors — matches real bank identities */
  const BANK_COLORS = {
    Maybank: "#FDCF0B", // signature yellow
    CIMB: "#EC1C24", // CIMB red
    RHB: "#005BAA", // RHB blue
    "Public Bank": "#E60012", // PBB red
  };

  /* ---------- Element getters ---------- */
  const $walletBig = () => document.getElementById("walletBalanceBig");
  const $loanOut = () => document.getElementById("loanOutstanding");
  const $loanCycle = () => document.getElementById("loanCycleText");
  const $loanBar = () => document.getElementById("loanProgressBar");
  const $loanNote = () => document.getElementById("loanNote");
  const $statSpent = () => document.getElementById("statSpent");
  const $statTrips = () => document.getElementById("statTrips");
  const $statRepaid = () => document.getElementById("statRepaid");
  const $statTopups = () => document.getElementById("statTopups");
  const $txList = () => document.getElementById("txList");
  const $topupModal = () => document.getElementById("topupModal");
  const $customAmt = () => document.getElementById("customAmount");
  const $confirmBtn = () => document.getElementById("confirmTopup");
  const $topupError = () => document.getElementById("topupError");
  const $loanRepay = () => document.getElementById("loanRepayNotice");
  const $repayAmount = () => document.getElementById("repayAmount");
  const $toast = () => document.getElementById("toast");
  const $toastText = () => document.getElementById("toastText");

  /* =========================================================
     INIT
     ========================================================= */
  function init() {
    user = window.CS?.getSession?.();
    if (!user) return;

    wallet = Number(user.wallet || 0);
    loanUsed = Number(user.loanUsed || 0);

    transactions = [...(window.CS_TRANSACTIONS || [])];

    renderBalance();
    renderLoan();
    renderStats();
    renderTransactions();
    wireTopup();
    wireOverlays();
    buildQrPattern();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* =========================================================
     RENDER
     ========================================================= */
  function renderBalance() {
    $walletBig().textContent = `RM ${wallet.toFixed(2)}`;
  }

  function renderLoan() {
    const outstanding = Number(user.loan || 0);
    $loanOut().textContent = `RM ${outstanding.toFixed(2)}`;
    $loanCycle().textContent = `${loanUsed} / ${LOAN_LIMIT} trips`;
    $loanBar().style.width = `${(loanUsed / LOAN_LIMIT) * 100}%`;

    if (loanUsed >= LOAN_LIMIT) {
      $loanNote().innerHTML = `<span class="text-routeA font-semibold">Loan limit reached.</span> Top up your wallet to unlock further trip loans.`;
    } else if (loanUsed > 0) {
      $loanNote().innerHTML = `${LOAN_LIMIT - loanUsed} trip${LOAN_LIMIT - loanUsed > 1 ? "s" : ""} remaining in this cycle. Outstanding loan is auto-deducted on next top-up.`;
    } else {
      $loanNote().textContent =
        "You can borrow for up to 3 consecutive trips. The amount is auto-deducted on your next top-up.";
    }
  }

  function renderStats() {
    const s = window.CS_WALLET_STATS || {};
    $statSpent().textContent = `RM ${(s.spentThisMonth || 0).toFixed(2)}`;
    $statTrips().textContent = s.tripsTaken || 0;
    $statRepaid().textContent = `RM ${(s.loanRepaid || 0).toFixed(2)}`;
    $statTopups().textContent = s.topups || 0;
  }

  function renderTransactions() {
    const list = $txList();
    const filtered =
      currentFilter === "all"
        ? transactions
        : transactions.filter((t) => t.type === currentFilter);

    if (!filtered.length) {
      list.innerHTML = `<div class="p-8 text-center text-sm text-muted">No transactions yet.</div>`;
      return;
    }

    list.innerHTML = filtered
      .map((t) => {
        const positive = t.amount > 0;
        const sign = positive ? "+" : "−";
        const amtColor = positive ? "text-lime" : "text-cream";
        const bgColor = positive
          ? "bg-lime/15"
          : t.type === "loan"
            ? "bg-routeB/15"
            : "bg-routeA/15";
        return `
        <div class="flex items-center gap-4 px-5 sm:px-6 py-4">
          <div class="w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center text-lg shrink-0">${t.icon}</div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-cream truncate">${t.title}</p>
            <p class="text-[11px] text-muted mt-0.5">${t.time} · ${t.method}</p>
          </div>
          <div class="text-right shrink-0">
            <p class="text-sm font-bold ${amtColor}">${sign}RM ${Math.abs(t.amount).toFixed(2)}</p>
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
    document.querySelectorAll(".tx-filter").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentFilter = btn.dataset.filter;
        document.querySelectorAll(".tx-filter").forEach((b) => {
          b.classList.remove("bg-white/10", "text-cream");
          b.classList.add("text-muted");
        });
        btn.classList.add("bg-white/10", "text-cream");
        btn.classList.remove("text-muted");
        renderTransactions();
      });
    });
    const first = document.querySelector('.tx-filter[data-filter="all"]');
    first?.classList.add("bg-white/10", "text-cream");
    first?.classList.remove("text-muted");
  }

  /* =========================================================
     TOP-UP MODAL
     ========================================================= */
  function wireTopup() {
    wireFilters();

    document
      .getElementById("openTopupBtn")
      ?.addEventListener("click", openTopup);
    document.querySelectorAll("#topupModal [data-close]").forEach((el) => {
      el.addEventListener("click", closeTopup);
    });

    document.querySelectorAll(".amount-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedAmount = Number(btn.dataset.amount);
        $customAmt().value = "";
        document.querySelectorAll(".amount-btn").forEach((b) => {
          b.classList.remove("border-routeB", "bg-routeB/15", "text-cream");
          b.classList.add("border-white/10", "bg-white/5");
        });
        btn.classList.remove("border-white/10", "bg-white/5");
        btn.classList.add("border-routeB", "bg-routeB/15", "text-cream");
        updateTopupState();
      });
    });

    $customAmt().addEventListener("input", () => {
      const v = parseFloat($customAmt().value) || 0;
      selectedAmount = v;
      document.querySelectorAll(".amount-btn").forEach((b) => {
        b.classList.remove("border-routeB", "bg-routeB/15", "text-cream");
        b.classList.add("border-white/10", "bg-white/5");
      });
      updateTopupState();
    });

    $confirmBtn().addEventListener("click", launchPayment);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$topupModal().classList.contains("hidden"))
        closeTopup();
    });
  }

  function openTopup() {
    selectedAmount = 0;
    $customAmt().value = "";
    document.querySelectorAll(".amount-btn").forEach((b) => {
      b.classList.remove("border-routeB", "bg-routeB/15", "text-cream");
      b.classList.add("border-white/10", "bg-white/5");
    });

    const outstanding = Number(user.loan || 0);
    if (outstanding > 0) {
      $loanRepay().classList.remove("hidden");
      $repayAmount().textContent = `RM ${outstanding.toFixed(2)}`;
    } else {
      $loanRepay().classList.add("hidden");
    }

    updateTopupState();
    clearTopupError();

    const modal = $topupModal();
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  function closeTopup() {
    const modal = $topupModal();
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }

  function updateTopupState() {
    const valid = selectedAmount > 0;
    $confirmBtn().disabled = !valid;
    $confirmBtn().textContent = valid
      ? `Confirm RM ${selectedAmount.toFixed(2)}`
      : "Confirm top-up";
  }

  function clearTopupError() {
    $topupError().classList.add("hidden");
  }
  function showTopupError(msg) {
    $topupError().textContent = msg;
    $topupError().classList.remove("hidden");
  }

  function getSelectedPaymentMethod() {
    const checked = document.querySelector('input[name="pm"]:checked');
    return checked ? checked.value : "Touch n Go";
  }

  /* =========================================================
     LAUNCH PAYMENT
     ========================================================= */
  function launchPayment() {
    clearTopupError();
    if (selectedAmount <= 0) {
      showTopupError("Please choose or enter an amount.");
      return;
    }

    pendingMethod = getSelectedPaymentMethod();
    closeTopup();

    if (pendingMethod === "Touch n Go") openTng();
    else if (pendingMethod === "DuitNow") openDuitNow();
    else if (pendingMethod === "Online Banking") openFpx();
    else finishTopup();
  }

  /* =========================================================
     FINISH — credit wallet + auto-deduct loan (FR26)
     ========================================================= */
  function finishTopup() {
    const outstanding = Number(user.loan || 0);
    let credited = selectedAmount;
    let repaid = 0;

    if (outstanding > 0) {
      repaid = Math.min(outstanding, selectedAmount);
      credited = selectedAmount - repaid;
      user.loan = outstanding - repaid;

      if (user.loan <= 0) {
        user.loan = 0;
        user.loanUsed = 0;
        loanUsed = 0;
      }
    }

    wallet += credited;
    user.wallet = wallet;
    window.CS.saveSession(user);

    const timeStr = `Today · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

    transactions.unshift({
      id: `TX-${Date.now()}`,
      type: "topup",
      title: `Top-up via ${pendingMethod}`,
      amount: +selectedAmount,
      time: timeStr,
      method: pendingMethod,
      icon: "💳",
    });

    if (repaid > 0) {
      transactions.unshift({
        id: `TX-${Date.now()}-R`,
        type: "loan",
        title: "Loan repayment on top-up",
        amount: -repaid,
        time: timeStr,
        method: "Loan",
        icon: "📄",
      });
    }

    renderBalance();
    renderLoan();
    renderTransactions();

    const msg =
      repaid > 0
        ? `Topped up RM ${selectedAmount.toFixed(2)} · repaid RM ${repaid.toFixed(2)} loan`
        : `Topped up RM ${selectedAmount.toFixed(2)}`;
    showToast(msg);
  }

  /* =========================================================
     TOAST
     ========================================================= */
  function showToast(msg) {
    const toast = $toast();
    $toastText().textContent = msg;
    toast.classList.remove("hidden");
    setTimeout(() => toast.classList.add("hidden"), 3500);
  }

  /* =========================================================
     OVERLAY HELPERS
     ========================================================= */
  function showOverlay(id) {
    const el = document.getElementById(id);
    el.classList.remove("hidden");
    el.classList.add("flex");
  }
  function hideOverlay(id) {
    const el = document.getElementById(id);
    el.classList.add("hidden");
    el.classList.remove("flex");
  }

  /* =========================================================
     WIRE OVERLAYS
     ========================================================= */
  function wireOverlays() {
    /* TnG */
    document
      .getElementById("tngClose")
      .addEventListener("click", () => hideOverlay("tngOverlay"));
    document.getElementById("tngPhone").addEventListener("input", updateTngBtn);
    document.getElementById("tngPin").addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 6);
      updateTngBtn();
    });
    document.getElementById("tngPayBtn").addEventListener("click", processTng);

    /* DuitNow */
    document
      .getElementById("duitnowClose")
      .addEventListener("click", () => hideOverlay("duitnowOverlay"));
    document
      .getElementById("duitnowSimulate")
      .addEventListener("click", processDuitNow);

    /* FPX */
    document
      .getElementById("fpxClose")
      .addEventListener("click", () => hideOverlay("fpxOverlay"));
    document.querySelectorAll(".bank-btn").forEach((btn) => {
      btn.addEventListener("click", () => selectBank(btn));
    });
    document
      .getElementById("fpxUser")
      .addEventListener("input", updateFpxLoginBtn);
    document
      .getElementById("fpxPass")
      .addEventListener("input", updateFpxLoginBtn);
    document.getElementById("fpxLoginBtn").addEventListener("click", fpxLogin);
    document.getElementById("fpxTac").addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 6);
      updateFpxTacBtn();
    });
    document.getElementById("fpxPayBtn").addEventListener("click", processFpx);
  }

  /* ===================== Touch 'n Go ===================== */
  function openTng() {
    document.getElementById("tngStepForm").classList.remove("hidden");
    document.getElementById("tngStepProcessing").classList.add("hidden");
    document.getElementById("tngStepSuccess").classList.add("hidden");
    document.getElementById("tngPin").value = "";
    document.getElementById("tngError").classList.add("hidden");
    document.getElementById("tngAmount").textContent =
      `RM ${selectedAmount.toFixed(2)}`;
    document.getElementById("tngPayBtn").textContent =
      `Pay RM ${selectedAmount.toFixed(2)}`;
    updateTngBtn();
    showOverlay("tngOverlay");
  }

  function updateTngBtn() {
    const phone = document.getElementById("tngPhone").value.trim();
    const pin = document.getElementById("tngPin").value.trim();
    document.getElementById("tngPayBtn").disabled = !(
      phone.length >= 8 && pin.length === 6
    );
  }

  function processTng() {
    const errBox = document.getElementById("tngError");
    errBox.classList.add("hidden");

    const pin = document.getElementById("tngPin").value;
    if (pin.length !== 6) {
      errBox.textContent = "PIN must be 6 digits.";
      errBox.classList.remove("hidden");
      return;
    }

    document.getElementById("tngStepForm").classList.add("hidden");
    document.getElementById("tngStepProcessing").classList.remove("hidden");

    setTimeout(() => {
      document.getElementById("tngStepProcessing").classList.add("hidden");
      document.getElementById("tngStepSuccess").classList.remove("hidden");
      document.getElementById("tngSuccessAmount").textContent =
        `RM ${selectedAmount.toFixed(2)}`;

      setTimeout(() => {
        hideOverlay("tngOverlay");
        finishTopup();
      }, 1200);
    }, 1300);
  }

  /* ===================== DuitNow QR ===================== */
  function buildQrPattern() {
    const grid = document.getElementById("qrGrid");
    if (!grid) return;
    grid.innerHTML = "";
    const cells = 64;
    for (let i = 0; i < cells; i++) {
      const on = (i * 7919) % 13 < 6;
      const div = document.createElement("div");
      div.style.background = on ? "#111" : "transparent";
      grid.appendChild(div);
    }
  }

  function openDuitNow() {
    document.getElementById("duitnowAmount").textContent =
      `RM ${selectedAmount.toFixed(2)}`;
    showOverlay("duitnowOverlay");
  }

  function processDuitNow() {
    hideOverlay("duitnowOverlay");
    finishTopup();
  }

  /* ===================== FPX ===================== */
  function openFpx() {
    selectedBank = null;
    document.getElementById("fpxStepLogin").classList.remove("hidden");
    document.getElementById("fpxStepTac").classList.add("hidden");
    document.getElementById("fpxStepProcessing").classList.add("hidden");
    document.getElementById("fpxStepSuccess").classList.add("hidden");

    document.getElementById("fpxAmount").textContent =
      `RM ${selectedAmount.toFixed(2)}`;
    document.getElementById("fpxUser").value = "demo_user";
    document.getElementById("fpxPass").value = "demo1234";
    document.getElementById("fpxTac").value = "";
    document.getElementById("fpxError").classList.add("hidden");
    document.getElementById("fpxTacError").classList.add("hidden");

    document.querySelectorAll(".bank-btn").forEach((b) => {
      b.style.borderColor = "";
      b.style.background = "";
    });

    updateFpxLoginBtn();
    showOverlay("fpxOverlay");
  }

  function selectBank(btn) {
    selectedBank = btn.dataset.bank;
    const color = BANK_COLORS[selectedBank] || "#1A2E4A";
    document.querySelectorAll(".bank-btn").forEach((b) => {
      b.style.borderColor = "";
      b.style.background = "";
    });
    btn.style.borderColor = color;
    btn.style.background = color + "18"; // ~10% tint
    updateFpxLoginBtn();
  }

  function updateFpxLoginBtn() {
    const u = document.getElementById("fpxUser").value.trim();
    const p = document.getElementById("fpxPass").value.trim();
    document.getElementById("fpxLoginBtn").disabled = !(selectedBank && u && p);
  }

  function fpxLogin() {
    const errBox = document.getElementById("fpxError");
    errBox.classList.add("hidden");

    const u = document.getElementById("fpxUser").value.trim();
    const p = document.getElementById("fpxPass").value.trim();

    if (!u || !p) {
      errBox.textContent = "Please enter your credentials.";
      errBox.classList.remove("hidden");
      return;
    }

    document.getElementById("fpxStepLogin").classList.add("hidden");
    document.getElementById("fpxStepTac").classList.remove("hidden");
    document.getElementById("fpxTacError").classList.add("hidden");
    document.getElementById("fpxPayBtn").textContent =
      `Pay RM ${selectedAmount.toFixed(2)}`;
    updateFpxTacBtn();
  }

  function updateFpxTacBtn() {
    const tac = document.getElementById("fpxTac").value.trim();
    document.getElementById("fpxPayBtn").disabled = tac.length !== 6;
  }

  function processFpx() {
    const tac = document.getElementById("fpxTac").value;
    const errBox = document.getElementById("fpxTacError");
    errBox.classList.add("hidden");

    if (tac.length !== 6) {
      errBox.textContent = "TAC must be 6 digits.";
      errBox.classList.remove("hidden");
      return;
    }

    document.getElementById("fpxStepTac").classList.add("hidden");
    document.getElementById("fpxStepProcessing").classList.remove("hidden");

    setTimeout(() => {
      document.getElementById("fpxStepProcessing").classList.add("hidden");
      document.getElementById("fpxStepSuccess").classList.remove("hidden");
      document.getElementById("fpxSuccessAmount").textContent =
        `RM ${selectedAmount.toFixed(2)}`;

      setTimeout(() => {
        hideOverlay("fpxOverlay");
        finishTopup();
      }, 1200);
    }, 1300);
  }
})();
