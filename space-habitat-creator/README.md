# 🚀 SW-4 | Space Habitat Layout Creator & Habitability Engine

A full-stack aerospace CAD web application for mission planners and aerospace engineers to design, 3D visualize, validate (NASA-STD-3001), score, and compare space habitat interiors.

---

## 📁 Project Structure (Separated & Modular)

```
space-habitat-creator/
├── .vscode/
│   └── launch.json         # VS Code 1-click F5 run & debug profile
├── data/
│   └── habitats.db         # Persistent SQLite database (auto-created & auto-seeded)
├── public/
│   ├── css/
│   │   └── style.css       # Obsidian theme, glassmorphism, HUD scanlines
│   ├── js/
│   │   ├── app.js          # Main client controller, state, telemetry, modals
│   │   ├── blueprint.js    # 2D CAD grid drawing & BFS egress laser paths
│   │   └── three-viewer.js # 3D Three.js Hero starfield & CAD interior walkthrough
│   └── index.html          # Clean HTML5 markup
├── src/
│   ├── db.js               # Database layer with SQLite & persistent JSON fallback
│   └── validation.js       # NASA-STD-3001 Celentano curve, adjacency checks, BFS egress
├── package.json            # npm start script and metadata
├── server.js               # Node.js HTTP server & REST API
└── README.md
```

---

## ⚡ How to Run in VS Code

### Method 1: Using VS Code Integrated Terminal (Recommended)
1. Open this folder in VS Code (`File` -> `Open Folder...` -> select `space-habitat-creator`).
2. Open the built-in terminal (`Ctrl + ~` or `Terminal` -> `New Terminal`).
3. Run:
   ```bash
   node server.js
   ```
   *(or `npm start`)*
4. Open your browser and navigate to:
   **`http://localhost:3000`**

### Method 2: Press F5 in VS Code
1. Open the folder in VS Code.
2. Press **`F5`** (or go to `Run and Debug` tab and click **Launch Habitat CAD Server**).
3. The server will start in the terminal and launch the debugger automatically.

---

## 🛰️ Key Features

- **3D Hero Scene:** Starfield with slowly rotating modular space station and smooth fly-in camera animation on clicking *"Launch Habitat Designer"*.
- **Dual 2D/3D Hybrid CAD:**
  - **2D Blueprint Grid:** Drag-to-draw zoning tool with 7 specialized compartments (`Sleep`, `Exercise`, `Hygiene`, `Food`, `Work`, `Medical`, `Storage`) plus `Airlocks` and `Corridors`.
  - **3D Walkthrough Viewport:** Real-time Three.js scene rendering the translucent habitat hull (switchable: **Cylinder**, **Dome**, **Torus/Ring**, or **Modular Grid**) with volumetric rooms and LED lighting.
- **Toggleable 3D Overlays:**
  - **Acoustic Decibel Heatmap:** Pulsing radial waves around high-vibration zones (`Exercise`, `Work`).
  - **Emergency Egress Path:** Real-time BFS shortest-path laser beam tracing from every module to the nearest airlock (turns flashing red if trapped/blocked).
- **Live Habitability Scorecard:**
  - Real-time animated circular SVG gauge (0–100) with status classification (**Optimal**, **Tolerable**, **Critical**).
  - NASA-STD-3001 Net Habitable Volume (NHV in $m^3$/crew) scaling with mission duration ($\ge 10\text{ m}^3$ short, $\ge 15\text{ m}^3$ medium, $\ge 22\text{ m}^3$ deep space).
  - Adjacency conflict detection (`Exercise` next to `Sleep`, `Hygiene` next to `Food`, `Medical` isolation).
  - Actionable improvement suggestions panel with exact point gains.
- **Save & Compare System:**
  - Save layouts with custom mission notes directly to the SQLite database.
  - Side-by-side comparison modal displaying dual metric tables, volume variances, and score differentials.
