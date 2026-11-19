/**
 * SW-4 | Space Habitat Layout Creator - Main Application Controller
 */

const state = {
  crewSize: 6,
  missionDays: 180,
  habitatShape: 'cylinder', // cylinder, dome, torus, modular
  selectedTool: 'sleep',
  viewMode: '2d', // '2d', '3d', 'split'
  showAcoustic: false,
  showEgress: true,
  zones: [], // array of { x, y, type }
  savedLayouts: [],
  currentValidation: null
};

const ZONES_CONFIG = {
  sleep: { name: 'Sleep Quarters', color: '#3b82f6', icon: '🛏️', desc: 'Private crew sleeping berths' },
  exercise: { name: 'Zero-G Gym', color: '#f97316', icon: '🏋️', desc: 'High vibration treadmill & resistance' },
  hygiene: { name: 'Hygiene & WHC', color: '#06b6d4', icon: '🚿', desc: 'Waste management and shower' },
  food: { name: 'Galley & Dining', color: '#10b981', icon: '🥗', desc: 'Food prep, hydrator, and mess table' },
  work: { name: 'Command & Lab', color: '#8b5cf6', icon: '🔬', desc: 'Flight ops and science research consoles' },
  medical: { name: 'Medical Infirmary', color: '#ef4444', icon: '🩺', desc: 'Diagnostic pod and emergency care' },
  storage: { name: 'Cargo & Consumables', color: '#f59e0b', icon: '📦', desc: 'Life support tanks, food packs, spares' }
};

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', async () => {
  buildPaletteUI();
  
  // Initialize 2D Canvas with painting callback
  initBlueprintCanvas((x, y) => {
    state.zones = state.zones.filter(z => !(z.x === x && z.y === y));
    if (state.selectedTool !== 'eraser') {
      state.zones.push({ x, y, type: state.selectedTool });
    }
    validateAndRender();
  });

  // Initialize 3D Scenes
  initHero3DScene();
  initWalkthrough3DScene();
  rebuild3DHull(state.habitatShape);

  // Fetch initial layouts from database
  await fetchSavedLayouts();

  // Load default certified preset
  await loadSeedPreset('seed-mars-transit');
});

// --- PALETTE UI ---
function buildPaletteUI() {
  const container = document.getElementById('zone-palette-list');
  if (!container) return;
  container.innerHTML = '';

  Object.keys(ZONES_CONFIG).forEach(key => {
    const item = ZONES_CONFIG[key];
    const btn = document.createElement('button');
    btn.id = 'palette-btn-' + key;
    btn.className = `w-full p-2 rounded-lg border text-left transition flex items-center justify-between text-xs font-mono ${
      state.selectedTool === key 
        ? 'bg-cyan-950 border-cyan-400 text-white shadow-md' 
        : 'bg-surface hover:bg-slate-800 border-slate-800 text-slate-300'
    }`;
    btn.onclick = () => selectZone(key);
    btn.innerHTML = `
      <div class="flex items-center space-x-2">
        <span class="w-3 h-3 rounded-full inline-block" style="background-color: ${item.color}"></span>
        <span class="font-medium">${item.icon} ${item.name}</span>
      </div>
      <span class="text-[10px] text-slate-500">${key.toUpperCase()}</span>
    `;
    container.appendChild(btn);
  });
}

function selectZone(type) {
  state.selectedTool = type;
  document.querySelectorAll('#zone-palette-list button, #zone-airlock, #zone-corridor, #zone-eraser').forEach(el => {
    el.classList.remove('border-cyan-400', 'bg-cyan-950', 'text-white');
  });
  const activeEl = document.getElementById('palette-btn-' + type) || document.getElementById('zone-' + type);
  if (activeEl) {
    activeEl.classList.add('border-cyan-400', 'bg-cyan-950', 'text-white');
  }
}

