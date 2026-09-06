# MTS Decor - Daily Work Progress Tracker

A clean, responsive, light-theme mobile web application built with **Bootstrap 5.3** and vanilla modern JavaScript for recording daily mason/construction tasks on job sites.

---

## 🚀 Key Features

### 1. Screen 1: 4-Digit PIN Security Lockscreen
- Modern centered PIN lockscreen with MTS Decor branding.
- 4 circular digit indicators with active states.
- On-screen touch keypad (0–9, backspace, clear) and physical keyboard support.
- **PIN 1234**: Site entry for masons & workers (leads to Step 1 Location & Worker Setup).
- **PIN 9999**: Supervisor fast-track access directly to the Site Supervisor Dashboard.
- Shake animation and feedback on failed attempt.

### 2. Screen 2: Location & Mason Setup (Step 1 of 2)
- Fast mobile touch targets ($\ge 48\text{px}$).
- Project Name with quick datalist autocompletions (`Sunrise Heights`, `Skyline Towers`, etc.).
- Floor / Flat No.
- Auto-prefilled today's date picker.
- Mason / Labour Name.
- Direct navigation to saved dashboard.

### 3. Screen 3: Cascading Work Details Entry (Step 2 of 2)
- Location & flat context pill with one-click "Change" action.
- **Parent Work Category Dropdown** (15 options):
  `Spotted Marble Sill`, `Stone Sill Work`, `Kitchen`, `Toilet`, `Main Floor`, `Utility Area`, `Deck Area`, `Common Lobby`, `Staircase`, `Ground Lobby`, `Gazibo`, `Podium`, `Compound Area`, `Terrace`, `Other`.
- **Dynamic Child Sub-Work Dropdown**: Populates strictly based on the parent category. Selecting "Other" dynamically hides the child dropdown and reveals the notes textarea.
- **Inline Measurement & Units Flex Row**:
  - Quantity numeric input.
  - Units: `Sq. Ft.`, `RFT (Running Feet)`, `Nos / Pieces`, `Bags`.
- **Remarks / Custom Notes**: Auto-unhides for "Other" or can be manually expanded via `+ Add Notes`.
- **Post-Submission Prompt Modal**:
  - `Add Another Task for Same Flat`: Retains location context, resets task inputs, and focuses category dropdown for rapid logging.
  - `Finish & Go to Dashboard`: Jumps directly to supervisor dashboard.

### 4. Screen 4: Site Supervisor Dashboard
- Real-time **Total Tasks Completed** badge counter.
- Search & Filter by Project Name and Date.
- High-contrast feed cards displaying location, mason, category pills, measurement tags, notes, and delete buttons.
- Bottom Utility Bar:
  - **Export to CSV**: Real downloadable `.csv` file formatted for Microsoft Excel / Google Sheets.
  - **Clear All Data**: With confirmation safeguard.
  - **Lock App**: Instant return to Screen 1.

---

## 🏃 Local Run

Run any HTTP server:
```bash
npm start
# Or using npx:
npx serve -p 3001 .
# Or using python:
python3 -m http.server 3001
```
Open [http://localhost:3001](http://localhost:3001) in your browser.
