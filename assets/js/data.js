/* =========================================================
   CampusShuttle — mock data
   Includes: users + cached road coordinates (fallback for OSRM)
   + trips, routes, schedules, seats, wallet transactions
   ========================================================= */

const MOCK_USERS = [
  // ---- Students (FR01–FR04) ----
  {
    id: "stu1",
    role: "student",
    password: "student123",
    name: "Tan.Mos.Min.Yu",
    email: "ahmed@klust.edu.my",
    wallet: 5,
    loanUsed: 0,
    gender: "M",
  },
  {
    id: "253926208",
    role: "student",
    password: "student123",
    name: "Tanvir Samiul Hasan",
    email: "minul@klust.edu.my",
    wallet: 3.0,
    loanUsed: 0,
    gender: "M",
  },

  // ---- Drivers (FR05) ----
  {
    id: "drb1",
    role: "driver",
    password: "driver123",
    name: "Driver Uncle",
    assignedBus: "BUS-07",
    route: "MRT Serdang Jaya → KLUST",
  },
  {
    id: "DRV-002",
    role: "driver",
    password: "driver123",
    name: "Yu Jieyao",
    assignedBus: "BUS-12",
    route: "IOI City Mall → KLUST",
  },

  // ---- Admin ----
  {
    id: "adm1",
    role: "admin",
    password: "admin123",
    name: "KLUST Transport Office",
  },
];

/* =========================================================
   Location constants
   ========================================================= */
const LOCATIONS = {
  klust: { lat: 2.9794, lng: 101.74, name: "KLUST (formerly IUKL)" },
  mrtSerdang: { lat: 3.017, lng: 101.707, name: "MRT Serdang Jaya" },
  ioiCity: { lat: 2.97, lng: 101.714, name: "IOI City Mall" },
};

/* =========================================================
   Intermediate stops (bus slows here visually)
   ========================================================= */
const STOPS = {
  routeA: [
    { lat: 3.0055, lng: 101.715, name: "Seri Kembangan" },
    { lat: 2.993, lng: 101.728, name: "Uniten" },
  ],
  routeB: [
    { lat: 2.976, lng: 101.726, name: "Bandar Baru Bangi" },
    { lat: 2.981, lng: 101.735, name: "Kajang Sentral" },
  ],
};

/* =========================================================
   CACHED ROAD ROUTES (fallback if OSRM is unavailable)
   ========================================================= */
const CACHED_ROUTES = {
  // MRT Serdang Jaya → KLUST via Silk Highway / Jalan Ikram-Uniten
  routeA: [
    [3.017, 101.707],
    [3.0155, 101.709],
    [3.0138, 101.711],
    [3.0122, 101.7135],
    [3.0105, 101.716],
    [3.0088, 101.7185],
    [3.007, 101.721],
    [3.0055, 101.7235],
    [3.0038, 101.726],
    [3.002, 101.7285],
    [3.0, 101.7308],
    [2.9978, 101.7328],
    [2.9955, 101.7345],
    [2.993, 101.736],
    [2.9905, 101.7372],
    [2.988, 101.7382],
    [2.9855, 101.7388],
    [2.983, 101.7392],
    [2.981, 101.7395],
    [2.9794, 101.74],
  ],
  // IOI City Mall → KLUST via SILK / Kajang
  routeB: [
    [2.97, 101.714],
    [2.9715, 101.7162],
    [2.9732, 101.7185],
    [2.975, 101.7208],
    [2.9765, 101.723],
    [2.9778, 101.7255],
    [2.9788, 101.728],
    [2.9795, 101.7305],
    [2.9798, 101.733],
    [2.9798, 101.7355],
    [2.9796, 101.7378],
    [2.9794, 101.74],
  ],
};

/* =========================================================
   Dashboard mock data — trips + announcements
   ========================================================= */

