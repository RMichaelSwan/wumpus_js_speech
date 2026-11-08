import * as THREE from 'three';

export const THEMES = {
    solid_green: {
        id: 'solid_green',
        name: 'Classic Green (Solid)',
        bodyVisible: true,
        bodyType: 'phong',
        bodyProps: {
            color: 0x35F555,
            specular: 0xffffff,
            shininess: 35,
            flatShading: true,
            transparent: false,
            opacity: 1.0
        },
        nodeColor: 0x145a27,
        tunnelColor: 0x1e6f35,
        tunnelEmissive: 0x072810,
        background: 0x0c1a12,
        ambientLight: 0xddffdd,
        ambientIntensity: 0.8
    },
    obsidian: {
        id: 'obsidian',
        name: 'Obsidian Basalt (Solid)',
        bodyVisible: true,
        bodyType: 'standard',
        bodyProps: {
            color: 0x141a22,
            roughness: 0.35,
            metalness: 0.8,
            flatShading: true,
            transparent: false,
            opacity: 1.0
        },
        nodeColor: 0x223344,
        tunnelColor: 0x2d3f52,
        tunnelEmissive: 0x081522,
        background: 0x0a0e14,
        ambientLight: 0xddeeff,
        ambientIntensity: 0.7
    },
    cave_rock: {
        id: 'cave_rock',
        name: 'Cavern Rock (Solid)',
        bodyVisible: true,
        bodyType: 'standard',
        bodyProps: {
            color: 0x483627,
            roughness: 0.9,
            metalness: 0.1,
            flatShading: true,
            transparent: false,
            opacity: 1.0
        },
        nodeColor: 0x3d2b1f,
        tunnelColor: 0x5a4130,
        tunnelEmissive: 0x1a0f08,
        background: 0x100a06,
        ambientLight: 0xffeedd,
        ambientIntensity: 0.85
    },
    wireframe_crystal: {
        id: 'wireframe_crystal',
        name: 'Neon Crystal (Translucent)',
        bodyVisible: true,
        bodyType: 'standard',
        bodyProps: {
            color: 0x00f0ff,
            roughness: 0.1,
            metalness: 0.9,
            flatShading: true,
            transparent: true,
            opacity: 0.22
        },
        nodeColor: 0x004466,
        tunnelColor: 0x0088aa,
        tunnelEmissive: 0x002e3b,
        background: 0x060d14,
        ambientLight: 0xccffff,
        ambientIntensity: 0.65
    },
    deep_space: {
        id: 'deep_space',
        name: 'Deep Space (Open / No Body)',
        bodyVisible: false,
        bodyType: null,
        bodyProps: null,
        nodeColor: 0x223344,
        tunnelColor: 0x334455,
        tunnelEmissive: 0x0a1420,
        background: 0x05070a,
        ambientLight: 0xddeeff,
        ambientIntensity: 0.7
    }
};

/**
 * Creates and manages the 3D cave graph (dodecahedron nodes and connecting tunnels)
 */
export class CaveGraph {
    constructor(scene, mapData, initialTheme = 'solid_green') {
        this.scene = scene;
        this.mapData = mapData;
        this.currentThemeKey = initialTheme;
        this.graphGroup = new THREE.Group();
        this.scene.add(this.graphGroup);

        this.nodeMeshes = new Map(); // roomId -> { sphere, sprite, ring, position, data }
        this.tunnelMeshes = [];      // array of cylinder meshes connecting rooms
        this.tunnelMap = new Map();  // 'min-max' -> cylinder mesh
        this.bodyMesh = null;

        this._buildGraph();
    }