// --- MISSION CONTROLS ---
function updateMissionParams() {
  const crewInput = document.getElementById('input-crew-size');
  state.crewSize = parseInt(crewInput.value, 10);
  document.getElementById('val-crew-size').textContent = `${state.crewSize} Astronauts`;
  document.getElementById('stat-crew').textContent = state.crewSize;
  validateAndRender();
}

function setMissionDays(days) {
  state.missionDays = days;
  document.querySelectorAll('.day-btn').forEach(btn => {
    btn.className = 'day-btn py-1 text-[11px] font-mono rounded bg-surface hover:bg-slate-800 border border-slate-700 text-slate-300';
    if (btn.textContent.includes(days + 'd')) {
      btn.className = 'day-btn py-1 text-[11px] font-mono rounded bg-cyan-950 text-cyan-400 border border-cyan-700 font-bold';
    }
  });
  document.getElementById('val-mission-days').textContent = `${days} Days`;
  document.getElementById('stat-days').textContent = `${days}d`;

  const badge = document.getElementById('badge-mission-class');
  if (days >= 180) badge.textContent = 'DEEP SPACE';
  else if (days >= 90) badge.textContent = 'INTERMEDIATE';
  else badge.textContent = 'LEO / LUNAR';

  validateAndRender();
}

function setHabitatShape(shape) {
  state.habitatShape = shape;
  document.querySelectorAll('.shape-btn').forEach(btn => {
    btn.className = 'shape-btn px-2 py-2 rounded-lg bg-surface hover:bg-slate-800 border border-slate-700 text-slate-300 font-mono text-xs flex items-center justify-center gap-1.5 transition';
  });
  const activeBtn = document.getElementById('shape-' + shape);
  if (activeBtn) {
    activeBtn.className = 'shape-btn px-2 py-2 rounded-lg bg-cyan-950 border border-cyan-500 text-cyan-300 font-mono text-xs flex items-center justify-center gap-1.5 transition';
  }
  rebuild3DHull(shape);
  validateAndRender();
}

function clearEntireGrid() {
  if (confirm('Clear all placed zones and reset blueprint?')) {
    state.zones = [];
    validateAndRender();
  }
}

// --- OVERLAYS TOGGLING ---
function toggleAcousticOverlay() {
  state.showAcoustic = document.getElementById('toggle-acoustic').checked;
  update3DModules(state.zones, ZONES_CONFIG, state.showAcoustic, state.showEgress, state.currentValidation);
}

function toggleEgressOverlay() {
  state.showEgress = document.getElementById('toggle-egress').checked;
  renderBlueprint(state.zones, state.habitatShape, ZONES_CONFIG, state.showEgress, state.currentValidation);
  update3DModules(state.zones, ZONES_CONFIG, state.showAcoustic, state.showEgress, state.currentValidation);
}

// --- VIEW MODE SWITCHER ---
function switchViewMode(mode) {
  state.viewMode = mode;
  const cont2D = document.getElementById('container-2d');
  const cont3D = document.getElementById('container-3d');

  document.querySelectorAll('#view-mode-2d, #view-mode-3d, #view-mode-split').forEach(btn => {
    btn.className = 'px-3.5 py-1.5 rounded-lg bg-surface hover:bg-slate-800 text-slate-300 border border-slate-700 font-mono text-xs flex items-center gap-1.5 transition';
  });
  const activeBtn = document.getElementById('view-mode-' + mode);
  if (activeBtn) {
    activeBtn.className = 'px-3.5 py-1.5 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-600 font-mono text-xs font-semibold flex items-center gap-1.5 transition';
  }

  if (mode === '2d') {
    cont2D.classList.remove('hidden');
    cont3D.classList.add('hidden');
  } else if (mode === '3d') {
    cont2D.classList.add('hidden');
    cont3D.classList.remove('hidden');
    setTimeout(resize3DViewports, 50);
  } else {
    // Split View
    cont2D.classList.remove('hidden');
    cont3D.classList.remove('hidden');
    setTimeout(resize3DViewports, 50);
  }
}