window.CS_TRIPS = [
  {
    id: "TRP-101",
    route: "MRT Serdang Jaya → KLUST",
    origin: "MRT Serdang Jaya",
    destination: "KLUST (formerly IUKL)",
    date: "Today",
    departTime: "14:30",
    arriveTime: "14:50",
    seat: "A12",
    status: "On Time",
    bus: "BUS-07",
  },
  {
    id: "TRP-102",
    route: "IOI City Mall → KLUST",
    origin: "IOI City Mall",
    destination: "KLUST (formerly IUKL)",
    date: "Tomorrow",
    departTime: "08:15",
    arriveTime: "08:38",
    seat: "B04",
    status: "Scheduled",
    bus: "BUS-12",
  },
  {
    id: "TRP-103",
    route: "MRT Serdang Jaya → KLUST",
    origin: "MRT Serdang Jaya",
    destination: "KLUST (formerly IUKL)",
    date: "Wed, 12 Oct",
    departTime: "17:00",
    arriveTime: "17:20",
    seat: "A08",
    status: "Scheduled",
    bus: "BUS-07",
  },
  {
    id: "TRP-104",
    route: "KLUST → IOI City Mall",
    origin: "KLUST (formerly IUKL)",
    destination: "IOI City Mall",
    date: "Thu, 13 Oct",
    departTime: "20:00",
    arriveTime: "20:23",
    seat: "C03",
    status: "Scheduled",
    bus: "BUS-12",
  },
];

window.CS_ANNOUNCEMENTS = [
  {
    type: "warning",
    tag: "Delay",
    title: "Route A delayed by 8 minutes",
    body: "MRT Serdang Jaya departure at 14:30 is running late due to traffic on Silk Highway.",
    time: "12 min ago",
  },
  {
    type: "info",
    tag: "New",
    title: "Evening shuttle added",
    body: "New 19:00 trip from IOI City Mall to KLUST starts this Friday.",
    time: "2 h ago",
  },
  {
    type: "success",
    tag: "Info",
    title: "Wallet top-up bonus",
    body: "Top up RM 50 before Friday and get RM 5 credit — limited time.",
    time: "Yesterday",
  },
];

/* =========================================================
   Seat reservation data — routes, schedules, seat layout
   ========================================================= */

window.CS_ROUTES = [
  // Inbound
  { id: "A", name: "MRT Serdang Jaya → KLUST", color: "#ef4444", icon: "🚇" },
  { id: "B", name: "IOI City Mall → KLUST", color: "#f76d0a", icon: "🛍️" },
  // Outbound
  { id: "A2", name: "KLUST → MRT Serdang Jaya", color: "#ef4444", icon: "🚇" },
  { id: "B2", name: "KLUST → IOI City Mall", color: "#f76d0a", icon: "🛍️" },
];

window.CS_SCHEDULES = [
  // Route A — MRT Serdang Jaya → KLUST
  {
    id: "A-1430",
    routeId: "A",
    departTime: "14:30",
    arriveTime: "14:50",
    fare: 2.5,
    bus: "BUS-07",
  },
  {
    id: "A-1700",
    routeId: "A",
    departTime: "17:00",
    arriveTime: "17:20",
    fare: 2.5,
    bus: "BUS-07",
  },
  {
    id: "A-1930",
    routeId: "A",
    departTime: "19:30",
    arriveTime: "19:50",
    fare: 2.5,
    bus: "BUS-07",
  },

  // Route B — IOI City Mall → KLUST
  {
    id: "B-0815",
    routeId: "B",
    departTime: "08:15",
    arriveTime: "08:38",
    fare: 3.0,
    bus: "BUS-12",
  },
  {
    id: "B-1215",
    routeId: "B",
    departTime: "12:15",
    arriveTime: "12:38",
    fare: 3.0,
    bus: "BUS-12",
  },
  {
    id: "B-1800",
    routeId: "B",
    departTime: "18:00",
    arriveTime: "18:23",
    fare: 3.0,
    bus: "BUS-12",
  },

  // Route A2 — KLUST → MRT Serdang Jaya
  {
    id: "A2-0900",
    routeId: "A2",
    departTime: "09:00",
    arriveTime: "09:20",
    fare: 2.5,
    bus: "BUS-07",
  },
  {
    id: "A2-1230",
    routeId: "A2",
    departTime: "12:30",
    arriveTime: "12:50",
    fare: 2.5,
    bus: "BUS-07",
  },
  {
    id: "A2-1800",
    routeId: "A2",
    departTime: "18:00",
    arriveTime: "18:20",
    fare: 2.5,
    bus: "BUS-07",
  },

  // Route B2 — KLUST → IOI City Mall
  {
    id: "B2-1000",
    routeId: "B2",
    departTime: "10:00",
    arriveTime: "10:23",
    fare: 3.0,
    bus: "BUS-12",
  },
  {
    id: "B2-1430",
    routeId: "B2",
    departTime: "14:30",
    arriveTime: "14:53",
    fare: 3.0,
    bus: "BUS-12",
  },
  {
    id: "B2-2000",
    routeId: "B2",
    departTime: "20:00",
    arriveTime: "20:23",
    fare: 3.0,
    bus: "BUS-12",
  },
];