    _buildGraph() {
        const rooms = this.mapData.rooms;

        // 0. Solid Dodecahedron Cave Body (if standard map)
        if (this.mapData.name === 'standard') {
            const bodyGeom = new THREE.DodecahedronGeometry(146, 0);
            this.bodyMesh = new THREE.Mesh(bodyGeom);
            this.bodyMesh.rotation.z = Math.PI / 2;
            this.bodyMesh.name = 'dodecahedron_body';
            this.graphGroup.add(this.bodyMesh);
        }

        // 1. Create 3D Nodes
        for (const [idStr, room] of Object.entries(rooms)) {
            const id = Number(idStr);
            const pos = new THREE.Vector3(room.x3d, room.y3d, room.z3d);

            const nodeGroup = new THREE.Group();
            nodeGroup.position.copy(pos);
            nodeGroup.name = `node_${id}`;

            // Sphere base
            const sphereGeom = new THREE.SphereGeometry(14, 20, 20);
            const sphereMat = new THREE.MeshStandardMaterial({
                color: 0x223344,
                roughness: 0.3,
                metalness: 0.7,
                emissive: 0x051015
            });
            const sphere = new THREE.Mesh(sphereGeom, sphereMat);
            sphere.userData = { roomId: id };
            nodeGroup.add(sphere);

            // Glowing selection/accent ring
            const ringGeom = new THREE.TorusGeometry(16, 1.2, 8, 24);
            const ringMat = new THREE.MeshBasicMaterial({
                color: 0x44aaff,
                transparent: true,
                opacity: 0.0
            });
            const ring = new THREE.Mesh(ringGeom, ringMat);
            ring.lookAt(pos.clone().multiplyScalar(2)); // orient ring tangent to surface
            nodeGroup.add(ring);

            // Billboard sprite for room number & clues
            const sprite = this._createRoomSprite(id);
            // Push sprite slightly outwards along normal
            const normal = pos.clone().normalize();
            sprite.position.copy(normal.clone().multiplyScalar(18));
            sprite.scale.set(32, 32, 1);
            nodeGroup.add(sprite);

            this.graphGroup.add(nodeGroup);

            this.nodeMeshes.set(id, {
                group: nodeGroup,
                sphere: sphere,
                ring: ring,
                sprite: sprite,
                position: pos,
                normal: normal,
                data: room
            });
        }

        // 2. Create Tunnels (Edges)
        const drawnEdges = new Set();
        for (const [idStr, room] of Object.entries(rooms)) {
            const u = Number(idStr);
            const uPos = this.nodeMeshes.get(u).position;

            for (const v of room.outs) {
                const edgeKey = u < v ? `${u}-${v}` : `${v}-${u}`;
                if (!drawnEdges.has(edgeKey)) {
                    drawnEdges.add(edgeKey);
                    const vPos = this.nodeMeshes.get(v).position;
                    const tunnel = this._createTunnel(uPos, vPos);
                    tunnel.userData = { u, v, key: edgeKey };
                    this.graphGroup.add(tunnel);
                    this.tunnelMeshes.push(tunnel);
                    this.tunnelMap.set(edgeKey, tunnel);
                }
            }
        }
    }

