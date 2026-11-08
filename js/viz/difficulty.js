/**
 * Manages Fog of War and entity visibility across the three difficulty tiers:
 * - 'hardest': Classic mode. Strict fog of war. Only current room and immediate exits visible.
 * - 'normal': Standard mode. Visited trail and sensory deduction clues visible.
 * - 'tutorial': God mode. Full reveal. Wumpus and all hazards visible at all times.
 */
export class DifficultyManager {
    constructor() {
        this.mode = 'normal'; // default mode
    }

    setMode(mode) {
        if (['hardest', 'normal', 'tutorial'].includes(mode)) {
            this.mode = mode;
        }
    }

    getMode() {
        return this.mode;
    }

    /**
     * Updates visibility and materials of graph nodes, tunnels, and markers
     */
    apply(status, caveGraph, markerManager) {
        const {
            hunter,
            wumpus,
            pits,
            bats,
            exits,
            visited,
            sensedClues,
            status: gameStatus
        } = status;

        const isGameOver = gameStatus !== 'PLAYING';
        const isWon = gameStatus === 'WON';

        // 1. Position Markers
        if (hunter && caveGraph.nodeMeshes.has(hunter)) {
            const hPos = caveGraph.nodeMeshes.get(hunter).position;
            if (!markerManager.activeMoveAnimation) {
                markerManager.orientOutward(markerManager.playerMesh, hPos, 14);
            }
            markerManager.playerMesh.visible = true;
        }

        // Position Wumpus
        if (wumpus && caveGraph.nodeMeshes.has(wumpus)) {
            const wPos = caveGraph.nodeMeshes.get(wumpus).position;
            markerManager.orientOutward(markerManager.wumpusMesh, wPos, 16);
        }

        // Position Pits
        pits.forEach((pitRoom, idx) => {
            if (markerManager.pitMeshes[idx] && caveGraph.nodeMeshes.has(pitRoom)) {
                const pPos = caveGraph.nodeMeshes.get(pitRoom).position;
                markerManager.orientOutward(markerManager.pitMeshes[idx], pPos, 10);
            }
        });

        // Position Bats
        bats.forEach((batRoom, idx) => {
            if (markerManager.batMeshes[idx] && caveGraph.nodeMeshes.has(batRoom)) {
                const bPos = caveGraph.nodeMeshes.get(batRoom).position;
                markerManager.orientOutward(markerManager.batMeshes[idx], bPos, 14);
            }
        });

        // 2. Control Marker Visibility based on Difficulty
        if (this.mode === 'tutorial' || isGameOver) {
            // God Mode: show everything
            markerManager.wumpusMesh.visible = true;
            markerManager.pitMeshes.forEach(m => m.visible = true);
            markerManager.batMeshes.forEach(m => m.visible = true);
        } else if (this.mode === 'normal') {
            // Normal: Wumpus hidden until game over. Hazards shown only if visited/triggered.
            markerManager.wumpusMesh.visible = isGameOver;
            markerManager.pitMeshes.forEach((m, idx) => {
                m.visible = visited.includes(pits[idx]) || isGameOver;
            });
            markerManager.batMeshes.forEach((m, idx) => {
                m.visible = visited.includes(bats[idx]) || isGameOver;
            });
        } else { // 'hardest'
            // Hardest: Everything hidden until game over
            markerManager.wumpusMesh.visible = isGameOver;
            markerManager.pitMeshes.forEach(m => m.visible = isGameOver);
            markerManager.batMeshes.forEach(m => m.visible = isGameOver);
        }

        // 3. Update Nodes & Tunnels (Fog of War)
        const visitedSet = new Set(visited);
        const exitSet = new Set(exits);

        for (const [id, node] of caveGraph.nodeMeshes.entries()) {
            const isCurrent = id === hunter;
            const isExit = exitSet.has(id);
            const isExplored = visitedSet.has(id);

            let nodeVisible = true;
            let nodeOpacity = 1.0;

            if (this.mode === 'hardest') {
                if (isCurrent || isExit || isGameOver) {
                    nodeVisible = true;
                    nodeOpacity = 1.0;
                } else {
                    nodeVisible = true; // show faint silhouette so player understands geometry
                    nodeOpacity = 0.15;
                }
            } else if (this.mode === 'normal') {
                if (isCurrent || isExit || isExplored || isGameOver) {
                    nodeVisible = true;
                    nodeOpacity = 1.0;
                } else {
                    nodeVisible = true;
                    nodeOpacity = 0.25;
                }
            } else { // tutorial
                nodeVisible = true;
                nodeOpacity = 1.0;
            }

            node.group.visible = nodeVisible;
            node.sphere.material.opacity = nodeOpacity;
            node.sphere.material.transparent = nodeOpacity < 1.0;
            node.sprite.material.opacity = nodeOpacity;

            // Update badge content
            const clues = sensedClues[id] || {};
            // Only show sensory dots on visited rooms in normal/tutorial, or current room in hardest
            const showClues = (this.mode === 'tutorial') ||
                              (this.mode === 'normal' && isExplored) ||
                              (this.mode === 'hardest' && isCurrent);

            caveGraph.updateRoomBadge(id, {
                isCurrent,
                isExit,
                nearWumpus: showClues && clues.nearWumpus,
                nearPit: showClues && clues.nearPit,
                nearBats: showClues && clues.nearBats
            });
        }

        // 4. Update Tunnels
        for (const tunnel of caveGraph.tunnelMeshes) {
            const { u, v } = tunnel.userData;
            const isConnectedToHunter = (u === hunter && exitSet.has(v)) || (v === hunter && exitSet.has(u));

            if (isConnectedToHunter) {
                // Highlight active tunnels with pulsing cyan/gold
                tunnel.material.color.setHex(0x00f0ff);
                tunnel.material.emissive.setHex(0x003344);
                tunnel.material.opacity = 1.0;
                tunnel.material.transparent = false;
            } else if (this.mode === 'hardest' && !isGameOver) {
                tunnel.material.color.setHex(0x1a2530);
                tunnel.material.emissive.setHex(0x000000);
                tunnel.material.opacity = 0.15;
                tunnel.material.transparent = true;
            } else if (this.mode === 'normal' && !isGameOver) {
                const isBothExplored = visitedSet.has(u) && visitedSet.has(v);
                tunnel.material.color.setHex(isBothExplored ? 0x4a6572 : 0x223344);
                tunnel.material.emissive.setHex(isBothExplored ? 0x051520 : 0x000000);
                tunnel.material.opacity = isBothExplored ? 0.9 : 0.3;
                tunnel.material.transparent = !isBothExplored;
            } else { // tutorial or game over
                tunnel.material.color.setHex(0x3e5260);
                tunnel.material.emissive.setHex(0x0a1420);
                tunnel.material.opacity = 0.8;
                tunnel.material.transparent = false;
            }
        }
    }
}
