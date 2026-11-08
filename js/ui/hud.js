/**
 * Floating HUD & Mobile Controls for 3D Cave
 */
export class HUD {
    constructor(containerEl, options = {}) {
        this.container = containerEl;
        this.onActionChange = options.onActionChange || (() => {});
        this.onShootFired = options.onShootFired || (() => {});
        this.onMicToggle = options.onMicToggle || (() => {});
        this.onDifficultyChange = options.onDifficultyChange || (() => {});
        this.onThemeChange = options.onThemeChange || (() => {});
        this.onAutoZoomToggle = options.onAutoZoomToggle || (() => {});
        this.onSttEngineChange = options.onSttEngineChange || (() => {});
        this.onMapChange = options.onMapChange || (() => {});
        this.onNewGame = options.onNewGame || (() => {});
        this.onToggleView = options.onToggleView || (() => {});

        this.currentMode = 'move'; // 'move' or 'shoot'
        this.autoZoom = true;
        this.shootTargets = [];

        this._render();
        this._bindEvents();
    }

    _render() {
        this.container.innerHTML = `
            <div class="hud-top-bar">
                <div class="hud-stats">
                    <span class="hud-badge room-badge" id="hud-room">Room --</span>
                    <span class="hud-badge arrows-badge" id="hud-arrows">🏹 5</span>
                    <span class="hud-badge moves-badge" id="hud-moves">Moves: 0</span>
                </div>
                <div class="hud-sensory-badges" id="hud-sensory">
                    <span class="sense-pill draft-pill" id="pill-draft" style="display:none;">💨 Draft</span>
                    <span class="sense-pill bats-pill" id="pill-bats" style="display:none;">🦇 Bats</span>
                    <span class="sense-pill smell-pill" id="pill-smell" style="display:none;">🦨 Wumpus</span>
                </div>
                <div class="hud-settings">
                    <select id="hud-theme" class="hud-select" title="Cave Visual Theme">
                        <option value="solid_green" selected>Theme: Classic Green (Solid)</option>
                        <option value="obsidian">Theme: Obsidian Basalt (Solid)</option>
                        <option value="cave_rock">Theme: Cavern Rock (Solid)</option>
                        <option value="wireframe_crystal">Theme: Neon Crystal (Translucent)</option>
                        <option value="deep_space">Theme: Deep Space (Open)</option>
                    </select>
                    <select id="hud-difficulty" class="hud-select" title="Difficulty / Fog of War">
                        <option value="normal" selected>Normal</option>
                        <option value="hardest">Hardest (Classic)</option>
                        <option value="tutorial">Tutorial (Easy)</option>
                    </select>
                    <select id="hud-map" class="hud-select" title="Cave Map">
                        <option value="standard" selected>Dodecahedron</option>
                        <option value="waterslide">Waterslide</option>
                        <option value="mobius">Möbius</option>
                        <option value="risk">Risk</option>
                    </select>
                    <button class="btn btn-zoom active" id="btn-auto-zoom" title="Toggle camera auto-zoom on move">Zoom: ON</button>
                </div>
            </div>

            <!-- Shoot Path Bar (Visible when in Shoot mode) -->
            <div class="hud-shoot-bar" id="hud-shoot-bar" style="display:none;">
                <span class="shoot-label">Aim Arrow (up to 5 rooms):</span>
                <span class="shoot-path-list" id="shoot-path-list">None</span>
                <button class="btn btn-fire" id="btn-fire-arrow" disabled>Fire! 🏹</button>
                <button class="btn btn-clear" id="btn-clear-path">Clear</button>
            </div>

            <div class="hud-bottom-bar">
                <div class="hud-actions">
                    <button class="btn btn-mode active" id="btn-mode-move">Move</button>
                    <button class="btn btn-mode" id="btn-mode-shoot">Shoot</button>
                </div>

                <div class="hud-speech">
                    <button class="btn btn-mic" id="btn-mic" title="Voice Command">
                        <span class="mic-icon">🎙️</span>
                        <span class="mic-label" id="mic-label">Speak</span>
                    </button>
                    <select id="hud-stt-engine" class="hud-select" title="Speech Recognition Engine">
                        <option value="web_speech" selected>Web Speech (Default)</option>
                        <option value="whisper_offline">Local Whisper (~39MB)</option>
                    </select>
                    <span class="hud-speech-status" id="speech-status"></span>
                </div>

                <div class="hud-system">
                    <button class="btn btn-view-toggle" id="btn-view-toggle">Terminal ⌨️</button>
                    <button class="btn btn-restart" id="btn-restart" title="New Game">New Game</button>
                </div>
            </div>
        `;
    }

