# Hunt the Wumpus (Speech & 3D Web Edition) — Architecture & Implementation Plan

## 1. Project Overview & Objectives

The goal of this project is to build a fully featured, browser-based version of the classic game **Hunt the Wumpus** in `./wumpus_js_speech/` using static HTML/JavaScript with zero mandatory external server dependencies.

### Key Capabilities
1. **Classic Text Experience**: Authentic Hunt the Wumpus text console on the left (or accessible in full-screen on mobile), matching the exact gameplay and messages from the reference Python engine (`wumpus_speech/wumpushost.py`).
2. **Interactive 3D Visualizer**: A dynamic Three.js representation of the cave (starting with the regular dodecahedron map) featuring 20 nodes, 30 connecting tunnels, and animated entity markers for the player, wumpus, pits, and bats.
3. **Difficulty Levels (Fog of War)**:
   - **Hardest (Expert)**: Strict classic mode. Shows only the player's current room and immediately connected tunnels/rooms. Hazards remain hidden until triggered.
   - **Normal (Standard)**: Fog of war lifts for explored rooms. Preserves historical sensory badges (e.g. "draft sensed here") on visited nodes so players can deduce hazard locations like a detective.
   - **Easiest (Tutorial / God Mode)**: Full map visibility. The Wumpus and all hazards (pits, bats) are continuously visible, allowing players to learn the dodecahedron topology and observe how arrows travel.
4. **Multimodal Input Synchronization**:
   - Keyboard command entry (classic prompts `m`/`s` and room numbers, or shorthand `move 14`, `shoot 15,6,16`).
   - Direct 3D GUI interaction (mouse clicks and mobile touchscreen taps on nodes to move or build arrow flight paths).
   - Local Offline Speech-to-Text (STT) (voice commands transcribed and fed into the engine).
   - Every input method stays 100% synchronized with the text log and 3D visual view.
5. **Mobile & Small Form-Factor First**:
   - GUI-first mobile layout with touch controls (orbit, pinch-to-zoom, tap-to-select).
   - One-tap view switcher / drawer between the 3D visualizer and the text console.
6. **Multi-Map Extensibility**:
   - Built to easily load additional cave topologies from `./wumpus_speech/` (`standard.txt`, `waterslide.txt`, `mobius.txt`, `risk.txt`) through a decoupled map schema.

---

## 2. Local STT Investigation & Selection

### 2.1 The Mozilla STT Status
The user requested investigating local STT models, noting: *(maybe one of the mozilla ones?) with the goal of everything working without internet.*

- **Mozilla DeepSpeech**: Originally developed by Mozilla based on Baidu's DeepSpeech architecture, Mozilla archived the project in 2020–2021. The community fork (**Coqui STT**) also shut down operations in 2023. DeepSpeech was primarily designed for native desktop/server environments (Python/C++). WASM ports existed experimentally, but were large (>150 MB), unmaintained, and required heavy memory allocations.
- **Firefox Native Speech**: While the W3C Web Speech API (`webkitSpeechRecognition` / `SpeechRecognition`) exists in specifications, Firefox historically left it disabled by default or tied to external OS/cloud services.

### 2.2 Evaluation of Offline In-Browser STT Options

| Solution | Runtime / Engine | Download Size | Natural Speech Accuracy | Offline Capability | Performance / Latency |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Transformers.js (Whisper-tiny.en)** | WebAssembly + ONNX Runtime Web | ~39 MB (quantized) | **Excellent** (understands numbers, phrases, accents) | **100% Offline** (cached via Cache API / IndexedDB) | ~0.5s–1.2s per command (runs in Web Worker) |
| **Vosk-Browser** | WebAssembly (Kaldi) | ~40–50 MB | Good | **100% Offline** | Real-time streaming (~0.3s) |
| **PocketSphinx.js** | WebAssembly / JS | ~2–5 MB (custom grammar) | Fair (limited vocabulary only) | **100% Offline** | Fast (<0.1s), but brittle to accents & noise |
| **TensorFlow.js Speech Commands** | WebGL / WASM | ~3–5 MB | Fixed 20 words (digits 0–9, go, stop) | **100% Offline** | Real-time, but cannot parse multi-room shoot paths |
| **Web Speech API** | Browser Native | 0 MB | Good | Browser/OS-dependent (Chrome/Safari require cloud; Android can be offline) | Immediate |

### 2.3 Recommended STT Architecture
We recommend a **hybrid, pluggable Speech Controller**:
1. **Primary Local Engine**: **Transformers.js (`whisper-tiny.en`)** running inside a dedicated **Web Worker**.
   - Model weights (~39 MB) are downloaded once on demand and cached locally using browser Cache Storage.
   - Once cached, it runs **completely offline** with no internet connection required.
   - Can transcribe full natural sentences (e.g. *"move to room fourteen"*, *"shoot fifteen, six, sixteen"*).
   - Offloading inference to a Web Worker guarantees that the Three.js 60fps render loop never stutters while transcribing.
