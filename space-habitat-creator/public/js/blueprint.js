/**
 * 2D Blueprint Grid CAD Engine
 */

const GRID_COLS = 16;
const GRID_ROWS = 10;
const CELL_SIZE = 40; // 40px = 2.5 meters in CAD scale

let canvas2D = null;
let ctx2D = null;
let isMouseDown = false;

function initBlueprintCanvas(onPaintCallback) {
  canvas2D = document.getElementById('blueprint-canvas');
  if (!canvas2D) return;

  canvas2D.width = GRID_COLS * CELL_SIZE;
  canvas2D.height = GRID_ROWS * CELL_SIZE;
  ctx2D = canvas2D.getContext('2d');

  canvas2D.addEventListener('mousedown', (e) => {
    isMouseDown = true;
    handlePaint(e, onPaintCallback);
  });

  canvas2D.addEventListener('mousemove', (e) => {
    const rect = canvas2D.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
    const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);

    if (x >= 0 && x < GRID_COLS && y >= 0 && y < GRID_ROWS) {
      const hud = document.getElementById('coord-hud');
      if (hud) hud.textContent = `X: ${x} | Y: ${y} (Cell: 15.6 m³)`;
    }

    if (isMouseDown) {
      handlePaint(e, onPaintCallback);
    }
  });

  window.addEventListener('mouseup', () => {
    isMouseDown = false;
  });
}

function handlePaint(e, callback) {
  const rect = canvas2D.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
  const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);

  if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) return;

  if (typeof callback === 'function') {
    callback(x, y);
  }
}

function renderBlueprint(zones, habitatShape, zonesConfig, showEgress, validation) {
  if (!ctx2D || !canvas2D) return;

  ctx2D.clearRect(0, 0, canvas2D.width, canvas2D.height);

  // 1. Draw Grid Lines
  ctx2D.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  ctx2D.lineWidth = 1;
  for (let c = 0; c <= GRID_COLS; c++) {
    ctx2D.beginPath();
    ctx2D.moveTo(c * CELL_SIZE, 0);
    ctx2D.lineTo(c * CELL_SIZE, GRID_ROWS * CELL_SIZE);
    ctx2D.stroke();
  }
  for (let r = 0; r <= GRID_ROWS; r++) {
    ctx2D.beginPath();
    ctx2D.moveTo(0, r * CELL_SIZE);
    ctx2D.lineTo(GRID_COLS * CELL_SIZE, r * CELL_SIZE);
    ctx2D.stroke();
  }

  // 2. Draw Hull Geometry Boundary
  ctx2D.strokeStyle = 'rgba(0, 242, 254, 0.35)';
  ctx2D.lineWidth = 2;
  ctx2D.setLineDash([5, 5]);

  if (habitatShape === 'cylinder') {
    ctx2D.strokeRect(10, 10, canvas2D.width - 20, canvas2D.height - 20);
  } else if (habitatShape === 'dome') {
    ctx2D.beginPath();
    ctx2D.arc(canvas2D.width / 2, canvas2D.height - 15, canvas2D.width / 2.2, Math.PI, 2 * Math.PI);
    ctx2D.stroke();
  } else if (habitatShape === 'torus') {
    ctx2D.strokeRect(20, 20, canvas2D.width - 40, canvas2D.height - 40);
  } else {
    // Modular grid
    ctx2D.strokeRect(4, 4, canvas2D.width - 8, canvas2D.height - 8);
  }
  ctx2D.setLineDash([]);

  // 3. Draw Placed Zones
  zones.forEach(z => {
    let color = '#475569';
    let label = 'MOD';

    if (zonesConfig[z.type]) {
      color = zonesConfig[z.type].color;
      label = z.type.substring(0, 3).toUpperCase();
    } else if (z.type === 'airlock') {
      color = '#84cc16';
      label = 'EXIT';
    } else if (z.type === 'corridor') {
      color = '#334155';
      label = 'CORR';
    }

    // Module Rect
    ctx2D.fillStyle = color;
    ctx2D.beginPath();
    ctx2D.roundRect(z.x * CELL_SIZE + 2, z.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4, 4);
    ctx2D.fill();

    // Inner Bevel Highlight
    ctx2D.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx2D.lineWidth = 1;
    ctx2D.stroke();

    // Label
    ctx2D.fillStyle = '#FFFFFF';
    ctx2D.font = 'bold 9px "JetBrains Mono", monospace';
    ctx2D.textAlign = 'center';
    ctx2D.textBaseline = 'middle';
    ctx2D.fillText(label, z.x * CELL_SIZE + CELL_SIZE / 2, z.y * CELL_SIZE + CELL_SIZE / 2);
  });

  // 4. Egress Overlay on 2D Blueprint
  if (showEgress && validation && validation.egressPaths) {
    ctx2D.strokeStyle = '#10b981';
    ctx2D.lineWidth = 3;
    ctx2D.shadowColor = '#10b981';
    ctx2D.shadowBlur = 8;

    Object.values(validation.egressPaths).forEach(item => {
      if (item.blocked) return;
      if (item.path && item.path.length > 1) {
        ctx2D.beginPath();
        ctx2D.moveTo(item.path[0].x * CELL_SIZE + CELL_SIZE / 2, item.path[0].y * CELL_SIZE + CELL_SIZE / 2);
        for (let i = 1; i < item.path.length; i++) {
          ctx2D.lineTo(item.path[i].x * CELL_SIZE + CELL_SIZE / 2, item.path[i].y * CELL_SIZE + CELL_SIZE / 2);
        }
        ctx2D.stroke();
      }
    });
    ctx2D.shadowBlur = 0;
  }
}
