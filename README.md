# SW-4 | Space Habitat Layout Creator & Habitability Engine

![Node.js](https://img.shields.io/badge/Node.js-Zero%20Dependencies-339933?style=flat-square&logo=node.js&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-r128-000000?style=flat-square&logo=three.js&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-CDN-06B6D4?style=flat-square&logo=tailwind-css&logoColor=white)
![SQLite](https://img.shields.io/badge/Database-node%3Asqlite%20%2B%20JSON%20Fallback-003B57?style=flat-square&logo=sqlite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

A full-stack aerospace CAD web platform for designing, visualizing in real-time 3D, validating against **NASA-STD-3001** habitability standards, scoring, and comparing deep-space habitat interiors. Built with zero external npm dependencies using native Node.js, HTML5 Canvas, Three.js, and SQLite.

---

## Key Features

- **Interactive 3D Hero Viewport:** Deep-space starfield with an orbiting modular station (translucent pressure hull, artificial gravity torus ring, solar arrays) and a smooth camera fly-in transition into the workspace.
- **Dual 2D / 3D Hybrid CAD Workspace:**
  - **2D Blueprint Grid:** Click-and-drag painting on a `16 × 10` grid (`1 cell = 2.5m × 2.5m × 2.5m = 15.625 m³`) with live coordinate HUD, hull outlines, and egress route overlays.
  - **3D Interior Walkthrough:** Real-time Three.js scene with `OrbitControls` (rotate, pan, zoom, camera reset) rendering color-coded 3D modules inside switchable wireframe hull geometries (**Cylinder**, **Dome**, **Torus/Ring**, **Modular Grid**).
  - **View Modes:** Seamlessly toggle between **2D Blueprint**, **3D Walkthrough**, and **Dual Split View**.
- **Real-Time 3D Diagnostic Overlays:**
  - **Acoustic Wavefront Heatmap:** Animated pulsing radial waves around high-noise/high-vibration modules (`Zero-G Gym`, `Command & Lab`).
  - **Emergency Egress Laser Paths:** Real-time 3D and 2D shortest-path routes from every module to the nearest airlock (green for clear evacuation routes, red for blocked/trapped modules).
- **NASA-STD-3001 Habitability Validation Engine:**
  - Live `0–100` habitability score with an animated SVG gauge and classification (**Optimal**, **Tolerable**, **Critical**).
  - Duration-scaled Net Habitable Volume (NHV) checks, crew capacity verification, adjacency hazard detection, BFS egress pathfinding, and actionable optimization suggestions with exact point gains.
- **Mission Persistence & Side-by-Side Comparison:**
  - Save custom layouts directly to SQLite (with automatic JSON fallback) and compare any two designs side-by-side across score, geometry, crew size, mission duration, NHV, conflict count, and egress efficiency.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Backend Server** | Node.js built-in `http`, `fs`, `path` (Zero `npm` packages required) |
| **Database** | Native `node:sqlite` (`DatabaseSync`) with automatic fallback to `data/layouts.json` |
| **Frontend Markup & Styling** | HTML5, Tailwind CSS (CDN), custom dark mission-control CSS (`glassmorphism`, HUD scanlines) |
| **2D CAD Engine** | HTML5 Canvas API (`blueprint.js`) |
| **3D Visualization** | Three.js `r128` + `OrbitControls` (`three-viewer.js`) |
| **Fonts** | Inter & JetBrains Mono (Google Fonts) |

---

## Project Structure

```text
space-habitat-creator/
├── .vscode/
│   └── launch.json           # VS Code F5 launch & integrated terminal debug profile
├── data/
│   └── habitats.db           # Auto-created & auto-seeded SQLite database
├── public/
│   ├── css/
│   │   └── style.css         # Obsidian theme, glassmorphism panels, HUD scanlines, glows
│   ├── js/
│   │   ├── app.js            # State management, mission controls, live validation, modals
│   │   ├── blueprint.js      # 2D 16x10 CAD grid renderer & BFS egress path overlay
│   │   └── three-viewer.js   # Three.js hero starfield & 3D interior CAD walkthrough engine
│   └── index.html            # Main UI layout, workspace, scorecard, and modals
├── src/
│   ├── db.js                 # SQLite persistence layer, JSON fallback, & reference seeding
│   └── validation.js         # NASA-STD-3001 rules, NHV curve, adjacency checks, BFS egress
├── package.json              # Project metadata and npm start/dev scripts
├── server.js                 # Zero-dependency Node.js HTTP server & REST API
└── README.md
```

---

## Getting Started

### Prerequisites
- **Node.js** installed (Node.js `22.5+` enables native `node:sqlite`; earlier versions automatically fall back to persistent JSON storage in `data/layouts.json`).
- No `npm install` step is needed—the backend has zero external npm dependencies.

### Run via Terminal
1. Clone the repository and enter the project directory:
   ```bash
   git clone [https://github.com/](https://github.com/)<your-username>/space-habitat-creator.git
   cd space-habitat-creator
   ```
2. Start the server:
   ```bash
   npm start
   ```
   For development with automatic reload on file changes:
   ```bash
   npm run dev
   ```
3. Open your browser at:
   ```text
   http://localhost:3000
   ```
   *(Set the `PORT` environment variable to run on a custom port.)*

### Run via VS Code Debugger
1. Open the `space-habitat-creator` folder in VS Code.
2. Press **`F5`** (or select **Launch Habitat CAD Server** in the **Run and Debug** panel) to start `server.js` directly in the integrated terminal.

---

## Placeable Modules & Tools

| Type | Name | Role / Validation Notes |
| :--- | :--- | :--- |
| `sleep` | **Sleep Quarters** | Private crew berths (`ceil(crewSize / 2)` minimum); sensitive to adjacent gym noise (`≤ 45 dBA`). |
| `exercise` | **Zero-G Gym** | Required for all missions; high-vibration noise source (`76 dB`), renders pulsing acoustic rings in 3D. |
| `hygiene` | **Hygiene & WHC** | Required waste & shower facility; must not touch `food` (bio-aerosol hazard). |
| `food` | **Galley & Dining** | Food preparation and dining module; must remain isolated from `hygiene`. |
| `work` | **Command & Lab** | Flight operations and research consoles (`64 dB`), renders acoustic waves in 3D. |
| `medical` | **Medical Infirmary** | Required clinical diagnostics and emergency triage bay. |
| `storage` | **Cargo & Consumables** | Life support tanks and spares; excluded from Net Habitable Volume (NHV) calculations. |
| `airlock` | **Airlock / Exit** | Required emergency egress hatch; `≥ 2` recommended for crews of 6 or more. |
| `corridor` | **Access Corridor** | Walkable passageway connecting modules and buffering conflicting zones. |
| `eraser` | **Eraser Tool** | Removes placed tiles from the 2D blueprint grid. |

---

## NASA-STD-3001 Validation & Scoring Engine

Every layout starts at **100 points** and is evaluated in real time across four engineering categories:

| Score Range | Status |
| :--- | :--- |
| **80 – 100** | **Optimal** |
| **55 – 79** | **Tolerable** |
| **0 – 54** | **Critical** |

### Validation Rules
1. **Net Habitable Volume (NHV):** Calculated from all non-storage modules (`15.625 m³` per cell) divided by crew size (`1–12` astronauts). Minimum targets scale by mission length:
   - Short duration (`< 30 days`): `≥ 10 m³/person`
   - Medium duration (`30–179 days`): `≥ 15 m³/person`
   - Deep space (`≥ 180 days`): `≥ 22 m³/person`
   - *Penalty:* Up to `-30 pts` for volume deficits.
2. **Minimum Station Provisions:**
   - Insufficient sleep quarters (`< ceil(crewSize / 2)`): `-10 pts` per missing pod.
   - Missing Zero-G Gym: `-15 pts`.
   - Missing Hygiene & WHC: `-15 pts`.
   - Missing Medical Infirmary: `-10 pts`.
   - Missing Airlock: `-35 pts` (or `-8 pts` if crew size `≥ 6` with only a single airlock).
3. **Adjacency Conflict Detection** *(8-directional, including diagonals)*:
   - **Acoustic Conflict:** `exercise` adjacent to `sleep` (`-15 pts` per conflict, max `-25 pts`).
   - **Bio-Hazard:** `hygiene` adjacent to `food` (`-15 pts` per conflict, max `-25 pts`).
4. **BFS Emergency Egress Pathfinding:**
   - Executes Breadth-First Search from every non-airlock module through connected tiles to the nearest `airlock`.
   - Isolated/trapped modules incur `-10 pts` each (max `-30 pts`) and reduce overall **Egress Efficiency**.

---

## Pre-Seeded Reference Layouts

On first launch, `src/db.js` automatically seeds three benchmark habitats into `data/habitats.db`:

| Preset ID | Layout Name | Crew / Duration | Hull | Modules | Score & Status | Purpose |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| `seed-lunar-alpha` | **Lunar Outpost Alpha** | 4 crew / 30d | Dome | 16 | **85** (Optimal) | Near-optimal lunar base with 1 bio-hazard adjacency warning (`hygiene` next to `food`). |
| `seed-mars-transit` | **Mars Transit Vessel** | 6 crew / 500d | Torus | 28 | **100** (Optimal) | Zero-conflict deep-space reference with dual airlocks and buffered zones. |
| `seed-flawed-prototype` | **Flawed Prototype (Test Case)** | 6 crew / 180d | Cylinder | 6 | **0** (Critical) | Stress test demonstrating NHV deficit, acoustic/hygiene conflicts, and 5 trapped modules. |

---

## REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/layouts/validate` | Evaluates `{ crewSize, missionLengthDays, habitatShape, zones }` and returns score, status, NHV metrics, conflicts, suggestions, and BFS egress paths. |
| `GET` | `/api/layouts` | Returns all saved layouts ordered by `createdAt DESC`. |
| `GET` | `/api/layouts/:id` | Retrieves a single saved or seeded layout by ID. |
| `POST` | `/api/layouts` | Validates and saves a new layout (`name`, `crewSize`, `missionLengthDays`, `habitatShape`, `zones`) to the database. |
| `DELETE` | `/api/layouts/:id` | Deletes a saved layout by ID. |

---

## License

This project is licensed under the **MIT License** — see `package.json` for details.