2. **Instant Fallback Engine**: **Web Speech API (`SpeechRecognition`)**.
   - Zero-download option ready immediately on load without waiting for the 39 MB model.
   - Works immediately on Chrome, Edge, Safari, and Android.
3. **User Control in UI**:
   - A microphone button on the screen with a clean status pill:
     - `Mic: Ready (WebSpeech)` or `Mic: Local Whisper (Offline Ready)`
     - Clear progress indicator when downloading local model weights for offline use.
4. **Natural Speech Command Parser**:
   - Parses numbers, words ("room fifteen", "15", "fifteen"), and intents ("move", "go", "shoot", "fire", "yes", "no", "restart").

---

## 3. Game Engine & Rules Parity (Reference: `wumpus_speech/`)

The JS engine will faithfully mirror `wumpus_speech/wumpushost.py`:

```
┌────────────────────────────────────────────────────────┐
│                   Game Rules Summary                   │
├────────────────────────────────────────────────────────┤
│ • Rooms: 20 rooms (1–20), each with 3 exits            │
│ • Hazards: 2 Pits (lethal), 2 Bats (teleport player),  │
│   1 Wumpus (lethal if awakened/encountered)            │
│ • Player: 5 crooked arrows, 100 move stamina limit     │
│ • Warnings (at turn start):                            │
│     - Near Pit(s): "I feel a draft"                    │
│     - Near Bat(s): "I hear bats!"                      │
│     - Near Wumpus (within smell distance):             │
│       "I smell a wumpus!"                              │
│ • Actions: Move (M) or Shoot (S)                       │
│ • Moving:                                              │
│     - Valid neighbor: moves to room                    │
│     - Pit -> fell into pit, game over                  │
│     - Bats -> snatched to random room (recursive!)     │
│     - Wumpus -> eaten by wumpus, game over             │
│     - Invalid exit -> "BONK! That's not a possible     │
│       move" (no stamina loss)                          │
│ • Shooting:                                            │
│     - Select 1 to 5 rooms in flight path               │
│     - Cannot double back: room[i] == room[i+2]         │
│       -> "Arrows aren't that crooked" (no arrow spent) │
│     - Arrow flies along tunnels (or random if invalid) │
│     - Hit Wumpus -> WIN! (Score = 100 - moves)         │
│     - Hit Player -> "Shot yourself!", game over        │
│     - Miss -> arrow -1; wakes Wumpus:                  │
│         Wumpus moves 75% to adjacent room (25% still). │
│         If Wumpus enters player room -> groggy wumpus  │
│         eats player!                                   │
│     - Arrows reach 0 -> "Out of arrows!", game over    │
│ • Multi-map: Supports directed ins/outs & custom smell │
│   radii (standard, waterslide, mobius, risk)           │
└────────────────────────────────────────────────────────┘
```

---

## 4. 3D Visualizer & Dodecahedron Geometry

### 4.1 Topology & Vertex Isomorphism
A regular dodecahedron has:
- **20 Vertices**: Positioned at $(\pm 1, \pm 1, \pm 1)$, $(0, \pm \phi, \pm 1/\phi)$, $(\pm 1/\phi, 0, \pm \phi)$, $(\pm \phi, \pm 1/\phi, 0)$.
- **30 Edges**: Each vertex has exactly 3 neighbors at distance $2/\phi = \sqrt{5} - 1$.
- **12 Pentagonal Faces**.

In `standard.txt`, rooms are numbered 1 to 20 with specific neighbor linkages. We establish an exact isomorphic mapping:
$$\text{Room ID } (1 \dots 20) \longleftrightarrow \text{Vertex Position } (x, y, z) \in \mathbb{R}^3$$
This ensures that room 1 in the text log corresponds to the exact physical node 1 on the 3D dodecahedron, and its exits lead to nodes 2, 5, and 8 along physical 3D struts.

### 4.2 Visual Scene Elements
1. **Cave Frame**:
   - Translucent/wireframe dodecahedron body with metallic/slate luster.
   - 30 Tunnel struts (3D cylinders connecting adjacent nodes).
2. **20 Room Nodes**:
   - Floating circular or spherical nodes.
   - Room numbers (1–20) rendered via billboard text sprites or high-contrast 3D canvas textures.
   - Interactive: Raycaster highlights node on hover/touch.
3. **Entity Markers**:
   - **Player**: Stylized 3D arrowhead / crystal tetrahedron positioned over the current node, orientated outward along the normal vector $\vec{n} = \frac{\vec{v}}{\|\vec{v}\|}$.
   - **Wumpus**: Stylized red beast / horned icon with a pulsating glow.
   - **Pits**: Dark swirling vortex / inverted cylinder cone.
   - **Bats**: Winged icon / flapping silhouette.
4. **Difficulty Visual Modes**:
   - **Hardest**: Unexplored nodes are darkened/hidden. Only the current room and its 3 connected neighbors are visible. No hazard icons.
   - **Normal**: Visited rooms remain illuminated. Discovered clues (e.g. draft, bat chatter, smell) display persistent detective badges on the room nodes.
   - **Tutorial (Easiest)**: Full god-mode reveal. All nodes, the Wumpus, and all hazards are permanently visible.