function scrollToDesigner() {
  const el = document.getElementById('designer-container');
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function handleHeroLaunch() {
  launchDesignerWithFlyIn(() => {
    scrollToDesigner();
  });
}

// --- LIVE VALIDATION & TELEMETRY ---
let validateTimeout = null;

function validateAndRender() {
  renderBlueprint(state.zones, state.habitatShape, ZONES_CONFIG, state.showEgress, state.currentValidation);
  update3DModules(state.zones, ZONES_CONFIG, state.showAcoustic, state.showEgress, state.currentValidation);

  clearTimeout(validateTimeout);
  validateTimeout = setTimeout(async () => {
    try {
      const res = await fetch('/api/layouts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crewSize: state.crewSize,
          missionLengthDays: state.missionDays,
          habitatShape: state.habitatShape,
          zones: state.zones
        })
      });
      const report = await res.json();
      state.currentValidation = report;
      updateScoreDashboard(report);
      renderBlueprint(state.zones, state.habitatShape, ZONES_CONFIG, state.showEgress, state.currentValidation);
      update3DModules(state.zones, ZONES_CONFIG, state.showAcoustic, state.showEgress, state.currentValidation);
    } catch (err) {
      console.error('Validation API error:', err);
    }
  }, 120);
}

function updateScoreDashboard(report) {
  // Score Numbers
  document.getElementById('score-number').textContent = report.score;
  document.getElementById('stat-score').textContent = `${report.score}/100`;

  // Animated Circular SVG Gauge
  const circle = document.getElementById('score-circle');
  const offset = 264 - (264 * report.score) / 100;
  circle.style.strokeDashoffset = offset;

  const badge = document.getElementById('score-status-badge');
  badge.textContent = report.status.toUpperCase();

  if (report.status === 'Optimal') {
    circle.className = 'text-emerald-400 transition-all duration-700 ease-out';
    badge.className = 'px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800';
  } else if (report.status === 'Tolerable') {
    circle.className = 'text-amber-400 transition-all duration-700 ease-out';
    badge.className = 'px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-400 border border-amber-800';
  } else {
    circle.className = 'text-crimson-400 transition-all duration-700 ease-out';
    badge.className = 'px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-crimson-950 text-crimson-400 border border-crimson-800';
  }

  // Telemetry Cards
  document.getElementById('metric-nhv-val').textContent = `${report.nhvPerCrew} m³/person`;
  document.getElementById('stat-nhv').textContent = `${report.nhvPerCrew} m³/person`;
  document.getElementById('metric-nhv-target').textContent = `Req: ≥ ${report.targetNhvPerCrew} m³`;
  document.getElementById('metric-egress-val').textContent = `${report.egressEfficiency}%`;

  // Conflicts List
  const conflictsContainer = document.getElementById('conflicts-list');
  const badgeCount = document.getElementById('conflict-count-badge');
  badgeCount.textContent = report.conflicts.length;
  conflictsContainer.innerHTML = '';

  if (report.conflicts.length === 0) {
    conflictsContainer.innerHTML = `
      <div class="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs text-center font-mono">
        ✅ Zero NASA-STD-3001 Violations Detected
      </div>
    `;
  } else {
    report.conflicts.forEach(c => {
      const div = document.createElement('div');
      div.className = 'p-2.5 rounded-lg bg-crimson-950/30 border border-crimson-800/60 space-y-1 text-xs font-mono';
      div.innerHTML = `
        <div class="flex items-center justify-between text-crimson-400 font-bold">
          <span>⚠️ ${c.type}</span>
          <span class="text-[10px] text-crimson-500">-${c.penalty} pts</span>
        </div>
        <div class="text-[11px] text-slate-300">${c.description}</div>
      `;
      conflictsContainer.appendChild(div);
    });
  }

  // Suggestions List
  const suggContainer = document.getElementById('suggestions-list');
  suggContainer.innerHTML = '';
  if (report.suggestions.length === 0) {
    suggContainer.innerHTML = '<div class="text-slate-500 text-xs">Layout meets optimal baseline performance.</div>';
  } else {
    report.suggestions.forEach(s => {
      const div = document.createElement('div');
      div.className = 'p-2 rounded bg-surface border border-emerald-800/40 text-emerald-300 text-[11px] leading-tight flex items-start gap-1.5';
      div.innerHTML = `<span>💡</span><span>${s}</span>`;
      suggContainer.appendChild(div);
    });
  }
}

