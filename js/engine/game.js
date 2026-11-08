import { MAP_DATA } from './map_data.js';

export const ActionResult = Object.freeze({
    MOVE_SUCCESSFUL: 'MOVE_SUCCESSFUL',
    MET_WUMPUS: 'MET_WUMPUS',
    FELL_IN_PIT: 'FELL_IN_PIT',
    WUMPUS_KILLED: 'WUMPUS_KILLED',
    WUMPUS_MISSED: 'WUMPUS_MISSED',
    KILLED_BY_GROGGY_WUMPUS: 'KILLED_BY_GROGGY_WUMPUS',
    TOO_CROOKED: 'TOO_CROOKED',
    OUT_OF_ARROWS: 'OUT_OF_ARROWS',
    SHOT_SELF: 'SHOT_SELF',
    EXHAUSTED: 'EXHAUSTED',
    NOT_AN_EXIT: 'NOT_AN_EXIT'
});

export const GameStatus = Object.freeze({
    PLAYING: 'PLAYING',
    WON: 'WON',
    LOST: 'LOST'
});

/**
 * Fast Mulberry32 PRNG for seeded games
 */
export function createPRNG(seed) {
    let s = (Math.abs(seed) || 123456789) >>> 0;
    return function() {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export class WumpusGame {
    constructor(options = {}) {
        this.mapName = options.mapName || 'standard';
        this.seed = options.seed !== undefined ? options.seed : Math.floor(Math.random() * 1000000);
        this.map = null;
        this.prng = null;
        
        // Game state
        this.hunter = null;
        this.wumpus = null;
        this.pits = [];
        this.bats = [];
        this.arrows = 5;
        this.moves = 0;
        this.score = 0;
        this.status = GameStatus.PLAYING;
        
        // Exploration tracking (1-indexed room IDs)
        this.visited = new Set();
        this.sensedClues = {}; // roomId -> { draft: bool, bats: bool, wumpus: bool }
        this.history = []; // record of all actions for replay
        
        this.init(this.seed, this.mapName);
    }

    init(seed, mapName) {
        if (mapName && MAP_DATA[mapName]) {
            this.mapName = mapName;
        }
        this.map = JSON.parse(JSON.stringify(MAP_DATA[this.mapName]));
        this.seed = seed !== undefined ? seed : Math.floor(Math.random() * 1000000);
        this.prng = createPRNG(this.seed);
        
        this.arrows = 5;
        this.moves = 0;
        this.score = 0;
        this.status = GameStatus.PLAYING;
        this.visited = new Set();
        this.sensedClues = {};
        this.history = [];

        // Sample 6 unique rooms: [hunter, bat1, bat2, pit1, pit2, wumpus]
        const roomIds = Object.keys(this.map.rooms).map(Number);
        const sampled = this._sample(roomIds, 6);
        
        this.hunter = sampled[0];
        this.bats = [sampled[1], sampled[2]];
        this.pits = [sampled[3], sampled[4]];
        this.wumpus = sampled[5];

        // Mark starting room explored
        this.visited.add(this.hunter);
        this._recordClues(this.hunter);
    }

    _sample(array, k) {
        const copy = [...array];
        const result = [];
        for (let i = 0; i < k; i++) {
            const index = Math.floor(this.prng() * copy.length);
            result.push(copy.splice(index, 1)[0]);
        }
        return result;
    }

    _choice(array) {
        if (!array || array.length === 0) return null;
        const index = Math.floor(this.prng() * array.length);
        return array[index];
    }

    /**
     * Compute proximity warnings for any room
     */
    getProximity(roomId) {
        const room = this.map.rooms[roomId];
        if (!room) return { nearPit: false, nearBats: false, nearWumpus: false };

        const neighbors = [...new Set([...room.outs, ...room.ins])];
        
        const nearPit = neighbors.some(n => this.pits.includes(n));
        const nearBats = neighbors.some(n => this.bats.includes(n));

        // Wumpus smell distance BFS
        let nearWumpus = false;
        const maxDist = this.map.smellDistance || 1;
        const visitedDist = new Map();
        const queue = [{ id: roomId, dist: 0 }];
        visitedDist.set(roomId, 0);

        while (queue.length > 0) {
            const current = queue.shift();
            if (current.dist > 0 && current.id === this.wumpus) {
                nearWumpus = true;
                break;
            }
            if (current.dist < maxDist) {
                const adj = [...new Set([...this.map.rooms[current.id].outs, ...this.map.rooms[current.id].ins])];
                for (const nextId of adj) {
                    if (!visitedDist.has(nextId)) {
                        visitedDist.set(nextId, current.dist + 1);
                        queue.push({ id: nextId, dist: current.dist + 1 });
                    }
                }
            }
        }

        return { nearPit, nearBats, nearWumpus };
    }

    _recordClues(roomId) {
        const prox = this.getProximity(roomId);
        this.sensedClues[roomId] = { ...prox };
    }

    /**
     * Get current status bundle
     */
    getStatus() {
        const room = this.map.rooms[this.hunter];
        const prox = this.getProximity(this.hunter);
        const exits = [...room.outs];
        const entrances = [...room.ins];
        const visibleOnly = entrances.filter(x => !exits.includes(x));

        return {
            hunter: this.hunter,
            wumpus: this.wumpus,
            pits: [...this.pits],
            bats: [...this.bats],
            arrows: this.arrows,
            moves: this.moves,
            score: this.score,
            status: this.status,
            seed: this.seed,
            nearPit: prox.nearPit,
            nearBats: prox.nearBats,
            nearWumpus: prox.nearWumpus,
            exits: exits,
            entrances: entrances,
            visibleOnly: visibleOnly,
            visited: Array.from(this.visited),
            sensedClues: { ...this.sensedClues }
        };
    }

    /**
     * Perform a move action to target room
     */
    move(newRoom) {
        newRoom = Number(newRoom);
        if (this.status !== GameStatus.PLAYING) {
            return { result: ActionResult.EXHAUSTED, gameStatus: this.status, message: 'Game is over.' };
        }

        const currentRoomData = this.map.rooms[this.hunter];
        if (!currentRoomData.outs.includes(newRoom)) {
            return {
                result: ActionResult.NOT_AN_EXIT,
                gameStatus: this.status,
                startRoom: this.hunter,
                finalRoom: this.hunter,
                batsInvolved: false,
                path: [this.hunter]
            };
        }

        this.history.push({ action: 'move', target: newRoom });

        // Resolve landing (with possible recursive bat snatches)
        const path = [this.hunter, newRoom];
        const resolution = this._resolveLanding(newRoom, path);

        this.hunter = resolution.finalRoom;
        this.visited.add(this.hunter);
        this._recordClues(this.hunter);

        if (resolution.result === ActionResult.MET_WUMPUS) {
            this.status = GameStatus.LOST;
            this.score = 0;
        } else if (resolution.result === ActionResult.FELL_IN_PIT) {
            this.status = GameStatus.LOST;
            this.score = 0;
        } else if (resolution.result === ActionResult.MOVE_SUCCESSFUL) {
            this.moves += 1;
            if (this.moves >= 100) {
                this.status = GameStatus.LOST;
                resolution.result = ActionResult.EXHAUSTED;
                this.score = 0;
            }
        }

        return {
            result: resolution.result,
            gameStatus: this.status,
            startRoom: path[0],
            firstTarget: newRoom,
            finalRoom: this.hunter,
            batsInvolved: resolution.batsInvolved,
            path: path,
            moves: this.moves,
            score: this.score
        };
    }

    _resolveLanding(room, path) {
        if (room === this.wumpus) {
            return { finalRoom: room, result: ActionResult.MET_WUMPUS, batsInvolved: false };
        }
        if (this.pits.includes(room)) {
            return { finalRoom: room, result: ActionResult.FELL_IN_PIT, batsInvolved: false };
        }
        if (this.bats.includes(room)) {
            // Super bat snatch: drop into random room (1..20)
            const allRooms = Object.keys(this.map.rooms).map(Number);
            const dropRoom = this._choice(allRooms);
            path.push(dropRoom);
            const next = this._resolveLanding(dropRoom, path);
            return { finalRoom: next.finalRoom, result: next.result, batsInvolved: true };
        }
        return { finalRoom: room, result: ActionResult.MOVE_SUCCESSFUL, batsInvolved: false };
    }

    /**
     * Perform a shoot action along a list of up to 5 rooms
     */
    shoot(roomList) {
        if (this.status !== GameStatus.PLAYING) {
            return { result: ActionResult.OUT_OF_ARROWS, gameStatus: this.status, message: 'Game is over.' };
        }

        roomList = roomList.map(Number).filter(r => !isNaN(r) && r > 0);
        if (roomList.length === 0) {
            return { result: ActionResult.NOT_AN_EXIT, gameStatus: this.status, message: 'No rooms specified.' };
        }

        const fullList = [this.hunter, ...roomList];

        // Check crookedness: cannot immediately double back (room[i] == room[i+2])
        for (let i = 0; i < fullList.length - 2; i++) {
            if (fullList[i] === fullList[i + 2]) {
                return {
                    result: ActionResult.TOO_CROOKED,
                    gameStatus: this.status,
                    arrows: this.arrows,
                    flightPath: [this.hunter]
                };
            }
        }

        this.history.push({ action: 'shoot', target: roomList });

        // Simulate arrow flight path
        let arrowLocation = this.hunter;
        const flightPath = [this.hunter];
        let hitResult = ActionResult.WUMPUS_MISSED;

        for (const target of roomList.slice(0, 5)) {
            const passages = [...new Set([...this.map.rooms[arrowLocation].outs, ...this.map.rooms[arrowLocation].ins])];
            if (passages.includes(target)) {
                arrowLocation = target;
            } else {
                arrowLocation = this._choice(passages);
            }
            flightPath.push(arrowLocation);

            if (arrowLocation === this.wumpus) {
                hitResult = ActionResult.WUMPUS_KILLED;
                break;
            } else if (arrowLocation === this.hunter) {
                hitResult = ActionResult.SHOT_SELF;
                break;
            }
        }

        if (hitResult === ActionResult.WUMPUS_KILLED) {
            this.status = GameStatus.WON;
            this.score = 100 - this.moves;
            return {
                result: ActionResult.WUMPUS_KILLED,
                gameStatus: this.status,
                arrows: this.arrows,
                score: this.score,
                flightPath
            };
        }

        if (hitResult === ActionResult.SHOT_SELF) {
            this.status = GameStatus.LOST;
            this.score = 0;
            return {
                result: ActionResult.SHOT_SELF,
                gameStatus: this.status,
                arrows: this.arrows,
                score: this.score,
                flightPath
            };
        }

        // Missed shot: arrow count drops, Wumpus wakes up
        this.arrows -= 1;
        const wumpusWokeAndMoved = this._wakeWumpus();

        if (wumpusWokeAndMoved.ateHunter) {
            this.status = GameStatus.LOST;
            this.score = 0;
            return {
                result: ActionResult.KILLED_BY_GROGGY_WUMPUS,
                gameStatus: this.status,
                arrows: this.arrows,
                score: this.score,
                flightPath,
                wumpusMoved: true,
                newWumpusRoom: this.wumpus
            };
        }

        if (this.arrows <= 0) {
            this.status = GameStatus.LOST;
            this.score = 0;
            return {
                result: ActionResult.OUT_OF_ARROWS,
                gameStatus: this.status,
                arrows: this.arrows,
                score: this.score,
                flightPath,
                wumpusMoved: wumpusWokeAndMoved.moved,
                newWumpusRoom: this.wumpus
            };
        }

        // Update clues for hunter since Wumpus may have moved closer or farther
        this._recordClues(this.hunter);

        return {
            result: ActionResult.WUMPUS_MISSED,
            gameStatus: this.status,
            arrows: this.arrows,
            score: this.score,
            flightPath,
            wumpusMoved: wumpusWokeAndMoved.moved,
            newWumpusRoom: this.wumpus
        };
    }

    _wakeWumpus() {
        // Wumpus moves with P=0.75 to adjacent room, or stays (P=0.25)
        const roomData = this.map.rooms[this.wumpus];
        const choices = [...roomData.outs, this.wumpus];
        const nextRoom = this._choice(choices);
        const moved = nextRoom !== this.wumpus;
        this.wumpus = nextRoom;

        return {
            moved: moved,
            ateHunter: this.wumpus === this.hunter
        };
    }
}
