/* =========================================================
   CampusShuttle — animated map background (v6)
   - Stadia Alidade Smooth Dark (rich POIs + labels)
   - Real road routing via OSRM
   - Smooth constant-velocity buses
   - Per-label colors for the 3 key locations
   ========================================================= */

(function () {
  const ROUTE_A = {
    from: LOCATIONS.mrtSerdang,
    to: LOCATIONS.klust,
    color: "#ef4444",
    cached: CACHED_ROUTES.routeA,
  };
  const ROUTE_B = {
    from: LOCATIONS.ioiCity,
    to: LOCATIONS.klust,
    color: "#f76d0a",
    cached: CACHED_ROUTES.routeB,
  };

  /* ---------- Init map ---------- */
  const map = L.map("map", {
    center: [2.993, 101.723],
    zoom: 11.5,
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    touchZoom: false,
    tap: false,
    fadeAnimation: false,
    zoomAnimation: false,
  });

  /* ---------- Stadia Alidade Smooth Dark ---------- */
  const STADIA_API_KEY = "b28ec85a-7840-407d-a05c-61f8e8b87630";

  L.tileLayer(
    `https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png?api_key=${STADIA_API_KEY}`,
    {
      maxZoom: 20,
      attribution: "© Stadia Maps © OpenMapTiles © OpenStreetMap",
    },
  ).addTo(map);

  /* ---------- Fetch real road route from OSRM ---------- */
  async function fetchRoute(from, to, cachedFallback) {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${from.lng},${from.lat};${to.lng},${to.lat}` +
      `?overview=full&geometries=geojson`;

    try {
      const res = await fetch(url, { cache: "force-cache" });
      if (!res.ok) throw new Error("OSRM HTTP " + res.status);
      const data = await res.json();
      const coords = data?.routes?.[0]?.geometry?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) {
        throw new Error("OSRM empty route");
      }
      return coords.map(([lng, lat]) => [lat, lng]);
    } catch (err) {
      console.warn("OSRM failed, using cached route:", err.message);
      return cachedFallback;
    }
  }

  /* ---------- Draw route ---------- */
  function drawRoute(points, color) {
    L.polyline(points, {
      color,
      weight: 20,
      opacity: 0.2,
      lineCap: "round",
      lineJoin: "round",
      interactive: false,
    }).addTo(map);

    L.polyline(points, {
      color,
      weight: 10,
      opacity: 0.95,
      lineCap: "round",
      lineJoin: "round",
      interactive: false,
    }).addTo(map);
  }

  /* ---------- Marker helpers ---------- */
  function dotMarker(loc, color) {
    return L.marker([loc.lat, loc.lng], {
      icon: L.divIcon({
        className: "cs-marker",
        html: `<div class="cs-dot" style="background:${color};box-shadow:0 0 10px ${color}"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      }),
      interactive: false,
    }).addTo(map);
  }

  function hubMarker(loc) {
    return L.marker([loc.lat, loc.lng], {
      icon: L.divIcon({
        className: "cs-marker",
        html: `<div class="cs-hub"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }),
      interactive: false,
    }).addTo(map);
  }

  function stopMarker(stop, color) {
    return L.marker([stop.lat, stop.lng], {
      icon: L.divIcon({
        className: "cs-marker",
        html: `<div class="cs-stop" style="border-color:${color}"></div>`,
        iconSize: [8, 8],
        iconAnchor: [4, 4],
      }),
      interactive: false,
    }).addTo(map);
  }

  /* ---------- Label marker (now supports per-label color) ---------- */
  function labelMarker(loc, text, small = false, color = null) {
    const style = color ? `style="color:${color};border-color:${color}66"` : "";
    return L.marker([loc.lat, loc.lng], {
      icon: L.divIcon({
        className: "cs-marker",
        html: `<div class="cs-label${small ? " cs-label-sm" : ""}" ${style}>${text}</div>`,
        iconSize: [0, 0],
        iconAnchor: small ? [-8, 14] : [-10, 22],
      }),
      interactive: false,
    }).addTo(map);
  }

  /* ---------- Extra POIs and area labels ---------- */
  const EXTRA_POIS = [
    // MRT stations along route A
    { lat: 3.006, lng: 101.699, name: "MRT Serdang Raya", small: true },
    { lat: 2.996, lng: 101.702, name: "MRT UPM", small: true },
    { lat: 2.9875, lng: 101.706, name: "MRT 16 Sierra", small: true },

    // Transit hub near route B
    { lat: 2.9285, lng: 101.672, name: "Putrajaya Sentral", small: true },

    // Area labels
    {
      lat: 3.023,
      lng: 101.708,
      name: "Seri Kembangan",
      small: true,
      area: true,
    },
    { lat: 2.993, lng: 101.789, name: "Kajang", small: true, area: true },
    {
      lat: 2.96,
      lng: 101.759,
      name: "Bandar Baru Bangi",
      small: true,
      area: true,
    },
    { lat: 2.926, lng: 101.696, name: "Putrajaya", small: true, area: true },
    { lat: 2.922, lng: 101.657, name: "Cyberjaya", small: true, area: true },
    { lat: 2.89, lng: 101.74, name: "Sepang", small: true, area: true },
  ];

  /* ---------- Bus marker ---------- */
  const BUS_SVG = `
    <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/>
      <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/>
      <circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/>
    </svg>`;

  function makeBusIcon(color) {
    return L.divIcon({
      className: "cs-bus",
      html: `
        <div class="cs-bus-marker" style="background:${color};box-shadow:0 2px 8px rgba(0,0,0,0.5), 0 0 14px ${color}88;">
          ${BUS_SVG}
        </div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  }

  /* ---------- Distance helpers ---------- */
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

  function positionAt(points, cum, targetDist) {
    let lo = 0,
      hi = cum.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < targetDist) lo = mid;
      else hi = mid;
    }
    const segLen = cum[hi] - cum[lo] || 1;
    const t = (targetDist - cum[lo]) / segLen;
    return [
      points[lo][0] + (points[hi][0] - points[lo][0]) * t,
      points[lo][1] + (points[hi][1] - points[lo][1]) * t,
    ];
  }

  /* ---------- Animate bus ---------- */
  function animateBus(points, color, opts = {}) {
    const cum = buildCumulative(points);
    const totalDist = cum[cum.length - 1];
    const speedMps = opts.speedMps || 45;
    const startOffset = opts.startOffset || 0;

    const marker = L.marker(points[0], {
      icon: makeBusIcon(color),
      interactive: false,
      zIndexOffset: 1000,
    }).addTo(map);

    const startTime = performance.now();

    function tick(now) {
      const elapsedSec = (now - startTime) / 1000;
      let dist = (elapsedSec * speedMps + startOffset) % totalDist;
      if (dist < 0) dist += totalDist;
      marker.setLatLng(positionAt(points, cum, dist));
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
    console.log("[Bus] animating, dist =", Math.round(totalDist), "m");
    return marker;
  }

  /* ---------- Boot ---------- */
  async function boot() {
    const [routeAPts, routeBPts] = await Promise.all([
      fetchRoute(ROUTE_A.from, ROUTE_A.to, ROUTE_A.cached),
      fetchRoute(ROUTE_B.from, ROUTE_B.to, ROUTE_B.cached),
    ]);

    console.log("[Map] Route A points:", routeAPts.length);
    console.log("[Map] Route B points:", routeBPts.length);

    drawRoute(routeAPts, ROUTE_A.color);
    drawRoute(routeBPts, ROUTE_B.color);

    dotMarker(ROUTE_A.from, ROUTE_A.color);
    dotMarker(ROUTE_B.from, ROUTE_B.color);
    hubMarker(ROUTE_A.to);

    STOPS.routeA.forEach((s) => stopMarker(s, ROUTE_A.color));
    STOPS.routeB.forEach((s) => stopMarker(s, ROUTE_B.color));

    // Main location labels — custom colors
    labelMarker(ROUTE_A.from, ROUTE_A.from.name, false, "#ef4444"); // MRT Serdang Jaya — purple
    labelMarker(ROUTE_B.from, ROUTE_B.from.name, false, "#f76d0a"); // IOI City Mall — orange
    labelMarker(ROUTE_A.to, ROUTE_A.to.name, false, "#41ee22"); // KLUST — cyan

    // Extra POIs + area labels (keep default muted cream color)
    EXTRA_POIS.forEach((poi) => {
      if (!poi.area) {
        L.marker([poi.lat, poi.lng], {
          icon: L.divIcon({
            className: "cs-marker",
            html: `<div class="cs-poi"></div>`,
            iconSize: [6, 6],
            iconAnchor: [3, 3],
          }),
          interactive: false,
        }).addTo(map);
      }
      labelMarker(poi, poi.name, poi.small);
    });

    // Fit bounds to all visible points
    const bounds = L.latLngBounds([
      [ROUTE_A.from.lat, ROUTE_A.from.lng],
      [ROUTE_B.from.lat, ROUTE_B.from.lng],
      [ROUTE_A.to.lat, ROUTE_A.to.lng],
      [2.89, 101.657], // Sepang SW
      [3.023, 101.789], // Seri Kembangan NE
    ]);
    // On desktop, push the map view left so KLUST isn't hidden
    // behind the login card on the right
    const isDesktop = window.innerWidth >= 1024;
    const rightPadding = isDesktop ? Math.round(window.innerWidth * 0.45) : 40;

    map.fitBounds(bounds, {
      paddingTopLeft: [40, 40],
      paddingBottomRight: [rightPadding, 40],
      maxZoom: 13,
      animate: false,
    });

    // Start buses
    animateBus(routeAPts, ROUTE_A.color, {
      speedMps: 120,
      startOffset: 0,
    });

    const routeBLength = buildCumulative(routeBPts).pop();
    animateBus(routeBPts, ROUTE_B.color, {
      speedMps: 110,
      startOffset: routeBLength * 0.4,
    });
  }

  boot();

  window.addEventListener("resize", () => map.invalidateSize());
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) map.invalidateSize();
  });
})();