// --- PRESET LOADER ---
async function loadSeedPreset(id) {
  try {
    const res = await fetch(`/api/layouts/${id}`);
    if (!res.ok) return;
    const layout = await res.json();

    state.crewSize = layout.crewSize;
    state.missionDays = layout.missionLengthDays;
    state.habitatShape = layout.habitatShape;
    state.zones = layout.zones;

    document.getElementById('input-crew-size').value = state.crewSize;
    document.getElementById('val-crew-size').textContent = `${state.crewSize} Astronauts`;
    document.getElementById('stat-crew').textContent = state.crewSize;
    
    setMissionDays(state.missionDays);
    setHabitatShape(state.habitatShape);

    validateAndRender();
  } catch (err) {
    console.error('Error loading preset:', err);
  }
}

// --- SAVE MODAL ---
function openSaveModal() {
  document.getElementById('modal-save').classList.remove('hidden');
  document.getElementById('modal-save').classList.add('flex');
}
function closeSaveModal() {
  document.getElementById('modal-save').classList.add('hidden');
  document.getElementById('modal-save').classList.remove('flex');
}

async function executeSaveLayout() {
  const name = document.getElementById('input-save-name').value.trim() || `Habitat Layout ${new Date().toLocaleDateString()}`;

  const payload = {
    name,
    crewSize: state.crewSize,
    missionLengthDays: state.missionDays,
    habitatShape: state.habitatShape,
    zones: state.zones
  };

  try {
    const res = await fetch('/api/layouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      closeSaveModal();
      await fetchSavedLayouts();
      alert(`Layout "${name}" saved successfully to mission database!`);
    }
  } catch (err) {
    alert('Failed to save layout: ' + err.message);
  }
}

// --- COMPARISON MODAL ---
async function fetchSavedLayouts() {
  try {
    const res = await fetch('/api/layouts');
    state.savedLayouts = await res.json();
  } catch (e) {
    console.error('Fetch layouts error:', e);
  }
}

function openCompareModal() {
  const selectA = document.getElementById('select-layout-a');
  const selectB = document.getElementById('select-layout-b');
  selectA.innerHTML = '';
  selectB.innerHTML = '';

  state.savedLayouts.forEach(l => {
    const optA = document.createElement('option');
    optA.value = l.id;
    optA.textContent = `${l.name} (${l.score} pts, ${l.crewSize} crew)`;
    selectA.appendChild(optA);

    const optB = document.createElement('option');
    optB.value = l.id;
    optB.textContent = `${l.name} (${l.score} pts, ${l.crewSize} crew)`;
    selectB.appendChild(optB);
  });

  if (selectB.options.length > 1) {
    selectB.selectedIndex = 1;
  }

  document.getElementById('modal-compare').classList.remove('hidden');
  document.getElementById('modal-compare').classList.add('flex');
  renderComparisonTable();
}

function closeCompareModal() {
  document.getElementById('modal-compare').classList.add('hidden');
  document.getElementById('modal-compare').classList.remove('flex');
}

