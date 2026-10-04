/* =========================================================
   CampusShuttle — shared layout shell (v2, role-aware)
   Injects sidebar + topbar into any logged-in page.
   Fires "cs:ready" on next tick so late listeners catch it.
   ========================================================= */

(function () {
  /* ---------- Session guard ---------- */
  const user = window.CS?.getSession?.();
  const here = location.pathname.split("/").pop() || "dashboard.html";

  if (!user) {
    const depth =
      location.pathname.includes("/student/") ||
      location.pathname.includes("/driver/") ||
      location.pathname.includes("/admin/");
    window.location.replace(depth ? "../login.html" : "login.html");
    return;
  }

  /* ---------- Role-aware nav ---------- */
  const NAV_BY_ROLE = {
    student: [
      { href: "dashboard.html", label: "Dashboard", icon: "🏠" },
      { href: "seat-select.html", label: "Reserve a Seat", icon: "💺" },
      { href: "wallet.html", label: "My Wallet", icon: "👛" },
      { href: "tracking.html", label: "Track Bus", icon: "📍" },
      { href: "chatbot.html", label: "Chatbot", icon: "🤖" },
    ],
    driver: [
      { href: "trip.html", label: "My Trip", icon: "🚌" },
      { href: "alerts.html", label: "Alert History", icon: "🚨" },
    ],
    admin: [
      { href: "routes.html", label: "Routes & Analytics", icon: "🗺️" },
      { href: "buses.html", label: "Buses", icon: "🚐", disabled: true },
      { href: "accounts.html", label: "Accounts", icon: "👥", disabled: true },
    ],
  };

  const NAV = NAV_BY_ROLE[user.role] || [];

  const initial = (user.name || "U").trim().charAt(0).toUpperCase();

  /* ---------- Sidebar markup ---------- */
  const sidebarHTML = `
    <aside id="cs-sidebarInner"
      class="fixed top-0 left-0 bottom-0 w-64 bg-navy-900/80 backdrop-blur-2xl border-r border-white/10
             flex flex-col z-40
             -translate-x-full lg:translate-x-0 transition-transform duration-300">

      <div class="px-5 py-5 flex items-center gap-3 border-b border-white/10">
        <div class="w-10 h-10 rounded-xl bg-white/95 flex items-center justify-center overflow-hidden shrink-0">
          <img src="../assets/img/klust-logo.png" alt="KLUST"
               class="w-full h-full object-cover scale-[1.35]"
               onerror="this.style.display='none';this.parentElement.innerHTML='<span class=\\'text-navy-950 font-extrabold text-lg\\'>K</span>';" />
        </div>
        <div class="min-w-0">
          <p class="font-extrabold text-sm leading-tight truncate">CampusShuttle</p>
          <p class="text-[10px] text-muted leading-tight truncate">KLUST Fleet</p>
        </div>
        <button id="csSidebarClose" class="ml-auto lg:hidden text-muted hover:text-cream text-xl leading-none">×</button>
      </div>

      <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        ${NAV.map((item) => {
          const active = item.href === here;
          const cls = item.disabled
            ? "opacity-40 cursor-not-allowed"
            : "hover:text-cream hover:bg-white/5";
          const inner = `
              <span class="text-base">${item.icon}</span>
              <span>${item.label}</span>
              ${active ? '<span class="ml-auto w-1.5 h-1.5 rounded-full bg-routeA"></span>' : ""}
          `;
          return item.disabled
            ? `<div class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-muted border border-transparent ${cls}">${inner}</div>`
            : `<a href="${item.href}"
                  class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition
                         ${
                           active
                             ? "bg-gradient-to-br from-routeA/25 to-routeB/15 text-cream border border-routeA/30"
                             : "text-muted border border-transparent " + cls
                         }">
                  ${inner}
               </a>`;
        }).join("")}
      </nav>

      <div class="px-3 py-4 border-t border-white/10">
        <div class="flex items-center gap-3 px-2 py-2 rounded-xl bg-white/5">
          <div class="w-9 h-9 rounded-full bg-gradient-to-br from-routeA to-routeB flex items-center justify-center font-bold text-white shrink-0">
            ${initial}
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold text-cream truncate">${user.name || user.id}</p>
            <p class="text-[10px] text-muted truncate capitalize">${user.role}</p>
          </div>
        </div>
        <button id="csLogout"
          class="mt-3 w-full py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-muted hover:text-routeA hover:border-routeA/40 transition">
          Sign out
        </button>
      </div>
    </aside>

    <div id="csBackdrop" class="fixed inset-0 bg-black/60 z-30 hidden lg:hidden"></div>
  `;

  /* ---------- Topbar markup ---------- */
  const now = new Date();
  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  const topbarHTML = `
    <header class="sticky top-0 z-20 bg-navy-950/80 backdrop-blur-xl border-b border-white/10">
      <div class="px-4 sm:px-6 lg:px-10 py-4 flex items-center gap-3">
        <button id="csSidebarOpen" class="lg:hidden w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-cream">☰</button>

        <div class="min-w-0">
          <p class="text-[11px] text-muted leading-tight">${dateStr}</p>
          <p class="text-sm sm:text-base font-bold text-cream truncate">${greeting}, ${(user.name || user.id).split(" ")[0]}</p>
        </div>

        <div class="ml-auto flex items-center gap-2 sm:gap-3">
          <div class="hidden md:flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 w-64">
            <span class="text-muted text-sm">🔍</span>
            <input type="text" placeholder="Search trips, routes…"
              class="bg-transparent outline-none text-xs text-cream placeholder:text-muted w-full" />
          </div>

          <button id="csBell" class="relative w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-cream hover:bg-white/10 transition">
            🔔
            <span class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-routeA text-white text-[10px] font-bold flex items-center justify-center">2</span>
          </button>

          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-routeA to-routeB flex items-center justify-center font-bold text-white">
            ${initial}
          </div>
        </div>
      </div>
    </header>
  `;

  /* ---------- Mount ---------- */
  const sidebarSlot = document.getElementById("cs-sidebar");
  const topbarSlot = document.getElementById("cs-topbar");
  if (sidebarSlot) sidebarSlot.innerHTML = sidebarHTML;
  if (topbarSlot) topbarSlot.innerHTML = topbarHTML;

  /* ---------- Interactions ---------- */
  const inner = document.getElementById("cs-sidebarInner");
  const backdrop = document.getElementById("csBackdrop");
  const openBtn = document.getElementById("csSidebarOpen");
  const closeBtn = document.getElementById("csSidebarClose");
  const logoutBtn = document.getElementById("csLogout");

  const openSidebar = () => {
    inner?.classList.remove("-translate-x-full");
    backdrop?.classList.remove("hidden");
  };
  const closeSidebar = () => {
    inner?.classList.add("-translate-x-full");
    backdrop?.classList.add("hidden");
  };

  openBtn?.addEventListener("click", openSidebar);
  closeBtn?.addEventListener("click", closeSidebar);
  backdrop?.addEventListener("click", closeSidebar);

  logoutBtn?.addEventListener("click", () => {
    window.CS.clearSession();
    const depth =
      location.pathname.includes("/student/") ||
      location.pathname.includes("/driver/") ||
      location.pathname.includes("/admin/");
    window.location.href = depth ? "../login.html" : "login.html";
  });

  /* ---------- Ready signal ---------- */
  setTimeout(() => {
    document.dispatchEvent(new CustomEvent("cs:ready"));
  }, 0);
})();