/* =========================================================
   Seat maps — 4 rows × 5 cols per trip
   Values = gender of occupant: null (free), "M", "F"
   ========================================================= */

window.CS_SEATS = {
  // ============ Route A (MRT Serdang Jaya → KLUST) ============
  "A-1430": {
    A1: null,
    A2: "M",
    A3: "F",
    A4: "M",
    A5: null,
    B1: "F",
    B2: null,
    B3: "M",
    B4: null,
    B5: "M",
    C1: null,
    C2: "F",
    C3: null,
    C4: "M",
    C5: "F",
    D1: "M",
    D2: null,
    D3: "F",
    D4: null,
    D5: null,
  },
  "A-1700": {
    A1: null,
    A2: null,
    A3: "M",
    A4: null,
    A5: "F",
    B1: null,
    B2: "M",
    B3: null,
    B4: "F",
    B5: null,
    C1: "M",
    C2: null,
    C3: null,
    C4: null,
    C5: "M",
    D1: null,
    D2: "F",
    D3: null,
    D4: "M",
    D5: null,
  },
  "A-1930": {
    A1: null,
    A2: null,
    A3: null,
    A4: null,
    A5: null,
    B1: null,
    B2: null,
    B3: null,
    B4: null,
    B5: null,
    C1: null,
    C2: null,
    C3: null,
    C4: null,
    C5: null,
    D1: null,
    D2: null,
    D3: null,
    D4: null,
    D5: null,
  },

  // ============ Route B (IOI City Mall → KLUST) ============
  "B-0815": {
    A1: "F",
    A2: null,
    A3: "M",
    A4: null,
    A5: "F",
    B1: null,
    B2: "M",
    B3: null,
    B4: "F",
    B5: null,
    C1: "M",
    C2: null,
    C3: null,
    C4: "F",
    C5: null,
    D1: null,
    D2: "M",
    D3: null,
    D4: null,
    D5: "F",
  },
  "B-1215": {
    A1: null,
    A2: "F",
    A3: null,
    A4: "M",
    A5: null,
    B1: "F",
    B2: null,
    B3: "M",
    B4: null,
    B5: null,
    C1: null,
    C2: null,
    C3: "F",
    C4: null,
    C5: "M",
    D1: "M",
    D2: null,
    D3: null,
    D4: "F",
    D5: null,
  },
  "B-1800": {
    A1: null,
    A2: null,
    A3: null,
    A4: null,
    A5: null,
    B1: null,
    B2: null,
    B3: null,
    B4: null,
    B5: null,
    C1: null,
    C2: null,
    C3: null,
    C4: null,
    C5: null,
    D1: null,
    D2: null,
    D3: null,
    D4: null,
    D5: null,
  },

  // ============ Route A2 (KLUST → MRT Serdang Jaya) ============
  "A2-0900": {
    A1: null,
    A2: "M",
    A3: null,
    A4: "F",
    A5: null,
    B1: null,
    B2: null,
    B3: "M",
    B4: null,
    B5: "F",
    C1: null,
    C2: "M",
    C3: null,
    C4: null,
    C5: "M",
    D1: "F",
    D2: null,
    D3: null,
    D4: "M",
    D5: null,
  },
  "A2-1230": {
    A1: null,
    A2: null,
    A3: null,
    A4: null,
    A5: null,
    B1: "F",
    B2: null,
    B3: null,
    B4: "M",
    B5: null,
    C1: null,
    C2: "M",
    C3: "F",
    C4: null,
    C5: null,
    D1: null,
    D2: null,
    D3: "M",
    D4: null,
    D5: "F",
  },
  "A2-1800": {
    A1: null,
    A2: null,
    A3: null,
    A4: null,
    A5: null,
    B1: null,
    B2: null,
    B3: null,
    B4: null,
    B5: null,
    C1: null,
    C2: null,
    C3: null,
    C4: null,
    C5: null,
    D1: null,
    D2: null,
    D3: null,
    D4: null,
    D5: null,
  },

  // ============ Route B2 (KLUST → IOI City Mall) ============
  "B2-1000": {
    A1: null,
    A2: null,
    A3: null,
    A4: "F",
    A5: null,
    B1: "M",
    B2: null,
    B3: "F",
    B4: null,
    B5: null,
    C1: null,
    C2: "M",
    C3: null,
    C4: null,
    C5: "F",
    D1: null,
    D2: null,
    D3: "M",
    D4: null,
    D5: null,
  },
  "B2-1430": {
    A1: "F",
    A2: null,
    A3: "M",
    A4: null,
    A5: null,
    B1: null,
    B2: "F",
    B3: null,
    B4: null,
    B5: "M",
    C1: null,
    C2: null,
    C3: "M",
    C4: null,
    C5: null,
    D1: "F",
    D2: null,
    D3: null,
    D4: "M",
    D5: null,
  },
  "B2-2000": {
    A1: null,
    A2: null,
    A3: null,
    A4: null,
    A5: null,
    B1: null,
    B2: null,
    B3: null,
    B4: null,
    B5: null,
    C1: null,
    C2: null,
    C3: null,
    C4: null,
    C5: null,
    D1: null,
    D2: null,
    D3: null,
    D4: null,
    D5: null,
  },
};