function renderComparisonTable() {
  const idA = document.getElementById('select-layout-a').value;
  const idB = document.getElementById('select-layout-b').value;

  const layoutA = state.savedLayouts.find(l => l.id === idA);
  const layoutB = state.savedLayouts.find(l => l.id === idB);

  const container = document.getElementById('compare-table-container');
  if (!layoutA || !layoutB) {
    container.innerHTML = '<div class="text-slate-400 text-xs font-mono">Select two layouts to compare.</div>';
    return;
  }

  const scoreDiff = layoutA.score - layoutB.score;
  const nhvDiff = (layoutA.metrics.nhvPerCrew - layoutB.metrics.nhvPerCrew).toFixed(1);

  container.innerHTML = `
    <div class="grid grid-cols-2 gap-4 text-xs font-mono">
      <!-- Layout A -->
      <div class="glassmorphism-card p-4 rounded-xl border border-cyan-800/60 space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-slate-700">
          <h4 class="font-bold text-cyan-300 text-sm truncate">${layoutA.name}</h4>
          <span class="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 font-bold border border-cyan-700">${layoutA.score} PTS</span>
        </div>
        <div class="space-y-1.5 text-slate-300">
          <div class="flex justify-between"><span>Geometry:</span> <strong class="text-white uppercase">${layoutA.habitatShape}</strong></div>
          <div class="flex justify-between"><span>Crew Size:</span> <strong class="text-white">${layoutA.crewSize} Astronauts</strong></div>
          <div class="flex justify-between"><span>Duration:</span> <strong class="text-white">${layoutA.missionLengthDays} Days</strong></div>
          <div class="flex justify-between"><span>Volume/Crew:</span> <strong class="text-cyan-400">${layoutA.metrics.nhvPerCrew} m³</strong></div>
          <div class="flex justify-between"><span>Conflicts:</span> <strong class="${layoutA.metrics.conflicts.length > 0 ? 'text-crimson-400' : 'text-emerald-400'}">${layoutA.metrics.conflicts.length}</strong></div>
          <div class="flex justify-between"><span>Egress Safety:</span> <strong class="text-white">${layoutA.metrics.egressEfficiency}%</strong></div>
        </div>
      </div>

      <!-- Layout B -->
      <div class="glassmorphism-card p-4 rounded-xl border border-indigo-800/60 space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-slate-700">
          <h4 class="font-bold text-indigo-300 text-sm truncate">${layoutB.name}</h4>
          <span class="text-xs px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 font-bold border border-indigo-700">${layoutB.score} PTS</span>
        </div>
        <div class="space-y-1.5 text-slate-300">
          <div class="flex justify-between"><span>Geometry:</span> <strong class="text-white uppercase">${layoutB.habitatShape}</strong></div>
          <div class="flex justify-between"><span>Crew Size:</span> <strong class="text-white">${layoutB.crewSize} Astronauts</strong></div>
          <div class="flex justify-between"><span>Duration:</span> <strong class="text-white">${layoutB.missionLengthDays} Days</strong></div>
          <div class="flex justify-between"><span>Volume/Crew:</span> <strong class="text-indigo-400">${layoutB.metrics.nhvPerCrew} m³</strong></div>
          <div class="flex justify-between"><span>Conflicts:</span> <strong class="${layoutB.metrics.conflicts.length > 0 ? 'text-crimson-400' : 'text-emerald-400'}">${layoutB.metrics.conflicts.length}</strong></div>
          <div class="flex justify-between"><span>Egress Safety:</span> <strong class="text-white">${layoutB.metrics.egressEfficiency}%</strong></div>
        </div>
      </div>
    </div>

    <!-- Comparative Variance -->
    <div class="p-3 rounded-lg bg-surface border border-slate-700 text-xs font-mono space-y-1">
      <div class="text-slate-400 uppercase font-bold text-[10px]">Comparative Performance Deltas:</div>
      <div class="flex justify-between text-slate-300">
        <span>Score Variance (A vs B):</span>
        <strong class="${scoreDiff >= 0 ? 'text-emerald-400' : 'text-crimson-400'}">${scoreDiff >= 0 ? '+' + scoreDiff : scoreDiff} Points</strong>
      </div>
      <div class="flex justify-between text-slate-300">
        <span>Habitable Volume Delta:</span>
        <strong class="${nhvDiff >= 0 ? 'text-emerald-400' : 'text-crimson-400'}">${nhvDiff >= 0 ? '+' + nhvDiff : nhvDiff} m³/person</strong>
      </div>
    </div>
  `;
}
