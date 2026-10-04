/* =========================================================
   CampusShuttle — Live Tracking (FR09–FR11)
   - Interactive Leaflet map
   - Two routes with animated buses
   - Live ETA countdown per stop
   ========================================================= */

(function () {
  /* ---------- Route config ---------- */
  const ROUTES = [
    {
      id: "A",
      name: "MRT Serdang Jaya → KLUST",
      color: "#ef4444",
      from: LOCATIONS.mrtSerdang,
      to: LOCATIONS.klust,
      cached: CACHED_ROUTES.routeA,
      stops: STOPS.routeA,
      bus: { id: "BUS-07", driver: "Samiul Hasan Tanvir", speed: 45 },
      totalSeats: 20,
      takenSeats: 8,
    },
    {
      id: "B",
      name: "IOI City Mall → KLUST",
      color: "#f76d0a",
      from: LOCATIONS.ioiCity,
      to: LOCATIONS.klust,
      cached: CACHED_ROUTES.routeB,
      stops: STOPS.routeB,
      bus: { id: "BUS-12", driver: "Yu Jieyao", speed: 42 },
      totalSeats: 20,
      takenSeats: 11,
    },
  ];

  let map;
  let activeRoute = ROUTES[0];
  let routeLines = {};
  let busMarkers = {};
  let activeRoutePoints = null; // [[lat, lng], ...]
  let activeCumulative = null;
  let activeTotalDist = 0;
  let busProgress = 0;
  let busSpeedMps = 45;
  let started = false;

  /* ---------- Element getters ---------- */
  const $lastUpdated = () => document.getElementById("lastUpdated");
  const $busName = () => document.getElementById("busName");
  const $busBadge = () => document.getElementById("busBadge");
  const $nextStop = () => document.getElementById("nextStop");
  const $etaValue = () => document.getElementById("etaValue");
  const $speedValue = () => document.getElementById("speedValue");
  const $occupancy = () => document.getElementById("occupancyValue");
  const $progressBar = () => document.getElementById("progressBar");
  const $tripRoute = () => document.getElementById("tripRoute");
  const $tripVehicle = () => document.getElementById("tripVehicle");
  const $tripDeparted = () => document.getElementById("tripDeparted");
  const $tripEtaFinal = () => document.getElementById("tripEtaFinal");
  const $stopsList = () => document.getElementById("stopsList");
  const $routeTabs = () => document.getElementById("routeTabs");
  const $recenterBtn = () => document.getElementById("recenterBtn");

  /* =========================================================
     Math helpers
     ========================================================= */
  function haversine(a, b) {
    const R = 6371000;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(b[0] - a[0]);
    const dLng = toRad(b[1] - a[1]);
    const lat1 = toRad(a[0]);
    const lat2 = toRad(b[0]);
    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }

  function buildCumulative(points) {
    const cum = [0];
    for (let i = 1; i < points.length; i++) {
      cum[i] = cum[i - 1] + haversine(points[i - 1], points[i]);
    }
    return cum;
  }

  function positionAt(points, cum, dist) {
    let lo = 0,
      hi = cum.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < dist) lo = mid;
      else hi = mid;
    }
    const seg = cum[hi] - cum[lo] || 1;
    const t = (dist - cum[lo]) / seg;
    return [
      points[lo][0] + (points[hi][0] - points[lo][0]) * t,
      points[lo][1] + (points[hi][1] - points[lo][1]) * t,
    ];
  }

  function cumulativeAt(points, cum, target) {
    let best = 0,
      bestD = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = haversine(points[i], target);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return cum[best];
  }

  /* =========================================================
     Fetch road route from OSRM
     ========================================================= */
  async function fetchRoute(from, to, fallback) {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    try {
      const res = await fetch(url, { cache: "force-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const coords = data?.routes?.[0]?.geometry?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) throw new Error("empty");
      return coords.map(([lng, lat]) => [lat, lng]);
    } catch (err) {
      return fallback;
    }
  }

  /* =========================================================
     Bus marker icon
     ========================================================= */
  const BUS_SVG = `
    <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/>
      <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/>
      <circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/>
    </svg>`;

  function makeBusIcon(color, withPulse) {
    const pulse = withPulse
      ? `<div style="position:absolute;inset:-8px;border-radius:14px;border:2px solid ${color};opacity:0.5;animation:hubPulse 2s ease-out infinite;"></div>`
      : "";
    return L.divIcon({
      className: "cs-bus",
      html: `
        <div style="position:relative;width:44px;height:44px;">
          ${pulse}
          <div class="cs-bus-marker" style="width:44px;height:44px;background:${color};box-shadow:0 2px 8px rgba(0,0,0,0.5), 0 0 18px ${color}99;">
            ${BUS_SVG}
          </div>
        </div>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
  }

  /* =========================================================
     Map setup
     ========================================================= */
  function initMap() {
    map = L.map("map", {
      center: [2.99, 101.72],
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer(
      `https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png?api_key=b28ec85a-7840-407d-a05c-61f8e8b87630`,
      { maxZoom: 20 },
    ).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);
  }

  function drawAllRoutes(routePointsMap) {
    Object.entries(routePointsMap).forEach(([id, points]) => {
      const cfg = ROUTES.find((r) => r.id === id);
      L.polyline(points, {
        color: cfg.color,
        weight: 16,
        opacity: 0.15,
        lineCap: "round",
        interactive: false,
      }).addTo(map);
      routeLines[id] = L.polyline(points, {
        color: cfg.color,
        weight: 5,
        opacity: 0.95,
        lineCap: "round",
        interactive: false,
      }).addTo(map);
    });

    // KLUST hub
    L.marker([LOCATIONS.klust.lat, LOCATIONS.klust.lng], {
      icon: L.divIcon({
        className: "cs-marker",
        html: `<div style="position:relative;width:22px;height:22px;border-radius:50%;background:#c9a227;border:3px solid #fff;box-shadow:0 0 16px #c9a227;">
          <div style="position:absolute;inset:-8px;border-radius:50%;border:2px solid #c9a227;animation:hubPulse 2.4s ease-out infinite;"></div>
        </div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      }),
      interactive: false,
    }).addTo(map);

    // Origin markers
    ROUTES.forEach((r) => {
      L.marker([r.from.lat, r.from.lng], {
        icon: L.divIcon({
          className: "cs-marker",
          html: `<div style="width:14px;height:14px;border-radius:50%;background:${r.color};border:2px solid #fff;box-shadow:0 0 10px ${r.color};"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        }),
        interactive: false,
      }).addTo(map);
    });
  }

  function drawStops(route) {
    route.stops.forEach((s) => {
      L.marker([s.lat, s.lng], {
        icon: L.divIcon({
          className: "cs-marker",
          html: `<div style="width:10px;height:10px;border-radius:50%;background:#0a1628;border:2px solid ${route.color};"></div>`,
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        }),
        interactive: false,
      }).addTo(map);
    });
  }

  /* =========================================================
     Route tabs
     ========================================================= */
  function renderRouteTabs() {
    const wrap = $routeTabs();
    wrap.innerHTML = ROUTES.map(
      (r) => `
      <button data-route="${r.id}"
        class="route-tab px-4 py-2 rounded-xl text-xs font-semibold transition border border-transparent">
        <span class="inline-block w-2 h-2 rounded-full mr-2" style="background:${r.color};box-shadow:0 0 6px ${r.color}"></span>
        ${r.name}
      </button>
    `,
    ).join("");

    wrap.querySelectorAll(".route-tab").forEach((btn) => {
      btn.addEventListener("click", () => switchRoute(btn.dataset.route));
    });

    highlightActiveTab();
  }

  function highlightActiveTab() {
    document.querySelectorAll(".route-tab").forEach((btn) => {
      const active = btn.dataset.route === activeRoute.id;
      if (active) {
        btn.style.background = activeRoute.color + "22";
        btn.style.borderColor = activeRoute.color + "66";
        btn.style.color = "#F5F1EA";
      } else {
        btn.style.background = "";
        btn.style.borderColor = "transparent";
        btn.style.color = "#8FA3BF";
      }
    });
  }

  /* =========================================================
     Switch active route
     ========================================================= */
  function switchRoute(id) {
    activeRoute = ROUTES.find((r) => r.id === id);
    // FIX: convert Leaflet LatLng objects to [lat, lng] arrays
    activeRoutePoints = routeLines[id].getLatLngs().map((p) => [p.lat, p.lng]);
    activeCumulative = buildCumulative(activeRoutePoints);
    activeTotalDist = activeCumulative[activeCumulative.length - 1];

    busProgress = 0.15;
    busSpeedMps = activeRoute.bus.speed;

    Object.entries(busMarkers).forEach(([rid, m]) => {
      if (rid === id) map.addLayer(m);
      else map.removeLayer(m);
    });

    $busName().textContent = activeRoute.bus.id;
    $busBadge().style.background = activeRoute.color + "22";
    $busBadge().style.borderColor = activeRoute.color + "55";
    $tripRoute().textContent = activeRoute.name;
    $tripVehicle().textContent = `${activeRoute.bus.id} · Driver ${activeRoute.bus.driver}`;
    $tripDeparted().textContent = new Date(
      Date.now() - 5 * 60000,
    ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    $tripEtaFinal().textContent =
      "in ~" + Math.round(activeTotalDist / busSpeedMps / 60) + " min";

    renderStopsList();
    highlightActiveTab();
    recenter(id);
  }

  function recenter(id) {
    const points = routeLines[id].getLatLngs();
    const group = L.featureGroup(points.map((p) => L.marker(p)));
    map.fitBounds(group.getBounds().pad(0.25));
  }

  /* =========================================================
     Stops list
     ========================================================= */
  function renderStopsList() {
    const list = $stopsList();
    if (!list || !activeRoutePoints) return;

    const origin = {
      name: activeRoute.from.name,
      lat: activeRoute.from.lat,
      lng: activeRoute.from.lng,
    };
    const dest = {
      name: activeRoute.to.name,
      lat: activeRoute.to.lat,
      lng: activeRoute.to.lng,
    };
    const allStops = [origin, ...activeRoute.stops, dest];

    const stopDists = allStops.map((s) =>
      cumulativeAt(activeRoutePoints, activeCumulative, [s.lat, s.lng]),
    );

    const busDist = busProgress * activeTotalDist;

    list.innerHTML = allStops
      .map((s, i) => {
        const isPassed = stopDists[i] < busDist;
        const isNext = !isPassed && (i === 0 || stopDists[i - 1] < busDist);
        const eta = Math.max(
          0,
          Math.round((stopDists[i] - busDist) / busSpeedMps / 60),
        );

        const ring = isPassed
          ? `<span class="w-3 h-3 rounded-full bg-lime"></span>`
          : isNext
            ? `<span class="w-3 h-3 rounded-full bg-routeB animate-pulse"></span>`
            : `<span class="w-3 h-3 rounded-full bg-white/20 border border-white/40"></span>`;

        const timeLabel = isPassed
          ? `<span class="text-[10px] text-lime font-semibold">Passed</span>`
          : isNext
            ? `<span class="text-[10px] text-routeB font-semibold">${eta <= 0 ? "Arriving" : eta + " min"}</span>`
            : `<span class="text-[10px] text-muted">${eta} min</span>`;

        return `
        <div class="flex items-center gap-3">
          ${ring}
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold ${isPassed ? "text-muted line-through" : "text-cream"} truncate">${s.name}</p>
          </div>
          ${timeLabel}
        </div>
      `;
      })
      .join("");
  }

  /* =========================================================
     Bus animation
     ========================================================= */
  function startBusAnimation() {
    const routeA = ROUTES[0];
    const routeB = ROUTES[1];

    busMarkers.A = L.marker([routeA.from.lat, routeA.from.lng], {
      icon: makeBusIcon(routeA.color, true),
      interactive: false,
      zIndexOffset: 1000,
    });
    busMarkers.B = L.marker([routeB.from.lat, routeB.from.lng], {
      icon: makeBusIcon(routeB.color, false),
      interactive: false,
      zIndexOffset: 1000,
    });

    map.addLayer(busMarkers[activeRoute.id]);
  }

  function tickBus() {
    if (!activeRoutePoints) return;

    busProgress = (busProgress + 0.0008) % 1;
    const dist = busProgress * activeTotalDist;
    const pos = positionAt(activeRoutePoints, activeCumulative, dist);

    const marker = busMarkers[activeRoute.id];
    if (marker) marker.setLatLng(pos);

    updateBusStats(dist);
  }

  function updateBusStats(dist) {
    const speed = busSpeedMps + Math.round(Math.sin(Date.now() / 4000) * 8);
    $speedValue().textContent = `${speed} km/h`;
    $progressBar().style.width = `${(dist / activeTotalDist) * 100}%`;

    const origin = {
      name: activeRoute.from.name,
      lat: activeRoute.from.lat,
      lng: activeRoute.from.lng,
    };
    const dest = {
      name: activeRoute.to.name,
      lat: activeRoute.to.lat,
      lng: activeRoute.to.lng,
    };
    const allStops = [origin, ...activeRoute.stops, dest];
    const stopDists = allStops.map((s) =>
      cumulativeAt(activeRoutePoints, activeCumulative, [s.lat, s.lng]),
    );

    let nextStop = dest;
    let nextStopEta = Math.round((activeTotalDist - dist) / busSpeedMps / 60);
    for (let i = 0; i < allStops.length; i++) {
      if (stopDists[i] > dist) {
        nextStop = allStops[i];
        nextStopEta = Math.max(
          1,
          Math.round((stopDists[i] - dist) / busSpeedMps / 60),
        );
        break;
      }
    }

    $nextStop().textContent = nextStop.name;
    $etaValue().textContent =
      nextStopEta <= 0 ? "Arriving" : `${nextStopEta} min`;
    $occupancy().textContent = `${activeRoute.takenSeats} / ${activeRoute.totalSeats}`;
    $lastUpdated().textContent = "Updated just now";

    if (Math.floor(Date.now() / 1000) % 3 === 0) renderStopsList();
  }

  /* =========================================================
     Recenter
     ========================================================= */
  function wireRecenter() {
    $recenterBtn().addEventListener("click", () => recenter(activeRoute.id));
  }

  /* =========================================================
     Boot
     ========================================================= */
  async function boot() {
    if (started) return;
    started = true;

    initMap();

    const routePointsMap = {};
    await Promise.all(
      ROUTES.map(async (r) => {
        routePointsMap[r.id] = await fetchRoute(r.from, r.to, r.cached);
      }),
    );

    drawAllRoutes(routePointsMap);
    ROUTES.forEach((r) => drawStops(r));

    activeRoutePoints = routePointsMap[activeRoute.id];
    activeCumulative = buildCumulative(activeRoutePoints);
    activeTotalDist = activeCumulative[activeCumulative.length - 1];

    renderRouteTabs();
    startBusAnimation();
    recenter(activeRoute.id);

    $busName().textContent = activeRoute.bus.id;
    $busBadge().style.background = activeRoute.color + "22";
    $busBadge().style.borderColor = activeRoute.color + "55";
    $tripRoute().textContent = activeRoute.name;
    $tripVehicle().textContent = `${activeRoute.bus.id} · Driver ${activeRoute.bus.driver}`;
    $tripDeparted().textContent = new Date(
      Date.now() - 5 * 60000,
    ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    $tripEtaFinal().textContent =
      "in ~" + Math.round(activeTotalDist / busSpeedMps / 60) + " min";

    renderStopsList();
    wireRecenter();

    function loop() {
      tickBus();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  /* =========================================================
     Start
     ========================================================= */
  function start() {
    const user = window.CS?.getSession?.();
    if (!user) return;
    boot();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  document.addEventListener("cs:ready", () => {
    if (!map) start();
  });

  window.addEventListener("resize", () => {
    if (map) map.invalidateSize();
  });
})();
