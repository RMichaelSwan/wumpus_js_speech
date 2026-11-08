# Hunt the Wumpus — 3D & Speech Edition

A modern, fully responsive, static HTML/JavaScript implementation of the classic game **Hunt the Wumpus**, featuring:
- **Three.js 0.187.0** interactive 3D cave visualizer (starting with the classic regular dodecahedron map).
- **Camera Auto-Zoom on Move**: Automatically focuses and zooms in on the player's new room when moving (with a dedicated HUD toggle to enable/disable, default **ON**).
- **Map Visual Themes**: Choose from multiple solid and translucent styles via the HUD theme selector:
  - **Classic Green (Solid)**: Authentic retro green faceted dodecahedron with white specular highlights.
  - **Obsidian Basalt (Solid)**: Dark volcanic stone facets with neon cyber accents.
  - **Cavern Rock (Solid)**: Warm earthen subterranean rock with torchlit mood.
  - **Neon Crystal (Translucent)**: Holographic crystal facets with glowing struts.
  - **Deep Space (Open)**: Floating nodes and tunnels against a deep cosmic void.
- **Menacing Beast Redesign for the Wumpus**: A terrifying cave predator with a heavy hunched muscular frame, spined dorsal crest, curved obsidian demon horns, 4 piercing fiery glowing eyes, reaching clawed hands, and an aggressive gaping jaw filled with sharp sabre fangs and lower tusks.
- **Synchronized Multimodal Controls**: Type classic commands, click/touch 3D nodes directly, or speak commands via voice.
- **Three Fog-of-War Difficulty Tiers**:
  - **Hardest (Classic)**: Strict fog of war — only your current room and immediately connected neighbors are visible. All hazards remain hidden until triggered.
  - **Normal (Standard)**: Explored rooms remain visible with persistent sensory clue badges (`💨 Draft`, `🦇 Bats`, `🦨 Wumpus smell`), allowing tactical deduction.
  - **Tutorial (Easy / God Mode)**: Full map visibility with live Wumpus and hazard markers at all times.
- **Speech-to-Text (STT)**:
  - Instant **Web Speech API** fallback (zero download).
  - Background **Transformers.js (OpenAI Whisper-tiny.en ~39MB)** Web Worker for **100% offline in-browser recognition**.
- **Mobile-First UX**:
  - Touchscreen controls (single-finger orbit, two-finger zoom, tap to move/shoot).
  - 1-tap view switcher between full-screen 3D GUI and the retro text console.
- **Multi-Map Support**:
  - Standard (Dodecahedron)
  - Waterslide
  - Möbius Strip
  - Risk

---

## Quick Start

Because modern browsers require HTTP/HTTPS to load ES modules, import maps, and Web Workers, serve the directory with any static HTTP server:

```bash
cd wumpus_js_speech
python3 -m http.server 8000
```

Open your browser to:
```
http://localhost:8000
```

---

## How to Play

### 1. Moving
- **Text**: Type `m <room>` or `move to <room>` (e.g. `move 14`).
- **GUI**: Tap on any glowing connected room node.
- **Speech**: Press the **🎙️ Speak** button and say: *"Move to room fourteen"* or *"Go to fourteen"*.

### 2. Shooting
- **Text**: Type `s <r1, r2, ...>` (e.g. `shoot 15, 6, 16`).
- **GUI**: Switch to **Shoot** mode on the HUD, tap 1 to 5 connected room nodes to build the arrow path, and click **Fire! 🏹**.
- **Speech**: Say: *"Shoot fifteen, six, sixteen"* or *"Fire into five"*.

### 3. Rules & Hazards
- **Pits**: 2 rooms contain bottomless pits. If you enter, you fall in and lose.
- **Super Bats**: 2 rooms contain super bats. If you enter, a bat snatches you and drops you into a random room across the cave (which might have pits or the Wumpus!).
- **The Wumpus**: Asleep until you enter his room or shoot an arrow. If awakened, he has a 75% chance to move to an adjacent room and a 25% chance to stay still. If he enters your room, you lose!
- **Crooked Arrows**: You start with 5 crooked arrows. An arrow travels 1 to 5 rooms. Arrows cannot immediately double back (`r[i] == r[i+2]`). If an arrow enters the Wumpus's room, you win!
- **Score**: Winning earns `100 - moves`. Shooting does not consume move stamina.

---

## Project Structure

```
wumpus_js_speech/
├── index.html               # Main application entry point & responsive layout
├── css/
│   └── style.css            # Responsive styles (desktop split & mobile GUI)
├── js/
│   ├── app.js               # Application coordinator (wires engine, viz, UI, STT)
│   ├── engine/
│   │   ├── game.js          # Core ruleset, hazard resolutions, and scoring
│   │   └── map_data.js      # Map definitions (standard, waterslide, mobius, risk)
│   ├── viz/
│   │   ├── scene.js         # Three.js 0.187.0 scene, lights, controls, raycaster
│   │   ├── dodecahedron.js  # Node spheres, tunnel struts, billboard sprites
│   │   ├── markers.js       # 3D Player, Wumpus, Bats, Pits, and arrow animations
│   │   └── difficulty.js    # Fog of war & difficulty tiers
│   ├── speech/
│   │   ├── stt_controller.js# Dual Web Speech & Whisper Web Worker manager
│   │   ├── parser.js        # Natural command parser ("move 14", "shoot 15 6")
│   │   └── whisper_worker.js# Background worker running Transformers.js Whisper
│   └── ui/
│       ├── terminal.js      # Classic retro text console
│       └── hud.js           # Floating HUD overlay & mobile touch controls
├── vendor/
│   ├── three/               # Three.js 0.187.0 (three.module.js, OrbitControls.js)
│   └── transformers/        # Transformers.js 2.17.2 bundle
├── PLAN.md                  # Detailed engineering architecture
└── README.md                # Documentation and guide
```