5. **Animations**:
   - Smooth interpolation (lerp/slerp) of the player marker along tunnel curves when moving.
   - Swooping bat animation when super-bats snatch the player.
   - Glowing golden arrow projectile tracing through the selected room path when shooting.

---

## 5. Mobile & Small Form-Factor UI Design

### 5.1 Responsive Layout Strategy
- **Desktop Screens ($\ge 900\text{px}$)**:
  - Split screen: Text Console on the left (40%), 3D Cave Canvas on the right (60%).
- **Mobile Screens ($< 900\text{px}$)**:
  - **GUI-Prioritized**: 3D Cave Canvas occupies full viewport.
  - **Floating HUD**: Compact top/bottom bar showing:
    - Current Room & Senses badge (e.g. `Room 14` `[Draft!]`).
    - Action buttons: `Move`, `Shoot`, `Mic (Hold to talk)`, `Difficulty`.
  - **View Switcher**: A quick floating toggle button (`[Text Console / 3D Cave]`) or swipeable bottom drawer allowing instant switching between 3D navigation and the classic text log.
  - **Touch Gestures**:
    - 1-finger drag: Rotate cave in 3D (`OrbitControls`).
    - 2-finger pinch: Zoom in/out.
    - Single tap on node: Select node to move or shoot.

---

## 6. Project Architecture & File Structure

```
wumpus_js_speech/
├── index.html               # Main application entry point & responsive layout
├── css/
│   └── style.css            # Responsive styles (desktop split-pane & mobile GUI)
├── js/
│   ├── engine/
│   │   ├── game.js          # Core ruleset, game loop, scoring, state
│   │   ├── map.js           # Map loader (dodecahedron, waterslide, mobius, risk)
│   │   └── maps/            # Map definition files (standard.json, waterslide.json, etc.)
│   ├── viz/
│   │   ├── scene.js         # Three.js scene setup, lighting, camera controls
│   │   ├── dodecahedron.js  # Node & tunnel mesh generation + coordinate mapping
│   │   ├── markers.js       # Player, Wumpus, Bat, Pit 3D markers & animations
│   │   └── difficulty.js    # Fog-of-war & visibility controller (Hard / Normal / Easy)
│   ├── speech/
│   │   ├── stt_controller.js # Speech manager (Whisper worker + Web Speech fallback)
│   │   ├── parser.js        # Voice command parser ("move 14", "shoot 15 6 16")
│   │   └── worker.js        # Web Worker running Transformers.js Whisper offline
│   └── ui/
│       ├── terminal.js      # Classic text log, command prompt & input handling
│       ├── hud.js           # Mobile HUD overlay, difficulty picker, mode toggles
│       └── app.js           # Main coordinator wiring engine, viz, UI, and speech
├── assets/                  # Icons, offline model cache / vendor scripts
├── PLAN.md                  # This detailed project specification
└── README.md                # Project documentation & user guide
```

---

## 7. Phased Implementation Roadmap

1. **Phase 1: Core Engine & Map Parity**
   - Implement `WumpusGame` with full state machine, hazard checks, crooked arrow simulation, bat recursion, and scoring matching `wumpushost.py`.
   - Implement map graph abstraction supporting 20-room layouts with arbitrary directed/undirected edges.
2. **Phase 2: 3D Dodecahedron & Interactive Nodes**
   - Calculate exact 3D coordinates and edges for the dodecahedron.
   - Build 20 clickable node meshes with room labels and 30 connecting tunnel tubes.
   - Integrate `OrbitControls` with mobile touch support and raycasting selection.
3. **Phase 3: 3D Entity Markers, Animations & Difficulty Modes**
   - Create 3D markers for Player, Wumpus, Bats, and Pits.
   - Implement Fog of War manager: Hardest (pure local fog), Normal (explored history + sensory badges), Tutorial (god mode).
   - Add smooth move animations and arrow flight trajectories.
4. **Phase 4: Speech-to-Text (STT) Integration**
   - Implement `stt_controller.js` with Web Speech API instant mode and Transformers.js Whisper offline Web Worker.
   - Implement flexible speech command parser handling natural speech variations.
   - Add UI status pill with download progress and microphone toggle.
5. **Phase 5: Mobile Responsive Layout & Dual Sync**
   - Build responsive layout with mobile GUI focus and seamless view switcher.
   - Ensure complete bidirectional synchronization: actions triggered by typing, clicking 3D nodes, or speaking voice commands update the text log, 3D visualizer, and game state simultaneously.
6. **Phase 6: Testing, Polish & Multi-Map Verification**
   - Test offline execution (service worker / cache).
   - Verify rules against edge cases (bat loops, 5-room crooked arrow rebounds, out of arrows).
   - Verify mobile touch responsiveness across various screen dimensions.
