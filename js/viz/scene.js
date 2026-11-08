import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CaveGraph } from './dodecahedron.js';
import { MarkerManager } from './markers.js';
import { DifficultyManager } from './difficulty.js';

export class WumpusViz {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.onNodeSelected = options.onNodeSelected || (() => {});
        this.mapData = options.mapData;

        // Scene, Camera, Renderer
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0e141b);

        this.camera = new THREE.PerspectiveCamera(60, 1, 1, 2000);
        this.camera.position.set(0, 50, 420);

        this.isSupported = true;
        try {
            this.renderer = new THREE.WebGLRenderer({
                canvas: this.canvas,
                antialias: true,
                powerPreference: 'high-performance'
            });
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            // OrbitControls (with full mobile touch support)
            this.controls = new OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.minDistance = 150;
            this.controls.maxDistance = 650;
            this.controls.rotateSpeed = 0.8;
        } catch (err) {
            console.warn('WebGL initialization failed:', err);
            this.isSupported = false;
            this.renderer = null;
            this.controls = null;
            this._showWebGLFallback();
        }

        // Lighting
        this._setupLighting();

        // Subsystems
        this.caveGraph = new CaveGraph(this.scene, this.mapData);
        this.markers = new MarkerManager(this.scene);
        this.difficulty = new DifficultyManager();

        // Raycasting & Tap interaction
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this._dragStartPos = new THREE.Vector2();
        this._isDragging = false;
        this._hoveredNodeId = null;

        if (this.isSupported && this.renderer) {
            this._setupInteraction();
            this._setupResizeObserver();
            // Animation loop
            this._lastTime = 0;
            this._animate = this._animate.bind(this);
            requestAnimationFrame(this._animate);
        }
    }

    _setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xddeeff, 0.7);
        this.scene.add(ambientLight);

        const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight1.position.set(200, 300, 250);
        this.scene.add(dirLight1);

        const dirLight2 = new THREE.DirectionalLight(0x4466aa, 0.8);
        dirLight2.position.set(-200, -200, -200);
        this.scene.add(dirLight2);

        // Subtle camera light for unlit angles
        const camLight = new THREE.PointLight(0x00f0ff, 0.5, 600);
        this.camera.add(camLight);
        this.scene.add(this.camera);
    }

    _setupInteraction() {
        const dom = this.renderer.domElement;

        const getPointerPos = (e) => {
            const rect = dom.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                x: ((clientX - rect.left) / rect.width) * 2 - 1,
                y: -((clientY - rect.top) / rect.height) * 2 + 1,
                rawX: clientX,
                rawY: clientY
            };
        };

        const onPointerDown = (e) => {
            const p = getPointerPos(e);
            this._dragStartPos.set(p.rawX, p.rawY);
            this._isDragging = false;
        };

        const onPointerMove = (e) => {
            const p = getPointerPos(e);
            const dist = Math.hypot(p.rawX - this._dragStartPos.x, p.rawY - this._dragStartPos.y);
            if (dist > 8) {
                this._isDragging = true;
            }

            // Raycast for hover highlights (mouse only)
            if (!e.touches) {
                this.pointer.x = p.x;
                this.pointer.y = p.y;
                this.raycaster.setFromCamera(this.pointer, this.camera);
                const clickables = this.caveGraph.getClickableMeshes();
                const intersects = this.raycaster.intersectObjects(clickables, false);

                if (intersects.length > 0) {
                    const hitRoomId = intersects[0].object.userData.roomId;
                    if (this._hoveredNodeId !== hitRoomId) {
                        if (this._hoveredNodeId) this.caveGraph.highlightNode(this._hoveredNodeId, false);
                        this._hoveredNodeId = hitRoomId;
                        this.caveGraph.highlightNode(hitRoomId, true, 0x00f0ff);
                        dom.style.cursor = 'pointer';
                    }
                } else if (this._hoveredNodeId) {
                    this.caveGraph.highlightNode(this._hoveredNodeId, false);
                    this._hoveredNodeId = null;
                    dom.style.cursor = 'default';
                }
            }
        };

        const onPointerUp = (e) => {
            if (!this._isDragging) {
                const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
                const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
                const rect = dom.getBoundingClientRect();
                this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
                this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

                this.raycaster.setFromCamera(this.pointer, this.camera);
                const clickables = this.caveGraph.getClickableMeshes();
                const intersects = this.raycaster.intersectObjects(clickables, false);

                if (intersects.length > 0) {
                    const hitRoomId = intersects[0].object.userData.roomId;
                    this.onNodeSelected(hitRoomId);
                }
            }
            this._isDragging = false;
        };

        dom.addEventListener('pointerdown', onPointerDown, { passive: true });
        dom.addEventListener('pointermove', onPointerMove, { passive: true });
        dom.addEventListener('pointerup', onPointerUp, { passive: true });
    }

    _setupResizeObserver() {
        const resize = () => {
            const width = this.canvas.clientWidth;
            const height = this.canvas.clientHeight;
            if (width === 0 || height === 0) return;

            this.renderer.setSize(width, height, false);
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        };

        const observer = new ResizeObserver(resize);
        observer.observe(this.canvas);
        setTimeout(resize, 50);
    }

    _showWebGLFallback() {
        if (!this.canvas) return;
        const parent = this.canvas.parentElement;
        if (!parent) return;

        const notice = document.createElement('div');
        notice.style.position = 'absolute';
        notice.style.top = '50%';
        notice.style.left = '50%';
        notice.style.transform = 'translate(-50%, -50%)';
        notice.style.padding = '20px';
        notice.style.background = 'rgba(15, 25, 35, 0.9)';
        notice.style.border = '1px solid #00f0ff';
        notice.style.borderRadius = '8px';
        notice.style.color = '#c9d8e8';
        notice.style.textAlign = 'center';
        notice.style.maxWidth = '80%';
        notice.innerHTML = `
            <h3 style="color:#00f0ff; margin-bottom:8px;">3D WebGL Disabled</h3>
            <p style="font-size:13px; line-height:1.5;">Hardware acceleration / WebGL is disabled in this environment. You can still play the game using the full text terminal on the left!</p>
        `;
        parent.appendChild(notice);
    }

    /**
     * Update entire visualization to match current game status
     */
    updateState(gameStatus) {
        if (!this.isSupported) return;
        this.difficulty.apply(gameStatus, this.caveGraph, this.markers);
    }

    setDifficultyMode(mode) {
        this.difficulty.setMode(mode);
    }

    /**
     * Animate moving player along path
     */
    animatePlayerMove(path, onComplete) {
        if (!this.isSupported) {
            if (onComplete) onComplete();
            return;
        }
        const positions = path.map(id => this.caveGraph.nodeMeshes.get(id).position);
        this.markers.animatePlayerMove(positions, onComplete);
    }

    /**
     * Animate arrow shot
     */
    animateArrowShoot(flightPath, onComplete) {
        if (!this.isSupported) {
            if (onComplete) onComplete();
            return;
        }
        const positions = flightPath.map(id => this.caveGraph.nodeMeshes.get(id).position);
        this.markers.animateArrowShoot(positions, onComplete);
    }

    _animate(time) {
        if (!this.isSupported || !this.renderer) return;
        requestAnimationFrame(this._animate);

        const delta = (time - this._lastTime) * 0.001;
        this._lastTime = time;

        if (this.controls) this.controls.update();
        this.markers.update(time * 0.001);

        this.renderer.render(this.scene, this.camera);
    }
}
