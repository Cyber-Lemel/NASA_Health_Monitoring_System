import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import {
    RotateCcw, Eye, Play, Pause, ZoomIn, ZoomOut,
    Flame, Activity, Shield, Crosshair, Sparkles, Wind
} from 'lucide-react';

interface Astronaut3DModelProps {
    heartRate: number; // e.g. 135 bpm
    coreTemp: number; // e.g. 38.2 C
    oxygenSaturation: number;
    demoHeartRate?: number;
    evaStatus: string; // e.g. "ON-GOING"
    astronautName?: string;
    telemetryOverlay?: React.ReactNode;
}

type ViewMode = 'skeleton' | 'thermal' | 'suit';
type BodyTarget = 'full' | 'head' | 'chest' | 'spine' | 'arms' | 'legs';
const telemetryAnchors = [
    { id: 'heart', side: 'left', point: new THREE.Vector3(0.35, 1.63, 0.36) },
    { id: 'hand', side: 'left', point: new THREE.Vector3(-1.59, -0.64, 0.4) },
    { id: 'ribs', side: 'left', point: new THREE.Vector3(-0.56, 0.91, 0.35) },
    { id: 'core', side: 'right', point: new THREE.Vector3(0.28, 0.65, 0.34) },
] as const;
export type CharacterModel = 'piccolo' | 'luffy' | 'frieren' | 'astronaut';

// The outfit, skeleton, and thermal overlay share these anatomical landmarks.
const crewPose = [
    {
        shoulder: new THREE.Vector3(1.23, 2.25, 0),
        elbow: new THREE.Vector3(1.59, 0.97, -0.13),
        wrist: new THREE.Vector3(1.48, -0.27, 0.15),
        hip: new THREE.Vector3(0.51, -0.39, 0),
        knee: new THREE.Vector3(0.67, -2.28, 0.23),
        ankle: new THREE.Vector3(0.76, -4.12, 0.01),
    },
    {
        shoulder: new THREE.Vector3(-1.23, 2.21, 0.04),
        elbow: new THREE.Vector3(-1.53, 0.91, 0),
        wrist: new THREE.Vector3(-1.59, -0.33, 0.29),
        hip: new THREE.Vector3(-0.51, -0.39, 0.04),
        knee: new THREE.Vector3(-0.62, -2.24, 0.39),
        ankle: new THREE.Vector3(-0.73, -4.12, 0.32),
    },
];

function ellipsoid(
    material: THREE.Material,
    center: THREE.Vector3,
    width: number,
    height: number,
    depth: number,
) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), material);
    mesh.position.copy(center);
    mesh.scale.set(width, height, depth);
    return mesh;
}

function roundedProfile(points: [radius: number, height: number][], depthRatio = 1) {
    const curve = new THREE.SplineCurve(points.map(([radius, height]) => new THREE.Vector2(radius, height)));
    const profile = curve.getPoints(56);
    for (const point of profile) {
        point.x = Math.max(0, point.x);
    }
    return new THREE.LatheGeometry(profile, 48).scale(1, 1, depthRatio);
}

function addPosePivot(parent: THREE.Group, anchor: THREE.Vector3) {
    const pivot = new THREE.Group();
    const meshes = new THREE.Group();
    pivot.position.copy(anchor);
    meshes.position.copy(anchor).negate();
    pivot.add(meshes);
    parent.add(pivot);
    return { pivot, meshes };
}

function taperedLimb(
    material: THREE.Material,
    joints: THREE.Vector3[],
    profile: [distance: number, radius: number][],
) {
    const curve = new THREE.CatmullRomCurve3(joints);
    const segments = 32;
    const sides = 24;
    const geometry = new THREE.TubeGeometry(curve, segments, 1, sides, false);
    const positions = geometry.getAttribute('position');
    const radiusCurve = new THREE.SplineCurve(profile.map(([distance, radius]) => new THREE.Vector2(distance, radius)));
    const samples = radiusCurve.getPoints(64);
    const vertex = new THREE.Vector3();
    let upper = 1;

    for (let ring = 0; ring <= segments; ring++) {
        const distance = ring / segments;
        const center = curve.getPointAt(distance);
        while (upper < samples.length - 1 && samples[upper].x < distance) {
            upper++;
        }
        const start = samples[upper - 1];
        const end = samples[upper];
        const blend = THREE.MathUtils.clamp((distance - start.x) / (end.x - start.x), 0, 1);
        const radius = Math.max(0.001, THREE.MathUtils.lerp(start.y, end.y, blend));
        for (let side = 0; side <= sides; side++) {
            const index = ring * (sides + 1) + side;
            vertex.fromBufferAttribute(positions, index).sub(center).multiplyScalar(radius).add(center);
            positions.setXYZ(index, vertex.x, vertex.y, vertex.z);
        }
    }

    geometry.computeVertexNormals();
    const normals = geometry.getAttribute('normal');
    const otherNormal = new THREE.Vector3();
    // The first and last vertex of each ring meet at the texture seam.
    for (let ring = 0; ring <= segments; ring++) {
        const first = ring * (sides + 1);
        const last = first + sides;
        vertex.fromBufferAttribute(normals, first).add(otherNormal.fromBufferAttribute(normals, last)).normalize();
        normals.setXYZ(first, vertex.x, vertex.y, vertex.z);
        normals.setXYZ(last, vertex.x, vertex.y, vertex.z);
    }
    return new THREE.Mesh(geometry, material);
}

