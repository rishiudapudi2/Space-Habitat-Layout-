/**
 * NASA-STD-3001 Habitability Validation & BFS Egress Pathfinding Engine
 */

const CELL_VOLUME_M3 = 15.625; // 2.5m x 2.5m x 2.5m per module cell
const GRID_COLS = 16;
const GRID_ROWS = 10;

const ZONE_METADATA = {
  sleep: { name: 'Sleep Quarters', baseNoiseDb: 32, maxToleratedNoiseDb: 45, color: '#3b82f6', isObstacle: true },
  exercise: { name: 'Zero-G Gym', baseNoiseDb: 76, maxToleratedNoiseDb: 80, color: '#f97316', isObstacle: true },
  hygiene: { name: 'Hygiene & WHC', baseNoiseDb: 50, maxToleratedNoiseDb: 60, color: '#06b6d4', isObstacle: true },
  food: { name: 'Galley & Dining', baseNoiseDb: 54, maxToleratedNoiseDb: 60, color: '#10b981', isObstacle: true },
  work: { name: 'Command & Lab', baseNoiseDb: 64, maxToleratedNoiseDb: 65, color: '#8b5cf6', isObstacle: true },
  medical: { name: 'Medical Infirmary', baseNoiseDb: 40, maxToleratedNoiseDb: 50, color: '#ef4444', isObstacle: true },
  storage: { name: 'Consumables & Cargo', baseNoiseDb: 30, maxToleratedNoiseDb: 70, color: '#f59e0b', isObstacle: true },
  airlock: { name: 'Primary Airlock / Hatch', baseNoiseDb: 45, maxToleratedNoiseDb: 70, color: '#84cc16', isObstacle: false },
  corridor: { name: 'Access Corridor', baseNoiseDb: 35, maxToleratedNoiseDb: 70, color: '#64748b', isObstacle: false }
};