/* =========================================================
   Wallet mock data — transaction history
   ========================================================= */

window.CS_TRANSACTIONS = [
  {
    id: "TX-1041",
    type: "fare",
    title: "Fare — MRT Serdang Jaya → KLUST",
    amount: -2.5,
    time: "Today · 14:30",
    method: "Wallet",
    icon: "🚌",
  },
  {
    id: "TX-1040",
    type: "loan",
    title: "Trip loan used (trip 2 of 3)",
    amount: -2.5,
    time: "Today · 13:05",
    method: "Loan",
    icon: "📄",
  },
  {
    id: "TX-1039",
    type: "topup",
    title: "Top-up via Touch 'n Go",
    amount: +20.0,
    time: "Yesterday · 09:12",
    method: "TnG",
    icon: "💳",
  },
  {
    id: "TX-1038",
    type: "fare",
    title: "Fare — IOI City Mall → KLUST",
    amount: -3.0,
    time: "Yesterday · 08:15",
    method: "Wallet",
    icon: "🚌",
  },
  {
    id: "TX-1037",
    type: "loan",
    title: "Loan repayment on top-up",
    amount: -5.0,
    time: "2 days ago · 10:48",
    method: "Loan",
    icon: "📄",
  },
  {
    id: "TX-1036",
    type: "fare",
    title: "Fare — MRT Serdang Jaya → KLUST",
    amount: -2.5,
    time: "3 days ago · 17:00",
    method: "Wallet",
    icon: "🚌",
  },
  {
    id: "TX-1035",
    type: "topup",
    title: "Top-up via DuitNow QR",
    amount: +10.0,
    time: "Last week · 20:31",
    method: "DuitNow",
    icon: "💳",
  },
];

/* Wallet quick stats (static demo values) */
window.CS_WALLET_STATS = {
  spentThisMonth: 12.5,
  tripsTaken: 5,
  loanRepaid: 5.0,
  topups: 3,
};
/* =========================================================
   Driver / UC12 — Send Delay or SOS Alert
   Mock data for driver trip, students on trip, seed alerts
   ========================================================= */

window.CS_DRIVER_TRIP = {
  tripId: "TRP-101",
  routeId: "A",
  routeName: "MRT Serdang Jaya → KLUST",
  bus: "BUS-07",
  origin: "MRT Serdang Jaya",
  destination: "KLUST (formerly IUKL)",
  scheduledDepart: "14:30",
  scheduledArrive: "14:50",
  totalSeats: 20,
  studentsOnBoard: 12,
  stops: [
    { name: "MRT Serdang Jaya", status: "departed" },
    { name: "Seri Kembangan", status: "next" },
    { name: "Uniten", status: "upcoming" },
    { name: "KLUST (formerly IUKL)", status: "upcoming" },
  ],
};

/* Students with reservations on the current trip */
window.CS_TRIP_STUDENTS = [
  { id: "253926139", name: "Ahmed Mohammad Mostakim", seat: "A12" },
  { id: "253926047", name: "Md Minul Islam", seat: "A08" },
  { id: "253926208", name: "Samiul Hasan Tanvir", seat: "B04" },
  { id: "253926104", name: "Yu Jieyao", seat: "B09" },
  { id: "253926155", name: "Nur Aisyah", seat: "C01" },
  { id: "253926162", name: "Lim Wei Chen", seat: "C06" },
  { id: "253926173", name: "Tan Mei Ling", seat: "D02" },
  { id: "253926181", name: "Rajesh Kumar", seat: "D05" },
  { id: "253926192", name: "Siti Nurhaliza", seat: "A03" },
  { id: "253926203", name: "Wong Jia Hui", seat: "B11" },
  { id: "253926214", name: "Muhammad Irfan", seat: "C08" },
  { id: "253926225", name: "Priya Devi", seat: "D09" },
];

