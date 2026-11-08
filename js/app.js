import { WumpusGame, ActionResult, GameStatus } from './engine/game.js';
import { MAP_DATA } from './engine/map_data.js';
import { WumpusViz } from './viz/scene.js';
import { TerminalUI } from './ui/terminal.js';
import { HUD } from './ui/hud.js';
import { STTController } from './speech/stt_controller.js';
import { CommandParser } from './speech/parser.js';

class App {
    constructor() {
        this.currentMapName = 'standard';
        this.game = new WumpusGame({ mapName: this.currentMapName });
        this.context = { waitingFor: 'action' }; // 'action', 'move_room', 'shoot_rooms'

        // UI Components
        this.terminal = new TerminalUI(
            document.getElementById('terminal-log'),
            document.getElementById('input'),
            (cmd) => this.handleCommand(cmd)
        );

        const canvas = document.getElementById('c');
        this.viz = new WumpusViz(canvas, {
            mapData: MAP_DATA[this.currentMapName],
            onNodeSelected: (roomId) => this.handleNodeSelected(roomId)
        });

        this.hud = new HUD(document.getElementById('hud-overlay'), {
            onActionChange: (mode) => {
                if (mode === 'move') {
                    this.context.waitingFor = 'move_room';
                    this.terminal.print('Select a connected room to move to (by clicking 3D node, typing number, or voice).');
                } else {
                    this.context.waitingFor = 'shoot_rooms';
                    this.terminal.print('Select 1 to 5 rooms for arrow path, then click Fire! (or type numbers separated by commas).');
                }
            },
            onShootFired: (targets) => {
                this.executeShoot(targets);
            },
            onMicToggle: () => {
                this.stt.toggleListening();
            },
            onSttEngineChange: (engine) => {
                this.stt.setEngine(engine, (pct) => {
                    this.hud.setSpeechStatus(`Downloading Whisper: ${pct}%`);
                });
                const label = engine === 'web_speech' ? 'Web Speech API' : 'Local Whisper (~39MB offline model)';
                this.terminal.print(`Speech engine set to: <b>${label}</b>`);
            },
            onDifficultyChange: (mode) => {
                this.viz.setDifficultyMode(mode);
                this.viz.updateState(this.game.getStatus());
                this.terminal.print(`Difficulty set to: ${mode.toUpperCase()}`);
            },
            onMapChange: (mapName) => {
                this.changeMap(mapName);
            },
            onNewGame: () => {
                this.startNewGame();
            },
            onToggleView: () => {
                this.toggleMobileView();
            }
        });

        // STT Setup
        this.stt = new STTController({
            onResult: (text) => {
                this.hud.setSpeechStatus(`Heard: "${text}"`);
                this.terminal.print(`🎤 "${text}"`, 'user-command');
                this.handleCommand(text);
            },
            onStatus: (msg) => {
                this.hud.setSpeechStatus(msg);
            },
            onListeningChange: (isListening) => {
                this.hud.setListening(isListening);
            },
            onError: (err) => {
                this.hud.setSpeechStatus(`Mic error: ${err}`);
            }
        });

        this._setupMobileCloseButton();
        this._startInitialGame();
    }