    _bindEvents() {
        const btnMove = this.container.querySelector('#btn-mode-move');
        const btnShoot = this.container.querySelector('#btn-mode-shoot');
        const btnMic = this.container.querySelector('#btn-mic');
        const btnFire = this.container.querySelector('#btn-fire-arrow');
        const btnClear = this.container.querySelector('#btn-clear-path');
        const diffSelect = this.container.querySelector('#hud-difficulty');
        const themeSelect = this.container.querySelector('#hud-theme');
        const mapSelect = this.container.querySelector('#hud-map');
        const btnZoom = this.container.querySelector('#btn-auto-zoom');
        const btnRestart = this.container.querySelector('#btn-restart');
        const btnToggleView = this.container.querySelector('#btn-view-toggle');

        if (btnZoom) {
            btnZoom.addEventListener('click', () => {
                this.autoZoom = !this.autoZoom;
                if (this.autoZoom) {
                    btnZoom.classList.add('active');
                    btnZoom.textContent = 'Zoom: ON';
                } else {
                    btnZoom.classList.remove('active');
                    btnZoom.textContent = 'Zoom: OFF';
                }
                this.onAutoZoomToggle(this.autoZoom);
            });
        }

        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                this.onThemeChange(e.target.value);
            });
        }

        btnMove.addEventListener('click', () => {
            this.setMode('move');
        });

        btnShoot.addEventListener('click', () => {
            this.setMode('shoot');
        });

        btnMic.addEventListener('click', () => {
            this.onMicToggle();
        });

        btnFire.addEventListener('click', () => {
            if (this.shootTargets.length > 0) {
                this.onShootFired([...this.shootTargets]);
                this.clearShootTargets();
            }
        });

        btnClear.addEventListener('click', () => {
            this.clearShootTargets();
        });

        const sttSelect = this.container.querySelector('#hud-stt-engine');
        if (sttSelect) {
            sttSelect.addEventListener('change', (e) => {
                this.onSttEngineChange(e.target.value);
            });
        }

        diffSelect.addEventListener('change', (e) => {
            this.onDifficultyChange(e.target.value);
        });

        mapSelect.addEventListener('change', (e) => {
            this.onMapChange(e.target.value);
        });

        btnRestart.addEventListener('click', () => {
            this.onNewGame();
        });

        btnToggleView.addEventListener('click', () => {
            this.onToggleView();
        });
    }

    setMode(mode) {
        this.currentMode = mode;
        const btnMove = this.container.querySelector('#btn-mode-move');
        const btnShoot = this.container.querySelector('#btn-mode-shoot');
        const shootBar = this.container.querySelector('#hud-shoot-bar');

        if (mode === 'move') {
            btnMove.classList.add('active');
            btnShoot.classList.remove('active');
            shootBar.style.display = 'none';
            this.clearShootTargets();
        } else {
            btnShoot.classList.add('active');
            btnMove.classList.remove('active');
            shootBar.style.display = 'flex';
        }
        this.onActionChange(mode);
    }

    addShootTarget(roomId) {
        if (this.shootTargets.length < 5) {
            this.shootTargets.push(roomId);
            this._updateShootPathDisplay();
        }
    }

    clearShootTargets() {
        this.shootTargets = [];
        this._updateShootPathDisplay();
    }

    _updateShootPathDisplay() {
        const pathEl = this.container.querySelector('#shoot-path-list');
        const fireBtn = this.container.querySelector('#btn-fire-arrow');

        if (this.shootTargets.length === 0) {
            pathEl.textContent = 'Tap adjacent rooms to aim';
            fireBtn.disabled = true;
        } else {
            pathEl.innerHTML = this.shootTargets.map(r => `<span class="path-chip">${r}</span>`).join(' ➔ ');
            fireBtn.disabled = false;
        }
    }

    updateStats(status) {
        this.container.querySelector('#hud-room').textContent = `Room ${status.hunter}`;
        this.container.querySelector('#hud-arrows').textContent = `🏹 ${status.arrows}`;
        this.container.querySelector('#hud-moves').textContent = `Moves: ${status.moves}`;

        this.container.querySelector('#pill-draft').style.display = status.nearPit ? 'inline-flex' : 'none';
        this.container.querySelector('#pill-bats').style.display = status.nearBats ? 'inline-flex' : 'none';
        this.container.querySelector('#pill-smell').style.display = status.nearWumpus ? 'inline-flex' : 'none';
    }

    setListening(isListening) {
        const btnMic = this.container.querySelector('#btn-mic');
        const label = this.container.querySelector('#mic-label');
        if (isListening) {
            btnMic.classList.add('listening');
            label.textContent = 'Listening...';
        } else {
            btnMic.classList.remove('listening');
            label.textContent = 'Speak';
        }
    }

    setSpeechStatus(text) {
        const el = this.container.querySelector('#speech-status');
        el.textContent = text;
        if (text) {
            el.style.opacity = '1';
            clearTimeout(this._statusTimer);
            this._statusTimer = setTimeout(() => {
                el.style.opacity = '0';
            }, 3500);
        }
    }
}
