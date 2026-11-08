import * as THREE from 'three';

/**
 * Creates and manages 3D entity markers and path animations
 */
export class MarkerManager {
    constructor(scene) {
        this.scene = scene;
        this.markersGroup = new THREE.Group();
        this.scene.add(this.markersGroup);

        this.playerMesh = this._createPlayerMesh();
        this.wumpusMesh = this._createWumpusMesh();
        this.pitMeshes = [this._createPitMesh(), this._createPitMesh()];
        this.batMeshes = [this._createBatMesh(), this._createBatMesh()];
        this.arrowMesh = this._createArrowMesh();

        this.markersGroup.add(this.playerMesh);
        this.markersGroup.add(this.wumpusMesh);
        this.pitMeshes.forEach(m => this.markersGroup.add(m));
        this.batMeshes.forEach(m => this.markersGroup.add(m));
        this.markersGroup.add(this.arrowMesh);

        // Hide markers initially
        this.wumpusMesh.visible = false;
        this.pitMeshes.forEach(m => m.visible = false);
        this.batMeshes.forEach(m => m.visible = false);
        this.arrowMesh.visible = false;

        // Active animations
        this.activeMoveAnimation = null;
        this.activeArrowAnimation = null;
    }

    _createPlayerMesh() {
        const group = new THREE.Group();
        
        // Stylized crystal / arrowhead
        const geom = new THREE.ConeGeometry(12, 28, 4);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x006699,
            roughness: 0.2,
            metalness: 0.8
        });
        const cone = new THREE.Mesh(geom, mat);
        cone.rotation.x = Math.PI / 2; // point outwards
        group.add(cone);

        // Glowing base ring
        const ringGeom = new THREE.TorusGeometry(14, 2, 8, 24);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x33ffff });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        group.add(ring);

        group.name = 'player';
        return group;
    }

    _createWumpusMesh() {
        const group = new THREE.Group();

        // Beast body: spiked icosahedron
        const bodyGeom = new THREE.IcosahedronGeometry(22, 1);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0xff1133,
            emissive: 0x660011,
            roughness: 0.4,
            metalness: 0.6
        });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        group.add(body);

        // Horns
        const hornGeom = new THREE.ConeGeometry(5, 18, 5);
        const hornMat = new THREE.MeshStandardMaterial({ color: 0x220000 });
        
        const horn1 = new THREE.Mesh(hornGeom, hornMat);
        horn1.position.set(-10, 16, 5);
        horn1.rotation.z = -0.3;
        group.add(horn1);

        const horn2 = new THREE.Mesh(hornGeom, hornMat);
        horn2.position.set(10, 16, 5);
        horn2.rotation.z = 0.3;
        group.add(horn2);

        // Glowing eyes
        const eyeGeom = new THREE.SphereGeometry(3, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const eye1 = new THREE.Mesh(eyeGeom, eyeMat);
        eye1.position.set(-6, 4, 18);
        const eye2 = new THREE.Mesh(eyeGeom, eyeMat);
        eye2.position.set(6, 4, 18);
        group.add(eye1);
        group.add(eye2);

        group.name = 'wumpus';
        return group;
    }

    _createPitMesh() {
        const group = new THREE.Group();

        // Dark vortex / funnel
        const coneGeom = new THREE.CylinderGeometry(18, 2, 22, 16, 1, true);
        const coneMat = new THREE.MeshStandardMaterial({
            color: 0x111111,
            emissive: 0x221133,
            side: THREE.DoubleSide,
            wireframe: false
        });
        const cone = new THREE.Mesh(coneGeom, coneMat);
        cone.rotation.x = Math.PI / 2;
        group.add(cone);

        // Rim
        const rimGeom = new THREE.TorusGeometry(18, 2, 8, 24);
        const rimMat = new THREE.MeshBasicMaterial({ color: 0x663399 });
        const rim = new THREE.Mesh(rimGeom, rimMat);
        group.add(rim);

        group.name = 'pit';
        return group;
    }

    _createBatMesh() {
        const group = new THREE.Group();

        // Central bat body
        const bodyGeom = new THREE.SphereGeometry(7, 8, 8);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.8 });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        group.add(body);

        // Stylized wings
        const wingShape = new THREE.Shape();
        wingShape.moveTo(0, 0);
        wingShape.lineTo(16, 12);
        wingShape.lineTo(12, 0);
        wingShape.lineTo(16, -6);
        wingShape.lineTo(0, 0);
        
        const wingGeom = new THREE.ShapeGeometry(wingShape);
        const wingMat = new THREE.MeshStandardMaterial({ color: 0x553311, side: THREE.DoubleSide });
        
        const leftWing = new THREE.Mesh(wingGeom, wingMat);
        leftWing.position.set(4, 0, 0);
        const rightWing = new THREE.Mesh(wingGeom, wingMat);
        rightWing.position.set(-4, 0, 0);
        rightWing.scale.set(-1, 1, 1);

        group.add(leftWing);
        group.add(rightWing);
        group.userData = { leftWing, rightWing };
        group.name = 'bat';
        return group;
    }

    _createArrowMesh() {
        const group = new THREE.Group();
        
        // Glowing energy projectile
        const sphereGeom = new THREE.SphereGeometry(6, 12, 12);
        const sphereMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
        const sphere = new THREE.Mesh(sphereGeom, sphereMat);
        group.add(sphere);

        // Trail glow
        const glowGeom = new THREE.SphereGeometry(10, 8, 8);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 0.5
        });
        const glow = new THREE.Mesh(glowGeom, glowMat);
        group.add(glow);

        group.name = 'arrow';
        return group;
    }

    /**
     * Align a mesh so that its 'up' or pointing vector points outward from the origin
     */
    orientOutward(mesh, position, offsetDist = 14) {
        const normal = position.clone().normalize();
        const posWithOffset = position.clone().add(normal.clone().multiplyScalar(offsetDist));
        mesh.position.copy(posWithOffset);

        // Look away from center
        const target = posWithOffset.clone().add(normal);
        mesh.lookAt(target);
    }

    /**
     * Start smooth movement animation for player along a path of room positions
     */
    animatePlayerMove(roomPositions, onComplete) {
        if (!roomPositions || roomPositions.length < 2) {
            if (onComplete) onComplete();
            return;
        }

        const durationPerSegment = 350; // ms per hop
        const totalDuration = (roomPositions.length - 1) * durationPerSegment;
        const startTime = performance.now();

        this.activeMoveAnimation = {
            roomPositions,
            startTime,
            totalDuration,
            durationPerSegment,
            onComplete
        };
    }

    /**
     * Start arrow flight trajectory animation
     */
    animateArrowShoot(roomPositions, onComplete) {
        if (!roomPositions || roomPositions.length < 2) {
            if (onComplete) onComplete();
            return;
        }

        const durationPerSegment = 220; // ms per room hop
        const totalDuration = (roomPositions.length - 1) * durationPerSegment;
        const startTime = performance.now();

        this.arrowMesh.visible = true;
        this.activeArrowAnimation = {
            roomPositions,
            startTime,
            totalDuration,
            durationPerSegment,
            onComplete
        };
    }

    /**
     * Per-frame animation tick
     */
    update(time) {
        const now = performance.now();

        // Idle animations: Wumpus breathing
        if (this.wumpusMesh.visible) {
            const scale = 1 + 0.08 * Math.sin(time * 3);
            this.wumpusMesh.scale.set(scale, scale, scale);
        }

        // Idle animations: Bat wing flaps
        this.batMeshes.forEach(bat => {
            if (bat.visible && bat.userData.leftWing) {
                const angle = 0.4 * Math.sin(time * 8);
                bat.userData.leftWing.rotation.y = angle;
                bat.userData.rightWing.rotation.y = -angle;
            }
        });

        // Player idle pulse
        if (!this.activeMoveAnimation && this.playerMesh.visible) {
            const pulse = 1 + 0.04 * Math.sin(time * 4);
            this.playerMesh.scale.set(pulse, pulse, pulse);
        }

        // Player move animation along path
        if (this.activeMoveAnimation) {
            const anim = this.activeMoveAnimation;
            const elapsed = now - anim.startTime;
            const t = Math.min(1, elapsed / anim.totalDuration);

            const segmentCount = anim.roomPositions.length - 1;
            const currentSegmentFloat = t * segmentCount;
            const segIndex = Math.min(segmentCount - 1, Math.floor(currentSegmentFloat));
            const segFraction = currentSegmentFloat - segIndex;

            const p0 = anim.roomPositions[segIndex];
            const p1 = anim.roomPositions[segIndex + 1];

            // Spherical slerp or curved lerp outward from center
            const currentPos = new THREE.Vector3().lerpVectors(p0, p1, segFraction);
            // Push slightly outward on arc
            const midArcBump = Math.sin(segFraction * Math.PI) * 15;
            const normal = currentPos.clone().normalize();
            currentPos.add(normal.multiplyScalar(midArcBump));

            this.orientOutward(this.playerMesh, currentPos, 14);

            if (t >= 1) {
                const finalPos = anim.roomPositions[anim.roomPositions.length - 1];
                this.orientOutward(this.playerMesh, finalPos, 14);
                const cb = anim.onComplete;
                this.activeMoveAnimation = null;
                if (cb) cb();
            }
        }

        // Arrow flight animation
        if (this.activeArrowAnimation) {
            const anim = this.activeArrowAnimation;
            const elapsed = now - anim.startTime;
            const t = Math.min(1, elapsed / anim.totalDuration);

            const segmentCount = anim.roomPositions.length - 1;
            const currentSegmentFloat = t * segmentCount;
            const segIndex = Math.min(segmentCount - 1, Math.floor(currentSegmentFloat));
            const segFraction = currentSegmentFloat - segIndex;

            const p0 = anim.roomPositions[segIndex];
            const p1 = anim.roomPositions[segIndex + 1];

            const currentPos = new THREE.Vector3().lerpVectors(p0, p1, segFraction);
            const normal = currentPos.clone().normalize();
            currentPos.add(normal.multiplyScalar(10));
            this.arrowMesh.position.copy(currentPos);

            if (t >= 1) {
                this.arrowMesh.visible = false;
                const cb = anim.onComplete;
                this.activeArrowAnimation = null;
                if (cb) cb();
            }
        }
    }
}