    _createTunnel(p1, p2) {
        const distance = p1.distanceTo(p2);
        const geom = new THREE.CylinderGeometry(3.5, 3.5, distance, 12);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x334455,
            roughness: 0.5,
            metalness: 0.6,
            emissive: 0x0a1420
        });
        const mesh = new THREE.Mesh(geom, mat);

        // Position cylinder at midpoint
        const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        mesh.position.copy(mid);

        // Orient cylinder from p1 to p2
        const direction = new THREE.Vector3().subVectors(p2, p1).normalize();
        const orientation = new THREE.Vector3(0, 1, 0); // cylinder default height axis is Y
        const quaternion = new THREE.Quaternion().setFromUnitVectors(orientation, direction);
        mesh.setRotationFromQuaternion(quaternion);

        return mesh;
    }

    _createRoomSprite(roomId, clues = {}) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        this._renderSpriteCanvas(ctx, roomId, clues);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });
        const sprite = new THREE.Sprite(material);
        sprite.userData = { canvas, ctx, texture, roomId };
        return sprite;
    }

    _renderSpriteCanvas(ctx, roomId, clues = {}) {
        ctx.clearRect(0, 0, 128, 128);

        // Circular background
        ctx.beginPath();
        ctx.arc(64, 64, 46, 0, Math.PI * 2);
        ctx.fillStyle = clues.isCurrent ? '#00e5ff' : (clues.isExit ? '#ffd600' : 'rgba(25, 35, 45, 0.9)');
        ctx.fill();

        // Border
        ctx.lineWidth = 6;
        ctx.strokeStyle = clues.isCurrent ? '#ffffff' : (clues.isExit ? '#ffffff' : '#455a64');
        ctx.stroke();

        // Room Number Text
        ctx.fillStyle = (clues.isCurrent || clues.isExit) ? '#000000' : '#ffffff';
        ctx.font = 'bold 44px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(roomId.toString(), 64, 64);

        // Sensory Badge Dots (if known clues exist on this room)
        if (clues.nearWumpus) {
            ctx.beginPath();
            ctx.arc(32, 28, 12, 0, Math.PI * 2);
            ctx.fillStyle = '#ff1744'; // Red for smell
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#fff';
            ctx.stroke();
        }
        if (clues.nearPit) {
            ctx.beginPath();
            ctx.arc(64, 20, 12, 0, Math.PI * 2);
            ctx.fillStyle = '#2979ff'; // Blue for draft
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#fff';
            ctx.stroke();
        }
        if (clues.nearBats) {
            ctx.beginPath();
            ctx.arc(96, 28, 12, 0, Math.PI * 2);
            ctx.fillStyle = '#ff9100'; // Orange for bats
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#fff';
            ctx.stroke();
        }
    }

    /**
     * Update room visual appearance and badges based on game state
     */
    updateRoomBadge(roomId, options = {}) {
        const node = this.nodeMeshes.get(roomId);
        if (!node) return;

        const sprite = node.sprite;
        const { ctx, texture } = sprite.userData;
        this._renderSpriteCanvas(ctx, roomId, options);
        texture.needsUpdate = true;
    }

    /**
     * Get raycastable sphere meshes for interaction
     */
    getClickableMeshes() {
        return Array.from(this.nodeMeshes.values()).map(n => n.sphere);
    }

    /**
     * Set highlight on hover or selection
     */
    highlightNode(roomId, active = true, color = 0x00f0ff) {
        const node = this.nodeMeshes.get(roomId);
        if (!node) return;
        node.ring.material.opacity = active ? 0.9 : 0.0;
        node.ring.material.color.setHex(color);
        const scale = active ? 1.15 : 1.0;
        node.group.scale.set(scale, scale, scale);
    }

    /**
     * Apply a visual theme across cave body, nodes, tunnels, and atmosphere
     */
    setTheme(themeKey, scene = null, ambientLight = null) {
        const theme = THEMES[themeKey] || THEMES.solid_green;
        this.currentThemeKey = theme.id;

        // Update body mesh
        if (this.bodyMesh) {
            this.bodyMesh.visible = theme.bodyVisible;
            if (theme.bodyVisible && theme.bodyProps) {
                if (theme.bodyType === 'phong') {
                    this.bodyMesh.material = new THREE.MeshPhongMaterial(theme.bodyProps);
                } else {
                    this.bodyMesh.material = new THREE.MeshStandardMaterial(theme.bodyProps);
                }
            }
        }

        // Update default node spheres
        for (const node of this.nodeMeshes.values()) {
            node.sphere.material.color.setHex(theme.nodeColor);
        }

        // Update default tunnels
        for (const tunnel of this.tunnelMeshes) {
            tunnel.material.color.setHex(theme.tunnelColor);
            tunnel.material.emissive.setHex(theme.tunnelEmissive);
        }

        // Update scene background & lighting
        if (scene) {
            scene.background = new THREE.Color(theme.background);
        }
        if (ambientLight) {
            ambientLight.color = new THREE.Color(theme.ambientLight);
            ambientLight.intensity = theme.ambientIntensity;
        }
    }
}