export default function Astronaut3DModel({
    heartRate,
    coreTemp,
    oxygenSaturation,
    demoHeartRate,
    evaStatus,
    astronautName = 'CDR. Elena Rovani',
    telemetryOverlay,
}: Astronaut3DModelProps) {
    const mountRef = useRef<HTMLDivElement>(null);
    const telemetryRef = useRef<HTMLDivElement>(null);
    const connectorRef = useRef<SVGSVGElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const modelGroupRef = useRef<THREE.Group | null>(null);
    const heartMeshRef = useRef<THREE.Mesh | null>(null);
    const heartLightRef = useRef<THREE.PointLight | null>(null);
    const setThermalSurfaceRef = useRef<((enabled: boolean) => void) | null>(null);
    const skeletonGroupRef = useRef<THREE.Group | null>(null);
    const suitGroupRef = useRef<THREE.Group | null>(null);
    const piccoloGroupRef = useRef<THREE.Group | null>(null);
    const luffyGroupRef = useRef<THREE.Group | null>(null);
    const frierenGroupRef = useRef<THREE.Group | null>(null);

    // State for interactive UI controls
    const [characterModel, setCharacterModel] = useState<CharacterModel>('piccolo');
    const [isAutoRotate, setIsAutoRotate] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('suit');
    const [selectedTarget, setSelectedTarget] = useState<BodyTarget>('full');

    // Drag-to-rotate interaction refs
    const isDraggingRef = useRef(false);
    const prevMousePosRef = useRef({ x: 0, y: 0 });
    const targetRotationRef = useRef({ x: 0, y: 0 });
    const autoRotateRef = useRef(isAutoRotate);

    // Dynamic color indicators
    const isElevatedTemp = coreTemp > 37.8;
    const isHighHr = heartRate > 115;
    const hasCardiacAlert = demoHeartRate !== undefined || isHighHr || isElevatedTemp;
    const hasOxygenAlert = Number.isFinite(oxygenSaturation) && oxygenSaturation < 95;

    // Keep live vitals updated inside requestAnimationFrame loop
    const heartRateRef = useRef(heartRate);
    const coreTempRef = useRef(coreTemp);
    useEffect(() => {
        heartRateRef.current = heartRate;
        coreTempRef.current = coreTemp;
    }, [heartRate, coreTemp]);

    useEffect(() => {
        autoRotateRef.current = isAutoRotate;
    }, [isAutoRotate]);

    useEffect(() => {
        const container = mountRef.current;
        if (!container) return;

        const width = container.clientWidth || 360;
        const height = container.clientHeight || 450;

        // 1. Scene
        const scene = new THREE.Scene();
        sceneRef.current = scene;
        scene.fog = new THREE.FogExp2(0x030b14, 0.035);

        // 2. Camera
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        camera.position.set(0, 0, 16);
        const cameraOrbit = new THREE.Group();
        cameraOrbit.add(camera);
        scene.add(cameraOrbit);
        cameraRef.current = camera;

        // 3. Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        rendererRef.current = renderer;
        container.appendChild(renderer.domElement);

        // 4. Lights
        const ambientLight = new THREE.AmbientLight(0x8594ab, 0.38);
        scene.add(ambientLight);

        // The wallpaper moon stays at screen right as the camera orbits.
        const moonlight = new THREE.DirectionalLight(0xe0e8ff, 3.2);
        moonlight.position.set(8, 6, 5);
        cameraOrbit.add(moonlight, moonlight.target);

        // Pulsing Point light inside the heart
        const heartPointLight = new THREE.PointLight(0xef4444, 2.0, 6);
        heartPointLight.position.set(0.35, 1.5, 0.4);
        heartLightRef.current = heartPointLight;

        // 5. Root Model Group
        const modelGroup = new THREE.Group();
        scene.add(modelGroup);
        modelGroupRef.current = modelGroup;

        // Subgroups for togglable view modes & character models
        const skeletonGroup = new THREE.Group();
        const suitGroup = new THREE.Group();
        const piccoloGroup = new THREE.Group();
        const luffyGroup = new THREE.Group();
        const frierenGroup = new THREE.Group();
        const piccoloUpperBody = new THREE.Group();
        const skeletonUpperBody = new THREE.Group();
        piccoloGroup.add(piccoloUpperBody);
        skeletonGroup.add(skeletonUpperBody);
        const neckPivot = new THREE.Vector3(0, 3.06, -0.02);
        const piccoloHead = addPosePivot(piccoloUpperBody, neckPivot);
        const skeletonHead = addPosePivot(skeletonUpperBody, neckPivot);
        const armPivots = crewPose.map(({ shoulder }) => ({
            outfit: addPosePivot(piccoloUpperBody, shoulder),
            skeleton: addPosePivot(skeletonUpperBody, shoulder),
            side: Math.sign(shoulder.x),
        }));

        modelGroup.add(skeletonGroup);
        modelGroup.add(suitGroup);
        modelGroup.add(piccoloGroup);
        modelGroup.add(luffyGroup);
        modelGroup.add(frierenGroup);

        skeletonGroupRef.current = skeletonGroup;
        suitGroupRef.current = suitGroup;
        piccoloGroupRef.current = piccoloGroup;
        luffyGroupRef.current = luffyGroup;
        frierenGroupRef.current = frierenGroup;

        // --- Materials ---
        const boneMat = new THREE.MeshStandardMaterial({
            color: 0x5cdbdf,
            emissive: 0x144c5c,
            roughness: 0.3,
            metalness: 0.8,
            wireframe: true,
        });

        const spineMat = new THREE.MeshStandardMaterial({
            color: 0x7dd3fc,
            emissive: 0x0284c7,
            roughness: 0.4,
            metalness: 0.6,
        });

        const jointMat = new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            emissive: 0x5cdbdf,
            emissiveIntensity: 0.6,
            roughness: 0.2,
            metalness: 0.9,
        });

        // ---------------------------------------------
        // SKELETON: Anatomical 3D Bones & Spine
        // ---------------------------------------------

        // Cranium and rounded mandible
        skeletonHead.meshes.add(
            ellipsoid(boneMat, new THREE.Vector3(0, 3.7, 0), 0.63, 0.7, 0.62),
            ellipsoid(boneMat, new THREE.Vector3(0, 3.32, 0.26), 0.43, 0.35, 0.38),
        );
        const socketMat = new THREE.MeshBasicMaterial({ color: 0x0a2235 });
        for (const side of [-1, 1]) {
            skeletonHead.meshes.add(ellipsoid(socketMat, new THREE.Vector3(side * 0.25, 3.56, 0.59), 0.15, 0.11, 0.05));
        }

        // Spine follows the curve from the neck down to the pelvis.
        const spineDepth = (y: number) => -0.3 - 0.08 * Math.cos((y - 1.45) * 1.8);
        for (let i = 0; i < 18; i++) {
            const y = 2.96 - i * 0.198;
            skeletonUpperBody.add(ellipsoid(spineMat, new THREE.Vector3(0, y, spineDepth(y)), 0.15 + i * 0.003, 0.089, 0.14));
        }

        const sternum = ellipsoid(boneMat, new THREE.Vector3(0, 1.56, 0.52), 0.105, 0.57, 0.06);
        skeletonUpperBody.add(sternum);
        for (let rib = 0; rib < 8; rib++) {
            const y = 2.24 - rib * 0.175;
            const width = 0.55 + 0.42 * Math.sin((rib + 1) / 9 * Math.PI);
            for (const side of [-1, 1]) {
                const ribCurve = new THREE.CatmullRomCurve3([
                    new THREE.Vector3(side * 0.08, y, spineDepth(y)),
                    new THREE.Vector3(side * width * 0.77, y - 0.06, -0.29),
                    new THREE.Vector3(side * width, y - 0.19, 0.08),
                    new THREE.Vector3(side * width * 0.63, y - 0.26, 0.48),
                    new THREE.Vector3(side * (rib < 6 ? 0.08 : 0.22), Math.max(1.03, y - 0.2), 0.52),
                ]);
                skeletonUpperBody.add(new THREE.Mesh(new THREE.TubeGeometry(ribCurve, 24, 0.044, 8, false), boneMat));
            }
        }

        const pelvis = new THREE.Mesh(new THREE.TorusGeometry(0.57, 0.12, 12, 32), boneMat);
        pelvis.scale.set(1.05, 0.68, 1);
        pelvis.rotation.x = 1.15;
        pelvis.position.set(0, -0.36, 0);
        skeletonGroup.add(pelvis);

        for (const [index, { shoulder, elbow, wrist, hip, knee, ankle }] of crewPose.entries()) {
            const side = Math.sign(shoulder.x);
            const hand = wrist.clone().add(new THREE.Vector3(-side * 0.03, -0.27, 0.045));
            const toes = ankle.clone().add(new THREE.Vector3(side * 0.09, -0.28, 0.47));
            skeletonUpperBody.add(
                taperedLimb(boneMat, [new THREE.Vector3(0.12 * side, 2.32, 0.37), shoulder], [[0, 0.05], [1, 0.065]]),
                ellipsoid(jointMat, shoulder, 0.16, 0.15, 0.15),
            );
            armPivots[index].skeleton.meshes.add(
                taperedLimb(boneMat, [shoulder, elbow], [[0, 0.1], [0.45, 0.063], [1, 0.09]]),
                taperedLimb(boneMat, [elbow, wrist], [[0, 0.085], [0.45, 0.052], [1, 0.06]]),
                ellipsoid(jointMat, elbow, 0.125, 0.135, 0.12),
                ellipsoid(jointMat, wrist, 0.096, 0.085, 0.088),
                taperedLimb(boneMat, [wrist, hand], [[0, 0.075], [0.6, 0.117], [1, 0.04]]),
            );
            skeletonGroup.add(
                taperedLimb(boneMat, [hip, knee], [[0, 0.11], [0.53, 0.083], [1, 0.12]]),
                taperedLimb(boneMat, [knee, ankle], [[0, 0.11], [0.56, 0.065], [1, 0.08]]),
                ellipsoid(jointMat, hip, 0.16, 0.17, 0.16),
                ellipsoid(jointMat, knee, 0.125, 0.14, 0.12),
                ellipsoid(jointMat, ankle, 0.11, 0.12, 0.105),
                taperedLimb(boneMat, [ankle, toes], [[0, 0.105], [0.65, 0.15], [1, 0.04]]),
            );
        }

        // ---------------------------------------------
        // PULSING 3D HEART
        // ---------------------------------------------
        const heartShape = new THREE.Shape();
        const x = 0, y = 0;
        heartShape.moveTo(x + 0.25, y + 0.25);
        heartShape.bezierCurveTo(x + 0.25, y + 0.25, x + 0.2, y, x, y);
        heartShape.bezierCurveTo(x - 0.3, y, x - 0.3, y + 0.35, x - 0.3, y + 0.35);
        heartShape.bezierCurveTo(x - 0.3, y + 0.55, x - 0.1, y + 0.77, x + 0.25, y + 0.95);
        heartShape.bezierCurveTo(x + 0.6, y + 0.77, x + 0.8, y + 0.55, x + 0.8, y + 0.35);
        heartShape.bezierCurveTo(x + 0.8, y + 0.35, x + 0.8, y, x + 0.5, y);
        heartShape.bezierCurveTo(x + 0.35, y, x + 0.25, y + 0.25, x + 0.25, y + 0.25);

        const heartExtrude = new THREE.ExtrudeGeometry(heartShape, {
            depth: 0.3,
            bevelEnabled: true,
            bevelSegments: 4,
            steps: 2,
            bevelSize: 0.08,
            bevelThickness: 0.08,
        });
        heartExtrude.center();
        heartExtrude.rotateZ(Math.PI);
        heartExtrude.scale(0.55, 0.55, 0.55);

        const heartMat = new THREE.MeshStandardMaterial({
            color: 0xef4444,
            emissive: 0xdc2626,
            emissiveIntensity: 1.2,
            roughness: 0.2,
            metalness: 0.8,
        });
        const heartMesh = new THREE.Mesh(heartExtrude, heartMat);
        heartMesh.position.set(0.35, 1.5, 0.4);
        skeletonUpperBody.add(heartMesh, heartPointLight);
        heartMeshRef.current = heartMesh;

        // ---------------------------------------------
        // SUIT WIREFRAME SILHOUETTE (Suit Layer)
        // ---------------------------------------------
        const suitTorsoGeo = new THREE.CylinderGeometry(1.3, 1.1, 3.2, 16);
        const suitTorsoMat = new THREE.MeshStandardMaterial({
            color: 0x5cdbdf,
            emissive: 0x0e3a47,
            wireframe: true,
            transparent: true,
            opacity: 0.45,
        });
        const suitTorso = new THREE.Mesh(suitTorsoGeo, suitTorsoMat);
        suitTorso.position.set(0, 1.1, 0.1);
        suitGroup.add(suitTorso);

        // Helmet bubble
        const helmetGeo = new THREE.SphereGeometry(1.25, 16, 16);
        const helmetMat = new THREE.MeshStandardMaterial({
            color: 0x5cdbdf,
            emissive: 0x0e3a47,
            wireframe: true,
            transparent: true,
            opacity: 0.35,
        });
        const helmet = new THREE.Mesh(helmetGeo, helmetMat);
        helmet.position.set(0, 3.5, 0.1);
        suitGroup.add(helmet);

        // ---------------------------------------------
        // PROCEDURAL CHARACTER MODELS (Piccolo, Luffy, Frieren)
        // ---------------------------------------------
        // 1. PICCOLO (Dragon Ball Z Namekian)
        const pSkinMat = new THREE.MeshStandardMaterial({ color: 0x38b000, roughness: 0.72 });
        const pPurpleMat = new THREE.MeshStandardMaterial({ color: 0x581c87, roughness: 0.82 });
        const pCapeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.86 });
        const pBlueBeltMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.78 });
        const pPinkPatchMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.72 });
        const pBootMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.65 });
        const pRedWristMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.74 });
        const pFaceShadow = new THREE.MeshStandardMaterial({ color: 0x214811, roughness: 0.78 });
        const pPupilMat = new THREE.MeshStandardMaterial({ color: 0x13250f, roughness: 0.48 });

        // Sculpt the face around the jaw and cheekbones, keeping the turban and antennae.
        const pHeadGeo = roundedProfile([
            [0, 2.98], [0.18, 3.0], [0.35, 3.11], [0.49, 3.29],
            [0.63, 3.51], [0.66, 3.73], [0.6, 3.98], [0.45, 4.15], [0, 4.23],
        ], 0.92);
        piccoloUpperBody.add(ellipsoid(pSkinMat, new THREE.Vector3(0, 3.03, -0.04), 0.32, 0.42, 0.33));
        piccoloHead.meshes.add(
            new THREE.Mesh(pHeadGeo, pSkinMat),
            ellipsoid(pSkinMat, new THREE.Vector3(0, 3.42, 0.56), 0.11, 0.16, 0.14),
        );

        const mouth = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(-0.16, 3.275, 0.439),
            new THREE.Vector3(0, 3.244, 0.477),
            new THREE.Vector3(0.16, 3.275, 0.439),
        );
        piccoloHead.meshes.add(new THREE.Mesh(new THREE.TubeGeometry(mouth, 12, 0.016, 6, false), pFaceShadow));

        const pTurban = new THREE.Mesh(roundedProfile([
            [0, 3.87], [0.58, 3.85], [0.74, 3.94], [0.79, 4.11],
            [0.76, 4.32], [0.63, 4.44], [0.48, 4.46], [0, 4.43],
        ], 0.93), pCapeMat);
        piccoloHead.meshes.add(
            pTurban,
            ellipsoid(pPurpleMat, new THREE.Vector3(0, 4.35, 0), 0.64, 0.27, 0.61),
        );

        for (const side of [-1, 1]) {
            const eye = ellipsoid(pCapeMat, new THREE.Vector3(side * 0.245, 3.57, 0.555), 0.175, 0.065, 0.066);
            eye.rotation.set(0, side * 0.28, side * 0.32);
            const brow = ellipsoid(pSkinMat, new THREE.Vector3(side * 0.255, 3.628, 0.559), 0.23, 0.072, 0.086);
            brow.rotation.copy(eye.rotation);
            piccoloHead.meshes.add(
                eye,
                brow,
                ellipsoid(pPupilMat, new THREE.Vector3(side * 0.223, 3.559, 0.618), 0.046, 0.053, 0.02),
                taperedLimb(pSkinMat, [
                    new THREE.Vector3(side * 0.53, 3.49, -0.01),
                    new THREE.Vector3(side * 0.81, 3.59, 0.005),
                    new THREE.Vector3(side * 1.14, 3.74, -0.056),
                ], [[0, 0.15], [0.34, 0.195], [0.66, 0.109], [1, 0.004]]),
                taperedLimb(pSkinMat, [
                    new THREE.Vector3(side * 0.23, 3.81, 0.53),
                    new THREE.Vector3(side * 0.29, 4.0, 0.73),
                    new THREE.Vector3(side * 0.36, 4.14, 0.87),
                ], [[0, 0.062], [0.56, 0.047], [0.92, 0.036], [1, 0.005]]),
            );
        }

        // Rounded chest, narrow waist and a continuous gi silhouette.
        piccoloUpperBody.add(
            new THREE.Mesh(roundedProfile([
                [0, -0.54], [0.54, -0.46], [0.82, -0.2], [0.79, 0.27],
                [0.85, 0.62], [1.04, 1.26], [1.19, 1.91], [1.22, 2.17],
                [1.1, 2.39], [0.76, 2.52], [0.34, 2.65], [0, 2.65],
            ], 0.63), pPurpleMat),
            new THREE.Mesh(roundedProfile([
                [0, 0.11], [0.77, 0.11], [0.85, 0.17], [0.88, 0.25], [0.86, 0.34],
                [0.89, 0.42], [0.85, 0.51], [0.8, 0.53], [0, 0.53],
            ], 0.73), pBlueBeltMat),
        );

        const cowl = new THREE.Mesh(new THREE.TorusGeometry(0.93, 0.26, 20, 48), pCapeMat);
        cowl.rotation.x = Math.PI / 2;
        cowl.scale.set(1.27, 0.73, 1);
        cowl.position.set(0, 2.48, 0.02);
        piccoloUpperBody.add(cowl);

        const capeGeometry = new THREE.PlaneGeometry(2, 2, 32, 24);
        const capeVertices = capeGeometry.getAttribute('position') as THREE.BufferAttribute;
        const capeDrop = new Float32Array(capeVertices.count);
        capeVertices.setUsage(THREE.DynamicDrawUsage);
        for (let i = 0; i < capeVertices.count; i++) {
            const across = capeVertices.getX(i);
            const drop = (1 - capeVertices.getY(i)) / 2;
            capeDrop[i] = drop;
            const halfWidth = 1.26 + 0.26 * drop - 0.14 * Math.sin(Math.PI * drop);
            const folds = Math.cos(across * Math.PI * 3.5 + drop * 0.7) * (0.06 + drop * 0.13);
            capeVertices.setXYZ(
                i,
                across * halfWidth - 0.09 * drop * drop,
                2.47 - 4.8 * drop + 0.12 * across * across * drop,
                -0.68 - drop * 0.64 + across * across * (0.46 - 0.34 * drop) + folds,
            );
        }
        capeGeometry.computeVertexNormals();
        const capeNormals = capeGeometry.getAttribute('normal') as THREE.BufferAttribute;
        capeNormals.setUsage(THREE.DynamicDrawUsage);
        const capeRest = capeVertices.clone();
        const capeMaterial = pCapeMat.clone();
        capeMaterial.side = THREE.DoubleSide;
        const cape = new THREE.Mesh(capeGeometry, capeMaterial);
        cape.frustumCulled = false;
        piccoloUpperBody.add(cape);

        // Continuous limbs carry the same stance through the scanner views.
        for (const [index, { shoulder, elbow, wrist, hip, knee, ankle }] of crewPose.entries()) {
            const side = Math.sign(shoulder.x);
            const upperArmPatch = shoulder.clone().lerp(elbow, 0.42);
            upperArmPatch.z += 0.245;
            const patch = ellipsoid(pPinkPatchMat, upperArmPatch, 0.174, 0.405, 0.122);
            patch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), shoulder.clone().sub(elbow).normalize());

            const bandStart = elbow.clone().lerp(wrist, 0.87);
            const bandEnd = wrist.clone().add(new THREE.Vector3(0, -0.08, 0.023));
            const knuckles = wrist.clone().add(new THREE.Vector3(-side * 0.035, -0.30, 0.12));
            const bootToe = ankle.clone().add(new THREE.Vector3(side * 0.12, -0.26, 0.72));
            armPivots[index].outfit.meshes.add(
                taperedLimb(pSkinMat, [
                    shoulder.clone().add(new THREE.Vector3(-side * 0.2, 0.14, 0)),
                    shoulder, elbow, wrist,
                ], [[0, 0.035], [0.12, 0.31], [0.31, 0.315], [0.54, 0.218], [0.68, 0.245], [1, 0.142]]),
                patch,
                taperedLimb(pRedWristMat, [bandStart, wrist, bandEnd],
                    [[0, 0.15], [0.15, 0.19], [0.81, 0.18], [1, 0.145]]),
                taperedLimb(pSkinMat, [wrist, knuckles, knuckles.clone().add(new THREE.Vector3(0, -0.12, 0.062))],
                    [[0, 0.132], [0.48, 0.221], [0.75, 0.20], [1, 0.008]]),
                ellipsoid(pSkinMat, knuckles.clone().add(new THREE.Vector3(-side * 0.135, 0.05, 0.128)),
                    0.092, 0.145, 0.088),
            );
            piccoloGroup.add(
                taperedLimb(pPurpleMat, [
                    hip.clone().add(new THREE.Vector3(-side * 0.08, 0.45, 0)), hip, knee, ankle,
                ], [[0, 0.31], [0.17, 0.535], [0.34, 0.49], [0.56, 0.383],
                    [0.69, 0.411], [0.83, 0.33], [0.94, 0.31], [1, 0.196]]),
                taperedLimb(pBootMat, [
                    ankle.clone().add(new THREE.Vector3(0, 0.09, -0.025)),
                    ankle.clone().add(new THREE.Vector3(0, -0.22, 0.08)),
                    ankle.clone().add(new THREE.Vector3(side * 0.065, -0.31, 0.42)),
                    bootToe,
                ], [[0, 0.23], [0.31, 0.244], [0.56, 0.236], [0.82, 0.14], [1, 0.004]]),
            );
        }

        // A false-color surface follows the existing model and idle pose.
        const thermalMaterial = new THREE.ShaderMaterial({
            uniforms: {
                coreHeat: { value: 0 },
                sweepHeight: { value: 0 },
            },
            vertexShader: `
                varying vec3 bodyPoint;
                varying vec3 viewNormal;
                varying vec3 viewDirection;
                void main() {
                    bodyPoint = (modelMatrix * vec4(position, 1.0)).xyz;
                    vec4 viewPoint = modelViewMatrix * vec4(position, 1.0);
                    viewDirection = -viewPoint.xyz;
                    viewNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * viewPoint;
                }
            `,
            fragmentShader: `
                uniform float coreHeat;
                uniform float sweepHeight;
                varying vec3 bodyPoint;
                varying vec3 viewNormal;
                varying vec3 viewDirection;

                float region(vec3 center, vec3 spread) {
                    vec3 offset = (bodyPoint - center) / spread;
                    return exp(-dot(offset, offset));
                }

                void main() {
                    float core = region(vec3(0.0, 1.58, 0.3), vec3(1.38, 1.65, 1.25));
                    float face = region(vec3(0.0, 3.55, 0.31), vec3(0.85, 0.93, 0.95));
                    float hands = region(vec3(sign(bodyPoint.x) * 1.5, -0.56, 0.25), vec3(0.49, 0.64, 0.61));
                    float legs = region(vec3(sign(bodyPoint.x) * 0.62, -1.65, 0.1), vec3(0.75, 1.45, 0.9));
                    float surfaceDetail = sin(bodyPoint.x * 8.0 + bodyPoint.y * 3.2) * sin(bodyPoint.z * 8.5 - bodyPoint.y * 5.0);
                    float heat = clamp(0.18 + max(max(core * (0.76 + coreHeat * 0.24), face * 0.61), max(hands * 0.47, legs * 0.44)) + 0.034 * surfaceDetail, 0.0, 1.0);

                    vec3 color = mix(vec3(0.06, 0.10, 0.29), vec3(0.21, 0.16, 0.75), smoothstep(0.15, 0.38, heat));
                    color = mix(color, vec3(0.82, 0.09, 0.57), smoothstep(0.36, 0.60, heat));
                    color = mix(color, vec3(1.0, 0.41, 0.12), smoothstep(0.57, 0.81, heat));
                    color = mix(color, vec3(1.0, 0.91, 0.53), smoothstep(0.79, 1.0, heat));

                    float facing = max(0.0, dot(normalize(viewNormal), normalize(viewDirection)));
                    float rim = pow(1.0 - facing, 4.2);
                    float contour = pow(0.5 + 0.5 * cos(heat * 72.0), 10.0) * 0.13;
                    float sweep = exp(-abs(bodyPoint.y - sweepHeight) * 12.0);
                    color *= 0.72 + facing * 0.28;
                    color += vec3(0.20, 0.74, 1.0) * (rim * 0.39 + sweep * 0.18);
                    color += vec3(0.95, 0.78, 1.0) * contour;
                    gl_FragColor = vec4(color, 1.0);
                }
            `,
        });
        const thermalMeshes: { mesh: THREE.Mesh; original: THREE.Material | THREE.Material[] }[] = [];
        piccoloGroup.traverse((object) => {
            if (object instanceof THREE.Mesh && object !== cape) {
                thermalMeshes.push({ mesh: object, original: object.material });
            }
        });
        setThermalSurfaceRef.current = (enabled) => {
            for (const { mesh, original } of thermalMeshes) {
                mesh.material = enabled ? thermalMaterial : original;
            }
            cape.visible = !enabled;
        };

        // 2. MONKEY D. LUFFY (Straw Hat Captain)
        const lSkinMat = new THREE.MeshStandardMaterial({ color: 0xfbd0a8, roughness: 0.6 });
        const lStrawMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.8 });
        const lRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 });
        const lDenimMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.6 });
        const lWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
        const lSashMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });
        const lHairMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
        const lScarMat = new THREE.MeshBasicMaterial({ color: 0x991b1b });

        const lHead = new THREE.Mesh(new THREE.SphereGeometry(0.8, 18, 16), lSkinMat);
        lHead.position.set(0, 3.6, 0);
        luffyGroup.add(lHead);

        const lHair = new THREE.Mesh(new THREE.SphereGeometry(0.84, 14, 12), lHairMat);
        lHair.position.set(0, 3.75, -0.05);
        luffyGroup.add(lHair);

        const lBrim = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.65, 0.08, 24), lStrawMat);
        lBrim.position.set(0, 4.15, 0);
        lBrim.rotation.set(-0.15, 0, 0);
        luffyGroup.add(lBrim);

        const lCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.65, 20), lStrawMat);
        lCrown.position.set(0, 4.45, -0.05);
        lCrown.rotation.set(-0.15, 0, 0);
        luffyGroup.add(lCrown);

        const lRibbon = new THREE.Mesh(new THREE.CylinderGeometry(0.96, 0.97, 0.16, 20), lRedMat);
        lRibbon.position.set(0, 4.25, -0.02);
        lRibbon.rotation.set(-0.15, 0, 0);
        luffyGroup.add(lRibbon);

        // Luffy Torso & Chest X-Scar
        const lTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.72, 2.3, 16), lSkinMat);
        lTorso.position.set(0, 1.45, 0);
        luffyGroup.add(lTorso);

        const lLVest = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.76, 2.3, 12, 1, false, Math.PI * 0.15, Math.PI * 0.85), lRedMat);
        lLVest.position.set(0, 1.45, 0);
        luffyGroup.add(lLVest);

        const lRVest = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.76, 2.3, 12, 1, false, Math.PI * 1.0, Math.PI * 0.85), lRedMat);
        lRVest.position.set(0, 1.45, 0);
        luffyGroup.add(lRVest);

        const lScar1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.95, 0.05), lScarMat);
        lScar1.rotation.set(0, 0, Math.PI / 4);
        lScar1.position.set(0, 1.5, 0.82);
        luffyGroup.add(lScar1);

        const lScar2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.95, 0.05), lScarMat);
        lScar2.rotation.set(0, 0, -Math.PI / 4);
        lScar2.position.set(0, 1.5, 0.82);
        luffyGroup.add(lScar2);

        // Luffy Sash, Shorts & Bare Legs
        const lSash = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.84, 0.55, 16), lSashMat);
        lSash.position.set(0, 0.35, 0);
        luffyGroup.add(lSash);

        const lDrape = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.6, 0.1), lSashMat);
        lDrape.position.set(0.85, -0.4, 0.15);
        lDrape.rotation.set(0, 0, -0.1);
        luffyGroup.add(lDrape);

        const lArmG = new THREE.CylinderGeometry(0.2, 0.17, 2.6, 10);
        const lLArm = new THREE.Mesh(lArmG, lSkinMat);
        lLArm.position.set(1.3, 0.8, 0);
        luffyGroup.add(lLArm);
        const lRArm = new THREE.Mesh(lArmG, lSkinMat);
        lRArm.position.set(-1.3, 0.8, 0);
        luffyGroup.add(lRArm);

        const lShortG = new THREE.CylinderGeometry(0.42, 0.44, 1.7, 14);
        const lLShort = new THREE.Mesh(lShortG, lDenimMat);
        lLShort.position.set(0.55, -0.85, 0);
        luffyGroup.add(lLShort);
        const lRShort = new THREE.Mesh(lShortG, lDenimMat);
        lRShort.position.set(-0.55, -0.85, 0);
        luffyGroup.add(lRShort);

        const lCuffG = new THREE.TorusGeometry(0.45, 0.12, 8, 16);
        lCuffG.rotateX(Math.PI / 2);
        const lLCuff = new THREE.Mesh(lCuffG, lWhiteMat);
        lLCuff.position.set(0.55, -1.7, 0);
        luffyGroup.add(lLCuff);
        const lRCuff = new THREE.Mesh(lCuffG, lWhiteMat);
        lRCuff.position.set(-0.55, -1.7, 0);
        luffyGroup.add(lRCuff);

        const lLegG = new THREE.CylinderGeometry(0.22, 0.18, 2.4, 10);
        const lLLeg = new THREE.Mesh(lLegG, lSkinMat);
        lLLeg.position.set(0.55, -2.9, 0);
        luffyGroup.add(lLLeg);
        const lRLeg = new THREE.Mesh(lLegG, lSkinMat);
        lRLeg.position.set(-0.55, -2.9, 0);
        luffyGroup.add(lRLeg);

        // 3. FRIEREN (Elven Mage)
        const fSkinMat = new THREE.MeshStandardMaterial({ color: 0xfff1f2, roughness: 0.5 });
        const fWhiteMat = new THREE.MeshStandardMaterial({ color: 0xfdfbf7, roughness: 0.4 });
        const fGoldMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.3, metalness: 0.8 });
        const fRubyMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, emissive: 0x991b1b, emissiveIntensity: 0.7 });
        const fHairMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6 });
        const fTightsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
        const fBootMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 });

        const fHead = new THREE.Mesh(new THREE.SphereGeometry(0.75, 18, 16), fSkinMat);
        fHead.position.set(0, 3.6, 0);
        frierenGroup.add(fHead);

        const fHair = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 14), fHairMat);
        fHair.position.set(0, 3.75, -0.05);
        frierenGroup.add(fHair);

        const fTailG = new THREE.CylinderGeometry(0.12, 0.22, 2.8, 10);
        const fLTail = new THREE.Mesh(fTailG, fHairMat);
        fLTail.position.set(0.75, 2.4, -0.3);
        fLTail.rotation.set(0.1, 0, -0.15);
        frierenGroup.add(fLTail);
        const fRTail = new THREE.Mesh(fTailG, fHairMat);
        fRTail.position.set(-0.75, 2.4, -0.3);
        fRTail.rotation.set(0.1, 0, 0.15);
        frierenGroup.add(fRTail);

        const fEarG = new THREE.ConeGeometry(0.16, 0.75, 8);
        fEarG.rotateZ(Math.PI / 2);
        const fLEar = new THREE.Mesh(fEarG, fSkinMat);
        fLEar.position.set(0.8, 3.6, -0.08);
        fLEar.rotation.set(0, -0.2, 0.25);
        frierenGroup.add(fLEar);
        const fREar = new THREE.Mesh(fEarG, fSkinMat);
        fREar.position.set(-0.8, 3.6, -0.08);
        fREar.rotation.set(0, 0.2, -0.25);
        frierenGroup.add(fREar);

        const fCapelet = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1.2, 18, 1, true), fWhiteMat);
        fCapelet.position.set(0, 2.4, 0);
        frierenGroup.add(fCapelet);

        const fTrimG = new THREE.TorusGeometry(1.35, 0.05, 8, 20);
        fTrimG.rotateX(Math.PI / 2);
        const fTrim = new THREE.Mesh(fTrimG, fGoldMat);
        fTrim.position.set(0, 1.8, 0);
        frierenGroup.add(fTrim);

        const fBrooch = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), fRubyMat);
        fBrooch.position.set(0, 2.3, 0.8);
        frierenGroup.add(fBrooch);

        const fSkirt = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.6, 18, 1, true), fWhiteMat);
        fSkirt.position.set(0, 0.6, 0);
        frierenGroup.add(fSkirt);

        const fLegG = new THREE.CylinderGeometry(0.24, 0.2, 2.2, 10);
        const fLLeg = new THREE.Mesh(fLegG, fTightsMat);
        fLLeg.position.set(0.45, -1.3, 0);
        frierenGroup.add(fLLeg);
        const fRLeg = new THREE.Mesh(fLegG, fTightsMat);
        fRLeg.position.set(-0.45, -1.3, 0);
        frierenGroup.add(fRLeg);

        const fBootG = new THREE.CylinderGeometry(0.28, 0.26, 2.0, 10);
        const fLBoot = new THREE.Mesh(fBootG, fBootMat);
        fLBoot.position.set(0.45, -3.2, 0);
        frierenGroup.add(fLBoot);
        const fRBoot = new THREE.Mesh(fBootG, fBootMat);
        fRBoot.position.set(-0.45, -3.2, 0);
        frierenGroup.add(fRBoot);

        // Frieren Crescent Staff
        const fStaff = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 7.2, 12), new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.5 }));
        fStaff.position.set(-1.6, 0.8, 0.4);
        frierenGroup.add(fStaff);

        const fCrescent = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.09, 8, 20, Math.PI * 1.5), fGoldMat);
        fCrescent.position.set(-1.6, 4.2, 0.4);
        fCrescent.rotation.set(0, 0, Math.PI / 4);
        frierenGroup.add(fCrescent);

        const fOrb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), fRubyMat);
        fOrb.position.set(-1.6, 4.2, 0.4);
        frierenGroup.add(fOrb);

        // Initial character model visibility (Piccolo default)
        suitGroup.visible = false;
        piccoloGroup.visible = true;
        luffyGroup.visible = false;
        frierenGroup.visible = false;

        // ---------------------------------------------
        // HOLOGRAPHIC SCANNER & FLOOR TELEMETRY RINGS
        // ---------------------------------------------
        // Floor concentric rings
        const ringGeo = new THREE.RingGeometry(2.4, 2.5, 36);
        ringGeo.rotateX(Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x1a4b6c,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7,
        });
        const floorRing = new THREE.Mesh(ringGeo, ringMat);
        floorRing.position.set(0, -4.7, 0);
        scene.add(floorRing);

        const innerRingGeo = new THREE.RingGeometry(1.4, 1.48, 28);
        innerRingGeo.rotateX(Math.PI / 2);
        const innerRingMat = new THREE.MeshBasicMaterial({
            color: 0x5cdbdf,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.4,
        });
        const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
        innerRing.position.set(0, -4.7, 0);
        scene.add(innerRing);

        const footContactGeometry = new THREE.PlaneGeometry(0.95, 1.45);
        footContactGeometry.rotateX(-Math.PI / 2);
        const footContactMaterial = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                void main() {
                    float fade = 1.0 - smoothstep(0.04, 0.5, length(vUv - 0.5));
                    gl_FragColor = vec4(0.005, 0.01, 0.02, fade * fade * 0.72);
                }
            `,
        });
        for (const { ankle } of crewPose) {
            const contact = new THREE.Mesh(footContactGeometry, footContactMaterial);
            contact.position.set(ankle.x, -4.695, ankle.z + 0.25);
            piccoloGroup.add(contact);
        }

        // Three open arcs trace the scan plane and leave the center clear.
        const scanRing = new THREE.Group();
        const scanRadius = 2.45;
        const scanArc = new THREE.TorusGeometry(scanRadius, 0.018, 6, 48, Math.PI * 0.56);
        const scanGlow = new THREE.TorusGeometry(scanRadius, 0.045, 6, 48, Math.PI * 0.56);
        const scanHalo = new THREE.TorusGeometry(scanRadius, 0.082, 8, 48, Math.PI * 0.56);
        const scanAccent = new THREE.TorusGeometry(scanRadius + 0.075, 0.023, 6, 12, 0.18);
        const scanMat = new THREE.MeshBasicMaterial({
            color: 0x5cdbdf,
            transparent: true,
            depthWrite: false,
            opacity: 0.72,
        });
        const scanGlowMat = new THREE.MeshBasicMaterial({
            color: 0x39aee8,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            opacity: 0.12,
        });
        const scanHaloMat = scanGlowMat.clone();
        const scanAccentMat = scanMat.clone();
        scanAccentMat.color.setHex(0xc0faff);
        for (let segment = 0; segment < 3; segment++) {
            const section = new THREE.Group();
            section.rotation.z = segment * Math.PI * 2 / 3;
            section.add(
                new THREE.Mesh(scanHalo, scanHaloMat),
                new THREE.Mesh(scanGlow, scanGlowMat),
                new THREE.Mesh(scanArc, scanMat),
            );
            const accent = new THREE.Mesh(scanAccent, scanAccentMat);
            accent.rotation.z = 1.58;
            section.add(accent);
            scanRing.add(section);
        }
        const scanPlane = new THREE.Group();
        scanPlane.rotation.x = -Math.PI / 2;
        scanPlane.add(scanRing);
        scene.add(scanPlane);

        const scanTrail = [
            { delay: 0.055, opacity: 0.12 },
            { delay: 0.11, opacity: 0.055 },
        ].map(({ delay, opacity }) => {
            const plane = new THREE.Group();
            plane.rotation.x = scanPlane.rotation.x;
            const ring = new THREE.Group();
            const material = scanGlowMat.clone();
            for (let segment = 0; segment < 3; segment++) {
                const arc = new THREE.Mesh(scanArc, material);
                arc.rotation.z = segment * Math.PI * 2 / 3;
                ring.add(arc);
            }
            plane.add(ring);
            scene.add(plane);
            return { plane, ring, material, delay, opacity };
        });

        // Floating Dust Particles
        const particleCount = 60;
        const particleGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 8;
            positions[i + 1] = (Math.random() - 0.5) * 10;
            positions[i + 2] = (Math.random() - 0.5) * 6;
        }
        particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const particleMat = new THREE.PointsMaterial({
            color: 0x5cdbdf,
            size: 0.08,
            transparent: true,
            opacity: 0.6,
        });
        const particles = new THREE.Points(particleGeo, particleMat);
        scene.add(particles);

        // ---------------------------------------------
        // ANIMATION LOOP
        // ---------------------------------------------
        const upperBodies = [piccoloUpperBody, skeletonUpperBody];
        let animationFrameId: number;
        let previousFrameTime = performance.now();
        let elapsedTime = 0;
        let viewYaw = 0;
        let viewPitch = 0;
        let capeSway = 0;
        let capeSwayVelocity = 0;
        let capeLift = 0;
        const viewRotation = new THREE.Euler(0, 0, 0, 'XYZ');
        const projectedAnchor = new THREE.Vector3();

        const animate = (frameTime: number) => {
            animationFrameId = requestAnimationFrame(animate);
            const delta = THREE.MathUtils.clamp((frameTime - previousFrameTime) / 1000, 0.001, 1 / 30);
            previousFrameTime = frameTime;
            elapsedTime += delta;

            // Orbit the scanner so the model and the platform stay level together.
            if (autoRotateRef.current && !isDraggingRef.current) {
                targetRotationRef.current.y += 0.48 * delta;
            }
            const nextYaw = THREE.MathUtils.damp(viewYaw, targetRotationRef.current.y, 6.3, delta);
            const nextPitch = THREE.MathUtils.damp(viewPitch, targetRotationRef.current.x, 6.3, delta);
            const yawSpeed = (nextYaw - viewYaw) / delta;
            const pitchSpeed = (nextPitch - viewPitch) / delta;
            viewYaw = nextYaw;
            viewPitch = nextPitch;
            viewRotation.set(viewPitch, viewYaw, 0);
            cameraOrbit.quaternion.setFromEuler(viewRotation).invert();

            // Move the upper torso around the belt line. The legs and feet stay planted.
            const breath = (1 - Math.cos(elapsedTime * 1.45)) * 0.5;
            const weightShift = Math.sin(elapsedTime * 0.71) * 0.028;
            for (const body of upperBodies) {
                body.scale.set(1 + breath * 0.012, 1 + breath * 0.009, 1 + breath * 0.038);
                body.position.y = 0.32 * (1 - body.scale.y);
                body.rotation.z = weightShift;
            }

            // The head leads the glance. The arms respond more slowly to the weight shift.
            const glance = 0.16 * Math.pow(Math.sin(elapsedTime * 0.59), 3);
            const headDip = -0.035 * breath + 0.035 * Math.sin(elapsedTime * 0.83);
            piccoloHead.pivot.rotation.set(headDip, glance, -0.6 * weightShift);
            skeletonHead.pivot.rotation.copy(piccoloHead.pivot.rotation);
            for (const { outfit, skeleton, side } of armPivots) {
                const swing = Math.sin(elapsedTime * 0.71 - 0.55) * side * 0.055;
                outfit.pivot.rotation.set(swing - breath * 0.022, swing * 0.4, -side * breath * 0.035);
                skeleton.pivot.rotation.copy(outfit.pivot.rotation);
            }

            // Turning pulls the free end of the cape sideways. Damping lets it settle
            // back into its hanging shape when the turn ends.
            const swayTarget = THREE.MathUtils.clamp(yawSpeed * 0.17, -0.69, 0.69);
            capeSwayVelocity += ((swayTarget - capeSway) * 60 - capeSwayVelocity * 10) * delta;
            capeSway += capeSwayVelocity * delta;
            const liftTarget = THREE.MathUtils.clamp(Math.abs(yawSpeed) * 0.045 - pitchSpeed * 0.08, -0.15, 0.22);
            capeLift = THREE.MathUtils.damp(capeLift, liftTarget, 5, delta);

            if (piccoloGroup.visible && cape.visible) {
                for (let i = 0; i < capeVertices.count; i++) {
                    const drop = capeDrop[i];
                    const free = drop * drop;
                    const x = capeRest.getX(i);
                    const sway = capeSway * free;
                    capeVertices.setXYZ(
                        i,
                        x + sway,
                        capeRest.getY(i) + free * (0.32 * capeSway * capeSway + capeLift),
                        capeRest.getZ(i) - free * (0.13 * Math.abs(capeSway) + x * capeSway * 0.21),
                    );
                }
                capeVertices.needsUpdate = true;
                capeGeometry.computeVertexNormals();
            }

            // 2. Heart Pulsation (frequency dynamically driven by active astronaut's heartRate bpm)
            if (heartMeshRef.current) {
                const currentHr = heartRateRef.current || 75;
                const bpmFreq = (currentHr / 60) * Math.PI * 2;
                const pulse = 1.0 + Math.pow(Math.sin(elapsedTime * bpmFreq), 4) * 0.28;
                heartMeshRef.current.scale.set(0.55 * pulse, 0.55 * pulse, 0.55 * pulse);

                if (heartLightRef.current) {
                    heartLightRef.current.intensity = 1.5 + Math.sin(elapsedTime * bpmFreq) * 1.5;
                }
            }

            // Dim the arcs briefly as the scan reverses at either end.
            const scanPhase = elapsedTime * 1.2;
            const scanIntensity = 0.42 + 0.58 * Math.abs(Math.sin(scanPhase));
            scanPlane.position.y = Math.cos(scanPhase) * 4.48;
            thermalMaterial.uniforms.sweepHeight.value = scanPlane.position.y;
            thermalMaterial.uniforms.coreHeat.value = THREE.MathUtils.clamp((coreTempRef.current - 36) / 3, 0, 1);
            scanRing.rotation.z = elapsedTime * 0.24;
            scanMat.opacity = 0.72 * scanIntensity;
            scanGlowMat.opacity = 0.16 * scanIntensity;
            scanHaloMat.opacity = 0.045 * scanIntensity;
            scanAccentMat.opacity = 0.9 * scanIntensity;
            for (const { plane, ring, material, delay, opacity } of scanTrail) {
                const trailTime = Math.max(0, elapsedTime - delay);
                plane.position.y = Math.cos(trailTime * 1.2) * 4.48;
                ring.rotation.z = trailTime * 0.24;
                material.opacity = opacity * Math.abs(Math.sin(scanPhase));
            }

            // 4. Floor ring rotation
            floorRing.rotation.y = elapsedTime * 0.15;
            innerRing.rotation.y = -elapsedTime * 0.25;

            renderer.render(scene, camera);

            const connectors = connectorRef.current;
            const telemetry = telemetryRef.current;
            if (connectors && telemetry && connectors.clientWidth > 0) {
                const frame = connectors.getBoundingClientRect();
                const canvas = renderer.domElement.getBoundingClientRect();

                for (const [index, { id, side, point }] of telemetryAnchors.entries()) {
                    const gradient = connectors.querySelector(`#scanner-fade-${id}`);
                    const link = connectors.children[index + 1];
                    const card = telemetry.querySelector(`[data-scanner-anchor="${id}"]`)?.getBoundingClientRect();
                    if (!card) {
                        link.setAttribute('visibility', 'hidden');
                        continue;
                    }
                    const startX = (side === 'left' ? card.right : card.left) - frame.left;
                    const startY = card.top + card.height / 2 - frame.top;
                    const pose = id === 'hand' ? armPivots[1].outfit.meshes : piccoloUpperBody;
                    pose.localToWorld(projectedAnchor.copy(point)).project(camera);
                    const x = canvas.left - frame.left + (projectedAnchor.x + 1) * canvas.width / 2;
                    const y = canvas.top - frame.top + (1 - projectedAnchor.y) * canvas.height / 2;
                    const direction = side === 'left' ? 1 : -1;
                    const visible = canvas.height > 0 && Math.abs(projectedAnchor.y) < 0.94 &&
                        Math.abs(projectedAnchor.z) < 1 && (x - startX) * direction > 28;
                    link.setAttribute('visibility', visible ? 'visible' : 'hidden');
                    if (visible) {
                        const elbow = startX + direction * Math.min(38, Math.abs(x - startX) / 2);
                        gradient?.setAttribute('x1', String(startX));
                        gradient?.setAttribute('x2', String(x));
                        link.children[0].setAttribute('d', `M${startX} ${startY} H${elbow} L${x} ${y}`);
                        link.children[1].setAttribute('transform', `translate(${x} ${y})`);
                    }
                }
            }
        };

        animationFrameId = requestAnimationFrame(animate);

        // Resize handler
        const handleResize = () => {
            if (!container || !renderer || !camera) return;
            const newWidth = container.clientWidth;
            const newHeight = container.clientHeight;
            camera.aspect = newWidth / newHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(newWidth, newHeight);
        };

        const canvasResize = new ResizeObserver(handleResize);
        canvasResize.observe(container);

        // Cleanup
        return () => {
            cancelAnimationFrame(animationFrameId);
            canvasResize.disconnect();
            if (renderer.domElement && container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
            footContactGeometry.dispose();
            footContactMaterial.dispose();
            capeGeometry.dispose();
            capeMaterial.dispose();
            setThermalSurfaceRef.current = null;
            thermalMaterial.dispose();
            scanArc.dispose();
            scanGlow.dispose();
            scanHalo.dispose();
            scanAccent.dispose();
            scanMat.dispose();
            scanGlowMat.dispose();
            scanHaloMat.dispose();
            scanAccentMat.dispose();
            scanTrail.forEach(({ material }) => material.dispose());
            renderer.dispose();
        };
    }, []);

    // Update visibility based on ViewMode & CharacterModel
    useEffect(() => {
        if (!skeletonGroupRef.current || !suitGroupRef.current) return;

        const isCharacterOutfitVisible = viewMode === 'suit';
        const isThermal = viewMode === 'thermal';

        skeletonGroupRef.current.visible = viewMode === 'skeleton';
        setThermalSurfaceRef.current?.(isThermal);

        // Toggle character models
        suitGroupRef.current.visible = isCharacterOutfitVisible && characterModel === 'astronaut';
        if (piccoloGroupRef.current) {
            piccoloGroupRef.current.visible = isThermal || (isCharacterOutfitVisible && characterModel === 'piccolo');
        }
        if (luffyGroupRef.current) {
            luffyGroupRef.current.visible = isCharacterOutfitVisible && characterModel === 'luffy';
        }
        if (frierenGroupRef.current) {
            frierenGroupRef.current.visible = isCharacterOutfitVisible && characterModel === 'frieren';
        }
    }, [viewMode, characterModel]);

    // Handle mouse drag to rotate 3D canvas
    const handleMouseDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!e.isPrimary || e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        isDraggingRef.current = true;
        prevMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!e.isPrimary || !isDraggingRef.current) return;
        const deltaX = e.clientX - prevMousePosRef.current.x;
        const deltaY = e.clientY - prevMousePosRef.current.y;
        prevMousePosRef.current = { x: e.clientX, y: e.clientY };

        targetRotationRef.current.y += deltaX * 0.01;
        targetRotationRef.current.x = Math.max(-0.6, Math.min(0.6, targetRotationRef.current.x + deltaY * 0.008));
    };

    const handleMouseUp = () => {
        isDraggingRef.current = false;
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (!cameraRef.current) return;
        const delta = e.deltaY * 0.01;
        cameraRef.current.position.z = Math.max(8, Math.min(24, cameraRef.current.position.z + delta));
    };

    // Zoom Controls
    const zoomIn = () => {
        if (!cameraRef.current) return;
        cameraRef.current.position.z = Math.max(8, cameraRef.current.position.z - 2);
    };

    const zoomOut = () => {
        if (!cameraRef.current) return;
        cameraRef.current.position.z = Math.min(24, cameraRef.current.position.z + 2);
    };

    const resetCamera = () => {
        if (!cameraRef.current || !modelGroupRef.current) return;
        cameraRef.current.position.set(0, 0, 16);
        targetRotationRef.current = { x: 0, y: 0 };
        setSelectedTarget('full');
    };

    // Camera focusing on anatomical target
    const handleTargetSelect = (target: BodyTarget) => {
        setSelectedTarget(target);
        if (!cameraRef.current || !modelGroupRef.current) return;

        if (target === 'head') {
            cameraRef.current.position.set(0, 2.5, 8);
        } else if (target === 'chest') {
            cameraRef.current.position.set(0, 1.2, 9);
        } else if (target === 'spine') {
            cameraRef.current.position.set(0, 0.5, 10);
            targetRotationRef.current.y = Math.PI; // Look at back
        } else if (target === 'legs') {
            cameraRef.current.position.set(0, -2.5, 9);
        } else {
            cameraRef.current.position.set(0, 0, 16);
            targetRotationRef.current = { x: 0, y: 0 };
        }
    };

    return (
        <div className="relative w-full h-full min-h-[460px] @container orbit-scanner-glass flex flex-col justify-between overflow-hidden group select-none">
            <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-4">
                <div className="min-w-0">
                    <h2 className="orbit-section-title">{viewMode === 'thermal' ? 'Thermal scan' : 'Character scanner'}</h2>
                    <p className="mt-0.5 truncate text-xs text-slate-300" title={astronautName}>{astronautName}</p>
                </div>

                <div role="group" aria-label="Scanner view" className="orbit-segmented">
                    {([{ mode: 'suit', label: 'Suit' }, { mode: 'skeleton', label: 'Skeleton' }, { mode: 'thermal', label: 'Heatmap' }] as const).map(({ mode, label }) => (
                        <button key={mode} type="button" aria-pressed={viewMode === mode} onClick={() => setViewMode(mode)}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Scanner notifications */}
            {(hasCardiacAlert || hasOxygenAlert) && (
                <div className="relative z-20 mx-3 mb-2 flex flex-col items-end gap-2">
                    {hasCardiacAlert && (
                        <div role="status" className="orbit-glass orbit-glass-alert relative flex max-w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 sm:px-4">
                            <Activity aria-hidden="true" className="size-5 shrink-0 text-rose-300" />
                            <span className="text-base leading-snug font-semibold tracking-tight text-rose-50">{demoHeartRate === undefined ? 'Cardiac Exertion Alert' : 'Cardiac Alert · Low BPM'}</span>
                            <span className="flex flex-wrap gap-x-3 text-xs font-semibold text-rose-200 tabular-nums sm:text-sm">
                                {demoHeartRate !== undefined ? <span>{demoHeartRate} bpm · Demo</span> : (
                                    <>
                                        {isHighHr && <span>{heartRate} bpm</span>}
                                        {isElevatedTemp && <span>{coreTemp}°C</span>}
                                    </>
                                )}
                            </span>
                        </div>
                    )}
                    {hasOxygenAlert && (
                        <div role="status" className="orbit-glass orbit-glass-alert relative flex max-w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 sm:px-4">
                            <Wind aria-hidden="true" className="size-5 shrink-0 text-rose-300" />
                            <span className="text-base leading-snug font-semibold tracking-tight text-rose-50">Low Oxygen Saturation</span>
                            <span className="text-xs font-semibold text-rose-200 tabular-nums sm:text-sm">
                                {oxygenSaturation}%{demoHeartRate !== undefined && ' · Demo'}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Main Interactive Three.js WebGL Canvas Mount */}
            <div
                ref={mountRef}
                onPointerDown={handleMouseDown}
                onPointerMove={handleMouseMove}
                onPointerUp={handleMouseUp}
                onLostPointerCapture={handleMouseUp}
                onWheel={handleWheel}
                className="relative min-h-[320px] flex-1 w-full cursor-grab active:cursor-grabbing z-10"
                style={{ touchAction: 'none' }}
            />

            {telemetryOverlay && (
                <>
                    <svg ref={connectorRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 hidden h-full w-full text-cyan-200 @min-[42rem]:block">
                        <defs>
                            <radialGradient id="scanner-marker-glow">
                                <stop offset="0%" stopColor="currentColor" stopOpacity=".42" />
                                <stop offset="55%" stopColor="currentColor" stopOpacity=".18" />
                                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                            </radialGradient>
                            {telemetryAnchors.map(({ id }) => (
                                <linearGradient key={id} id={`scanner-fade-${id}`} gradientUnits="userSpaceOnUse" y1="0" y2="0">
                                    <stop offset="0%" stopColor="currentColor" stopOpacity=".70" />
                                    <stop offset="45%" stopColor="currentColor" stopOpacity=".26" />
                                    <stop offset="80%" stopColor="currentColor" stopOpacity=".09" />
                                    <stop offset="100%" stopColor="currentColor" stopOpacity=".04" />
                                </linearGradient>
                            ))}
                        </defs>
                        {telemetryAnchors.map(({ id }) => (
                            <g key={id} visibility="hidden">
                                <path fill="none" stroke={`url(#scanner-fade-${id})`} />
                                <g>
                                    <circle r="10" fill="url(#scanner-marker-glow)" />
                                    <circle r="5" fill="none" stroke="currentColor" opacity=".55" />
                                    <circle r="1.7" fill="currentColor" opacity=".72" />
                                </g>
                            </g>
                        ))}
                    </svg>
                    <div ref={telemetryRef} className="pointer-events-none relative z-20 px-3 pb-2 @min-[42rem]:absolute @min-[42rem]:inset-x-5 @min-[42rem]:top-1/2 @min-[42rem]:-translate-y-1/2 @min-[42rem]:px-0 @min-[42rem]:pb-0">
                        {telemetryOverlay}
                    </div>
                </>
            )}

            {/* Anatomical Target Quick Inspector (Bottom Overlay) */}
            <div className="relative z-20 px-3 pb-2 flex flex-col gap-2 pointer-events-auto">
                {viewMode === 'thermal' && (
                    <div className="orbit-glass-inset self-center px-3 py-1.5 text-xs text-slate-200">
                        <div className="mb-1 text-center font-medium">Illustrative heat distribution</div>
                        <div className="flex items-center gap-2">
                            <span>Cooler</span>
                            <span aria-hidden="true" className="h-1.5 w-24 rounded-full bg-[linear-gradient(90deg,#3433bf,#d11791,#ff691f,#ffe887)] sm:w-32" />
                            <span>Warmer</span>
                        </div>
                    </div>
                )}
                {/* Floating anatomical target readout */}
                {selectedTarget !== 'full' && (
                    <div className="bg-[#06121e]/90 border border-[#5cdbdf]/50 p-2 text-xs flex items-center justify-between animate-in fade-in duration-150">
                        <div className="flex items-center gap-2">
                            <Crosshair className="w-3.5 h-3.5 text-[#5cdbdf]" />
                            <span className="text-white font-bold uppercase">TARGET: {selectedTarget}</span>
                            <span className="text-slate-400">
                                {selectedTarget === 'head' && 'Cranial index nominal • O2 saturation optimal'}
                                {selectedTarget === 'chest' && `Thoracic Load: Heart Rate ${heartRate} bpm, Core Temp ${coreTemp}°C`}
                                {selectedTarget === 'spine' && 'Vertebral alignment verified • Micro-gravity spinal decompression'}
                                {selectedTarget === 'legs' && 'Bone Density Monitoring • Lower extremity circulation stable'}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleTargetSelect('full')}
                            className="text-[#5cdbdf] hover:underline text-[11px] cursor-pointer"
                        >
                            Reset Focus
                        </button>
                    </div>
                )}

                {/* Bottom Controls Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#1a4b6c]/60 pt-2 text-xs">
                    <div role="group" aria-label="Focus on body region" className="orbit-segmented">
                        {(['head', 'chest', 'spine', 'legs'] as const).map((target) => (
                            <button key={target} type="button" aria-pressed={selectedTarget === target} onClick={() => handleTargetSelect(target)} className="capitalize">
                                {target}
                            </button>
                        ))}
                    </div>

                    {/* Camera Control Buttons */}
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setIsAutoRotate(!isAutoRotate)}
                            title={isAutoRotate ? 'Pause Auto-Rotation' : 'Resume Auto-Rotation'}
                            aria-pressed={isAutoRotate}
                            className="orbit-icon-control"
                        >
                            {isAutoRotate ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        </button>
                        <button
                            type="button"
                            onClick={zoomIn}
                            title="Zoom In"
                            className="orbit-icon-control"
                        >
                            <ZoomIn className="w-3 h-3" />
                        </button>
                        <button
                            type="button"
                            onClick={zoomOut}
                            title="Zoom Out"
                            className="orbit-icon-control"
                        >
                            <ZoomOut className="w-3 h-3" />
                        </button>
                        <button
                            type="button"
                            onClick={resetCamera}
                            title="Reset 3D Orientation"
                            className="orbit-icon-control"
                        >
                            <RotateCcw className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Instruction tooltip overlay */}
            <div className="absolute bottom-14 right-4 z-10 text-[11px] text-slate-400 pointer-events-none hidden @min-[42rem]:block">
                Drag to rotate · Scroll to zoom
            </div>
        </div>
    );
}