function runValidation(crewSize, missionDays, habitatShape, zones) {
  // Normalize grid
  const grid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
  const airlocks = [];
  const zoneCounts = {};

  zones.forEach(z => {
    if (z.x >= 0 && z.x < GRID_COLS && z.y >= 0 && z.y < GRID_ROWS) {
      grid[z.y][z.x] = z;
      zoneCounts[z.type] = (zoneCounts[z.type] || 0) + 1;
      if (z.type === 'airlock') {
        airlocks.push({ x: z.x, y: z.y });
      }
    }
  });

  const conflicts = [];
  const suggestions = [];
  let score = 100;

  // 1. NHV (Net Habitable Volume) Calculation according to NASA-STD-3001 Celentano Curve
  let targetNhvPerCrew = 10; // short duration (<30d)
  if (missionDays >= 180) targetNhvPerCrew = 22; // deep-space / Mars (>180d)
  else if (missionDays >= 30) targetNhvPerCrew = 15; // medium duration (30-180d)

  const activeCells = zones.filter(z => z.type !== 'storage');
  const totalNHV = activeCells.length * CELL_VOLUME_M3;
  const nhvPerCrew = crewSize > 0 ? totalNHV / crewSize : 0;

  if (nhvPerCrew < targetNhvPerCrew) {
    const deficit = (targetNhvPerCrew - nhvPerCrew).toFixed(1);
    const penalty = Math.min(30, Math.round((targetNhvPerCrew - nhvPerCrew) * 3));
    score -= penalty;
    conflicts.push({
      id: 'vol-deficit',
      severity: 'critical',
      type: 'Volume Deficiency',
      description: `Net Habitable Volume is ${nhvPerCrew.toFixed(1)} m³/person (target for ${missionDays}d mission is ≥ ${targetNhvPerCrew} m³). Deficit: -${deficit} m³/person.`,
      penalty
    });
    suggestions.push(`Expand crew compartment by at least ${Math.ceil((targetNhvPerCrew * crewSize - totalNHV) / CELL_VOLUME_M3)} modules to satisfy NASA-STD-3001 long-duration standard (+${penalty} pts).`);
  }

  // 2. Minimum Station Provisions (Sleep, Exercise, Hygiene, Medical)
  const sleepCount = zoneCounts['sleep'] || 0;
  const minSleepRequired = Math.ceil(crewSize / 2); // At least half crew private bunks / hot-bunking cap
  if (sleepCount < minSleepRequired) {
    const penalty = (minSleepRequired - sleepCount) * 10;
    score -= penalty;
    conflicts.push({
      id: 'sleep-capacity',
      severity: 'critical',
      type: 'Insufficient Quarters',
      description: `Only ${sleepCount} sleep pods placed for ${crewSize} crew members (minimum ${minSleepRequired} required).`,
      penalty
    });
    suggestions.push(`Add ${minSleepRequired - sleepCount} more Sleep Quarters pods (+${penalty} pts).`);
  }

  if (!zoneCounts['exercise']) {
    score -= 15;
    conflicts.push({
      id: 'no-gym',
      severity: 'warning',
      type: 'No Exercise Facility',
      description: 'Zero-G gym is missing. NASA requires 2.5 hrs/day exercise to prevent musculoskeletal atrophy.',
      penalty: 15
    });
    suggestions.push('Add an Exercise module to prevent crew bone demineralization (+15 pts).');
  }

  if (!zoneCounts['hygiene']) {
    score -= 15;
    conflicts.push({
      id: 'no-hygiene',
      severity: 'critical',
      type: 'No Hygiene Facility',
      description: 'Waste management and hygiene facility missing.',
      penalty: 15
    });
    suggestions.push('Place at least one Waste Management & Hygiene compartment (+15 pts).');
  }

  if (!zoneCounts['medical']) {
    score -= 10;
    conflicts.push({
      id: 'no-med',
      severity: 'warning',
      type: 'No Medical Facility',
      description: 'Habitat lacks dedicated clinical diagnostics and telemedicine bay.',
      penalty: 10
    });
    suggestions.push('Provide a Medical bay for emergency triage (+10 pts).');
  }

  if (airlocks.length === 0) {
    score -= 35;
    conflicts.push({
      id: 'no-airlock',
      severity: 'critical',
      type: 'No Egress Airlock',
      description: 'No primary EVA airlock or emergency egress hatch placed on this deck.',
      penalty: 35
    });
    suggestions.push('CRITICAL: Place at least one Airlock / Emergency Hatch (+35 pts).');
  } else if (crewSize >= 6 && airlocks.length < 2) {
    score -= 8;
    conflicts.push({
      id: 'single-airlock-risk',
      severity: 'warning',
      type: 'Single Egress Route',
      description: `Crew size of ${crewSize} on high-risk mission recommends dual redundant airlocks to guard against hatch seal failures.`,
      penalty: 8
    });
    suggestions.push('Add a secondary emergency airlock for redundant evacuation pathways (+8 pts).');
  }

  // 3. Adjacency Conflict Checks (Manhattan & Diagonal distance <= 1 tile)
  const directions = [
    { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
    { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
    { dx: 1, dy: 1 }, { dx: -1, dy: -1 },
    { dx: 1, dy: -1 }, { dx: -1, dy: 1 }
  ];

  let exerciseSleepConflicts = 0;
  let hygieneFoodConflicts = 0;

  zones.forEach(z => {
    if (z.type === 'sleep') {
      directions.forEach(({ dx, dy }) => {
        const nx = z.x + dx;
        const ny = z.y + dy;
        if (nx >= 0 && nx < GRID_COLS && ny >= 0 && ny < GRID_ROWS) {
          const neighbor = grid[ny][nx];
          if (neighbor && neighbor.type === 'exercise') {
            exerciseSleepConflicts++;
          }
        }
      });
    }

    if (z.type === 'hygiene') {
      directions.forEach(({ dx, dy }) => {
        const nx = z.x + dx;
        const ny = z.y + dy;
        if (nx >= 0 && nx < GRID_COLS && ny >= 0 && ny < GRID_ROWS) {
          const neighbor = grid[ny][nx];
          if (neighbor && neighbor.type === 'food') {
            hygieneFoodConflicts++;
          }
        }
      });
    }
  });

  if (exerciseSleepConflicts > 0) {
    const penalty = Math.min(25, exerciseSleepConflicts * 15);
    score -= penalty;
    conflicts.push({
      id: 'adj-noise-sleep',
      severity: 'critical',
      type: 'Acoustic Conflict: Gym adjacent to Sleep',
      description: 'High-vibration exercise equipment is located directly adjacent to quiet crew quarters. Exceeds 45 dBA sleep limit.',
      penalty
    });
    suggestions.push(`Move Exercise at least 2 tiles away from Sleep Quarters or buffer with storage/corridor (+${penalty} pts).`);
  }

  if (hygieneFoodConflicts > 0) {
    const penalty = Math.min(25, hygieneFoodConflicts * 15);
    score -= penalty;
    conflicts.push({
      id: 'adj-bio-hygiene',
      severity: 'critical',
      type: 'Bio-Hazard: Hygiene adjacent to Galley',
      description: 'Waste management and shower facility is directly adjacent to food prep and dining. Severe bio-aerosol cross-contamination risk.',
      penalty
    });
    suggestions.push(`Separate Waste & Hygiene from Galley/Dining with a corridor or air-barrier (+${penalty} pts).`);
  }

  // 4. BFS Egress Pathfinding to nearest Airlock
  const egressPaths = {};
  let trappedCount = 0;
  let totalEgressDistance = 0;
  let evaluatedZonesCount = 0;

  if (airlocks.length > 0) {
    zones.forEach(z => {
      if (z.type === 'airlock') return;

      // BFS
      const queue = [{ x: z.x, y: z.y, path: [{ x: z.x, y: z.y }] }];
      const visited = new Set([`${z.x},${z.y}`]);
      let shortestPath = null;

      while (queue.length > 0) {
        const current = queue.shift();
        if (grid[current.y][current.x] && grid[current.y][current.x].type === 'airlock') {
          shortestPath = current.path;
          break;
        }

        const neighbors = [
          { x: current.x + 1, y: current.y },
          { x: current.x - 1, y: current.y },
          { x: current.x, y: current.y + 1 },
          { x: current.x, y: current.y - 1 }
        ];

        for (const n of neighbors) {
          if (n.x >= 0 && n.x < GRID_COLS && n.y >= 0 && n.y < GRID_ROWS) {
            const key = `${n.x},${n.y}`;
            if (!visited.has(key)) {
              visited.add(key);
              // Cell is walkable if it has a zone (corridor, room) or is an airlock
              const occupant = grid[n.y][n.x];
              if (occupant) {
                queue.push({
                  x: n.x,
                  y: n.y,
                  path: [...current.path, { x: n.x, y: n.y }]
                });
              }
            }
          }
        }
      }

      if (!shortestPath) {
        trappedCount++;
        egressPaths[`${z.x},${z.y}`] = { blocked: true, path: [] };
      } else {
        egressPaths[`${z.x},${z.y}`] = { blocked: false, path: shortestPath };
        totalEgressDistance += shortestPath.length;
        evaluatedZonesCount++;
      }
    });

    if (trappedCount > 0) {
      const penalty = Math.min(30, trappedCount * 10);
      score -= penalty;
      conflicts.push({
        id: 'trapped-zones',
        severity: 'critical',
        type: 'Blocked Egress Route',
        description: `${trappedCount} module(s) have no continuous passageway to an emergency exit airlock.`,
        penalty
      });
      suggestions.push(`Connect isolated modules to the main corridor network leading to the airlock (+${penalty} pts).`);
    }
  }

  // Cap score between 0 and 100
  score = Math.max(0, Math.min(100, score));

  let status = 'Critical';
  if (score >= 80) status = 'Optimal';
  else if (score >= 55) status = 'Tolerable';

  return {
    score,
    status,
    nhvPerCrew: Number(nhvPerCrew.toFixed(1)),
    targetNhvPerCrew,
    totalVolume: Math.round(totalNHV),
    activeModulesCount: zones.length,
    conflicts,
    suggestions,
    egressEfficiency: evaluatedZonesCount > 0 ? Math.round(100 - (totalEgressDistance / evaluatedZonesCount) * 4) : 0,
    egressPaths
  };
}

module.exports = {
  ZONE_METADATA,
  GRID_COLS,
  GRID_ROWS,
  CELL_VOLUME_M3,
  runValidation
};
