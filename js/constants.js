// Constants and Configuration for MTS Decor Work Tracker

const WORK_LOGIC_MATRIX = {
  "Spotted Marble Sill": [
    "Bed Room",
    "Living Room",
    "Toilet",
    "Kitchen",
    "Utility",
    "Staircase",
    "Other"
  ],
  "Stone Sill Work": [
    "Bed Room",
    "Living Room",
    "Toilet",
    "Kitchen",
    "Utility",
    "Staircase",
    "Other"
  ],
  "Kitchen": [
    "Platform",
    "Wall Tiles",
    "Stone Sill",
    "Floor Tiles",
    "Other"
  ],
  "Toilet": [
    "Koba (Waterproofing base)",
    "Floor Tiles",
    "Wall Tiles",
    "Stone Sill",
    "Floor Italian",
    "Dedo Italian",
    "Counter",
    "Other"
  ],
  "Main Floor": [
    "Koba",
    "Floor Tiles",
    "Skirting",
    "Other"
  ],
  "Utility Area": [
    "Koba",
    "Floor Tiles",
    "Wall Tiles",
    "Stone Sill",
    "Other"
  ],
  "Deck Area": [
    "Koba",
    "Floor Tiles",
    "Skirting",
    "Other"
  ],
  "Common Lobby": [
    "Koba",
    "Floor Tiles",
    "Wall Tiles",
    "Stone Sill",
    "Other"
  ],
  "Staircase": [
    "Treads & Risers",
    "Skirting",
    "Stone Sill",
    "Landing Tiles",
    "Other"
  ],
  "Group Lobby": [
    "Floor Tiles",
    "Koba",
    "Floor Italian",
    "Dedo Italian",
    "Inlay Work",
    "Windowsill",
    "Spotted Marble Sill",
    "Counter",
    "Other"
  ],
  "Gazibo": [
    "Floor Tiles",
    "Floor Koba",
    "Dedo Tiles",
    "Other"
  ],
  "Podium": [
    "Koba",
    "Floor Tiles",
    "Spotted Marble Sill",
    "Stone Sill",
    "Other"
  ],
  "Compound Area": [
    "Appoxie / Epoxy Filling",
    "Floor Tiles",
    "Floor Koba",
    "Compound Wall Tiles",
    "Gate Ramp",
    "Other"
  ],
  "Terrace": [
    "Koba",
    "Floor Tiles",
    "Skirting",
    "Other"
  ],
  "Other": [] // Hides child dropdown and directly unhides notes
};

const UNITS = [
  "Sq. Ft.",
  "RFT (Running Feet)",
  "Nos / Pieces",
  "Bags"
];

const PROJECT_SUGGESTIONS = [
  "ONE UTTAM",
  "Sunrise Heights",
  "Skyline Towers",
  "Palm Residency",
  "Grandeur Vista",
  "Royal Meadows",
  "Prestige Lakefront"
];

const TOWER_SUGGESTIONS = [
  "Tower A",
  "Tower B",
  "Tower C",
  "Wing A",
  "Wing B",
  "A1",
  "B1"
];

const DEFAULT_MASONS = [
  "Sampat",
  "Narayan ji",
  "Imran",
  "Bablu",
  "Sarvesh",
  "Rajesh",
  "Shiku",
  "Sharafat",
  "Vivek",
  "Gulam",
  "Hiralal",
  "Suresh"
];

const SECURITY_PINS = {
  SITE_ENTRY: "1234",
  ADMIN_DASHBOARD: "9999"
};

const STORAGE_KEY = "mts_decor_work_logs";

if (typeof window !== "undefined") {
  window.WORK_LOGIC_MATRIX = WORK_LOGIC_MATRIX;
  window.UNITS = UNITS;
  window.PROJECT_SUGGESTIONS = PROJECT_SUGGESTIONS;
  window.TOWER_SUGGESTIONS = TOWER_SUGGESTIONS;
  window.DEFAULT_MASONS = DEFAULT_MASONS;
  window.SECURITY_PINS = SECURITY_PINS;
  window.STORAGE_KEY = STORAGE_KEY;
}


