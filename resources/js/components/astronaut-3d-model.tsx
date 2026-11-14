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
    const [characterModel, setCharacterModel] = useState<CharacterModel>('astronaut');
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

        // 4. Lights: Realistic Studio Space Lighting
        const ambientLight = new THREE.AmbientLight(0x8fa3bf, 0.75);
        scene.add(ambientLight);

        // Key light: Crisp direct directional light
        const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
        keyLight.position.set(6, 8, 7);
        cameraOrbit.add(keyLight, keyLight.target);

        // Cool rim light from behind to highlight spacesuit silhouette
        const rimLight = new THREE.DirectionalLight(0x93c5fd, 1.8);
        rimLight.position.set(-6, 5, -6);
        cameraOrbit.add(rimLight, rimLight.target);

        // Soft front-lower fill light
        const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.9);
        fillLight.position.set(0, -3, 6);
        cameraOrbit.add(fillLight, fillLight.target);

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
        const astronautUpperBody = new THREE.Group();

        piccoloGroup.add(piccoloUpperBody);
        skeletonGroup.add(skeletonUpperBody);
        suitGroup.add(astronautUpperBody);

        const neckPivot = new THREE.Vector3(0, 3.06, -0.02);
        const piccoloHead = addPosePivot(piccoloUpperBody, neckPivot);
        const skeletonHead = addPosePivot(skeletonUpperBody, neckPivot);
        const astronautHead = addPosePivot(astronautUpperBody, neckPivot);

        const armPivots = crewPose.map(({ shoulder }) => ({
            outfit: addPosePivot(piccoloUpperBody, shoulder),
            skeleton: addPosePivot(skeletonUpperBody, shoulder),
            suit: addPosePivot(astronautUpperBody, shoulder),
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
        skeletonHead.meshes.add(
            ellipsoid(boneMat, new THREE.Vector3(0, 3.7, 0), 0.63, 0.7, 0.62),
            ellipsoid(boneMat, new THREE.Vector3(0, 3.32, 0.26), 0.43, 0.35, 0.38),
        );

        const socketMat = new THREE.MeshBasicMaterial({ color: 0x0a2235 });
        for (const side of [-1, 1]) {
            skeletonHead.meshes.add(ellipsoid(socketMat, new THREE.Vector3(side * 0.25, 3.56, 0.59), 0.15, 0.11, 0.05));
        }

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

        // -------------------------------------------------------------
        // AUTHENTIC NASA EXTRAVEHICULAR MOBILITY UNIT (EMU / xEVA) SUIT
        // Matched 100% to NASA Extravehicular Spacewalk Flight Standard
        // -------------------------------------------------------------

        // 1. Procedural High-Resolution Textures (Dynamic HTML5 Canvas)
        const createNasaMeatballTexture = (): THREE.CanvasTexture => {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // NASA blue disc
                ctx.fillStyle = '#0b3d91';
                ctx.beginPath();
                ctx.arc(256, 256, 240, 0, Math.PI * 2);
                ctx.fill();

                // Stars
                ctx.fillStyle = '#ffffff';
                const stars = [
                    [120, 160, 4], [180, 120, 3], [320, 140, 5], [370, 190, 4],
                    [130, 320, 4], [170, 370, 3], [340, 340, 5], [260, 110, 4],
                    [220, 180, 2], [290, 220, 3], [140, 220, 3], [360, 260, 4]
                ];
                for (const [x, y, r] of stars) {
                    ctx.beginPath();
                    ctx.arc(x, y, r, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Red aerodynamic vector chevron
                ctx.fillStyle = '#fc3d21';
                ctx.beginPath();
                ctx.moveTo(90, 330);
                ctx.lineTo(256, 170);
                ctx.lineTo(430, 210);
                ctx.lineTo(270, 230);
                ctx.lineTo(130, 360);
                ctx.closePath();
                ctx.fill();

                ctx.beginPath();
                ctx.moveTo(256, 170);
                ctx.lineTo(390, 330);
                ctx.lineTo(360, 340);
                ctx.lineTo(260, 220);
                ctx.closePath();
                ctx.fill();

                // White orbital path loop
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 14;
                ctx.beginPath();
                ctx.ellipse(256, 256, 210, 80, -Math.PI / 6, 0, Math.PI * 2);
                ctx.stroke();

                // Bold white NASA logotype
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 112px "Arial Black", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('NASA', 256, 260);
            }
            const texture = new THREE.CanvasTexture(canvas);
            texture.colorSpace = THREE.SRGBColorSpace;
            return texture;
        };

        const createAmericanFlagTexture = (): THREE.CanvasTexture => {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 320;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const stripeHeight = 320 / 13;
                for (let i = 0; i < 13; i++) {
                    ctx.fillStyle = i % 2 === 0 ? '#b22234' : '#ffffff';
                    ctx.fillRect(0, i * stripeHeight, 512, stripeHeight);
                }
                ctx.fillStyle = '#3c3b6e';
                const cantonWidth = 512 * 0.44;
                const cantonHeight = stripeHeight * 7;
                ctx.fillRect(0, 0, cantonWidth, cantonHeight);

                ctx.fillStyle = '#ffffff';
                for (let row = 0; row < 5; row++) {
                    for (let col = 0; col < 6; col++) {
                        const cx = (col + 0.5) * (cantonWidth / 6);
                        const cy = (row + 0.5) * (cantonHeight / 5);
                        ctx.beginPath();
                        ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                ctx.strokeStyle = '#d4af37';
                ctx.lineWidth = 10;
                ctx.strokeRect(5, 5, 502, 310);
            }
            const texture = new THREE.CanvasTexture(canvas);
            texture.colorSpace = THREE.SRGBColorSpace;
            return texture;
        };

        const createDcmFaceplateTexture = (): THREE.CanvasTexture => {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#e2e8f0';
                ctx.fillRect(0, 0, 512, 512);

                ctx.strokeStyle = '#94a3b8';
                ctx.lineWidth = 10;
                ctx.strokeRect(8, 8, 496, 496);

                // NASA Meatball on upper left
                ctx.fillStyle = '#0b3d91';
                ctx.beginPath();
                ctx.arc(110, 115, 62, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fc3d21';
                ctx.beginPath();
                ctx.moveTo(70, 145);
                ctx.lineTo(110, 85);
                ctx.lineTo(150, 115);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 28px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('NASA', 110, 115);

                // Center Digital Display (Telemetry LCD Screen)
                ctx.fillStyle = '#061320';
                ctx.fillRect(200, 55, 275, 125);
                ctx.strokeStyle = '#1a4b6c';
                ctx.lineWidth = 4;
                ctx.strokeRect(200, 55, 275, 125);

                ctx.fillStyle = '#5cdbdf';
                ctx.font = 'bold 20px monospace';
                ctx.textAlign = 'left';
                ctx.fillText('SUIT P: 4.3 PSI', 215, 90);
                ctx.fillText('O2 FLOW: 100%', 215, 120);
                ctx.fillStyle = '#22c55e';
                ctx.fillText('DSN LINK • ACTIVE', 215, 150);

                // Middle switch banks
                ctx.fillStyle = '#cbd5e1';
                ctx.fillRect(35, 205, 442, 145);
                ctx.strokeStyle = '#64748b';
                ctx.lineWidth = 3;
                ctx.strokeRect(35, 205, 442, 145);

                ctx.fillStyle = '#0f172a';
                ctx.font = 'bold 15px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('VENT', 95, 230);
                ctx.fillText('O2 ACT', 185, 230);
                ctx.fillText('COMM', 275, 230);
                ctx.fillText('PUMP', 365, 230);

                // Toggle slots
                ctx.fillStyle = '#1e293b';
                for (const sx of [95, 185, 275, 365]) {
                    ctx.fillRect(sx - 12, 250, 24, 42);
                    ctx.fillStyle = '#e2e8f0';
                    ctx.fillRect(sx - 6, 260, 12, 22);
                    ctx.fillStyle = '#1e293b';
                }

                // Lower gauges
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(140, 420, 54, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#334155';
                ctx.lineWidth = 5;
                ctx.stroke();

                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(140, 420);
                ctx.lineTo(172, 395);
                ctx.stroke();

                ctx.fillStyle = '#1e40af';
                ctx.beginPath();
                ctx.arc(360, 420, 50, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#93c5fd';
                ctx.lineWidth = 6;
                ctx.stroke();

                ctx.fillStyle = '#475569';
                ctx.font = 'bold 16px sans-serif';
                ctx.fillText('EXTRAVEHICULAR DCM // EMU-MOD 4', 256, 380);
            }
            const texture = new THREE.CanvasTexture(canvas);
            texture.colorSpace = THREE.SRGBColorSpace;
            return texture;
        };

        const createWristChecklistTexture = (): THREE.CanvasTexture => {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 384;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, 256, 384);

                ctx.fillStyle = '#1d4ed8';
                ctx.fillRect(0, 0, 256, 65);

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 18px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('EVA-1 TIMELINE', 128, 30);
                ctx.font = '12px monospace';
                ctx.fillText('TASK 04: ORBIT INGRESS', 128, 52);

                ctx.fillStyle = '#1e293b';
                ctx.font = '13px monospace';
                ctx.textAlign = 'left';

                const tasks = [
                    '[X] 00:45 DEPRESS AIRLOCK',
                    '[X] 01:10 HATCH OPEN',
                    '[X] 01:30 TETHER SECURE',
                    '[ ] 02:15 PGT TOOL ALIGN',
                    '[ ] 03:00 SOLAR ARRAY R-2',
                    '[ ] 04:30 RADIATOR INSPECT',
                    '[ ] 06:00 AIRLOCK RETURN',
                    '[ ] 06:30 REPRESS 14.7 PSI',
                ];

                let ty = 95;
                for (const t of tasks) {
                    ctx.fillText(t, 20, ty);
                    ty += 34;
                }

                ctx.strokeStyle = '#cbd5e1';
                ctx.lineWidth = 3;
                ctx.strokeRect(4, 4, 248, 376);
            }
            const texture = new THREE.CanvasTexture(canvas);
            texture.colorSpace = THREE.SRGBColorSpace;
            return texture;
        };

        const createFabricBumpTexture = (): THREE.CanvasTexture => {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#808080';
                ctx.fillRect(0, 0, 512, 512);

                // Beta-cloth crossweave pattern
                ctx.fillStyle = '#8e8e8e';
                for (let y = 0; y < 512; y += 4) {
                    for (let x = 0; x < 512; x += 4) {
                        if ((x + y) % 8 === 0) {
                            ctx.fillRect(x, y, 3, 3);
                        }
                    }
                }

                // Horizontal natural cloth tension wrinkles
                ctx.strokeStyle = '#5a5a5a';
                ctx.lineWidth = 3;
                for (let y = 35; y < 512; y += 70) {
                    ctx.beginPath();
                    ctx.moveTo(0, y + Math.sin(y * 0.1) * 8);
                    ctx.bezierCurveTo(170, y + 16, 340, y - 16, 512, y + 6);
                    ctx.stroke();
                }
            }
            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(4, 4);
            return texture;
        };

        const createPgtToolTexture = (): THREE.CanvasTexture => {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#f1f5f9';
                ctx.fillRect(0, 0, 256, 128);

                ctx.fillStyle = '#1e293b';
                ctx.fillRect(0, 75, 256, 35);

                ctx.fillStyle = '#0f172a';
                ctx.font = 'bold 22px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('NASA PGT', 128, 45);

                ctx.fillStyle = '#eab308';
                for (let x = 10; x < 240; x += 25) {
                    ctx.beginPath();
                    ctx.moveTo(x, 80);
                    ctx.lineTo(x + 10, 80);
                    ctx.lineTo(x + 5, 105);
                    ctx.lineTo(x - 5, 105);
                    ctx.fill();
                }
            }
            const texture = new THREE.CanvasTexture(canvas);
            texture.colorSpace = THREE.SRGBColorSpace;
            return texture;
        };

        // Textures instantiation
        const nasaMeatballTex = createNasaMeatballTexture();
        const flagTex = createAmericanFlagTexture();
        const dcmTex = createDcmFaceplateTexture();
        const checklistTex = createWristChecklistTexture();
        const fabricBumpTex = createFabricBumpTexture();
        const pgtTex = createPgtToolTexture();

        // 2. Photorealistic PBR Materials
        const suitFabricMat = new THREE.MeshStandardMaterial({
            color: 0xf1f3f6,
            roughness: 0.85,
            metalness: 0.08,
            bumpMap: fabricBumpTex,
            bumpScale: 0.035,
        });

        const suitBellowsMat = new THREE.MeshStandardMaterial({
            color: 0xd8dde4,
            roughness: 0.72,
            metalness: 0.16,
        });

        const visorMat = new THREE.MeshStandardMaterial({
            color: 0xe5b824,
            roughness: 0.05,
            metalness: 0.98,
            emissive: 0x332600,
            emissiveIntensity: 0.22,
        });

        const visorRimMat = new THREE.MeshStandardMaterial({
            color: 0x1e242c,
            roughness: 0.6,
            metalness: 0.5,
        });

        const plssMat = new THREE.MeshStandardMaterial({
            color: 0xf6f8fb,
            roughness: 0.35,
            metalness: 0.16,
        });

        const machinedMetalMat = new THREE.MeshStandardMaterial({
            color: 0xc4cbd5,
            roughness: 0.22,
            metalness: 0.88,
        });

        const blueAnodizedMat = new THREE.MeshStandardMaterial({
            color: 0x1d64d8,
            roughness: 0.28,
            metalness: 0.75,
        });

        const redAnodizedMat = new THREE.MeshStandardMaterial({
            color: 0xd92d20,
            roughness: 0.28,
            metalness: 0.75,
        });

        const darkHardwareMat = new THREE.MeshStandardMaterial({
            color: 0x22262c,
            roughness: 0.65,
            metalness: 0.45,
        });

        const cameraLensMat = new THREE.MeshStandardMaterial({
            color: 0x050a14,
            roughness: 0.05,
            metalness: 0.95,
        });

        const lightEmitterMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xecfeff,
            emissiveIntensity: 2.0,
        });

        const rubberGripMat = new THREE.MeshStandardMaterial({
            color: 0x20242a,
            roughness: 0.94,
            metalness: 0.04,
        });

        const webbingStrapMat = new THREE.MeshStandardMaterial({
            color: 0xc8c2b5,
            roughness: 0.95,
            metalness: 0.02,
        });

        const thrusterNozzleMat = new THREE.MeshStandardMaterial({
            color: 0x47515f,
            roughness: 0.32,
            metalness: 0.9,
        });

        const dcmMat = new THREE.MeshStandardMaterial({
            map: dcmTex,
            roughness: 0.4,
            metalness: 0.25,
        });

        const flagMat = new THREE.MeshStandardMaterial({
            map: flagTex,
            roughness: 0.6,
            metalness: 0.05,
        });

        const nasaMat = new THREE.MeshStandardMaterial({
            map: nasaMeatballTex,
            roughness: 0.5,
            metalness: 0.1,
        });

        const checklistMat = new THREE.MeshStandardMaterial({
            map: checklistTex,
            roughness: 0.5,
            metalness: 0.1,
        });

        const pgtToolMat = new THREE.MeshStandardMaterial({
            map: pgtTex,
            roughness: 0.4,
            metalness: 0.3,
        });

        // Helper for authentic corrugated life support hoses
        const createCorrugatedHose = (
            points: THREE.Vector3[],
            radius: number,
            ribCount: number,
            baseMat: THREE.Material,
            ringMat: THREE.Material
        ): THREE.Group => {
            const group = new THREE.Group();
            const curve = new THREE.CatmullRomCurve3(points);
            const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, radius, 12, false), baseMat);
            group.add(tube);

            const tangent = new THREE.Vector3();
            const up = new THREE.Vector3(0, 1, 0);
            for (let i = 1; i < ribCount; i++) {
                const t = i / ribCount;
                const pt = curve.getPointAt(t);
                curve.getTangentAt(t, tangent);

                const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.15, radius * 0.24, 8, 16), ringMat);
                ring.position.copy(pt);
                ring.quaternion.setFromUnitVectors(up, tangent);
                group.add(ring);
            }
            return group;
        };

        // 3. HELMET & EXTRAVEHICULAR VISOR ASSEMBLY (EVVA)
        // Outer spherical helmet
        const helmetShell = ellipsoid(plssMat, new THREE.Vector3(0, 3.65, 0.03), 0.75, 0.82, 0.78);
        const helmetNeckRing = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.74, 0.16, 36), machinedMetalMat);
        helmetNeckRing.position.set(0, 3.12, 0.02);

        const neckLatchL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.1), blueAnodizedMat);
        neckLatchL.position.set(0.72, 3.12, 0.02);
        const neckLatchR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.1), blueAnodizedMat);
        neckLatchR.position.set(-0.72, 3.12, 0.02);

        // Gold reflective visor
        const visorFront = ellipsoid(visorMat, new THREE.Vector3(0, 3.62, 0.28), 0.62, 0.54, 0.60);
        const visorGasket = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.035, 12, 36), visorRimMat);
        visorGasket.position.set(0, 3.62, 0.26);

        // Protective sun visor brow cap
        const sunVisorCap = ellipsoid(plssMat, new THREE.Vector3(0, 3.92, 0.14), 0.76, 0.44, 0.72);
        const pivotDiskL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 20), darkHardwareMat);
        pivotDiskL.rotation.z = Math.PI / 2;
        pivotDiskL.position.set(0.74, 3.62, 0.12);
        const pivotDiskR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 20), darkHardwareMat);
        pivotDiskR.rotation.z = Math.PI / 2;
        pivotDiskR.position.set(-0.74, 3.62, 0.12);

        // Dual Helmet Worklights / Mini-Cameras (HECA Pods)
        const createHelmetPod = (isLeft: boolean): THREE.Group => {
            const pod = new THREE.Group();
            const sx = isLeft ? 1 : -1;
            pod.position.set(sx * 0.66, 4.02, 0.22);
            pod.rotation.y = sx * 0.38;
            pod.rotation.x = 0.12;

            const body = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.30), plssMat);
            const lensLight = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 16), lightEmitterMat);
            lensLight.rotation.x = Math.PI / 2;
            lensLight.position.set(0.045, 0.02, 0.16);

            const lensCam = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.03, 16), cameraLensMat);
            lensCam.rotation.x = Math.PI / 2;
            lensCam.position.set(-0.045, 0.02, 0.16);

            const bracket = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 10), machinedMetalMat);
            bracket.position.set(0, -0.1, 0);

            pod.add(body, lensLight, lensCam, bracket);
            return pod;
        };
        const worklightL = createHelmetPod(true);
        const worklightR = createHelmetPod(false);

        astronautHead.meshes.add(
            helmetShell,
            helmetNeckRing,
            neckLatchL,
            neckLatchR,
            visorFront,
            visorGasket,
            sunVisorCap,
            pivotDiskL,
            pivotDiskR,
            worklightL,
            worklightR
        );

        // 4. HARD UPPER TORSO (HUT) & DISPLAY AND CONTROL MODULE (DCM)
        const hut = new THREE.Mesh(new THREE.CylinderGeometry(0.96, 0.86, 1.48, 28), plssMat);
        hut.position.set(0, 1.78, 0.08);
        hut.scale.set(1.15, 1, 1.05);

        const neckCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.12, 32), machinedMetalMat);
        neckCollar.position.set(0, 2.52, 0.02);

        const scyeRingL = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.05, 12, 24), blueAnodizedMat);
        scyeRingL.rotation.y = Math.PI / 2;
        scyeRingL.position.set(1.16, 2.22, 0.02);

        const scyeRingR = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.05, 12, 24), blueAnodizedMat);
        scyeRingR.rotation.y = Math.PI / 2;
        scyeRingR.position.set(-1.16, 2.22, 0.02);

        // Chest Display and Control Module (DCM)
        const dcmHousing = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.66, 0.32), plssMat);
        dcmHousing.position.set(0, 1.62, 0.58);

        const dcmFaceplate = new THREE.Mesh(new THREE.BoxGeometry(0.80, 0.64, 0.02), dcmMat);
        dcmFaceplate.position.set(0, 1.62, 0.74);

        const dcmRedValve = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.08, 16), redAnodizedMat);
        dcmRedValve.rotation.x = Math.PI / 2;
        dcmRedValve.position.set(0.28, 1.38, 0.76);

        const dcmBlueValve = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.08, 16), blueAnodizedMat);
        dcmBlueValve.rotation.x = Math.PI / 2;
        dcmBlueValve.position.set(-0.28, 1.38, 0.76);

        const dcmTopShield = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.06, 0.36), machinedMetalMat);
        dcmTopShield.position.set(0, 1.96, 0.60);

        // Corrugated Umbilical Life Support Hoses
        const hose1 = createCorrugatedHose(
            [
                new THREE.Vector3(-0.26, 1.38, 0.72),
                new THREE.Vector3(-0.55, 1.15, 0.64),
                new THREE.Vector3(-0.68, 0.92, 0.32),
                new THREE.Vector3(-0.62, 1.10, -0.22),
            ],
            0.045,
            12,
            machinedMetalMat,
            suitBellowsMat
        );

        const hose2 = createCorrugatedHose(
            [
                new THREE.Vector3(0.26, 1.38, 0.72),
                new THREE.Vector3(0.55, 1.05, 0.64),
                new THREE.Vector3(0.68, 0.88, 0.32),
                new THREE.Vector3(0.62, 1.05, -0.22),
            ],
            0.045,
            12,
            machinedMetalMat,
            suitBellowsMat
        );

        // 5. PRIMARY LIFE SUPPORT SYSTEM (PLSS) BACKPACK & SAFER UNIT
        const plssMain = new THREE.Mesh(new THREE.BoxGeometry(1.42, 2.05, 0.72), plssMat);
        plssMain.position.set(0, 1.84, -0.46);

        const plssTopCap = new THREE.Mesh(new THREE.CylinderGeometry(0.70, 0.70, 0.28, 20), plssMat);
        plssTopCap.rotation.z = Math.PI / 2;
        plssTopCap.scale.set(0.5, 1, 1);
        plssTopCap.position.set(0, 2.92, -0.46);

        const antennaDome = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), machinedMetalMat);
        antennaDome.position.set(0.35, 3.02, -0.46);

        const lockerL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.85, 0.45), plssMat);
        lockerL.position.set(0.75, 1.84, -0.46);

        const lockerR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.85, 0.45), plssMat);
        lockerR.position.set(-0.75, 1.84, -0.46);

        // SAFER (Simplified Aid for EVA Rescue) Thruster Module
        const saferBody = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.46, 0.48), plssMat);
        saferBody.position.set(0, 0.94, -0.52);

        // 4 SAFER Conical Rocket Thruster Nozzles (Downwards & Lateral)
        const createThrusterNozzle = (x: number, y: number, z: number, rx: number, rz: number): THREE.Mesh => {
            const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.11, 0.18, 16, 1, true), thrusterNozzleMat);
            nozzle.position.set(x, y, z);
            nozzle.rotation.x = rx;
            nozzle.rotation.z = rz;
            return nozzle;
        };

        const thrusterDownL = createThrusterNozzle(0.64, 0.72, -0.52, Math.PI, 0);
        const thrusterDownR = createThrusterNozzle(-0.64, 0.72, -0.52, Math.PI, 0);
        const thrusterSideL = createThrusterNozzle(0.74, 0.94, -0.44, 0, -Math.PI / 2);
        const thrusterSideR = createThrusterNozzle(-0.74, 0.94, -0.44, 0, Math.PI / 2);

        // 6. WAIST, TACTICAL HARNESS & LOWER TORSO ASSEMBLY (LTA)
        const waistRing = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.08, 16, 36), machinedMetalMat);
        waistRing.rotation.x = Math.PI / 2;
        waistRing.position.set(0, 0.96, 0.05);

        const lowerTorso = ellipsoid(suitFabricMat, new THREE.Vector3(0, 0.48, 0.06), 0.88, 0.72, 0.65);

        // Tactical webbing harness straps crossing groin and pelvis
        const harnessStrap1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 0.02), webbingStrapMat);
        harnessStrap1.position.set(0.24, 0.48, 0.64);
        harnessStrap1.rotation.z = -Math.PI / 10;

        const harnessStrap2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 0.02), webbingStrapMat);
        harnessStrap2.position.set(-0.24, 0.48, 0.64);
        harnessStrap2.rotation.z = Math.PI / 10;

        // Tether Carabiner D-Rings
        const carabinerL = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 10, 20), machinedMetalMat);
        carabinerL.position.set(0.68, 0.65, 0.35);
        carabinerL.rotation.y = Math.PI / 2;

        const carabinerR = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 10, 20), machinedMetalMat);
        carabinerR.position.set(-0.68, 0.65, 0.35);
        carabinerR.rotation.y = Math.PI / 2;

        astronautUpperBody.add(
            hut,
            neckCollar,
            scyeRingL,
            scyeRingR,
            dcmHousing,
            dcmFaceplate,
            dcmTopShield,
            dcmRedValve,
            dcmBlueValve,
            hose1,
            hose2,
            plssMain,
            plssTopCap,
            antennaDome,
            lockerL,
            lockerR,
            saferBody,
            thrusterDownL,
            thrusterDownR,
            thrusterSideL,
            thrusterSideR,
            waistRing,
            lowerTorso,
            harnessStrap1,
            harnessStrap2,
            carabinerL,
            carabinerR
        );

        // 7. EMU ARMS, SHOULDER PATCHES, EVA CHECKLIST, GLOVES & PGT TOOL
        for (const [index, { shoulder, elbow, wrist, hip, knee, ankle }] of crewPose.entries()) {
            const side = Math.sign(shoulder.x);
            const hand = wrist.clone().add(new THREE.Vector3(-side * 0.05, -0.3, 0.1));
            const bootToe = ankle.clone().add(new THREE.Vector3(side * 0.1, -0.28, 0.55));

            // Pressurized Upper Arm Sleeve
            armPivots[index].suit.meshes.add(
                taperedLimb(suitFabricMat, [shoulder, elbow], [[0, 0.28], [0.5, 0.25], [1, 0.22]])
            );

            // Shoulder Insignia Patches
            if (side > 0) {
                // Left arm: American Flag Patch on upper arm
                const flagMesh = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.22, 0.34), flagMat);
                flagMesh.position.copy(shoulder).add(new THREE.Vector3(0.26, -0.25, 0));
                armPivots[index].suit.meshes.add(flagMesh);

                // Left forearm: EVA Cuff Checklist
                const checklistGroup = new THREE.Group();
                checklistGroup.position.copy(elbow).add(new THREE.Vector3(0.18, -0.38, 0.12));
                checklistGroup.rotation.y = Math.PI / 4;
                checklistGroup.rotation.x = -Math.PI / 10;

                const checklistPlate = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.32, 0.22), checklistMat);
                const checklistStrap1 = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.02, 10, 24), darkHardwareMat);
                checklistStrap1.rotation.y = Math.PI / 2;
                checklistStrap1.position.set(0, 0.1, 0);
                const checklistStrap2 = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 10, 24), darkHardwareMat);
                checklistStrap2.rotation.y = Math.PI / 2;
                checklistStrap2.position.set(0, -0.1, 0);

                checklistGroup.add(checklistPlate, checklistStrap1, checklistStrap2);
                armPivots[index].suit.meshes.add(checklistGroup);
            } else {
                // Right arm: NASA Meatball Patch on upper arm
                const nasaMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.02, 24), nasaMat);
                nasaMesh.rotation.z = Math.PI / 2;
                nasaMesh.position.copy(shoulder).add(new THREE.Vector3(-0.26, -0.25, 0));
                armPivots[index].suit.meshes.add(nasaMesh);
            }

            // Elbow Articulation Bellows (3 Ribs)
            for (let r = -1; r <= 1; r++) {
                const elbowRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.035, 10, 24), suitBellowsMat);
                elbowRing.position.copy(elbow).add(new THREE.Vector3(0, r * 0.06, 0));
                armPivots[index].suit.meshes.add(elbowRing);
            }

            // Pressurized Forearm Sleeve
            armPivots[index].suit.meshes.add(
                taperedLimb(suitFabricMat, [elbow, wrist], [[0, 0.22], [0.5, 0.20], [1, 0.18]])
            );

            // Wrist Disconnect Ring Assembly
            const wristRing = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.08, 24), machinedMetalMat);
            wristRing.position.copy(wrist);
            const wristLock = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.022, 10, 24), blueAnodizedMat);
            wristLock.position.copy(wrist);
            armPivots[index].suit.meshes.add(wristRing, wristLock);

            // Phase VI EVA Spacewalk Glove (Hand Palm & Formed Fingers)
            const glovePalm = ellipsoid(suitFabricMat, hand, 0.16, 0.18, 0.12);
            const gloveGripPad = ellipsoid(rubberGripMat, hand.clone().add(new THREE.Vector3(0, -0.04, 0.06)), 0.13, 0.15, 0.05);

            // Glove Fingers
            const thumb = taperedLimb(rubberGripMat, [hand, hand.clone().add(new THREE.Vector3(side * 0.1, -0.15, 0.08))], [[0, 0.055], [1, 0.04]]);
            const fingers = taperedLimb(rubberGripMat, [hand, hand.clone().add(new THREE.Vector3(0, -0.22, 0.02))], [[0, 0.09], [1, 0.06]]);

            armPivots[index].suit.meshes.add(glovePalm, gloveGripPad, thumb, fingers);

            // Handheld EVA Pistol-Grip Tool (PGT) in Right Hand (Index 1)
            if (index === 1) {
                const pgtGroup = new THREE.Group();
                pgtGroup.position.copy(hand).add(new THREE.Vector3(0, -0.12, 0.24));
                pgtGroup.rotation.x = Math.PI / 4.8;
                pgtGroup.rotation.y = -Math.PI / 18;

                // Ergonomic pistol grip
                const handle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.11), rubberGripMat);
                handle.rotation.x = -Math.PI / 12;

                // Main PGT drive head housing
                const head = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.44), plssMat);
                head.position.set(0, 0.18, 0.08);

                // Tool side label & caution banner
                const pgtLabel = new THREE.Mesh(new THREE.BoxGeometry(0.184, 0.14, 0.28), pgtToolMat);
                pgtLabel.position.set(0, 0.18, 0.08);

                // Top LCD telemetry readout
                const pgtScreen = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.16), darkHardwareMat);
                pgtScreen.position.set(0, 0.30, 0.06);

                // Heatsink cooling fins
                for (let f = -0.06; f <= 0.06; f += 0.03) {
                    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.015, 0.22), darkHardwareMat);
                    fin.position.set(0, 0.12 + f, -0.04);
                    pgtGroup.add(fin);
                }

                // Dual barrel socket drive & sensor optics
                const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.14, 16), machinedMetalMat);
                barrel.rotation.x = Math.PI / 2;
                barrel.position.set(0.035, 0.18, 0.36);

                const sensor = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.10, 16), cameraLensMat);
                sensor.rotation.x = Math.PI / 2;
                sensor.position.set(-0.04, 0.18, 0.34);

                pgtGroup.add(handle, head, pgtLabel, pgtScreen, barrel, sensor);
                armPivots[index].suit.meshes.add(pgtGroup);
            }

            // 8. PRESSURIZED LEGS, THIGH UTILITY POUCHES & EVA SPACEWALK BOOTS
            // Upper leg pressurized pants
            suitGroup.add(
                taperedLimb(
                    suitFabricMat,
                    [hip.clone().add(new THREE.Vector3(-side * 0.1, 0.22, 0)), knee],
                    [[0, 0.42], [0.5, 0.36], [1, 0.32]]
                )
            );

            // Heavy-Duty Thigh Equipment Pouch / Holster (on both thighs!)
            const thighPouch = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.44, 0.24), plssMat);
            thighPouch.position.copy(knee).add(new THREE.Vector3(side * 0.32, 0.95, 0.06));
            thighPouch.rotation.z = -side * 0.08;

            const pouchLid = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.12, 0.25), darkHardwareMat);
            pouchLid.position.copy(thighPouch.position).add(new THREE.Vector3(0, 0.21, 0));
            pouchLid.rotation.z = -side * 0.08;

            // Straps securing thigh pouch
            const thighStrap1 = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.02, 10, 24), webbingStrapMat);
            thighStrap1.position.copy(thighPouch.position).add(new THREE.Vector3(-side * 0.08, 0.1, 0));
            thighStrap1.rotation.y = Math.PI / 2;

            const thighStrap2 = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.02, 10, 24), webbingStrapMat);
            thighStrap2.position.copy(thighPouch.position).add(new THREE.Vector3(-side * 0.08, -0.1, 0));
            thighStrap2.rotation.y = Math.PI / 2;

            // Small cylindrical tether canister on pouch
            const tetherCanister = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.26, 16), machinedMetalMat);
            tetherCanister.position.copy(thighPouch.position).add(new THREE.Vector3(side * 0.15, -0.05, 0.04));

            suitGroup.add(thighPouch, pouchLid, thighStrap1, thighStrap2, tetherCanister);

            // Knee Articulation Bellows & Protective Kneepad
            for (let r = -1; r <= 1; r++) {
                const kneeRing = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.04, 10, 24), suitBellowsMat);
                kneeRing.position.copy(knee).add(new THREE.Vector3(0, r * 0.08, 0));
                suitGroup.add(kneeRing);
            }

            const kneepad = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, 0.06), plssMat);
            kneepad.position.copy(knee).add(new THREE.Vector3(0, 0, 0.32));
            suitGroup.add(kneepad);

            // Lower Leg / Shin Pressurized Pants
            suitGroup.add(
                taperedLimb(suitFabricMat, [knee, ankle], [[0, 0.32], [0.5, 0.28], [1, 0.25]])
            );

            // Calf Utility Cuff Band
            const calfCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.27, 0.12, 24), machinedMetalMat);
            calfCuff.position.copy(ankle).add(new THREE.Vector3(0, 0.22, 0));
            const calfPatch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.02), blueAnodizedMat);
            calfPatch.position.copy(calfCuff.position).add(new THREE.Vector3(0, 0, 0.28));
            suitGroup.add(calfCuff, calfPatch);

            // Massive EVA Spacewalk Boots
            // Thick Lugged Tread Sole
            const bootSole = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.68), rubberGripMat);
            bootSole.position.copy(ankle).add(new THREE.Vector3(side * 0.08, -0.38, 0.24));

            // Hard White Boot Upper
            const bootUpper = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.36, 0.62), plssMat);
            bootUpper.position.copy(bootSole.position).add(new THREE.Vector3(0, 0.18, 0));

            // Heel Step-in Latch & Toe Bumper
            const heelLatch = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.16, 0.08), darkHardwareMat);
            heelLatch.position.copy(bootSole.position).add(new THREE.Vector3(0, 0.12, -0.34));

            const toeCap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.30, 16), darkHardwareMat);
            toeCap.rotation.z = Math.PI / 2;
            toeCap.position.copy(bootSole.position).add(new THREE.Vector3(0, 0.06, 0.34));

            suitGroup.add(bootSole, bootUpper, heelLatch, toeCap);
        }

        // ---------------------------------------------
        // PROCEDURAL CHARACTER MODELS (Luffy, Frieren)
        // ---------------------------------------------
        // (Omitted for brevity - keeping existing original procedural structures for other models unchanged)

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

        // Initial character model visibility (Astronaut default)
        suitGroup.visible = true;
        piccoloGroup.visible = false;
        luffyGroup.visible = false;
        frierenGroup.visible = false;

        // -------------------------------------------------------------
        // SPACESUIT FLIR THERMAL HEATMAP SHADER & RADIATION ANALYSIS
        // Designed specifically for the authentic NASA EMU spacesuit
        // -------------------------------------------------------------
        const thermalMaterial = new THREE.ShaderMaterial({
            uniforms: {
                coreHeat: { value: 0 },
                sweepHeight: { value: 0 },
                time: { value: 0 },
                heartRate: { value: 75.0 },
            },
            vertexShader: `
                varying vec3 bodyPoint;
                varying vec3 viewNormal;
                varying vec3 viewDirection;
                varying vec2 vUv;
                void main() {
                    vUv = uv;
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
                uniform float time;
                uniform float heartRate;
                varying vec3 bodyPoint;
                varying vec3 viewNormal;
                varying vec3 viewDirection;
                varying vec2 vUv;

                // Spherical Gaussian heat distribution kernel
                float region(vec3 center, vec3 spread) {
                    vec3 offset = (bodyPoint - center) / spread;
                    return exp(-dot(offset, offset));
                }

                // NASA Standard FLIR Rainbow / Ironbow thermal color transfer function
                vec3 getThermalColor(float t) {
                    // t ranges 0.0 (cryogenic cold) to 1.0 (incandescent core)
                    vec3 c0 = vec3(0.04, 0.08, 0.22); // Deep Space Void Blue
                    vec3 c1 = vec3(0.02, 0.38, 0.72); // Cold Blue / Insulation
                    vec3 c2 = vec3(0.08, 0.68, 0.62); // Cyan / Teal
                    vec3 c3 = vec3(0.18, 0.82, 0.28); // Green / Nominal
                    vec3 c4 = vec3(0.96, 0.78, 0.12); // Amber Yellow / Metabolic
                    vec3 c5 = vec3(1.00, 0.38, 0.05); // High Radiant Orange
                    vec3 c6 = vec3(0.98, 0.08, 0.38); // Core Thermal Magenta
                    vec3 c7 = vec3(1.00, 0.95, 0.92); // White Heat Peak

                    vec3 color = mix(c0, c1, smoothstep(0.00, 0.16, t));
                    color = mix(color, c2, smoothstep(0.15, 0.30, t));
                    color = mix(color, c3, smoothstep(0.28, 0.46, t));
                    color = mix(color, c4, smoothstep(0.44, 0.64, t));
                    color = mix(color, c5, smoothstep(0.62, 0.80, t));
                    color = mix(color, c6, smoothstep(0.78, 0.92, t));
                    color = mix(color, c7, smoothstep(0.90, 1.00, t));
                    return color;
                }

                void main() {
                    // 1. ANATOMICAL & EMU SUIT THERMAL REGIONS:
                    // Cardiac / Thoracic core heat (pulsing with live heart rate):
                    float cardiacPulse = 0.5 + 0.5 * sin(time * (heartRate / 60.0) * 6.28318);
                    float core = region(vec3(0.12, 1.62, 0.42), vec3(0.95, 1.15, 0.85));

                    // Chest DCM Electronics & Life Support Valves:
                    float dcmElectronics = region(vec3(0.0, 1.62, 0.65), vec3(0.55, 0.45, 0.35));

                    // Helmet / Head & Gold Visor thermal radiation:
                    float helmet = region(vec3(0.0, 3.65, 0.18), vec3(0.72, 0.78, 0.72));

                    // PLSS Backpack Heat Exchanger & Radiator Vents:
                    float plssBackpack = region(vec3(0.0, 1.84, -0.48), vec3(0.95, 1.35, 0.65));

                    // Life Support Umbilical Hoses (coolant loop pulse):
                    float hosePulse = 0.5 + 0.5 * sin(time * 3.5 - bodyPoint.y * 4.0);
                    float midriffHoses = region(vec3(0.0, 1.15, 0.48), vec3(0.75, 0.38, 0.45)) * (0.8 + 0.2 * hosePulse);

                    // Arms & Extremities (gradual cooling towards EVA gloves):
                    float leftArm = region(vec3(1.45, 0.95, 0.0), vec3(0.65, 1.15, 0.65));
                    float rightArm = region(vec3(-1.45, 0.95, 0.0), vec3(0.65, 1.15, 0.65));
                    float hands = region(vec3(sign(bodyPoint.x) * 1.55, -0.45, 0.22), vec3(0.38, 0.45, 0.38));

                    // PGT Tool electronics in right hand:
                    float pgtTool = region(vec3(-1.55, -0.35, 0.45), vec3(0.35, 0.35, 0.45));

                    // Legs & Spacewalk Boots (friction/insulation gradient):
                    float upperLegs = region(vec3(sign(bodyPoint.x) * 0.60, -1.25, 0.12), vec3(0.55, 1.15, 0.55));
                    float lowerLegs = region(vec3(sign(bodyPoint.x) * 0.68, -3.15, 0.15), vec3(0.48, 1.05, 0.48));
                    float boots = region(vec3(sign(bodyPoint.x) * 0.72, -4.35, 0.28), vec3(0.45, 0.35, 0.55));

                    // Micro-creasing / beta-cloth insulation pattern:
                    float fabricDetail = sin(bodyPoint.x * 12.0) * cos(bodyPoint.y * 14.0) * sin(bodyPoint.z * 12.0) * 0.025;

                    // Combine thermal contributions:
                    float baseHeat = 0.14; // Deep space baseline
                    float heat = baseHeat
                        + core * (0.58 + coreHeat * 0.35 + cardiacPulse * 0.08)
                        + dcmElectronics * 0.42
                        + helmet * 0.52
                        + plssBackpack * 0.38
                        + midriffHoses * 0.32
                        + max(leftArm, rightArm) * 0.26
                        + hands * 0.24
                        + pgtTool * 0.34
                        + upperLegs * 0.28
                        + lowerLegs * 0.20
                        + boots * 0.18
                        + fabricDetail;

                    heat = clamp(heat, 0.0, 1.0);

                    // 2. SCIENTIFIC FLIR THERMAL HEATMAP COLOR
                    vec3 color = getThermalColor(heat);

                    // 3. SCIENTIFIC ISOTHERM CONTOUR LINES (Topographic temperature levels)
                    float isotherm = pow(0.5 + 0.5 * cos(heat * 44.0), 12.0) * 0.18;
                    color += vec3(0.95, 0.85, 1.0) * isotherm;

                    // 4. METRIC SCANNER LASER SWEEP LINE
                    float sweep = exp(-abs(bodyPoint.y - sweepHeight) * 16.0);
                    color += vec3(0.25, 0.85, 1.0) * (sweep * 0.35);

                    // 5. RIM SHADING / FRESNEL GLOW (Highlights spacesuit silhouette)
                    float facing = max(0.0, dot(normalize(viewNormal), normalize(viewDirection)));
                    float fresnel = pow(1.0 - facing, 3.2);
                    color *= 0.78 + facing * 0.22;
                    color += vec3(0.20, 0.75, 1.0) * (fresnel * 0.32);

                    // 6. SUBTLE GRID SCAN EFFECT
                    float grid = sin(bodyPoint.y * 42.0) * 0.02;
                    color += vec3(grid);

                    gl_FragColor = vec4(color, 1.0);
                }
            `,
        });

        // Register all meshes across models for dynamic thermal heatmap switching
        const thermalMeshes: { mesh: THREE.Mesh; original: THREE.Material | THREE.Material[] }[] = [];
        const registeredObjects = new Set<THREE.Mesh>();

        const registerMesh = (obj: THREE.Object3D) => {
            if (obj instanceof THREE.Mesh && !registeredObjects.has(obj) && obj !== cape) {
                registeredObjects.add(obj);
                thermalMeshes.push({ mesh: obj, original: obj.material });
            }
        };

        suitGroup.traverse(registerMesh);
        astronautUpperBody.traverse(registerMesh);
        astronautHead.meshes.traverse(registerMesh);
        for (const { suit } of armPivots) {
            suit.meshes.traverse(registerMesh);
        }
        piccoloGroup.traverse(registerMesh);
        luffyGroup.traverse(registerMesh);
        frierenGroup.traverse(registerMesh);

        setThermalSurfaceRef.current = (enabled) => {
            for (const { mesh, original } of thermalMeshes) {
                mesh.material = enabled ? thermalMaterial : original;
            }
            cape.visible = !enabled;
        };

        // ---------------------------------------------
        // HOLOGRAPHIC SCANNER & FLOOR TELEMETRY RINGS
        // ---------------------------------------------
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
        const upperBodies = [piccoloUpperBody, skeletonUpperBody, astronautUpperBody];

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

            const breath = (1 - Math.cos(elapsedTime * 1.45)) * 0.5;
            const weightShift = Math.sin(elapsedTime * 0.71) * 0.028;

            for (const body of upperBodies) {
                body.scale.set(1 + breath * 0.012, 1 + breath * 0.009, 1 + breath * 0.038);
                body.position.y = 0.32 * (1 - body.scale.y);
                body.rotation.z = weightShift;
            }

            const glance = 0.16 * Math.pow(Math.sin(elapsedTime * 0.59), 3);
            const headDip = -0.035 * breath + 0.035 * Math.sin(elapsedTime * 0.83);

            piccoloHead.pivot.rotation.set(headDip, glance, -0.6 * weightShift);
            skeletonHead.pivot.rotation.copy(piccoloHead.pivot.rotation);
            astronautHead.pivot.rotation.copy(piccoloHead.pivot.rotation);

            for (const { outfit, skeleton, suit, side } of armPivots) {
                const swing = Math.sin(elapsedTime * 0.71 - 0.55) * side * 0.055;
                outfit.pivot.rotation.set(swing - breath * 0.022, swing * 0.4, -side * breath * 0.035);
                skeleton.pivot.rotation.copy(outfit.pivot.rotation);
                suit.pivot.rotation.copy(outfit.pivot.rotation);
            }

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

            if (heartMeshRef.current) {
                const currentHr = heartRateRef.current || 75;
                const bpmFreq = (currentHr / 60) * Math.PI * 2;
                const pulse = 1.0 + Math.pow(Math.sin(elapsedTime * bpmFreq), 4) * 0.28;
                heartMeshRef.current.scale.set(0.55 * pulse, 0.55 * pulse, 0.55 * pulse);

                if (heartLightRef.current) {
                    heartLightRef.current.intensity = 1.5 + Math.sin(elapsedTime * bpmFreq) * 1.5;
                }
            }

            const scanPhase = elapsedTime * 1.2;
            const scanIntensity = 0.42 + 0.58 * Math.abs(Math.sin(scanPhase));

            scanPlane.position.y = Math.cos(scanPhase) * 4.48;
            thermalMaterial.uniforms.sweepHeight.value = scanPlane.position.y;
            thermalMaterial.uniforms.coreHeat.value = THREE.MathUtils.clamp((coreTempRef.current - 36) / 3, 0, 1);
            thermalMaterial.uniforms.time.value = elapsedTime;
            thermalMaterial.uniforms.heartRate.value = heartRateRef.current || 75;
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

                    // Depending on what model is showing, target the correct joint pose
                    const pose = id === 'hand'
                        ? (viewMode === 'suit' && characterModel === 'astronaut' ? armPivots[1].suit.meshes : armPivots[1].outfit.meshes)
                        : (viewMode === 'suit' && characterModel === 'astronaut' ? astronautUpperBody : piccoloUpperBody);

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

    useEffect(() => {
        if (!skeletonGroupRef.current || !suitGroupRef.current) return;
        const isCharacterOutfitVisible = viewMode === 'suit';
        const isThermal = viewMode === 'thermal';

        skeletonGroupRef.current.visible = viewMode === 'skeleton';
        setThermalSurfaceRef.current?.(isThermal);

        // In thermal view mode, show the active character's 3D model with the FLIR spacesuit heatmap
        const showActive = isCharacterOutfitVisible || isThermal;
        suitGroupRef.current.visible = showActive && characterModel === 'astronaut';

        if (piccoloGroupRef.current) {
            piccoloGroupRef.current.visible = showActive && characterModel === 'piccolo';
        }
        if (luffyGroupRef.current) {
            luffyGroupRef.current.visible = showActive && characterModel === 'luffy';
        }
        if (frierenGroupRef.current) {
            frierenGroupRef.current.visible = showActive && characterModel === 'frieren';
        }
    }, [viewMode, characterModel]);

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

            {(hasCardiacAlert || hasOxygenAlert) && (
                <div className="relative z-20 mx-3 mb-2 flex flex-col items-end gap-2">
                    {hasCardiacAlert && (
                        <div role="status" className="orbit-glass orbit-glass-alert relative flex max-w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 sm:px-4">
                            <Activity aria-hidden="true" className="size-5 shrink-0 text-rose-300" />
                            <span className="text-base leading-snug font-semibold tracking-tight text-rose-50">{demoHeartRate === undefined ? 'Cardiac Exertion Alert' : 'Cardiac Alert \u2014 Low BPM'}</span>
                            <span className="flex flex-wrap gap-x-3 text-xs font-semibold text-rose-200 tabular-nums sm:text-sm">
                                {demoHeartRate !== undefined ? <span>{demoHeartRate} bpm \u2014 Demo</span> : (
                                    <>
                                        {isHighHr && <span>{heartRate} bpm</span>}
                                        {isElevatedTemp && <span>{coreTemp}\u00b0C</span>}
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
                                {oxygenSaturation}%{demoHeartRate !== undefined && ' \u2014 Demo'}
                            </span>
                        </div>
                    )}
                </div>
            )}

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

            <div className="relative z-20 px-3 pb-2 flex flex-col gap-2 pointer-events-auto">
                {viewMode === 'thermal' && (
                    <div className="orbit-glass-inset self-center px-4 py-2 text-xs text-slate-200 bg-[#06111e]/92 border border-[#1a4b6c] shadow-[0_4px_24px_rgba(0,0,0,0.7)] rounded-xl">
                        <div className="mb-1.5 flex items-center justify-between gap-4">
                            <span className="font-mono text-[11px] font-bold tracking-wider text-[#5cdbdf] uppercase flex items-center gap-1.5">
                                <Flame className="w-3.5 h-3.5 text-amber-400" />
                                FLIR Spacesuit Thermal Telemetry
                            </span>
                            <span className="font-mono text-[10px] text-slate-300">
                                CORE: <strong className="text-amber-400 font-bold">{coreTemp}°C</strong>
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                            <span>-120°C (Space Void)</span>
                            <span
                                aria-hidden="true"
                                className="h-2 w-32 rounded-full bg-[linear-gradient(90deg,#0a1438,#0561b8,#14b8a6,#22c55e,#eab308,#f97316,#ef4444,#ffffff)] sm:w-48 shadow-[0_0_8px_rgba(20,184,166,0.4)]"
                            />
                            <span>+45°C (Core Vent)</span>
                        </div>
                    </div>
                )}

                {selectedTarget !== 'full' && (
                    <div className="bg-[#06121e]/90 border border-[#5cdbdf]/50 p-2 text-xs flex items-center justify-between animate-in fade-in duration-150">
                        <div className="flex items-center gap-2">
                            <Crosshair className="w-3.5 h-3.5 text-[#5cdbdf]" />
                            <span className="text-white font-bold uppercase">TARGET: {selectedTarget}</span>
                            <span className="text-slate-400">
                                {selectedTarget === 'head' && 'Cranial index nominal \u2014 O2 saturation optimal'}
                                {selectedTarget === 'chest' && `Thoracic Load: Heart Rate ${heartRate} bpm, Core Temp ${coreTemp}\u00b0C`}
                                {selectedTarget === 'spine' && 'Vertebral alignment verified \u2014 Micro-gravity spinal decompression'}
                                {selectedTarget === 'legs' && 'Bone Density Monitoring \u2014 Lower extremity circulation stable'}
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

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#1a4b6c]/60 pt-2 text-xs">
                    <div role="group" aria-label="Focus on body region" className="orbit-segmented">
                        {(['head', 'chest', 'spine', 'legs'] as const).map((target) => (
                            <button key={target} type="button" aria-pressed={selectedTarget === target} onClick={() => handleTargetSelect(target)} className="capitalize">
                                {target}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => setIsAutoRotate(!isAutoRotate)} title={isAutoRotate ? 'Pause Auto-Rotation' : 'Resume Auto-Rotation'} aria-pressed={isAutoRotate} className="orbit-icon-control">
                            {isAutoRotate ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        </button>
                        <button type="button" onClick={zoomIn} title="Zoom In" className="orbit-icon-control">
                            <ZoomIn className="w-3 h-3" />
                        </button>
                        <button type="button" onClick={zoomOut} title="Zoom Out" className="orbit-icon-control">
                            <ZoomOut className="w-3 h-3" />
                        </button>
                        <button type="button" onClick={resetCamera} title="Reset 3D Orientation" className="orbit-icon-control">
                            <RotateCcw className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-14 right-4 z-10 text-[11px] text-slate-400 pointer-events-none hidden @min-[42rem]:block">
                Drag to rotate \u2022 Scroll to zoom
            </div>
        </div>
    );
}