    _setupMobileCloseButton() {
        const closeBtn = document.getElementById('terminal-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                document.querySelector('.text-panel').classList.remove('open');
            });
        }
    }

    toggleMobileView() {
        const panel = document.querySelector('.text-panel');
        panel.classList.toggle('open');
        if (panel.classList.contains('open')) {
            this.terminal.focusInput();
        }
    }

    _startInitialGame() {
        this.terminal.clear();
        this.terminal.printHelp();
        this.terminal.print('----------------------------------------------------');
        this.syncState();
    }

    startNewGame(seed = undefined) {
        this.game = new WumpusGame({ mapName: this.currentMapName, seed });
        this.hud.clearShootTargets();
        this.hud.setMode('move');
        this.context.waitingFor = 'action';

        this.terminal.clear();
        this.terminal.print(`Starting a new game on <b>${MAP_DATA[this.currentMapName].title}</b> (Seed: ${this.game.seed})...`);
        this.syncState();
    }

    changeMap(mapName) {
        if (!MAP_DATA[mapName]) return;
        this.currentMapName = mapName;
        // Recreate visualizer graph with new map coordinates
        const canvas = document.getElementById('c');
        this.viz = new WumpusViz(canvas, {
            mapData: MAP_DATA[this.currentMapName],
            onNodeSelected: (roomId) => this.handleNodeSelected(roomId)
        });
        this.startNewGame();
    }

    syncState() {
        const status = this.game.getStatus();
        this.terminal.printStatus(status);
        this.viz.updateState(status);
        this.hud.updateStats(status);
    }

    handleNodeSelected(roomId) {
        if (this.game.status !== GameStatus.PLAYING) {
            this.terminal.print('Game is over. Click "New Game" to play again.');
            return;
        }

        if (this.hud.currentMode === 'move') {
            this.executeMove(roomId);
        } else {
            // Shoot mode: add to arrow flight path
            this.hud.addShootTarget(roomId);
            this.terminal.print(`Aim target added: Room ${roomId}`);
        }
    }

    handleCommand(rawText) {
        const cmd = CommandParser.parse(rawText, this.context);
        if (!cmd) return;

        if (cmd.type === 'SELECT_MOVE') {
            this.hud.setMode('move');
            this.context.waitingFor = 'move_room';
            this.terminal.print('Where to? (Enter room number or tap on 3D node)');
        } else if (cmd.type === 'SELECT_SHOOT') {
            this.hud.setMode('shoot');
            this.context.waitingFor = 'shoot_rooms';
            this.terminal.print('Enter room numbers for arrow flight (up to 5 separated by commas), or tap 3D nodes:');
        } else if (cmd.type === 'MOVE') {
            this.executeMove(cmd.room);
        } else if (cmd.type === 'SHOOT') {
            this.executeShoot(cmd.rooms);
        } else if (cmd.type === 'HELP') {
            this.terminal.printHelp();
        } else if (cmd.type === 'RESTART') {
            this.startNewGame();
        } else {
            this.terminal.print(`Command not recognized: "${rawText}". Type 'help' for instructions.`);
        }
    }

    executeMove(targetRoom) {
        if (this.game.status !== GameStatus.PLAYING) {
            this.terminal.print('Game is over. Click "New Game" to play again.');
            return;
        }

        const res = this.game.move(targetRoom);

        if (res.result === ActionResult.NOT_AN_EXIT) {
            this.terminal.print("BONK! That's not a possible move.");
            return;
        }

        // Animate move along path
        this.viz.animatePlayerMove(res.path, () => {
            this.viz.updateState(this.game.getStatus());
        });

        if (res.batsInvolved) {
            this.terminal.print('ZAP -- Super Bat snatch! Elsewhereville for you!', 'warning-line');
        }

        if (res.result === ActionResult.MET_WUMPUS) {
            this.terminal.printResult('TSK TSK TSK - Wumpus got you! HA HA HA - You lose!');
        } else if (res.result === ActionResult.FELL_IN_PIT) {
            this.terminal.printResult('YYYIIIIEEEE . . . Fell in a pit. HA HA HA - You lose!');
        } else if (res.result === ActionResult.EXHAUSTED) {
            this.terminal.printResult('OOF! You collapse from exhaustion. HA HA HA - You lose!');
        } else if (res.result === ActionResult.MOVE_SUCCESSFUL) {
            this.terminal.printStatus(this.game.getStatus());
        }

        this.hud.updateStats(this.game.getStatus());
        this.context.waitingFor = 'action';
    }

    executeShoot(roomList) {
        if (this.game.status !== GameStatus.PLAYING) {
            this.terminal.print('Game is over. Click "New Game" to play again.');
            return;
        }

        const res = this.game.shoot(roomList);

        if (res.result === ActionResult.TOO_CROOKED) {
            this.terminal.print("Arrows aren't that crooked - try another room.");
            return;
        }

        // Animate arrow trajectory
        if (res.flightPath && res.flightPath.length > 1) {
            this.viz.animateArrowShoot(res.flightPath, () => {
                this.viz.updateState(this.game.getStatus());
            });
        }

        if (res.result === ActionResult.WUMPUS_KILLED) {
            this.terminal.printResult(`AHA! You got the wumpus!\nHEE HEE HEE - The wumpus'll getcha next time!!\nYou got a score of ${res.score}`, true);
        } else if (res.result === ActionResult.SHOT_SELF) {
            this.terminal.printResult('LOOK OUT! Thunk! You shot yourself! HA HA HA - You lose!');
        } else if (res.result === ActionResult.KILLED_BY_GROGGY_WUMPUS) {
            this.terminal.printResult('CLANG! Missed and a groggy wumpus just ate you! HA HA HA - You lose!');
        } else if (res.result === ActionResult.OUT_OF_ARROWS) {
            this.terminal.printResult('WHIZZ! Oh no! Out of arrows. At night the ice weasels come for you... HA HA HA - You lose!');
        } else if (res.result === ActionResult.WUMPUS_MISSED) {
            this.terminal.print("SWISH! The wumpus didn't like that. He may have moved to a quieter room.");
            this.terminal.printStatus(this.game.getStatus());
        }

        this.hud.updateStats(this.game.getStatus());
        this.hud.setMode('move');
        this.context.waitingFor = 'action';
    }
}

// Bootstrap app when DOM is ready
function initApp() {
    if (!window.app) {
        window.app = new App();
    }
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

