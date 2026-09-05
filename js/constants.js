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
    "Other"
  ],
  "Terrace": [
    "Koba / Waterproofing",
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
  "Sunrise Heights",
  "Skyline Towers",
  "Palm Residency",
  "Grandeur Vista",
  "Royal Meadows",
  "Prestige Lakefront"
];

const SECURITY_PINS = {
  SITE_ENTRY: "1234",
  ADMIN_DASHBOARD: "9999"
};

const STORAGE_KEY = "mts_decor_work_logs";
