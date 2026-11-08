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

        // 1. Hunched Muscular Demon Body
        const torsoGeom = new THREE.DodecahedronGeometry(20, 1);
        const hideMat = new THREE.MeshStandardMaterial({
            color: 0x1a0606,
            emissive: 0x330005,
            roughness: 0.9,
            metalness: 0.3,
            flatShading: true
        });
        const torso = new THREE.Mesh(torsoGeom, hideMat);
        torso.scale.set(1.1, 1.25, 0.95);
        group.add(torso);

        // Dorsal Spines along spine
        const spineMat = new THREE.MeshStandardMaterial({ color: 0x0d0303, roughness: 0.7 });
        for (let i = 0; i < 4; i++) {
            const spineGeom = new THREE.ConeGeometry(3.5 - i * 0.5, 14 - i * 2, 5);
            const spine = new THREE.Mesh(spineGeom, spineMat);
            spine.position.set(0, 10 - i * 7, -12 - i * 2);
            spine.rotation.x = -0.5 - i * 0.15;
            group.add(spine);
        }

        // 2. Menacing Head with Heavy Brow
        const headGroup = new THREE.Group();
        headGroup.position.set(0, 6, 12);

        const skullGeom = new THREE.BoxGeometry(18, 14, 18);
        const skull = new THREE.Mesh(skullGeom, hideMat);
        headGroup.add(skull);

        // Heavy Brow Ridge
        const browGeom = new THREE.BoxGeometry(20, 4, 8);
        const browMat = new THREE.MeshStandardMaterial({ color: 0x0f0202, roughness: 0.95 });
        const brow = new THREE.Mesh(browGeom, browMat);
        brow.position.set(0, 5, 8);
        headGroup.add(brow);

        // 3. Piercing Predatory Eyes (4 eyes)
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff1a00 });
        const eyeGeom = new THREE.SphereGeometry(2.8, 10, 10);
        
        // Primary glowing eyes
        const eyeL = new THREE.Mesh(eyeGeom, eyeMat);
        eyeL.position.set(-6, 2, 9.5);
        const eyeR = new THREE.Mesh(eyeGeom, eyeMat);
        eyeR.position.set(6, 2, 9.5);
        headGroup.add(eyeL);
        headGroup.add(eyeR);

        // Secondary smaller sinister eyes
        const subEyeMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        const subEyeGeom = new THREE.SphereGeometry(1.6, 8, 8);
        const subEyeL = new THREE.Mesh(subEyeGeom, subEyeMat);
        subEyeL.position.set(-8.5, 4.5, 8.5);
        const subEyeR = new THREE.Mesh(subEyeGeom, subEyeMat);
        subEyeR.position.set(8.5, 4.5, 8.5);
        headGroup.add(subEyeL);
        headGroup.add(subEyeR);

        // Menacing crimson eye glow light
        const eyeGlow = new THREE.PointLight(0xff1100, 2.0, 90);
        eyeGlow.position.set(0, 2, 16);
        headGroup.add(eyeGlow);

        // 4. Gaping Maw & Lethal Fangs
        const mouthCavityGeom = new THREE.BoxGeometry(13, 8, 8);
        const mouthCavityMat = new THREE.MeshBasicMaterial({ color: 0x050000 });
        const mouthCavity = new THREE.Mesh(mouthCavityGeom, mouthCavityMat);
        mouthCavity.position.set(0, -3, 8);
        headGroup.add(mouthCavity);

        // Upper Sabre Fangs
        const fangMat = new THREE.MeshStandardMaterial({
            color: 0xfffff2,
            roughness: 0.2,
            metalness: 0.1
        });
        const mainFangGeom = new THREE.ConeGeometry(2.2, 11, 6);
        const uFangL = new THREE.Mesh(mainFangGeom, fangMat);
        uFangL.position.set(-5, -3, 11);
        uFangL.rotation.x = Math.PI;
        uFangL.rotation.z = -0.15;
        headGroup.add(uFangL);

        const uFangR = new THREE.Mesh(mainFangGeom, fangMat);
        uFangR.position.set(5, -3, 11);
        uFangR.rotation.x = Math.PI;
        uFangR.rotation.z = 0.15;
        headGroup.add(uFangR);

        // Serrated upper teeth
        for (let x = -3; x <= 3; x += 2) {
            const tooth = new THREE.Mesh(new THREE.ConeGeometry(1.1, 5, 4), fangMat);
            tooth.position.set(x, -2, 11);
            tooth.rotation.x = Math.PI;
            headGroup.add(tooth);
        }

        // Hinged Aggressive Lower Jaw
        const jawGroup = new THREE.Group();
        jawGroup.position.set(0, -6, 4);
        jawGroup.rotation.x = 0.35; // opened wide

        const jawMesh = new THREE.Mesh(new THREE.BoxGeometry(15, 5, 14), hideMat);
        jawMesh.position.set(0, 0, 6);
        jawGroup.add(jawMesh);

        // Lower Tusks pointing up
        const lTuskL = new THREE.Mesh(mainFangGeom, fangMat);
        lTuskL.position.set(-5, 3, 11);
        lTuskL.rotation.z = 0.2;
        jawGroup.add(lTuskL);

        const lTuskR = new THREE.Mesh(mainFangGeom, fangMat);
        lTuskR.position.set(5, 3, 11);
        lTuskR.rotation.z = -0.2;
        jawGroup.add(lTuskR);

        headGroup.add(jawGroup);
        group.add(headGroup);

        // 5. Massive Curved Demon Horns
        const hornMat = new THREE.MeshStandardMaterial({
            color: 0x0c0c0e,
            roughness: 0.4,
            metalness: 0.6
        });
        
        const createCurvedHorn = (isLeft) => {
            const horn = new THREE.Group();
            const segments = 5;
            for (let i = 0; i < segments; i++) {
                const rBase = 4.5 * (1 - i / segments);
                const rTop = 4.5 * (1 - (i + 1) / segments);
                const segGeom = new THREE.CylinderGeometry(rTop, rBase, 8, 8);
                const seg = new THREE.Mesh(segGeom, hornMat);
                seg.position.set(0, i * 6.5, 0);
                seg.rotation.z = (isLeft ? -0.18 : 0.18) * (i + 1);
                seg.rotation.x = -0.08 * (i + 1);
                horn.add(seg);
            }
            horn.position.set(isLeft ? -10 : 10, 12, 6);
            horn.rotation.z = isLeft ? -0.4 : 0.4;
            horn.rotation.y = isLeft ? -0.2 : 0.2;
            return horn;
        };

        group.add(createCurvedHorn(true));
        group.add(createCurvedHorn(false));

        // 6. Demonic Claws Reaching Outward
        const createClawHand = (isLeft) => {
            const arm = new THREE.Group();
            const armMesh = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 3.5, 16, 8), hideMat);
            armMesh.position.set(0, -6, 6);
            armMesh.rotation.x = 0.8;
            arm.add(armMesh);

            const talonMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.3 });
            for (let t = -1; t <= 1; t++) {
                const talon = new THREE.Mesh(new THREE.ConeGeometry(1.6, 9, 5), talonMat);
                talon.position.set(t * 3, -12, 14);
                talon.rotation.x = 1.3;
                talon.rotation.z = t * 0.2;
                arm.add(talon);
            }

            arm.position.set(isLeft ? -16 : 16, 0, 4);
            arm.rotation.y = isLeft ? 0.3 : -0.3;
            return arm;
        };

        const leftArm = createClawHand(true);
        const rightArm = createClawHand(false);
        group.add(leftArm);
        group.add(rightArm);

        // Store animated parts in userData
        group.userData = { jawGroup, headGroup, eyeGlow, leftArm, rightArm };
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

        // Idle animations: Wumpus menacing presence
        if (this.wumpusMesh.visible) {
            const scale = 1 + 0.04 * Math.sin(time * 2.5);
            this.wumpusMesh.scale.set(scale, scale * 1.02, scale);

            const { jawGroup, headGroup, eyeGlow, leftArm, rightArm } = this.wumpusMesh.userData;
            if (jawGroup) {
                // Jaw breathing & menacing snap
                jawGroup.rotation.x = 0.35 + 0.08 * Math.sin(time * 3);
            }
            if (headGroup) {
                // Subtle head predatory sway
                headGroup.rotation.y = 0.08 * Math.sin(time * 1.5);
                headGroup.rotation.x = 0.04 * Math.cos(time * 2);
            }
            if (leftArm && rightArm) {
                // Claws flex/tense
                leftArm.rotation.z = 0.06 * Math.sin(time * 2.5);
                rightArm.rotation.z = -0.06 * Math.sin(time * 2.5);
            }
            if (eyeGlow) {
                // Pulsing ominous eye light
                eyeGlow.intensity = 1.8 + 0.8 * Math.sin(time * 4);
            }
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
