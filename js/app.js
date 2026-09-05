// MTS Decor Daily Work Progress Tracker - Application Logic
document.addEventListener("DOMContentLoaded", () => {
  // --- STATE ---
  let currentPin = "";
  let currentContext = {
    projectName: "",
    tower: "",
    floorFlat: "",
    date: "",
    masonName: ""
  };
  let pendingDeleteId = null;

  // Bootstrap Modals & Toast Instances
  const appToastEl = document.getElementById("appToast");
  const appToast = appToastEl ? new bootstrap.Toast(appToastEl, { delay: 3000 }) : null;

  const successPromptModalEl = document.getElementById("successPromptModal");
  const successPromptModal = successPromptModalEl ? new bootstrap.Modal(successPromptModalEl) : null;

  const deleteConfirmModalEl = document.getElementById("deleteConfirmModal");
  const deleteConfirmModal = deleteConfirmModalEl ? new bootstrap.Modal(deleteConfirmModalEl) : null;

  const pdfPreviewModalEl = document.getElementById("pdfPreviewModal");
  const pdfPreviewModal = pdfPreviewModalEl ? new bootstrap.Modal(pdfPreviewModalEl) : null;

  const whatsappPdfModalEl = document.getElementById("whatsappPdfModal");
  const whatsappPdfModal = whatsappPdfModalEl ? new bootstrap.Modal(whatsappPdfModalEl) : null;
  const whatsappPdfFilenameEl = document.getElementById("whatsappPdfFilename");
  const btnReopenWhatsapp = document.getElementById("btnReopenWhatsapp");

  const addMasonModalEl = document.getElementById("addMasonModal");
  const addMasonModal = addMasonModalEl && window.bootstrap ? new bootstrap.Modal(addMasonModalEl) : null;
  const formAddNewMason = document.getElementById("formAddNewMason");
  const inputNewMasonName = document.getElementById("inputNewMasonName");

  let latestLoggedEntry = null;
  let currentPdfDoc = null;
  let currentPdfDocParsed = null;
  let pdfZoomLevelPct = 100;
  let pdfFitMode = "width";
  let currentPdfFilename = "MTS_Decor_Report.pdf";
  let currentPdfLogs = [];

  // Screens
  const screens = {
    s1: document.getElementById("screen1"),
    s2: document.getElementById("screen2"),
    s3: document.getElementById("screen3"),
    s4: document.getElementById("screen4")
  };

  function showScreen(screenKey) {
    Object.values(screens).forEach((s) => {
      if (s) {
        s.classList.remove("active");
        s.style.display = "none";
      }
    });

    const target = screens[screenKey];
    if (target) {
      target.style.display = (screenKey === "s1" || screenKey === "s2" || screenKey === "s3") ? "flex" : "flex";
      if (screenKey === "s2" || screenKey === "s3") {
        try {
          if (typeof populateMasonDatalistsAndPills === "function") {
            populateMasonDatalistsAndPills();
          }
        } catch (e) {
          console.error("Error refreshing masons on screen switch", e);
        }
      }
      // Slight timeout for CSS animation
      setTimeout(() => {
        target.classList.add("active");
      }, 10);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function showToast(message, isSuccess = true) {
    const toastMsgEl = document.getElementById("toastMessage");
    if (toastMsgEl) toastMsgEl.textContent = message;

    if (appToastEl) {
      if (isSuccess) {
        appToastEl.className = "toast align-items-center text-bg-success border-0 shadow";
      } else {
        appToastEl.className = "toast align-items-center text-bg-danger border-0 shadow";
      }
      if (appToast) appToast.show();
    }
  }

  // --- MONGODB ATLAS CLOUD & STORAGE LAYER ---
  let isAtlasConnected = false;
  let atlasDbInfo = { status: "checking", error: null, hasUri: false };

  function getStoredLogs() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Error reading localStorage:", e);
      return [];
    }
  }

  function saveLogs(logs) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    } catch (e) {
      console.error("Error saving to localStorage:", e);
    }
  }

  // Check MongoDB Atlas status and update UI badges
  async function checkAtlasConnection() {
    const btnDbStatus = document.getElementById("btnDbStatus");
    const dbStatusIcon = document.getElementById("dbStatusIcon");
    const dbStatusText = document.getElementById("dbStatusText");
    const mongoModalBadge = document.getElementById("mongoModalBadge");
    const mongoModalDetails = document.getElementById("mongoModalDetails");

    try {
      const res = await fetch("/api/health");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      atlasDbInfo = data;
      isAtlasConnected = (data.database === "connected");

      if (isAtlasConnected) {
        if (btnDbStatus) {
          btnDbStatus.style.background = "#dcfce7";
          btnDbStatus.style.color = "#15803d";
        }
        if (dbStatusIcon) dbStatusIcon.className = "bi bi-cloud-check-fill text-success";
        if (dbStatusText) dbStatusText.textContent = "Atlas Connected";
        if (mongoModalBadge) {
          mongoModalBadge.className = "badge bg-success";
          mongoModalBadge.textContent = "Connected (Live)";
        }
        if (mongoModalDetails) {
          mongoModalDetails.innerHTML = `<span class="text-success"><i class="bi bi-check-circle-fill me-1"></i>Connected to MongoDB Atlas Cluster.</span>`;
        }
      } else if (!data.hasUri) {
        if (btnDbStatus) {
          btnDbStatus.style.background = "#fef3c7";
          btnDbStatus.style.color = "#b45309";
        }
        if (dbStatusIcon) dbStatusIcon.className = "bi bi-cloud-slash text-warning";
        if (dbStatusText) dbStatusText.textContent = "No Atlas URI (.env)";
        if (mongoModalBadge) {
          mongoModalBadge.className = "badge bg-warning text-dark";
          mongoModalBadge.textContent = "Awaiting .env Configuration";
        }
        if (mongoModalDetails) {
          mongoModalDetails.innerHTML = `<span class="text-warning-emphasis"><i class="bi bi-exclamation-circle-fill me-1"></i>MONGODB_URI is not yet configured in <code>.env</code> file. Running in local-cache mode.</span>`;
        }
      } else {
        if (btnDbStatus) {
          btnDbStatus.style.background = "#fee2e2";
          btnDbStatus.style.color = "#b91c1c";
        }
        if (dbStatusIcon) dbStatusIcon.className = "bi bi-cloud-slash-fill text-danger";
        if (dbStatusText) dbStatusText.textContent = "Atlas Error";
        if (mongoModalBadge) {
          mongoModalBadge.className = "badge bg-danger";
          mongoModalBadge.textContent = "Connection Error";
        }
        if (mongoModalDetails) {
          mongoModalDetails.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle-fill me-1"></i>${escapeHtml(data.error || "Failed to connect to cluster")}</span>`;
        }
      }
    } catch (err) {
      isAtlasConnected = false;
      if (dbStatusText) dbStatusText.textContent = "Offline Mode";
      if (mongoModalBadge) {
        mongoModalBadge.className = "badge bg-secondary";
        mongoModalBadge.textContent = "Offline";
      }
    }
  }

  // Fetch logs from MongoDB Atlas (merging into local cache)
  async function fetchCloudLogs() {
    if (!isAtlasConnected) return;
    try {
      const res = await fetch("/api/logs");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.logs)) {
          saveLogs(data.logs);
          renderFeed();
          updateProjectFilters();
          populateTowerSuggestions();
          populateMasonDatalistsAndPills();
        }
      }
    } catch (err) {
      console.warn("Could not fetch logs from Atlas, using cached logs:", err);
    }
  }

  // Save new log to MongoDB Atlas and local cache
  async function apiSaveLog(newLog) {
    const logs = getStoredLogs();
    const filtered = logs.filter((l) => l.id !== newLog.id);
    filtered.unshift(newLog);
    saveLogs(filtered);

    if (isAtlasConnected) {
      try {
        const res = await fetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newLog)
        });
        if (res.ok) {
          console.log("Log synced to MongoDB Atlas:", newLog.id);
        }
      } catch (err) {
        console.warn("Failed to write to MongoDB Atlas, cached locally:", err);
      }
    }
  }

  // Delete log from MongoDB Atlas and local cache
  async function apiDeleteLog(id) {
    let logs = getStoredLogs();
    logs = logs.filter((l) => l.id !== id);
    saveLogs(logs);

    if (isAtlasConnected) {
      try {
        await fetch(`/api/logs/${encodeURIComponent(id)}`, { method: "DELETE" });
      } catch (err) {
        console.warn("Failed to delete from Atlas:", err);
      }
    }
  }

  // Clear all logs
  async function apiClearAllLogs() {
    localStorage.removeItem(STORAGE_KEY);
    if (isAtlasConnected) {
      try {
        await fetch("/api/logs", { method: "DELETE" });
      } catch (err) {
        console.warn("Failed to clear Atlas logs:", err);
      }
    }
  }

  // Batch sync local logs to Atlas
  async function syncLocalLogsToAtlas() {
    const logs = getStoredLogs();
    if (!logs || logs.length === 0) {
      showToast("No local records found to sync", false);
      return;
    }

    const btnSync = document.getElementById("btnSyncLocalToAtlas");
    if (btnSync) {
      btnSync.disabled = true;
      btnSync.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Syncing to Atlas...`;
    }

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logs })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Synced ${data.totalSynced || logs.length} records to MongoDB Atlas!`, true);
        await fetchCloudLogs();
      } else {
        showToast(data.error || "Sync failed. Check Atlas connection.", false);
      }
    } catch (err) {
      showToast("Sync error: " + err.message, false);
    } finally {
      if (btnSync) {
        btnSync.disabled = false;
        btnSync.innerHTML = `<i class="bi bi-arrow-repeat"></i> Sync Local Browser Records to MongoDB Atlas`;
      }
    }
  }

  // =========================================================
  // 1. SCREEN 1: PIN AUTHENTICATION
  // =========================================================
  const pinBoxes = [
    document.getElementById("pinBox0"),
    document.getElementById("pinBox1"),
    document.getElementById("pinBox2"),
    document.getElementById("pinBox3")
  ];
  const pinContainer = document.getElementById("pinBoxContainer");
  const pinErrorMsg = document.getElementById("pinErrorMessage");

  function updatePinBoxes() {
    pinBoxes.forEach((box, idx) => {
      if (!box) return;
      if (idx < currentPin.length) {
        box.value = "•";
        box.classList.add("filled");
      } else {
        box.value = "";
        box.classList.remove("filled");
      }
    });
  }

  function handlePinInput(digit) {
    if (currentPin.length >= 4) return;
    currentPin += digit;
    updatePinBoxes();
    if (pinErrorMsg) pinErrorMsg.classList.add("invisible");

    if (currentPin.length === 4) {
      setTimeout(verifyPin, 150);
    }
  }

  function handlePinBackspace() {
    if (currentPin.length > 0) {
      currentPin = currentPin.slice(0, -1);
      updatePinBoxes();
    }
    if (pinErrorMsg) pinErrorMsg.classList.add("invisible");
  }

  function handlePinClear() {
    currentPin = "";
    updatePinBoxes();
    if (pinErrorMsg) pinErrorMsg.classList.add("invisible");
  }

  function verifyPin() {
    if (currentPin === SECURITY_PINS.SITE_ENTRY) {
      currentPin = "";
      updatePinBoxes();
      showScreen("s2");
    } else if (currentPin === SECURITY_PINS.ADMIN_DASHBOARD) {
      currentPin = "";
      updatePinBoxes();
      refreshDashboard();
      showScreen("s4");
    } else {
      // Invalid PIN
      if (pinContainer) pinContainer.classList.add("animate-shake");
      if (pinErrorMsg) pinErrorMsg.classList.remove("invisible");

      setTimeout(() => {
        if (pinContainer) pinContainer.classList.remove("animate-shake");
        currentPin = "";
        updatePinBoxes();
      }, 500);
    }
  }

  // Keypad button listeners
  document.querySelectorAll(".keypad-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-key");
      const action = btn.getAttribute("data-action");

      if (key !== null) {
        handlePinInput(key);
      } else if (action === "backspace") {
        handlePinBackspace();
      } else if (action === "clear") {
        handlePinClear();
      }
    });
  });

  // Physical keyboard support for PIN
  document.addEventListener("keydown", (e) => {
    if (screens.s1 && screens.s1.classList.contains("active")) {
      if (/^[0-9]$/.test(e.key)) {
        handlePinInput(e.key);
      } else if (e.key === "Backspace") {
        handlePinBackspace();
      } else if (e.key === "Escape" || e.key === "Delete") {
        handlePinClear();
      }
    }
  });

  // =========================================================
  // 2. SCREEN 2: PROJECT SETUP & PRECISE FLOOR / FLAT SELECTION
  // =========================================================
  const formProjectSetup = document.getElementById("formProjectSetup");
  const inputProjectName = document.getElementById("inputProjectName");
  const inputFloor = document.getElementById("inputFloor");
  const inputFlatNo = document.getElementById("inputFlatNo");
  const flatSuggestions = document.getElementById("flatSuggestions");
  const quickFlatPillsContainer = document.getElementById("quickFlatPillsContainer");
  const quickFlatPills = document.getElementById("quickFlatPills");
  const floorBadgeIndicator = document.getElementById("floorBadgeIndicator");
  const flatValidationFeedback = document.getElementById("flatValidationFeedback");
  const flatValidationMessage = document.getElementById("flatValidationMessage");
  const inputDate = document.getElementById("inputDate");
  const inputMasonName = document.getElementById("inputMasonName");
  const selectScreen2Mason = document.getElementById("selectScreen2Mason");
  const inputScreen3Mason = document.getElementById("inputScreen3Mason");
  const selectScreen3LabourDropdown = document.getElementById("selectScreen3LabourDropdown");
  const btnScreen3AddLabour = document.getElementById("btnScreen3AddLabour");
  const screen3AssignedLaboursList = document.getElementById("screen3AssignedLaboursList");
  const assignedLaboursCountBadge = document.getElementById("assignedLaboursCountBadge");
  const inputTower = document.getElementById("inputTower");
  const projectSuggestionsDatalist = document.getElementById("projectSuggestions");
  const towerSuggestionsDatalist = document.getElementById("towerSuggestions");
  const btnLockFromScreen2 = document.getElementById("btnLockFromScreen2");
  const btnGoToDashboardFromScreen2 = document.getElementById("btnGoToDashboardFromScreen2");

  // State: Array of labours assigned to the current work entry in Screen 3
  let currentTaskAssignedMasons = [];

  // Populate project datalist
  if (projectSuggestionsDatalist && Array.isArray(PROJECT_SUGGESTIONS)) {
    projectSuggestionsDatalist.innerHTML = PROJECT_SUGGESTIONS.map(
      (p) => `<option value="${p}"></option>`
    ).join("");
  }

  // Populate Tower datalist
  function populateTowerSuggestions() {
    const towerList = Array.isArray(TOWER_SUGGESTIONS) ? [...TOWER_SUGGESTIONS] : [];
    const storedLogs = getStoredLogs();
    storedLogs.forEach((l) => {
      if (l.tower && l.tower.trim() && !towerList.includes(l.tower.trim())) {
        towerList.push(l.tower.trim());
      }
    });
    if (towerSuggestionsDatalist) {
      towerSuggestionsDatalist.innerHTML = towerList.map(
        (t) => `<option value="${escapeHtml(t)}"></option>`
      ).join("");
    }
  }

  // --- Persistent Custom Masons & Suggestions ---
  const CUSTOM_MASONS_KEY = "mts_custom_masons";

  function getCustomMasons() {
    try {
      const raw = localStorage.getItem(CUSTOM_MASONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("Failed to parse custom masons", e);
      return [];
    }
  }

  function saveCustomMason(name) {
    if (!name || !name.trim()) return null;
    const trimmed = name.trim();
    const current = getCustomMasons();
    if (!current.some((m) => m.toLowerCase() === trimmed.toLowerCase())) {
      current.push(trimmed);
      try {
        localStorage.setItem(CUSTOM_MASONS_KEY, JSON.stringify(current));
      } catch (e) {
        console.error("Failed to save custom mason", e);
      }
    }
    return trimmed;
  }

  // Get all unique known masons from defaults + custom masons + logs
  function getAllKnownMasons() {
    const list = [];
    const pushIfNew = (name) => {
      if (!name) return;
      const t = String(name).trim();
      if (!t || t === "-" || t.toLowerCase() === "unassigned") return;
      if (t.includes(",")) {
        t.split(",").forEach((sub) => pushIfNew(sub));
        return;
      }
      if (!list.some((existing) => existing.toLowerCase() === t.toLowerCase())) {
        list.push(t);
      }
    };

    // 1. Defaults from constants.js
    if (Array.isArray(DEFAULT_MASONS)) {
      DEFAULT_MASONS.forEach(pushIfNew);
    }

    // 2. Custom Masons added by user
    getCustomMasons().forEach(pushIfNew);

    // 3. Stored entries/logs
    const storedLogs = getStoredLogs();
    storedLogs.forEach((l) => {
      if (l.masonName) pushIfNew(l.masonName);
    });

    return list;
  }

  // Helper to visually update active/selected pill highlights
  function updateActiveMasonPills() {
    // Screen 2 active pill
    const s2Target = ((selectScreen2Mason && selectScreen2Mason.value) || (inputMasonName && inputMasonName.value) || currentContext.masonName || "").trim().toLowerCase();
    document.querySelectorAll(".mason-pill-s2").forEach((btn) => {
      const m = (btn.getAttribute("data-mason") || "").trim().toLowerCase();
      const icon = btn.querySelector("i");
      if (s2Target && m === s2Target) {
        btn.classList.add("active");
        if (icon) icon.className = "bi bi-check2 me-1";
      } else {
        btn.classList.remove("active");
        if (icon) icon.className = "bi bi-person me-1";
      }
    });

    // Screen 3 active pills: any mason present in currentTaskAssignedMasons
    document.querySelectorAll(".mason-pill-s3").forEach((btn) => {
      const m = (btn.getAttribute("data-mason") || "").trim().toLowerCase();
      const icon = btn.querySelector("i");
      const isAssigned = currentTaskAssignedMasons.some((x) => x.toLowerCase() === m);
      if (isAssigned) {
        btn.classList.add("active");
        if (icon) icon.className = "bi bi-check2 me-1";
      } else {
        btn.classList.remove("active");
        if (icon) icon.className = "bi bi-person me-1";
      }
    });
  }

  // Multi-Labour State Management for Screen 3
  function initScreen3Masons(initialMason) {
    currentTaskAssignedMasons = [];
    if (initialMason && initialMason.trim() && initialMason !== "-" && initialMason.toLowerCase() !== "unassigned") {
      initialMason.split(",").forEach((sub) => {
        const t = sub.trim();
        if (t && !currentTaskAssignedMasons.some((x) => x.toLowerCase() === t.toLowerCase())) {
          currentTaskAssignedMasons.push(t);
        }
      });
    }
    renderScreen3AssignedMasons();
  }

  function addLabourToCurrentTask(masonName) {
    if (!masonName) return;
    const trimmed = masonName.trim();
    if (trimmed === "__ADD_NEW__") {
      openAddMasonModal();
      return;
    }
    if (!trimmed) return;

    if (currentTaskAssignedMasons.some((x) => x.toLowerCase() === trimmed.toLowerCase())) {
      showToast(`${trimmed} is already assigned to this work`, false);
      return;
    }

    currentTaskAssignedMasons.push(trimmed);
    renderScreen3AssignedMasons();
    populateMasonDropdownsOnly();
    showToast(`Added ${trimmed} to work entry!`, true);
  }

  function removeLabourFromCurrentTask(idx) {
    if (idx >= 0 && idx < currentTaskAssignedMasons.length) {
      const removed = currentTaskAssignedMasons.splice(idx, 1);
      renderScreen3AssignedMasons();
      populateMasonDropdownsOnly();
      showToast(`Removed ${removed[0]} from work entry`, false);
    }
  }

  function toggleLabourInCurrentTask(masonName) {
    if (!masonName) return;
    const trimmed = masonName.trim();
    const existingIndex = currentTaskAssignedMasons.findIndex((x) => x.toLowerCase() === trimmed.toLowerCase());
    if (existingIndex >= 0) {
      removeLabourFromCurrentTask(existingIndex);
    } else {
      addLabourToCurrentTask(trimmed);
    }
  }

  function renderScreen3AssignedMasons() {
    const container = document.getElementById("screen3AssignedLaboursList");
    const countBadge = document.getElementById("assignedLaboursCountBadge");
    const hiddenInput = document.getElementById("inputScreen3Mason");

    const joined = currentTaskAssignedMasons.join(", ");
    if (hiddenInput) {
      hiddenInput.value = joined;
      currentContext.masonName = joined;
    }

    if (countBadge) {
      const count = currentTaskAssignedMasons.length;
      countBadge.textContent = count === 1 ? "1 Worker" : `${count} Workers`;
      if (count === 0) {
        countBadge.className = "badge bg-warning-subtle text-warning-emphasis fw-semibold";
      } else {
        countBadge.className = "badge bg-primary-subtle text-primary fw-semibold";
      }
    }

    if (!container) return;

    if (currentTaskAssignedMasons.length === 0) {
      container.innerHTML = `
        <div class="text-muted small fst-italic py-1 px-2 d-flex align-items-center gap-1">
          <i class="bi bi-info-circle text-secondary"></i> No labour assigned yet. Pick from the dropdown below and click <strong>Add</strong>, or tap any suggestion pill.
        </div>
      `;
    } else {
      container.innerHTML = currentTaskAssignedMasons.map((m, idx) => `
        <div class="assigned-labour-chip">
          <i class="bi bi-person-fill text-primary"></i>
          <span>${escapeHtml(m)}</span>
          <button type="button" class="btn-remove-assigned-labour btn-close" style="font-size: 0.65rem;" data-mason-idx="${idx}" title="Remove ${escapeHtml(m)}" aria-label="Remove"></button>
        </div>
      `).join("");

      container.querySelectorAll(".btn-remove-assigned-labour").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          const idx = parseInt(btn.getAttribute("data-mason-idx"), 10);
          removeLabourFromCurrentTask(idx);
        });
      });
    }

    updateActiveMasonPills();
  }

  // Populate only the dropdowns when labours change
  function populateMasonDropdownsOnly() {
    const masons = getAllKnownMasons();
    if (selectScreen3LabourDropdown) {
      let optionsHtml = `<option value="" selected disabled>Select labour from dropdown...</option>`;
      optionsHtml += masons.map((m) => {
        const isAssigned = currentTaskAssignedMasons.some((x) => x.toLowerCase() === m.toLowerCase());
        const label = isAssigned ? `${escapeHtml(m)} (Already Added)` : escapeHtml(m);
        return `<option value="${escapeHtml(m)}">${label}</option>`;
      }).join("");
      optionsHtml += `<option value="__ADD_NEW__" class="fw-bold text-primary">➕ + Create New Mason...</option>`;
      selectScreen3LabourDropdown.innerHTML = optionsHtml;
    }
  }

  // Populate mason dropdowns, datalists, and quick-selection pills on Screen 2 and Screen 3
  function populateMasonDatalistsAndPills(selectedMason) {
    const masons = getAllKnownMasons();
    const currentMason = (selectedMason !== undefined
      ? selectedMason
      : ((selectScreen2Mason && selectScreen2Mason.value) || (inputMasonName && inputMasonName.value) || currentContext.masonName || "")
    ).trim();

    // 1. Screen 2 Dropdown (<select id="selectScreen2Mason">)
    if (selectScreen2Mason) {
      let s2Html = `<option value="" disabled ${!currentMason ? "selected" : ""}>Select mason from dropdown...</option>`;
      s2Html += masons.map((m) => {
        const isSel = currentMason && m.toLowerCase() === currentMason.toLowerCase();
        return `<option value="${escapeHtml(m)}" ${isSel ? "selected" : ""}>${escapeHtml(m)}</option>`;
      }).join("");
      s2Html += `<option value="__ADD_NEW__" class="fw-bold text-primary">➕ + Add New Mason...</option>`;
      selectScreen2Mason.innerHTML = s2Html;
      if (currentMason && inputMasonName) {
        inputMasonName.value = currentMason;
      }
    }

    // 2. Screen 3 Multi-Labour Dropdown (<select id="selectScreen3LabourDropdown">)
    populateMasonDropdownsOnly();

    // 3. Autocomplete Datalist
    const datalist = document.getElementById("masonSuggestionsList");
    if (datalist) {
      datalist.innerHTML = masons.map(
        (m) => `<option value="${escapeHtml(m)}"></option>`
      ).join("");
    }

    // 4. Quick Pills Screen 2 (Click sets primary mason)
    const pillsS2 = document.getElementById("quickMasonPillsScreen2");
    if (pillsS2) {
      let htmlS2 = `
        <button type="button" class="mason-add-pill-btn btn-trigger-add-mason" title="Add a new mason / labour">
          <i class="bi bi-person-plus-fill"></i>+ Add New
        </button>
      `;
      htmlS2 += masons.map((m) => {
        const isSelected = Boolean(currentMason && m.toLowerCase() === currentMason.toLowerCase());
        const activeClass = isSelected ? " active" : "";
        const icon = isSelected ? "bi-check2" : "bi-person";
        return `
          <button type="button" class="mason-pill-btn mason-pill-s2${activeClass}" data-mason="${escapeHtml(m)}">
            <i class="bi ${icon} me-1"></i>${escapeHtml(m)}
          </button>
        `;
      }).join("");
      pillsS2.innerHTML = htmlS2;
      pillsS2.querySelectorAll(".mason-pill-s2").forEach((btn) => {
        btn.addEventListener("click", () => {
          const m = btn.getAttribute("data-mason");
          if (selectScreen2Mason) selectScreen2Mason.value = m;
          if (inputMasonName) inputMasonName.value = m;
          currentContext.masonName = m;
          updateActiveMasonPills();
        });
      });
    }

    // 5. Quick Pills Screen 3 (Click toggles/adds labour to task!)
    const pillsS3 = document.getElementById("quickMasonPillsScreen3");
    if (pillsS3) {
      let htmlS3 = `
        <button type="button" class="mason-add-pill-btn btn-trigger-add-mason" title="Add a new mason / labour">
          <i class="bi bi-person-plus-fill"></i>+ Add New
        </button>
      `;
      htmlS3 += masons.map((m) => {
        const isAssigned = currentTaskAssignedMasons.some((x) => x.toLowerCase() === m.toLowerCase());
        const activeClass = isAssigned ? " active" : "";
        const icon = isAssigned ? "bi-check2" : "bi-person";
        return `
          <button type="button" class="mason-pill-btn mason-pill-s3${activeClass}" data-mason="${escapeHtml(m)}" title="Tap to add or remove">
            <i class="bi ${icon} me-1"></i>${escapeHtml(m)}
          </button>
        `;
      }).join("");
      pillsS3.innerHTML = htmlS3;
      pillsS3.querySelectorAll(".mason-pill-s3").forEach((btn) => {
        btn.addEventListener("click", () => {
          const m = btn.getAttribute("data-mason");
          toggleLabourInCurrentTask(m);
        });
      });
    }

    updateActiveMasonPills();
  }

  // Handle Screen 2 Mason Dropdown selection
  if (selectScreen2Mason) {
    selectScreen2Mason.addEventListener("change", () => {
      const val = selectScreen2Mason.value;
      if (val === "__ADD_NEW__") {
        selectScreen2Mason.value = inputMasonName ? inputMasonName.value : "";
        openAddMasonModal();
        return;
      }
      if (inputMasonName) inputMasonName.value = val;
      currentContext.masonName = val;
      updateActiveMasonPills();
    });
  }

  // Handle Screen 3 Add Labour Dropdown & Add Button
  if (selectScreen3LabourDropdown) {
    selectScreen3LabourDropdown.addEventListener("change", () => {
      const val = selectScreen3LabourDropdown.value;
      if (val === "__ADD_NEW__") {
        selectScreen3LabourDropdown.value = "";
        openAddMasonModal();
      }
    });
  }

  if (btnScreen3AddLabour) {
    btnScreen3AddLabour.addEventListener("click", (e) => {
      e.preventDefault();
      const val = selectScreen3LabourDropdown ? selectScreen3LabourDropdown.value : "";
      if (!val || val === "__ADD_NEW__") {
        showToast("Please choose a labour from the dropdown first", false);
        return;
      }
      addLabourToCurrentTask(val);
      if (selectScreen3LabourDropdown) selectScreen3LabourDropdown.value = "";
    });
  }

  // Open Add Mason Modal helper
  function openAddMasonModal() {
    let prefill = "";
    if (inputMasonName && inputMasonName.value.trim()) {
      prefill = inputMasonName.value.trim();
    }
    if (inputNewMasonName) {
      inputNewMasonName.value = prefill;
    }
    const modal = (window.bootstrap && window.bootstrap.Modal && addMasonModalEl)
      ? bootstrap.Modal.getOrCreateInstance(addMasonModalEl)
      : addMasonModal;
    if (modal) {
      modal.show();
    }
    setTimeout(() => {
      if (inputNewMasonName) {
        inputNewMasonName.focus();
        if (inputNewMasonName.value) inputNewMasonName.select();
      }
    }, 350);
  }

  // Delegated click listener for any + Add New Mason buttons/pills
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest(".btn-trigger-add-mason");
    if (trigger) {
      e.preventDefault();
      openAddMasonModal();
    }
  });

  // Handle Add Mason Form Submit
  if (formAddNewMason) {
    formAddNewMason.addEventListener("submit", (e) => {
      e.preventDefault();
      const raw = inputNewMasonName ? inputNewMasonName.value.trim() : "";
      if (!raw) {
        showToast("Please enter a mason name", false);
        return;
      }
      const saved = saveCustomMason(raw);

      // Set for Screen 2
      if (inputMasonName) inputMasonName.value = saved;
      if (selectScreen2Mason) selectScreen2Mason.value = saved;
      currentContext.masonName = saved;

      // Also automatically add to Screen 3 current task if on Screen 3 or initializing
      if (!currentTaskAssignedMasons.some((x) => x.toLowerCase() === saved.toLowerCase())) {
        currentTaskAssignedMasons.push(saved);
      }

      populateMasonDatalistsAndPills(saved);
      renderScreen3AssignedMasons();

      const modal = (window.bootstrap && window.bootstrap.Modal && addMasonModalEl)
        ? bootstrap.Modal.getOrCreateInstance(addMasonModalEl)
        : addMasonModal;
      if (modal) {
        modal.hide();
      }

      showToast(`Mason "${saved}" created and added to task!`, true);
    });
  }

  // Default date to today (YYYY-MM-DD)
  const todayIso = new Date().toISOString().split("T")[0];
  if (inputDate && !inputDate.value) {
    inputDate.value = todayIso;
  }

  // Generate valid flat suggestions based on typed floor
  function getFlatSuggestionsForFloor(floorVal) {
    if (!floorVal) return [];

    const upper = floorVal.toUpperCase().trim();

    if (upper === "G" || upper.startsWith("GROUND")) {
      return ["G01", "G02", "G03", "G04", "001", "002", "003", "004"];
    } else if (upper.startsWith("B")) {
      return [`${upper}-01`, `${upper}-02`, `${upper}-03`, `${upper}-Parking`];
    } else if (upper.startsWith("PH") || upper.startsWith("PENT")) {
      return ["PH-1", "PH-2", "PH-3", "PH-4", "PH-A", "PH-B"];
    } else if (upper === "T" || upper.startsWith("TERRACE")) {
      return ["Terrace Unit", "T-1", "T-2"];
    }

    // Numeric or mixed Floors (e.g. 4, 14, 25, 42, 52...)
    const floorNum = parseInt(floorVal, 10);
    if (!isNaN(floorNum)) {
      const suggestions = [];
      const count = floorNum > 20 ? 4 : 8;
      for (let i = 1; i <= count; i++) {
        const unitSuffix = i < 10 ? `0${i}` : `${i}`;
        suggestions.push(`${floorNum}${unitSuffix}`);
      }
      return suggestions;
    }

    // Custom non-numeric string (e.g. Pod, Mezzanine)
    return [`${floorVal}-01`, `${floorVal}-02`, `${floorVal}-03`];
  }

  // Strict validation: Flat number MUST correspond to typed floor
  function validateFlatNo(floorVal, flatVal) {
    if (!floorVal || !floorVal.trim()) {
      return { valid: false, message: "Please enter a Floor Number first." };
    }
    if (!flatVal || !flatVal.trim()) {
      return { valid: false, message: "Flat / Unit No. is required." };
    }

    const fTrimmed = floorVal.trim();
    const upperFloor = fTrimmed.toUpperCase();
    const trimmedFlat = flatVal.trim();
    // Strip common prefixes if entered (e.g. "Flat 402" -> "402", "#402" -> "402")
    const cleanNum = trimmedFlat.replace(/^(flat|unit|no\.?|#)\s*/i, "").trim();

    if (upperFloor === "G" || upperFloor.startsWith("GROUND")) {
      const isGroundValid = /^(g|0|ground)/i.test(cleanNum);
      if (!isGroundValid) {
        return {
          valid: false,
          message: `Ground Floor flats must start with G or 0 (e.g., G01, G02, 001). Found: "${trimmedFlat}"`
        };
      }
      return { valid: true, cleanNum };
    }

    if (upperFloor.startsWith("B")) {
      const isBasementValid = /^(b|basement)/i.test(cleanNum);
      if (!isBasementValid) {
        return {
          valid: false,
          message: `Basement units on ${fTrimmed} must start with B (e.g., ${fTrimmed}-01, B01). Found: "${trimmedFlat}"`
        };
      }
      return { valid: true, cleanNum };
    }

    if (upperFloor.startsWith("PH") || upperFloor.startsWith("PENT")) {
      const isPhValid = /^(ph|p|penthouse)/i.test(cleanNum);
      if (!isPhValid) {
        return {
          valid: false,
          message: `Penthouse units must start with PH or P (e.g., PH-1, PH-2). Found: "${trimmedFlat}"`
        };
      }
      return { valid: true, cleanNum };
    }

    if (upperFloor === "T" || upperFloor.startsWith("TERRACE")) {
      const isTerraceValid = /^(t|terrace)/i.test(cleanNum);
      if (!isTerraceValid) {
        return {
          valid: false,
          message: `Terrace units must start with T or Terrace (e.g., T-1, Terrace). Found: "${trimmedFlat}"`
        };
      }
      return { valid: true, cleanNum };
    }

    // Numeric floor check (e.g. 4, 12, 45, etc.): Flat number must start with the typed floor!
    const floorDigits = fTrimmed.match(/^\d+/);
    if (floorDigits) {
      const floorStr = floorDigits[0];
      if (!cleanNum.startsWith(floorStr)) {
        const sample = `${floorStr}01, ${floorStr}02`;
        return {
          valid: false,
          message: `Invalid Flat! For Floor ${fTrimmed}, flat number must start with ${floorStr} (e.g., ${sample}). Cannot be "${trimmedFlat}".`
        };
      }
    } else {
      // Arbitrary custom string floor
      if (!cleanNum.toLowerCase().startsWith(fTrimmed.toLowerCase())) {
        return {
          valid: false,
          message: `Flat number on ${fTrimmed} must start with ${fTrimmed}. Found: "${trimmedFlat}".`
        };
      }
    }

    return { valid: true, cleanNum };
  }

  // Update UI when Floor Input Changes
  function handleFloorInputChange() {
    const floorVal = inputFloor.value.trim();
    if (!floorVal) {
      inputFlatNo.disabled = true;
      inputFlatNo.value = "";
      inputFlatNo.placeholder = "Enter floor first";
      quickFlatPillsContainer.classList.add("d-none");
      flatValidationFeedback.classList.add("d-none");
      return;
    }

    // Enable flat input
    inputFlatNo.disabled = false;
    const suggestions = getFlatSuggestionsForFloor(floorVal);

    // Populate Datalist
    if (flatSuggestions) {
      flatSuggestions.innerHTML = suggestions
        .map((s) => `<option value="${s}"></option>`)
        .join("");
    }

    // Update placeholder
    const upper = floorVal.toUpperCase();
    if (upper === "G" || upper.startsWith("GROUND")) {
      inputFlatNo.placeholder = "e.g. G01, G02";
    } else if (upper.startsWith("B")) {
      inputFlatNo.placeholder = `e.g. ${floorVal}-01, B01`;
    } else if (upper.startsWith("PH") || upper.startsWith("PENT")) {
      inputFlatNo.placeholder = "e.g. PH-1, PH-2";
    } else if (upper === "T" || upper.startsWith("TERRACE")) {
      inputFlatNo.placeholder = "e.g. Terrace Unit, T-1";
    } else {
      inputFlatNo.placeholder = `e.g. ${floorVal}01, ${floorVal}02`;
    }

    // Render Quick Pills
    if (quickFlatPills && suggestions.length > 0) {
      quickFlatPills.innerHTML = "";
      const floorLabel = `Floor ${floorVal}`;
      if (floorBadgeIndicator) floorBadgeIndicator.textContent = floorLabel;

      suggestions.forEach((item) => {
        const pillBtn = document.createElement("button");
        pillBtn.type = "button";
        pillBtn.className = "flat-pill-btn";
        pillBtn.textContent = item;
        pillBtn.addEventListener("click", () => {
          inputFlatNo.value = item;
          // Mark active pill
          document.querySelectorAll(".flat-pill-btn").forEach((p) => p.classList.remove("active"));
          pillBtn.classList.add("active");
          // Clear validation error
          inputFlatNo.classList.remove("is-invalid");
          inputFlatNo.classList.add("is-valid");
          flatValidationFeedback.classList.add("d-none");
        });
        quickFlatPills.appendChild(pillBtn);
      });

      quickFlatPillsContainer.classList.remove("d-none");
    } else {
      quickFlatPillsContainer.classList.add("d-none");
    }

    // If flat has a value already, revalidate it against this floor
    if (inputFlatNo.value) {
      checkFlatInputValidation();
    }
  }

  if (inputFloor) {
    inputFloor.addEventListener("input", handleFloorInputChange);
    inputFloor.addEventListener("change", handleFloorInputChange);
  }

  // Real-time validation as user types flat number
  function checkFlatInputValidation() {
    const floorVal = inputFloor.value.trim();
    const flatVal = inputFlatNo.value.trim();

    if (!flatVal) {
      inputFlatNo.classList.remove("is-invalid", "is-valid");
      flatValidationFeedback.classList.add("d-none");
      return true;
    }

    const result = validateFlatNo(floorVal, flatVal);
    if (!result.valid) {
      inputFlatNo.classList.add("is-invalid");
      inputFlatNo.classList.remove("is-valid");
      flatValidationFeedback.classList.remove("d-none");
      flatValidationMessage.textContent = result.message;

      // Unhighlight pills
      document.querySelectorAll(".flat-pill-btn").forEach((p) => p.classList.remove("active"));
      return false;
    } else {
      inputFlatNo.classList.remove("is-invalid");
      inputFlatNo.classList.add("is-valid");
      flatValidationFeedback.classList.add("d-none");

      // Highlight corresponding pill if exact match
      document.querySelectorAll(".flat-pill-btn").forEach((p) => {
        if (p.textContent.toLowerCase() === flatVal.toLowerCase()) {
          p.classList.add("active");
        } else {
          p.classList.remove("active");
        }
      });
      return true;
    }
  }

  if (inputFlatNo) {
    inputFlatNo.addEventListener("input", checkFlatInputValidation);
    inputFlatNo.addEventListener("change", checkFlatInputValidation);
  }

  if (btnLockFromScreen2) {
    btnLockFromScreen2.addEventListener("click", () => {
      currentPin = "";
      updatePinBoxes();
      showScreen("s1");
    });
  }

  if (btnGoToDashboardFromScreen2) {
    btnGoToDashboardFromScreen2.addEventListener("click", () => {
      refreshDashboard();
      showScreen("s4");
    });
  }

  if (formProjectSetup) {
    formProjectSetup.addEventListener("submit", (e) => {
      e.preventDefault();

      const floorVal = inputFloor.value.trim();
      const flatVal = inputFlatNo.value.trim();

      if (!floorVal) {
        showToast("Please enter a Floor Number", false);
        inputFloor.focus();
        return;
      }

      const validation = validateFlatNo(floorVal, flatVal);
      if (!validation.valid) {
        inputFlatNo.classList.add("is-invalid");
        flatValidationFeedback.classList.remove("d-none");
        flatValidationMessage.textContent = validation.message;
        showToast(validation.message, false);
        inputFlatNo.focus();
        return;
      }

      // Format floor name cleanly
      const upper = floorVal.toUpperCase();
      const floorLabel =
        upper === "G" || upper.startsWith("GROUND")
          ? "Ground Floor"
          : upper.startsWith("B")
          ? `Basement ${floorVal}`
          : upper.startsWith("PH") || upper.startsWith("PENT")
          ? "Penthouse"
          : upper === "T" || upper.startsWith("TERRACE")
          ? "Terrace"
          : `Floor ${floorVal}`;

      // Clean flat string
      const flatLabel = /^(flat|unit)/i.test(flatVal) ? flatVal : `Flat ${flatVal}`;
      const compositeLocation = `${floorLabel} • ${flatLabel}`;

      currentContext.projectName = inputProjectName.value.trim();
      currentContext.tower = (inputTower && inputTower.value.trim()) || "";
      currentContext.floor = floorVal;
      currentContext.flatNo = flatVal;
      currentContext.floorFlat = compositeLocation;
      currentContext.date = inputDate.value;
      const primaryMason = (selectScreen2Mason && selectScreen2Mason.value) || (inputMasonName && inputMasonName.value.trim()) || "";
      currentContext.masonName = primaryMason;

      // Initialize Screen 3 assigned labours with this primary mason
      initScreen3Masons(primaryMason);
      populateMasonDatalistsAndPills(primaryMason);

      // Update Screen 3 pill context
      const screen3ContextText = document.getElementById("screen3ContextText");
      if (screen3ContextText) {
        const towerSuffix = currentContext.tower ? ` • ${currentContext.tower}` : "";
        screen3ContextText.textContent = `${currentContext.projectName}${towerSuffix} • ${currentContext.floorFlat}`;
      }

      showScreen("s3");
    });
  }

  // =========================================================
  // 3. SCREEN 3: CASCADING WORK ENTRY & SPECIFICATION
  // =========================================================
  const selectWorkCategory = document.getElementById("selectWorkCategory");
  const subTaskContainer = document.getElementById("subTaskContainer");
  const selectSubTask = document.getElementById("selectSubTask");
  // inputScreen3Mason is already defined in common form inputs above
  const notesContainer = document.getElementById("notesContainer");
  const textareaNotes = document.getElementById("textareaNotes");
  const notesRequiredIndicator = document.getElementById("notesRequiredIndicator");
  const btnToggleNotes = document.getElementById("btnToggleNotes");
  const formWorkDetails = document.getElementById("formWorkDetails");
  const btnBackToScreen2 = document.getElementById("btnBackToScreen2");
  const btnEditSetupContext = document.getElementById("btnEditSetupContext");

  let manualNotesOpen = false;

  // Populate Work Categories from WORK_LOGIC_MATRIX
  if (selectWorkCategory) {
    const categories = Object.keys(WORK_LOGIC_MATRIX);
    selectWorkCategory.innerHTML = `<option value="" selected disabled>Select Work Detail...</option>` +
      categories.map((cat) => `<option value="${cat}">${cat}</option>`).join("");
  }

  function handleCategoryOrSubTaskChange() {
    const selectedCategory = selectWorkCategory.value;
    const subTasks = WORK_LOGIC_MATRIX[selectedCategory] || [];

    if (!selectedCategory) {
      if (subTaskContainer) subTaskContainer.classList.add("d-none");
      if (selectSubTask) {
        selectSubTask.removeAttribute("required");
        selectSubTask.innerHTML = `<option value="" selected disabled>Select Specific Item...</option>`;
      }
      return;
    }

    if (subTasks.length > 0) {
      // Show child dropdown
      if (subTaskContainer) subTaskContainer.classList.remove("d-none");
      if (selectSubTask) {
        selectSubTask.setAttribute("required", "required");
        selectSubTask.innerHTML = `<option value="" selected disabled>Select Specific Item...</option>` +
          subTasks.map((item) => `<option value="${item}">${item}</option>`).join("");
      }
    } else {
      // Category has no children (e.g., "Other")
      if (subTaskContainer) subTaskContainer.classList.add("d-none");
      if (selectSubTask) {
        selectSubTask.removeAttribute("required");
        selectSubTask.innerHTML = "";
      }
    }

    checkNotesVisibility();
  }

  function checkNotesVisibility() {
    const selectedCategory = selectWorkCategory.value;
    const selectedSub = selectSubTask ? selectSubTask.value : "";
    const isOtherSelected = selectedCategory === "Other" || selectedSub === "Other";

    if (isOtherSelected) {
      // Auto-open and make mandatory
      if (notesContainer) notesContainer.classList.remove("d-none");
      if (notesRequiredIndicator) notesRequiredIndicator.classList.remove("d-none");
      if (textareaNotes) {
        textareaNotes.setAttribute("required", "required");
        textareaNotes.placeholder = "Specific details required for 'Other'...";
        if (!textareaNotes.value) textareaNotes.focus();
      }
    } else {
      if (!manualNotesOpen) {
        if (notesContainer) notesContainer.classList.add("d-none");
      }
      if (notesRequiredIndicator) notesRequiredIndicator.classList.add("d-none");
      if (textareaNotes) {
        textareaNotes.removeAttribute("required");
        textareaNotes.placeholder = "Enter remarks, specific location details, or custom notes...";
      }
    }
  }

  if (selectWorkCategory) {
    selectWorkCategory.addEventListener("change", () => {
      handleCategoryOrSubTaskChange();
    });
  }

  if (selectSubTask) {
    selectSubTask.addEventListener("change", () => {
      checkNotesVisibility();
    });
  }

  if (btnToggleNotes) {
    btnToggleNotes.addEventListener("click", () => {
      manualNotesOpen = !manualNotesOpen;
      if (notesContainer) {
        if (manualNotesOpen) {
          notesContainer.classList.remove("d-none");
          btnToggleNotes.innerHTML = `<i class="bi bi-x-circle me-1"></i>Close Notes`;
          if (textareaNotes) textareaNotes.focus();
        } else {
          checkNotesVisibility();
          if (notesContainer.classList.contains("d-none")) {
            btnToggleNotes.innerHTML = `<i class="bi bi-pencil-square me-1"></i>+ Add Notes`;
          }
        }
      }
    });
  }

  function goBackToScreen2() {
    showScreen("s2");
  }

  if (btnBackToScreen2) btnBackToScreen2.addEventListener("click", goBackToScreen2);
  if (btnEditSetupContext) btnEditSetupContext.addEventListener("click", goBackToScreen2);

  // Submit Work Entry Form
  if (formWorkDetails) {
    formWorkDetails.addEventListener("submit", async (e) => {
      e.preventDefault();

      const category = selectWorkCategory.value;
      const subTasks = WORK_LOGIC_MATRIX[category] || [];
      let subTaskVal = "";

      if (subTasks.length > 0) {
        subTaskVal = selectSubTask ? selectSubTask.value : "";
        if (!subTaskVal) {
          selectSubTask.focus();
          return;
        }
      } else {
        subTaskVal = "General / Other";
      }

      const notesVal = textareaNotes ? textareaNotes.value.trim() : "";
      if ((category === "Other" || subTaskVal === "Other") && !notesVal) {
        if (textareaNotes) {
          textareaNotes.focus();
          showToast("Remarks are required when selecting 'Other'", false);
        }
        return;
      }

      if (currentTaskAssignedMasons.length === 0) {
        const pendingMason = selectScreen3LabourDropdown ? selectScreen3LabourDropdown.value : "";
        if (pendingMason && pendingMason !== "__ADD_NEW__") {
          currentTaskAssignedMasons.push(pendingMason);
          renderScreen3AssignedMasons();
        } else if (inputScreen3Mason && inputScreen3Mason.value.trim()) {
          inputScreen3Mason.value.trim().split(",").forEach((m) => {
            if (m.trim()) currentTaskAssignedMasons.push(m.trim());
          });
          renderScreen3AssignedMasons();
        } else if (currentContext.masonName && currentContext.masonName !== "Unassigned") {
          currentTaskAssignedMasons.push(currentContext.masonName);
          renderScreen3AssignedMasons();
        } else {
          showToast("Please assign at least one mason/labour to this work entry", false);
          if (selectScreen3LabourDropdown) selectScreen3LabourDropdown.focus();
          return;
        }
      }

      const taskMason = currentTaskAssignedMasons.join(", ");
      currentContext.masonName = taskMason;

      const newLog = {
        id: "log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        projectName: currentContext.projectName,
        tower: currentContext.tower || "",
        floorFlat: currentContext.floorFlat,
        date: currentContext.date,
        masonName: taskMason,
        workCategory: category,
        subTask: subTaskVal,
        notes: notesVal,
        createdAt: new Date().toISOString()
      };

      // Save locally & sync to MongoDB Atlas
      await apiSaveLog(newLog);

      // Refresh dynamic mason and tower suggestions
      populateMasonDatalistsAndPills();
      populateTowerSuggestions();
      renderScreen3AssignedMasons();

      // Track latest logged entry for instant PDF/WhatsApp export
      latestLoggedEntry = newLog;

      // Show toast
      showToast("Work entry recorded successfully!", true);

      // Reset Step 2 fields (keeping Step 1 context and mason intact for quick batching)
      selectWorkCategory.value = "";
      if (subTaskContainer) subTaskContainer.classList.add("d-none");
      if (selectSubTask) {
        selectSubTask.innerHTML = `<option value="" selected disabled>Select Specific Item...</option>`;
        selectSubTask.removeAttribute("required");
      }
      if (textareaNotes) textareaNotes.value = "";
      manualNotesOpen = false;
      if (notesContainer) notesContainer.classList.add("d-none");
      if (notesRequiredIndicator) notesRequiredIndicator.classList.add("d-none");
      if (btnToggleNotes) {
        btnToggleNotes.innerHTML = `<i class="bi bi-pencil-square me-1"></i>+ Add Notes`;
      }
      if (inputScreen3Mason) {
        inputScreen3Mason.value = taskMason;
      }

      // Show modal prompt
      const successModalDesc = document.getElementById("successModalDesc");
      if (successModalDesc) {
        successModalDesc.innerHTML = `<strong>${category}</strong> (${subTaskVal}) for <strong>${currentContext.projectName} • ${currentContext.floorFlat}</strong> has been saved.`;
      }
      if (successPromptModal) {
        successPromptModal.show();
      }
    });
  }

  // Modal Actions (Screen 3 Success Prompt)
  const btnAddAnotherTask = document.getElementById("btnAddAnotherTask");
  const btnFinishGoToDashboard = document.getElementById("btnFinishGoToDashboard");
  const btnViewLatestPdf = document.getElementById("btnViewLatestPdf");
  const btnDownloadLatestPdf = document.getElementById("btnDownloadLatestPdf");
  const btnShareLatestWhatsapp = document.getElementById("btnShareLatestWhatsapp");

  if (btnViewLatestPdf) {
    btnViewLatestPdf.addEventListener("click", () => {
      if (latestLoggedEntry) {
        const locClean = (latestLoggedEntry.floorFlat || "Report").replace(/[^a-zA-Z0-9]/g, "_");
        const title = `MTS Decor Report - ${latestLoggedEntry.floorFlat || latestLoggedEntry.projectName}`;
        openPdfPreview([latestLoggedEntry], title, `MTS_Report_${locClean}.pdf`);
      }
    });
  }

  if (btnDownloadLatestPdf) {
    btnDownloadLatestPdf.addEventListener("click", () => {
      if (latestLoggedEntry) {
        const locClean = (latestLoggedEntry.floorFlat || "Report").replace(/[^a-zA-Z0-9]/g, "_");
        const title = `MTS Decor Report - ${latestLoggedEntry.floorFlat || latestLoggedEntry.projectName}`;
        downloadPdf([latestLoggedEntry], title, `MTS_Report_${locClean}.pdf`);
      }
    });
  }

  if (btnShareLatestWhatsapp) {
    btnShareLatestWhatsapp.addEventListener("click", () => {
      if (latestLoggedEntry) {
        const locClean = (latestLoggedEntry.floorFlat || "Report").replace(/[^a-zA-Z0-9]/g, "_");
        const title = `MTS Decor Report - ${latestLoggedEntry.floorFlat || latestLoggedEntry.projectName}`;
        sharePdfToWhatsapp([latestLoggedEntry], title, `MTS_Report_${locClean}.pdf`);
      }
    });
  }

  if (btnAddAnotherTask) {
    btnAddAnotherTask.addEventListener("click", () => {
      if (successPromptModal) successPromptModal.hide();
      if (selectWorkCategory) selectWorkCategory.focus();
    });
  }

  if (btnFinishGoToDashboard) {
    btnFinishGoToDashboard.addEventListener("click", () => {
      if (successPromptModal) successPromptModal.hide();
      refreshDashboard();
      showScreen("s4");
    });
  }

  // =========================================================
  // =========================================================
  // PDF GENERATION ON OFFICIAL MTS DECOR LETTERHEAD
  // =========================================================
  let lastBlobUrl = null;
  let currentFilteredLogs = [];

  // Draw the complete MTS Decor printed letterhead frame
  function drawMtsLetterheadFrame(doc) {
    const brandTeal = [27, 163, 171]; // #1ba3ab matching official printed stationery
    const brandDark = [26, 77, 86];   // #1a4d56
    const textMuted = [85, 105, 115];

    const logoDataUrl = (typeof MTS_LOGO_DATA_URL !== "undefined")
      ? MTS_LOGO_DATA_URL
      : (window.MTS_LOGO_DATA_URL || null);

    // 1. Center Watermark
    if (logoDataUrl && doc.GState) {
      try {
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.07 }));
        // Centered logo watermark: w=75mm, h=109mm (aspect ratio 0.688)
        doc.addImage(logoDataUrl, "PNG", 67.5, 95, 75, 109);
        doc.restoreGraphicsState();
      } catch (e) {
        console.warn("Watermark error:", e);
      }
    }

    // 2. Header Left: MTS DECOR Title & Subtitle
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
    doc.text("MTS DECOR", 10, 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text("Civil & Furniture Contractor", 10, 19);

    // 3. Header Center: Official Logo
    if (logoDataUrl) {
      try {
        // Natural ratio 0.688: w=12.5mm, h=18.1mm
        doc.addImage(logoDataUrl, "PNG", 98.75, 5.5, 12.5, 18.1);
      } catch (e) {
        console.warn("Header logo error:", e);
      }
    }

    // 4. Header Right: Mobile Numbers
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.8);
    doc.setTextColor(50, 70, 80);
    doc.text("Mob. No. +91 98677 28154", 200, 14, { align: "right" });
    doc.text("+91 97684 40000", 200, 18.5, { align: "right" });

    // 5. Horizontal Teal Line with Email Cutout
    doc.setDrawColor(brandTeal[0], brandTeal[1], brandTeal[2]);
    doc.setLineWidth(0.65);

    // 5. Horizontal Teal Line with Email Cutout (aligned under contact block)
    doc.setDrawColor(brandTeal[0], brandTeal[1], brandTeal[2]);
    doc.setLineWidth(0.65);

    const emailStr = "Email : jagdish@mtsdecor.com";
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.6);
    doc.setTextColor(40, 60, 70);

    const emailStartX = 151;
    const emailEndX = 191;

    // Left line segment across page
    doc.line(8, 25.5, emailStartX - 1.5, 25.5);

    // Email text seamlessly in cutout
    doc.text(emailStr, emailStartX, 26.5);

    // Right line segment
    doc.line(emailEndX + 1.5, 25.5, 202, 25.5);

    // 6. Right Margin Vertical Line
    doc.line(202, 25.5, 202, 280);

    // 7. Bottom Footer Banner
    doc.setFillColor(brandTeal[0], brandTeal[1], brandTeal[2]);
    doc.rect(8, 280, 194, 11, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.6);
    doc.setTextColor(255, 255, 255);
    doc.text(
      "B-602, Shanti Apartment, Opp. Shakti Nagar, Anand Nagar, Shivaji Road No. 3, Dahisar (East), Mumbai - 400 068.",
      105,
      284.2,
      { align: "center" }
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.text("Website : www.mtsdecor.com", 105, 288.2, { align: "center" });
  }

  function generatePdf(logs, reportTitle = "Daily Work Progress Report") {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert("PDF engine is initializing. Please wait a moment and try again.");
      return null;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Group logs by Project & Tower so each Tower / Project is neatly separated by page
    const groupedLogs = {};
    logs.forEach((log) => {
      let groupKey = "";
      if (log.tower && log.tower.trim()) {
        const t = log.tower.trim();
        const p = (log.projectName || "").trim();
        if (p && !p.toLowerCase().includes(t.toLowerCase())) {
          groupKey = `${p} • ${t}`;
        } else {
          groupKey = p || t;
        }
      } else if (log.projectName && log.projectName.trim()) {
        groupKey = log.projectName.trim();
      } else {
        groupKey = "General Site Work";
      }

      if (!groupedLogs[groupKey]) {
        groupedLogs[groupKey] = [];
      }
      groupedLogs[groupKey].push(log);
    });

    const groupKeys = Object.keys(groupedLogs);
    const now = new Date();
    const dateFormatted = now.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    const timeFormatted = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

    groupKeys.forEach((groupKey, groupIdx) => {
      const groupLogs = groupedLogs[groupKey];

      // Each Tower / Project starts on its own dedicated page!
      if (groupIdx > 0) {
        doc.addPage();
      }

      // Draw the official MTS Decor letterhead frame
      drawMtsLetterheadFrame(doc);

      // Metadata Info Card specifically for this Tower / Project
      let metaBody = [];
      if (groupLogs.length === 1 && logs.length === 1) {
        const log = groupLogs[0];
        metaBody = [
          [
            { content: "Project / Tower :", styles: { fontStyle: "bold", textColor: [27, 163, 171], cellWidth: 28 } },
            { content: String(groupKey), styles: { fontStyle: "bold", textColor: [20, 35, 45], cellWidth: 65 } },
            { content: "Date :", styles: { fontStyle: "bold", textColor: [27, 163, 171], cellWidth: 20 } },
            { content: String(log.date || "-"), styles: { fontStyle: "normal", textColor: [20, 35, 45], cellWidth: 73 } }
          ],
          [
            { content: "Location :", styles: { fontStyle: "bold", textColor: [27, 163, 171], cellWidth: 28 } },
            { content: String(log.floorFlat || "-"), styles: { fontStyle: "bold", textColor: [20, 35, 45], cellWidth: 65 } },
            { content: "Mason :", styles: { fontStyle: "bold", textColor: [27, 163, 171], cellWidth: 20 } },
            { content: String(log.masonName || "-"), styles: { fontStyle: "normal", textColor: [20, 35, 45], cellWidth: 73 } }
          ]
        ];
      } else {
        const dateFilterVal = (filterDate && filterDate.value) ? filterDate.value : "All Dates";
        metaBody = [
          [
            { content: "Project / Tower :", styles: { fontStyle: "bold", textColor: [27, 163, 171], cellWidth: 28 } },
            { content: String(groupKey), styles: { fontStyle: "bold", textColor: [20, 35, 45], cellWidth: 65 } },
            { content: "Date :", styles: { fontStyle: "bold", textColor: [27, 163, 171], cellWidth: 20 } },
            { content: String(dateFilterVal), styles: { fontStyle: "normal", textColor: [20, 35, 45], cellWidth: 73 } }
          ],
          [
            { content: "Tower Summary :", styles: { fontStyle: "bold", textColor: [27, 163, 171], cellWidth: 28 } },
            { content: `${groupLogs.length} Completed Task${groupLogs.length > 1 ? "s" : ""}`, styles: { fontStyle: "bold", textColor: [20, 35, 45], cellWidth: 65 } },
            { content: "Generated :", styles: { fontStyle: "bold", textColor: [27, 163, 171], cellWidth: 20 } },
            { content: `${dateFormatted} ${timeFormatted}`, styles: { fontStyle: "normal", textColor: [20, 35, 45], cellWidth: 73 } }
          ]
        ];
      }

      doc.autoTable({
        body: metaBody,
        startY: 33,
        margin: { left: 10, right: 14 },
        theme: "plain",
        styles: {
          fontSize: 8.5,
          cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
          overflow: "linebreak",
          lineColor: [210, 230, 232],
          lineWidth: 0.25
        },
        tableLineColor: [200, 225, 228],
        tableLineWidth: 0.35,
        alternateRowStyles: {
          fillColor: [252, 254, 254]
        },
        bodyStyles: {
          fillColor: [248, 251, 251]
        }
      });

      // Work Details Table for this Tower
      const tableHeaders = [["#", "Location / Flat", "Mason", "Work Category", "Specification", "Remarks / Notes"]];
      const tableData = groupLogs.map((log, index) => [
        index + 1,
        log.floorFlat || log.projectName || "-",
        log.masonName || "-",
        log.workCategory || "-",
        log.subTask || "-",
        log.notes || "-"
      ]);

      const tableStartY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 4 : 52;

      doc.autoTable({
        head: tableHeaders,
        body: tableData,
        startY: tableStartY,
        margin: { left: 10, right: 14 },
        theme: "grid",
        headStyles: {
          fillColor: [27, 163, 171], // Official MTS Decor letterhead teal
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8.5
        },
        styles: {
          fontSize: 8,
          cellPadding: 2.8,
          textColor: [20, 35, 45],
          lineColor: [220, 235, 237],
          lineWidth: 0.2,
          overflow: "linebreak"
        },
        columnStyles: {
          0: { cellWidth: 8, halign: "center" },
          1: { cellWidth: 36 },
          2: { cellWidth: 28 },
          3: { cellWidth: 32 },
          4: { cellWidth: 36 },
          5: { cellWidth: 48 }
        },
        alternateRowStyles: {
          fillColor: [248, 252, 252]
        },
        didDrawPage: function() {
          // Draw letterhead on any new page auto-created by AutoTable
          drawMtsLetterheadFrame(doc);
        }
      });

      // Signatures block for this Tower / Project
      let finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 16 : 180;
      if (finalY > 255) {
        doc.addPage();
        drawMtsLetterheadFrame(doc);
        finalY = 45;
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(85, 105, 115);

      doc.setDrawColor(180, 205, 210);
      doc.setLineWidth(0.4);

      doc.line(18, finalY, 75, finalY);
      doc.text("Site Supervisor Signature", 18, finalY + 4.5);

      doc.line(135, finalY, 192, finalY);
      doc.text("Contractor / Client Signature", 135, finalY + 4.5);
    });

    // Page Numbering Footer across the entire document
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(130, 150, 160);
      doc.text(
        `Page ${i} of ${pageCount}`,
        10,
        277
      );
    }

    return doc;
  }

  async function renderPdfPagesFromParsed() {
    if (!currentPdfDocParsed) return;
    const container = document.getElementById("pdfCanvasContainer");
    const spinner = document.getElementById("pdfLoadingSpinner");
    const iframe = document.getElementById("pdfPreviewIframe");
    const modalBody = document.getElementById("pdfModalBody");

    if (!container) return;
    container.innerHTML = "";
    if (spinner) spinner.classList.remove("d-none");
    if (iframe) iframe.classList.add("d-none");

    const pdf = currentPdfDocParsed;

    try {
      // Container dimensions
      const bodyWidth = (modalBody && modalBody.clientWidth > 0) ? modalBody.clientWidth : (window.innerWidth < 768 ? window.innerWidth - 24 : 850);
      const bodyHeight = (modalBody && modalBody.clientHeight > 0) ? modalBody.clientHeight : (window.innerHeight * 0.7);

      const page1 = await pdf.getPage(1);
      const unscaledVp = page1.getViewport({ scale: 1.0 });

      let targetWidth;
      if (pdfFitMode === "width") {
        // Fit container width comfortably
        const padding = window.innerWidth < 768 ? 16 : 40;
        targetWidth = Math.max(280, bodyWidth - padding);
        pdfZoomLevelPct = Math.round((targetWidth / unscaledVp.width) * 100);
      } else if (pdfFitMode === "page") {
        // Fit entire page vertically in the modal viewport
        const availHeight = Math.max(300, bodyHeight - 40);
        targetWidth = Math.floor(availHeight * (unscaledVp.width / unscaledVp.height));
        pdfZoomLevelPct = Math.round((targetWidth / unscaledVp.width) * 100);
      } else {
        // Custom zoom level
        targetWidth = Math.floor(unscaledVp.width * (pdfZoomLevelPct / 100));
      }

      // Update zoom percentage badge
      const zoomLevelEl = document.getElementById("pdfZoomLevel");
      if (zoomLevelEl) {
        zoomLevelEl.textContent = `${pdfZoomLevelPct}%`;
      }

      if (spinner) spinner.classList.add("d-none");

      // Render each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = (pageNum === 1) ? page1 : await pdf.getPage(pageNum);
        const pageVp = page.getViewport({ scale: 1.0 });

        const cssWidth = Math.floor(targetWidth);
        const cssHeight = Math.floor(targetWidth * (pageVp.height / pageVp.width));

        // Crisp Retina Rendering
        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
        const renderScale = (targetWidth / pageVp.width) * dpr;
        const renderViewport = page.getViewport({ scale: renderScale });

        const canvas = document.createElement("canvas");
        canvas.className = "shadow-lg rounded bg-white my-2";
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;
        canvas.style.maxWidth = "none";
        canvas.style.display = "block";
        canvas.style.margin = "0 auto";
        canvas.width = Math.floor(renderViewport.width);
        canvas.height = Math.floor(renderViewport.height);

        const ctx = canvas.getContext("2d");
        await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;

        if (pdf.numPages > 1) {
          const wrap = document.createElement("div");
          wrap.className = "d-flex flex-column align-items-center mb-3 w-100";
          wrap.appendChild(canvas);
          const badge = document.createElement("span");
          badge.className = "badge bg-dark bg-opacity-75 text-white small mt-1";
          badge.textContent = `Page ${pageNum} of ${pdf.numPages}`;
          wrap.appendChild(badge);
          container.appendChild(wrap);
        } else {
          container.appendChild(canvas);
        }
      }
    } catch (err) {
      console.error("PDF render error:", err);
      if (spinner) spinner.classList.add("d-none");
    }
  }

  async function renderPdfPagesToCanvas(pdfDoc) {
    const container = document.getElementById("pdfCanvasContainer");
    const spinner = document.getElementById("pdfLoadingSpinner");
    const iframe = document.getElementById("pdfPreviewIframe");

    if (!container) return;
    container.innerHTML = "";
    if (spinner) spinner.classList.remove("d-none");
    if (iframe) iframe.classList.add("d-none");

    if (!window.pdfjsLib) {
      if (spinner) spinner.classList.add("d-none");
      if (iframe && lastBlobUrl) {
        iframe.classList.remove("d-none");
        iframe.src = lastBlobUrl;
      }
      return;
    }

    try {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      const pdfArrayBuffer = pdfDoc.output("arraybuffer");
      const loadingTask = window.pdfjsLib.getDocument({ data: pdfArrayBuffer });
      currentPdfDocParsed = await loadingTask.promise;
      await renderPdfPagesFromParsed();
    } catch (err) {
      console.error("PDF.js render error:", err);
      if (spinner) spinner.classList.add("d-none");
      if (iframe && lastBlobUrl) {
        iframe.classList.remove("d-none");
        iframe.src = lastBlobUrl;
      }
    }
  }

  function openPdfPreview(logs, title, filename) {
    if (!logs || logs.length === 0) {
      showToast("No work entries to view", false);
      return;
    }
    currentPdfLogs = logs;
    currentPdfFilename = filename || "MTS_Decor_Report.pdf";
    currentPdfDoc = generatePdf(logs, title);
    if (!currentPdfDoc) return;

    pdfFitMode = "width"; // Default to fit width for optimal readability

    if (lastBlobUrl) {
      URL.revokeObjectURL(lastBlobUrl);
    }
    const pdfBlob = currentPdfDoc.output("blob");
    lastBlobUrl = URL.createObjectURL(pdfBlob);

    const titleEl = document.getElementById("pdfModalLabel");
    if (titleEl) titleEl.textContent = title;

    if (pdfPreviewModal) pdfPreviewModal.show();

    // Render directly to HTML5 canvas so mobile & desktop display the document cleanly
    renderPdfPagesToCanvas(currentPdfDoc);
  }

  function downloadPdf(logs, title, filename) {
    if (!logs || logs.length === 0) {
      showToast("No work entries to download", false);
      return;
    }
    const doc = generatePdf(logs, title);
    if (!doc) return;
    doc.save(filename || "MTS_Decor_Report.pdf");
    showToast("PDF downloaded successfully!", true);
  }

  async function sharePdfToWhatsapp(logs, customTitle, customFilename) {
    if (!logs || logs.length === 0) {
      showToast("No work entries to share", false);
      return;
    }

    const title = customTitle || "MTS Decor Work Progress Report";
    const doc = generatePdf(logs, title);
    if (!doc) return;

    let filename = customFilename;
    if (!filename) {
      if (logs.length === 1) {
        const locClean = (logs[0].floorFlat || "Report").replace(/[^a-zA-Z0-9]/g, "_");
        filename = `MTS_Report_${locClean}.pdf`;
      } else {
        filename = `MTS_Daily_Report_${todayIso}.pdf`;
      }
    }

    const pdfBlob = doc.output("blob");
    const pdfFile = new File([pdfBlob], filename, { type: "application/pdf" });

    // Method 1: Modern Web Share API (Passes the actual PDF file directly to WhatsApp on mobile/Mac)
    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({
          files: [pdfFile],
          title: filename
        });
        showToast("PDF document shared successfully!", true);
        return;
      } catch (err) {
        if (err.name === "AbortError") {
          return; // User dismissed native share sheet
        }
        console.warn("Web Share API failed, using desktop download + WhatsApp launch:", err);
      }
    }

    // Method 2: Desktop Browser Implementation
    // Automatically download the real PDF document
    doc.save(filename);

    // Open WhatsApp directly without any plain text message
    window.open("https://web.whatsapp.com", "_blank");

    // Display the WhatsApp PDF guidance modal
    if (whatsappPdfFilenameEl) {
      whatsappPdfFilenameEl.textContent = filename;
    }
    if (whatsappPdfModal) {
      whatsappPdfModal.show();
    } else {
      showToast(`PDF saved to Downloads (${filename})! Attach it in WhatsApp.`, true);
    }
  }

  // =========================================================
  // 4. SCREEN 4: SUPERVISOR DASHBOARD & FILTERING
  // =========================================================
  const btnLogNewEntryFromDashboard = document.getElementById("btnLogNewEntryFromDashboard");
  const filterProject = document.getElementById("filterProject");
  const filterDate = document.getElementById("filterDate");
  const badgeTotalTasks = document.getElementById("badgeTotalTasks");
  const btnResetFilters = document.getElementById("btnResetFilters");
  const workLogsFeed = document.getElementById("workLogsFeed");
  const btnExportCsv = document.getElementById("btnExportCsv");
  const btnClearAllData = document.getElementById("btnClearAllData");
  const btnLockApp = document.getElementById("btnLockApp");
  const btnConfirmDeleteEntry = document.getElementById("btnConfirmDeleteEntry");
  const btnDownloadDailyPdf = document.getElementById("btnDownloadDailyPdf");
  const btnViewDailyPdf = document.getElementById("btnViewDailyPdf");
  const btnShareDailyWhatsapp = document.getElementById("btnShareDailyWhatsapp");
  const btnModalDownloadPdf = document.getElementById("btnModalDownloadPdf");
  const btnModalShareWhatsapp = document.getElementById("btnModalShareWhatsapp");

  if (btnReopenWhatsapp) {
    btnReopenWhatsapp.addEventListener("click", () => {
      window.open("https://web.whatsapp.com", "_blank");
    });
  }

  if (btnModalDownloadPdf) {
    btnModalDownloadPdf.addEventListener("click", () => {
      if (currentPdfDoc) {
        currentPdfDoc.save(currentPdfFilename);
        showToast("PDF downloaded successfully!");
      }
    });
  }

  if (btnModalShareWhatsapp) {
    btnModalShareWhatsapp.addEventListener("click", () => {
      if (currentPdfLogs && currentPdfLogs.length > 0) {
        sharePdfToWhatsapp(currentPdfLogs, "Work Progress Report", currentPdfFilename);
      }
    });
  }

  // --- PDF Viewer Interactive Zoom & Fit Controls ---
  const btnPdfZoomIn = document.getElementById("btnPdfZoomIn");
  const btnPdfZoomOut = document.getElementById("btnPdfZoomOut");
  const btnPdfZoomReset = document.getElementById("btnPdfZoomReset");
  const btnPdfFitWidth = document.getElementById("btnPdfFitWidth");
  const btnPdfFitPage = document.getElementById("btnPdfFitPage");

  if (btnPdfZoomIn) {
    btnPdfZoomIn.addEventListener("click", () => {
      pdfFitMode = "custom";
      pdfZoomLevelPct = Math.min(pdfZoomLevelPct + 20, 260);
      renderPdfPagesFromParsed();
    });
  }

  if (btnPdfZoomOut) {
    btnPdfZoomOut.addEventListener("click", () => {
      pdfFitMode = "custom";
      pdfZoomLevelPct = Math.max(pdfZoomLevelPct - 20, 40);
      renderPdfPagesFromParsed();
    });
  }

  if (btnPdfZoomReset) {
    btnPdfZoomReset.addEventListener("click", () => {
      pdfFitMode = "custom";
      pdfZoomLevelPct = 100;
      renderPdfPagesFromParsed();
    });
  }

  if (btnPdfFitWidth) {
    btnPdfFitWidth.addEventListener("click", () => {
      pdfFitMode = "width";
      renderPdfPagesFromParsed();
    });
  }

  if (btnPdfFitPage) {
    btnPdfFitPage.addEventListener("click", () => {
      pdfFitMode = "page";
      renderPdfPagesFromParsed();
    });
  }

  if (pdfPreviewModalEl) {
    pdfPreviewModalEl.addEventListener("shown.bs.modal", () => {
      // Re-calculate with exact finished modal width
      if (currentPdfDocParsed && pdfFitMode === "width") {
        renderPdfPagesFromParsed();
      }
    });
  }

  window.addEventListener("resize", () => {
    if (pdfPreviewModalEl && pdfPreviewModalEl.classList.contains("show") && currentPdfDocParsed) {
      if (pdfFitMode === "width" || pdfFitMode === "page") {
        renderPdfPagesFromParsed();
      }
    }
  });

  if (btnDownloadDailyPdf) {
    btnDownloadDailyPdf.addEventListener("click", () => {
      const logsToUse = (currentFilteredLogs && currentFilteredLogs.length > 0) ? currentFilteredLogs : getStoredLogs();
      if (!logsToUse || logsToUse.length === 0) {
        showToast("No work entries to export", false);
        return;
      }
      downloadPdf(logsToUse, "Daily Work Progress Report", `MTS_Daily_Report_${todayIso}.pdf`);
    });
  }

  if (btnViewDailyPdf) {
    btnViewDailyPdf.addEventListener("click", () => {
      const logsToUse = (currentFilteredLogs && currentFilteredLogs.length > 0) ? currentFilteredLogs : getStoredLogs();
      if (!logsToUse || logsToUse.length === 0) {
        showToast("No work entries to view", false);
        return;
      }
      openPdfPreview(logsToUse, "Daily Work Progress Report", `MTS_Daily_Report_${todayIso}.pdf`);
    });
  }

  if (btnShareDailyWhatsapp) {
    btnShareDailyWhatsapp.addEventListener("click", () => {
      const logsToUse = (currentFilteredLogs && currentFilteredLogs.length > 0) ? currentFilteredLogs : getStoredLogs();
      if (!logsToUse || logsToUse.length === 0) {
        showToast("No work entries to share", false);
        return;
      }
      sharePdfToWhatsapp(logsToUse, "Daily Work Progress Report", `MTS_Daily_Report_${todayIso}.pdf`);
    });
  }

  if (btnLogNewEntryFromDashboard) {
    btnLogNewEntryFromDashboard.addEventListener("click", () => {
      showScreen("s2");
    });
  }

  if (btnLockApp) {
    btnLockApp.addEventListener("click", () => {
      currentPin = "";
      updatePinBoxes();
      showScreen("s1");
    });
  }

  if (btnResetFilters) {
    btnResetFilters.addEventListener("click", () => {
      if (filterProject) filterProject.value = "ALL";
      if (filterDate) filterDate.value = "";
      renderFeed();
    });
  }

  if (filterProject) filterProject.addEventListener("change", renderFeed);
  if (filterDate) filterDate.addEventListener("change", renderFeed);

  function refreshDashboard() {
    populateProjectFilter();
    renderFeed();
  }

  function populateProjectFilter() {
    if (!filterProject) return;
    const logs = getStoredLogs();
    const uniqueProjects = Array.from(new Set(logs.map((l) => l.projectName).filter(Boolean)));

    const currentSelected = filterProject.value;
    filterProject.innerHTML = `<option value="ALL">All Projects</option>` +
      uniqueProjects.map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("");

    if (uniqueProjects.includes(currentSelected)) {
      filterProject.value = currentSelected;
    }
  }

  function renderFeed() {
    if (!workLogsFeed) return;
    const logs = getStoredLogs();

    const projFilter = filterProject ? filterProject.value : "ALL";
    const dateFilter = filterDate ? filterDate.value : "";

    const filtered = logs.filter((log) => {
      if (projFilter !== "ALL" && log.projectName !== projFilter) return false;
      if (dateFilter && log.date !== dateFilter) return false;
      return true;
    });

    currentFilteredLogs = filtered;

    if (badgeTotalTasks) {
      badgeTotalTasks.textContent = `Total Tasks Completed: ${filtered.length}`;
    }

    if (filtered.length === 0) {
      workLogsFeed.innerHTML = `
        <div class="text-center py-5">
          <div class="text-muted mb-2"><i class="bi bi-inbox fs-1"></i></div>
          <h6 class="text-secondary fw-semibold">No work entries found</h6>
          <p class="text-muted small">No logs match the selected filter criteria, or no tasks have been recorded yet.</p>
          <button type="button" class="btn btn-outline-primary btn-sm mt-2" id="btnEmptyStateLog">
            <i class="bi bi-plus-lg me-1"></i> Log First Entry
          </button>
        </div>
      `;
      const btnEmptyStateLog = document.getElementById("btnEmptyStateLog");
      if (btnEmptyStateLog) {
        btnEmptyStateLog.addEventListener("click", () => showScreen("s2"));
      }
      return;
    }

    workLogsFeed.innerHTML = filtered.map((log) => {
      const formattedDate = formatDateDisplay(log.date);
      return `
        <div class="task-card mb-3 shadow-sm" data-id="${log.id}">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <span class="badge bg-light text-dark border me-1"><i class="bi bi-calendar-event me-1"></i>${formattedDate}</span>
              ${(log.masonName || "Unassigned").split(",").map((m) => `<span class="badge bg-secondary-subtle text-secondary me-1"><i class="bi bi-person me-1"></i>${escapeHtml(m.trim())}</span>`).join("")}
            </div>
            <div class="d-flex align-items-center gap-1">
              <button type="button" class="btn btn-outline-success btn-sm rounded-circle p-0 d-flex align-items-center justify-content-center" data-wa-id="${log.id}" title="Share on WhatsApp" style="width: 32px; height: 32px; min-height: 32px;">
                <i class="bi bi-whatsapp"></i>
              </button>
              <button type="button" class="btn btn-outline-danger btn-sm rounded-circle p-0 d-flex align-items-center justify-content-center" data-pdf-id="${log.id}" title="View & Download PDF" style="width: 32px; height: 32px; min-height: 32px;">
                <i class="bi bi-file-earmark-pdf"></i>
              </button>
              <button type="button" class="task-delete-btn" data-delete-id="${log.id}" title="Delete Entry">
                <i class="bi bi-trash3"></i>
              </button>
            </div>
          </div>

          <div class="mb-2">
            <h6 class="fw-bold mb-1 text-dark">${escapeHtml(log.projectName)}${log.tower ? ` &bull; <span class="badge bg-primary-subtle text-primary border">${escapeHtml(log.tower)}</span>` : ""} &bull; <span class="text-primary">${escapeHtml(log.floorFlat)}</span></h6>
          </div>

          <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
            <span class="task-category-pill">
              <i class="bi bi-tag-fill me-1"></i>${escapeHtml(log.workCategory)}
            </span>
            <span class="badge bg-white border text-secondary fw-medium">
              ${escapeHtml(log.subTask)}
            </span>
            ${log.quantity ? `
              <span class="task-badge-qty ms-auto">
                ${log.quantity} ${escapeHtml(log.unit || "")}
              </span>
            ` : ""}
          </div>

          ${log.notes ? `
            <div class="mt-2 pt-2 border-top small text-secondary bg-light-subtle p-2 rounded">
              <i class="bi bi-chat-left-text me-1 text-primary"></i>${escapeHtml(log.notes)}
            </div>
          ` : ""}
        </div>
      `;
    }).join("");

    // Attach listeners to card buttons
    workLogsFeed.querySelectorAll("[data-delete-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        pendingDeleteId = btn.getAttribute("data-delete-id");
        if (deleteConfirmModal) deleteConfirmModal.show();
      });
    });

    workLogsFeed.querySelectorAll("[data-wa-id]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-wa-id");
        const log = logs.find((l) => l.id === id);
        if (log) {
          const locClean = (log.floorFlat || "Report").replace(/[^a-zA-Z0-9]/g, "_");
          const title = `MTS Decor Report - ${log.floorFlat || log.projectName}`;
          sharePdfToWhatsapp([log], title, `MTS_Report_${locClean}.pdf`);
        }
      });
    });

    workLogsFeed.querySelectorAll("[data-pdf-id]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-pdf-id");
        const log = logs.find((l) => l.id === id);
        if (log) {
          const locClean = (log.floorFlat || "Report").replace(/[^a-zA-Z0-9]/g, "_");
          const title = `MTS Decor Report - ${log.floorFlat || log.projectName}`;
          openPdfPreview([log], title, `MTS_Report_${locClean}.pdf`);
        }
      });
    });
  }

  // Confirm delete handler
  if (btnConfirmDeleteEntry) {
    btnConfirmDeleteEntry.addEventListener("click", async () => {
      if (!pendingDeleteId) return;
      const idToDelete = pendingDeleteId;
      pendingDeleteId = null;
      if (deleteConfirmModal) deleteConfirmModal.hide();
      await apiDeleteLog(idToDelete);
      showToast("Entry deleted", false);
      refreshDashboard();
    });
  }

  // Clear all data
  if (btnClearAllData) {
    btnClearAllData.addEventListener("click", async () => {
      if (confirm("Are you sure you want to clear ALL saved work logs? This action cannot be undone.")) {
        await apiClearAllLogs();
        showToast("All data cleared successfully", false);
        refreshDashboard();
      }
    });
  }

  // Export to CSV
  if (btnExportCsv) {
    btnExportCsv.addEventListener("click", () => {
      const logs = getStoredLogs();
      if (!logs || logs.length === 0) {
        showToast("No work entries to export", false);
        return;
      }

      const headers = [
        "Entry ID",
        "Date",
        "Project Name",
        "Tower / Wing",
        "Floor / Flat",
        "Mason Name",
        "Work Category",
        "Sub Task Specification",
        "Remarks / Notes",
        "Timestamp"
      ];

      const csvRows = [headers.join(",")];

      logs.forEach((item) => {
        const row = [
          csvEscape(item.id),
          csvEscape(item.date),
          csvEscape(item.projectName),
          csvEscape(item.tower || ""),
          csvEscape(item.floorFlat),
          csvEscape(item.masonName),
          csvEscape(item.workCategory),
          csvEscape(item.subTask),
          csvEscape(item.notes || ""),
          csvEscape(item.createdAt)
        ];
        csvRows.push(row.join(","));
      });

      const csvString = csvRows.join("\r\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const filename = `MTS_Decor_Logs_${todayIso}.csv`;

      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`Exported ${logs.length} entries to CSV!`, true);
    });
  }

  // --- UTILITIES ---
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function csvEscape(value) {
    if (value === null || value === undefined) return '""';
    const stringValue = String(value).replace(/"/g, '""');
    return `"${stringValue}"`;
  }

  function formatDateDisplay(dateStr) {
    if (!dateStr) return "";
    try {
      const [y, m, d] = dateStr.split("-");
      if (y && m && d) {
        return `${d}/${m}/${y}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  }

  // --- MONGODB ATLAS EVENT LISTENERS & INITIALIZATION ---
  const btnDbStatus = document.getElementById("btnDbStatus");
  const mongoInfoModalEl = document.getElementById("mongoInfoModal");
  const mongoInfoModal = mongoInfoModalEl ? new bootstrap.Modal(mongoInfoModalEl) : null;
  const btnSyncLocalToAtlas = document.getElementById("btnSyncLocalToAtlas");

  if (btnDbStatus && mongoInfoModal) {
    btnDbStatus.addEventListener("click", () => {
      checkAtlasConnection();
      mongoInfoModal.show();
    });
  }

  if (btnSyncLocalToAtlas) {
    btnSyncLocalToAtlas.addEventListener("click", syncLocalLogsToAtlas);
  }

  // Initialize
  showScreen("s1");
  populateTowerSuggestions();
  populateMasonDatalistsAndPills();
  checkAtlasConnection().then(() => {
    fetchCloudLogs();
  });

  // Background health poll every 15 seconds
  setInterval(checkAtlasConnection, 15000);
});