/* Seed alert log — shows previous alerts for admin review */
window.CS_ALERTS = [
  {
    id: "ALR-0021",
    type: "delay",
    minutes: 8,
    note: "Heavy traffic on Silk Highway",
    sentAt: "Today · 13:42",
    recipients: 12,
    status: "delivered",
  },
  {
    id: "ALR-0020",
    type: "sos",
    note: "Medical emergency — student fainted",
    sentAt: "Yesterday · 09:15",
    recipients: 14,
    status: "delivered",
  },
];
/* =========================================================
   Admin / UC04 — Manage Routes & Analytics
   Mock data: routes, vehicles, analytics, schedule grid
   ========================================================= */

window.CS_ADMIN_ROUTES = [
  {
    id: "A",
    name: "MRT Serdang Jaya → KLUST",
    color: "#ef4444",
    icon: "🚇",
    fare: 2.5,
    stops: ["MRT Serdang Jaya", "Seri Kembangan", "Uniten", "KLUST"],
    durationMin: 20,
    active: true,
    schedules: ["14:30", "17:00", "19:30"],
    vehicle: "BUS-07",
  },
  {
    id: "B",
    name: "IOI City Mall → KLUST",
    color: "#f76d0a",
    icon: "🛍️",
    fare: 3.0,
    stops: ["IOI City Mall", "Bandar Baru Bangi", "Kajang Sentral", "KLUST"],
    durationMin: 23,
    active: true,
    schedules: ["08:15", "12:15", "18:00"],
    vehicle: "BUS-12",
  },
  {
    id: "A2",
    name: "KLUST → MRT Serdang Jaya",
    color: "#ef4444",
    icon: "🚇",
    fare: 2.5,
    stops: ["KLUST", "Uniten", "Seri Kembangan", "MRT Serdang Jaya"],
    durationMin: 20,
    active: true,
    schedules: ["09:00", "12:30", "18:00"],
    vehicle: "BUS-07",
  },
  {
    id: "B2",
    name: "KLUST → IOI City Mall",
    color: "#f76d0a",
    icon: "🛍️",
    fare: 3.0,
    stops: ["KLUST", "Kajang Sentral", "Bandar Baru Bangi", "IOI City Mall"],
    durationMin: 23,
    active: true,
    schedules: ["10:00", "14:30", "20:00"],
    vehicle: "BUS-12",
  },
];

window.CS_ADMIN_VEHICLES = [
  {
    id: "BUS-07",
    plate: "WXY 1234",
    capacity: 20,
    driver: "Samiul Hasan Tanvir",
  },
  { id: "BUS-12", plate: "WXY 5678", capacity: 20, driver: "Yu Jieyao" },
];

/* Analytics — 7-day window, per-hour passenger counts */
window.CS_ANALYTICS = {
  peakHours: [
    { hour: "07:00", passengers: 12 },
    { hour: "08:00", passengers: 34 },
    { hour: "09:00", passengers: 48 },
    { hour: "10:00", passengers: 22 },
    { hour: "11:00", passengers: 15 },
    { hour: "12:00", passengers: 28 },
    { hour: "13:00", passengers: 33 },
    { hour: "14:00", passengers: 41 },
    { hour: "15:00", passengers: 36 },
    { hour: "16:00", passengers: 29 },
    { hour: "17:00", passengers: 52 },
    { hour: "18:00", passengers: 58 },
    { hour: "19:00", passengers: 44 },
    { hour: "20:00", passengers: 21 },
  ],
  routeLoad: [
    { routeId: "A", trips: 42, passengers: 528, avgLoad: 0.63 },
    { routeId: "B", trips: 38, passengers: 471, avgLoad: 0.55 },
    { routeId: "A2", trips: 35, passengers: 402, avgLoad: 0.51 },
    { routeId: "B2", trips: 31, passengers: 349, avgLoad: 0.44 },
  ],
  congestion: [
    { segment: "Silk Highway (Seri Kembangan)", delay: 6, level: "medium" },
    { segment: "Jalan Ikram-Uniten", delay: 2, level: "low" },
    { segment: "SILK / Kajang Interchange", delay: 9, level: "high" },
    { segment: "IOI City Mall entrance", delay: 4, level: "medium" },
  ],
  kpis: {
    totalTrips: 146,
    totalPassengers: 1750,
    avgLoadFactor: 0.54,
    onTimePct: 0.87,
  },
  dataWindowDays: 7,
};
