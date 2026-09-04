import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  RotateCw,
  Play,
  Pause,
  RotateCcw,
  Box,
  Palette,
  Sparkles,
  Info,
  Compass,
  Grid,
  Gauge,
} from 'lucide-react';
import { KatexMath } from '../common/KatexMath';
import { Revolution2DCanvas } from './Revolution2DCanvas';

interface Revolution3DViewProps {
  fFn: (x: number) => number;
  fExpr: string;
  a: number;
  b: number;
  area?: number;
  volume: number;
}

// Preset color options for solid of revolution
const COLOR_PRESETS = [
  { name: 'Xanh Sapphire', hex: '#0284c7', glow: 'rgba(2, 132, 199, 0.4)' },
  { name: 'Ngọc Lục Bảo', hex: '#059669', glow: 'rgba(5, 150, 105, 0.4)' },
  { name: 'Vàng Hổ Phách', hex: '#d97706', glow: 'rgba(217, 119, 6, 0.4)' },
  { name: 'Đỏ Hồng Ngọc', hex: '#e11d48', glow: 'rgba(225, 29, 72, 0.4)' },
  { name: 'Tím Pha Lê', hex: '#7c3aed', glow: 'rgba(124, 58, 237, 0.4)' },
  { name: 'Cyan Neon', hex: '#0891b2', glow: 'rgba(8, 145, 178, 0.4)' },
  { name: 'Hồng Ánh Dạ', hex: '#db2777', glow: 'rgba(219, 39, 119, 0.4)' },
  { name: 'Cam Hoàng Hôn', hex: '#ea580c', glow: 'rgba(234, 88, 12, 0.4)' },
];

// Speed presets (degrees per frame at 60fps)
type SpeedLevel = 'very_slow' | 'slow' | 'medium' | 'fast';
const SPEED_CONFIG: Record<SpeedLevel, { label: string; step: number; desc: string }> = {
  very_slow: { label: 'Rất chậm', step: 0.4, desc: '0.4°/frame (~24°/s)' },
  slow: { label: 'Chậm (Mặc định)', step: 0.8, desc: '0.8°/frame (~48°/s)' },
  medium: { label: 'Vừa', step: 1.8, desc: '1.8°/frame (~108°/s)' },
  fast: { label: 'Nhanh', step: 3.6, desc: '3.6°/frame (~216°/s)' },
};

export const Revolution3DView: React.FC<Revolution3DViewProps> = ({
  fFn,
  fExpr,
  a,
  b,
  area,
  volume,
}) => {
  // Shared state between 2D and 3D
  // Maximum revolution angle is 1800° (5 full rotations of 360°)
  const [revolutionAngle, setRevolutionAngle] = useState<number>(0);
  const [rotationSpeed, setRotationSpeed] = useState<SpeedLevel>('slow'); // Default is CHẬM (Slow)
  const [solidColor, setSolidColor] = useState<string>('#0284c7');
  const [solidOpacity, setSolidOpacity] = useState<number>(0.85);
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [isRotating, setIsRotating] = useState<boolean>(false); // Auto orbit camera
  const [isAnimating, setIsAnimating] = useState<boolean>(false); // Animation of revolution sweep
  const [viewMode, setViewMode] = useState<'3d' | 'front'>('3d');
  const [showGrid, setShowGrid] = useState<boolean>(false); // Lưới tọa độ mặc định đã bỏ
  const [show2DAxes, setShow2DAxes] = useState<boolean>(true); // Ẩn/hiện các trục tọa độ 2D
  const [show3DAxes, setShow3DAxes] = useState<boolean>(true); // Ẩn/hiện các trục tọa độ 3D

  // 3D Scene references
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const solidGroupRef = useRef<THREE.Group | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const axesGroupRef = useRef<THREE.Group | null>(null);

  // Up-to-date refs for animation loop
  const angleRef = useRef<number>(revolutionAngle);
  angleRef.current = revolutionAngle;
  const speedRef = useRef<SpeedLevel>(rotationSpeed);
  speedRef.current = rotationSpeed;
  const showGridRef = useRef<boolean>(showGrid);
  showGridRef.current = showGrid;
  const show3DAxesRef = useRef<boolean>(show3DAxes);
  show3DAxesRef.current = show3DAxes;
  const colorRef = useRef<string>(solidColor);
  colorRef.current = solidColor;
  const opacityRef = useRef<number>(solidOpacity);
  opacityRef.current = solidOpacity;
  const wireframeRef = useRef<boolean>(wireframe);
  wireframeRef.current = wireframe;
  const rotatingRef = useRef<boolean>(isRotating);
  rotatingRef.current = isRotating;
  const animFrameIdRef = useRef<number | null>(null);

  // Camera spherical coordinates ref
  const sphericalRef = useRef<{ radius: number; theta: number; phi: number }>({
    radius: 12,
    theta: 0.4,
    phi: 1.25,
  });

  // Re-build 3D geometry: both the EXACT 2D PLANAR REGION (H) and the 3D REVOLUTION SOLID
  // Supporting sweep angles up to 1800° with continuous rotating generator sheet!
  const buildSolidMesh = useCallback(() => {
    const solidGroup = solidGroupRef.current;
    if (!solidGroup) return;

    // Clear existing children
    while (solidGroup.children.length > 0) {
      const obj = solidGroup.children[0];
      solidGroup.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
      } else if (obj instanceof THREE.Line) {
        obj.geometry.dispose();
      } else if (obj instanceof THREE.Group) {
        obj.children.forEach(c => {
          if (c instanceof THREE.Mesh || c instanceof THREE.Line) {
            c.geometry.dispose();
          }
        });
      }
    }

    const lower = Math.min(a, b);
    const upper = Math.max(a, b);
    if (lower === upper) return;

    // =========================================================================
    // 1. EXACT 2D BOUNDED PLANAR REGION (H) IN THE Oxy PLANE (z = 0)
    // =========================================================================
    const planarGroup = new THREE.Group();
    planarGroup.name = 'planarRegionGroup';

    const numPlanar = 120;
    const planarVertices: number[] = [];
    const planarIndices: number[] = [];

    for (let i = 0; i <= numPlanar; i++) {
      const t = i / numPlanar;
      const xVal = lower + t * (upper - lower);
      let yVal = fFn(xVal);
      if (isNaN(yVal) || !isFinite(yVal)) yVal = 0;

      // Bottom point on Ox: (xVal, 0, 0)
      planarVertices.push(xVal, 0, 0.003);
      // Top point on curve y = f(x): (xVal, yVal, 0)
      planarVertices.push(xVal, yVal, 0.003);
    }

    for (let i = 0; i < numPlanar; i++) {
      const b1 = i * 2;
      const t1 = i * 2 + 1;
      const b2 = (i + 1) * 2;
      const t2 = (i + 1) * 2 + 1;

      planarIndices.push(b1, t1, b2);
      planarIndices.push(t1, t2, b2);
    }

    const planarGeo = new THREE.BufferGeometry();
    planarGeo.setAttribute('position', new THREE.Float32BufferAttribute(planarVertices, 3));
    planarGeo.setIndex(planarIndices);
    planarGeo.computeVertexNormals();

    const planarMat = new THREE.MeshPhongMaterial({
      color: new THREE.Color(colorRef.current),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: angleRef.current === 0 ? Math.max(0.85, opacityRef.current) : 0.75,
      shininess: 90,
      specular: new THREE.Color(0xffffff),
    });

    const planarMesh = new THREE.Mesh(planarGeo, planarMat);
    planarGroup.add(planarMesh);

    // Outline: Boundary curve y = f(x)
    const curvePoints: THREE.Vector3[] = [];
    for (let i = 0; i <= numPlanar; i++) {
      const t = i / numPlanar;
      const xVal = lower + t * (upper - lower);
      let yVal = fFn(xVal);
      if (isNaN(yVal) || !isFinite(yVal)) yVal = 0;
      curvePoints.push(new THREE.Vector3(xVal, yVal, 0.006));
    }
    const curveGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
    const curveMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 3 });
    planarGroup.add(new THREE.Line(curveGeo, curveMat));

    // Outline: Vertical line segment at x = lower (x = a)
    const yAtLower = fFn(lower);
    const yL = !isNaN(yAtLower) && isFinite(yAtLower) ? yAtLower : 0;
    const lineAGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(lower, 0, 0.006),
      new THREE.Vector3(lower, yL, 0.006),
    ]);
    const lineAMat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 0.15,
      gapSize: 0.08,
    });
    const lineAMesh = new THREE.Line(lineAGeo, lineAMat);
    lineAMesh.computeLineDistances();
    planarGroup.add(lineAMesh);

    // Outline: Vertical line segment at x = upper (x = b)
    const yAtUpper = fFn(upper);
    const yU = !isNaN(yAtUpper) && isFinite(yAtUpper) ? yAtUpper : 0;
    const lineBGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(upper, 0, 0.006),
      new THREE.Vector3(upper, yU, 0.006),
    ]);
    const lineBMat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 0.15,
      gapSize: 0.08,
    });
    const lineBMesh = new THREE.Line(lineBGeo, lineBMat);
    lineBMesh.computeLineDistances();
    planarGroup.add(lineBMesh);

    // Outline: Segment along the Ox axis from lower to upper (Red)
    const oxSegGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(lower, 0, 0.006),
      new THREE.Vector3(upper, 0, 0.006),
    ]);
    const oxSegMat = new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 3 });
    planarGroup.add(new THREE.Line(oxSegGeo, oxSegMat));

    solidGroup.add(planarGroup);

    // =========================================================================
    // 2. 3D REVOLUTION SOLID (SWEEPS FROM 0° UP TO 360°, AND PERSISTS UP TO 1800°)
    // =========================================================================
    const currentAngle = angleRef.current;
    if (currentAngle > 0) {
      // Solid geometry sweeps up to min(currentAngle, 360) degrees to form a closed revolution solid
      const solidSweepDeg = Math.min(360, currentAngle);
      const numX = 60;
      const numTheta = Math.max(8, Math.floor((solidSweepDeg / 360) * 48));
      const solidSweepRad = (solidSweepDeg * Math.PI) / 180;

      const vertices: number[] = [];
      const indices: number[] = [];

      // Outer revolving surface
      for (let i = 0; i <= numX; i++) {
        const t = i / numX;
        const xVal = lower + t * (upper - lower);
        let radius = fFn(xVal);
        if (isNaN(radius) || !isFinite(radius)) radius = 0;
        radius = Math.abs(radius);

        for (let j = 0; j <= numTheta; j++) {
          const theta = (j / numTheta) * solidSweepRad;
          const px = xVal;
          const py = radius * Math.cos(theta);
          const pz = radius * Math.sin(theta);
          vertices.push(px, py, pz);
        }
      }

      for (let i = 0; i < numX; i++) {
        for (let j = 0; j < numTheta; j++) {
          const row1 = i * (numTheta + 1);
          const row2 = (i + 1) * (numTheta + 1);

          const a1 = row1 + j;
          const b1 = row1 + j + 1;
          const c1 = row2 + j;
          const d1 = row2 + j + 1;

          indices.push(a1, c1, b1);
          indices.push(b1, c1, d1);
        }
      }

      // End disc at x = lower
      const rLower = Math.abs(fFn(lower));
      if (!isNaN(rLower) && rLower > 0.01) {
        const centerIdx = vertices.length / 3;
        vertices.push(lower, 0, 0); // Center point on Ox
        for (let j = 0; j <= numTheta; j++) {
          const theta = (j / numTheta) * solidSweepRad;
          vertices.push(lower, rLower * Math.cos(theta), rLower * Math.sin(theta));
        }
        for (let j = 0; j < numTheta; j++) {
          indices.push(centerIdx, centerIdx + 1 + j + 1, centerIdx + 1 + j);
        }
      }

      // End disc at x = upper
      const rUpper = Math.abs(fFn(upper));
      if (!isNaN(rUpper) && rUpper > 0.01) {
        const centerIdx = vertices.length / 3;
        vertices.push(upper, 0, 0); // Center point on Ox
        for (let j = 0; j <= numTheta; j++) {
          const theta = (j / numTheta) * solidSweepRad;
          vertices.push(upper, rUpper * Math.cos(theta), rUpper * Math.sin(theta));
        }
        for (let j = 0; j < numTheta; j++) {
          indices.push(centerIdx, centerIdx + 1 + j, centerIdx + 1 + j + 1);
        }
      }

      // Sector slice face at theta = solidSweepRad (when sweep is partial < 359°)
      if (solidSweepDeg < 359) {
        const cosEnd = Math.cos(solidSweepRad);
        const sinEnd = Math.sin(solidSweepRad);
        for (let i = 0; i < numX; i++) {
          const t1 = i / numX;
          const t2 = (i + 1) / numX;
          const x1 = lower + t1 * (upper - lower);
          const x2 = lower + t2 * (upper - lower);
          const r1 = Math.abs(fFn(x1)) || 0;
          const r2 = Math.abs(fFn(x2)) || 0;

          const baseIdx = vertices.length / 3;
          vertices.push(x1, 0, 0);
          vertices.push(x1, r1 * cosEnd, r1 * sinEnd);
          vertices.push(x2, 0, 0);
          vertices.push(x2, r2 * cosEnd, r2 * sinEnd);

          indices.push(baseIdx, baseIdx + 2, baseIdx + 1);
          indices.push(baseIdx + 1, baseIdx + 2, baseIdx + 3);
        }
      }

      const solidGeo = new THREE.BufferGeometry();
      solidGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      solidGeo.setIndex(indices);
      solidGeo.computeVertexNormals();

      const solidMat = new THREE.MeshPhongMaterial({
        color: new THREE.Color(colorRef.current),
        wireframe: wireframeRef.current,
        transparent: true,
        opacity: opacityRef.current,
        side: THREE.DoubleSide,
        shininess: 85,
        specular: new THREE.Color(0xffffff),
      });

      const solidMesh = new THREE.Mesh(solidGeo, solidMat);
      solidGroup.add(solidMesh);

      // =========================================================================
      // 3. DYNAMIC ROTATING GENERATING PROFILE (H_theta) AT EXACT CURRENT ANGLE
      // (Spins continuously around Ox all the way up to 1800°!)
      // =========================================================================
      const activeAngleRad = (currentAngle * Math.PI) / 180;
      const cosA = Math.cos(activeAngleRad);
      const sinA = Math.sin(activeAngleRad);

      const rotatingPlaneGroup = new THREE.Group();
      rotatingPlaneGroup.name = 'rotatingPlaneGroup';

      const rotVerts: number[] = [];
      const rotIndices: number[] = [];
      const rotCurvePoints: THREE.Vector3[] = [];

      for (let i = 0; i <= numPlanar; i++) {
        const t = i / numPlanar;
        const xVal = lower + t * (upper - lower);
        let yVal = fFn(xVal);
        if (isNaN(yVal) || !isFinite(yVal)) yVal = 0;

        // Bottom point on Ox: (xVal, 0, 0)
        rotVerts.push(xVal, 0, 0);
        // Point on revolving boundary curve
        const py = yVal * cosA;
        const pz = yVal * sinA;
        rotVerts.push(xVal, py, pz);

        rotCurvePoints.push(new THREE.Vector3(xVal, py, pz));
      }

      for (let i = 0; i < numPlanar; i++) {
        const b1 = i * 2;
        const t1 = i * 2 + 1;
        const b2 = (i + 1) * 2;
        const t2 = (i + 1) * 2 + 1;

        rotIndices.push(b1, t1, b2);
        rotIndices.push(t1, t2, b2);
      }

      const rotGeo = new THREE.BufferGeometry();
      rotGeo.setAttribute('position', new THREE.Float32BufferAttribute(rotVerts, 3));
      rotGeo.setIndex(rotIndices);
      rotGeo.computeVertexNormals();

      // Translucent highlighting sheet of the rotating generator
      const rotMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.38,
      });
      rotatingPlaneGroup.add(new THREE.Mesh(rotGeo, rotMat));

      // Vibrant leading curve outline
      const rotCurveGeo = new THREE.BufferGeometry().setFromPoints(rotCurvePoints);
      const rotCurveMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 3 });
      rotatingPlaneGroup.add(new THREE.Line(rotCurveGeo, rotCurveMat));

      // Boundary line at x = a at this angle
      const rotLineAGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(lower, 0, 0),
        new THREE.Vector3(lower, yL * cosA, yL * sinA),
      ]);
      const rotLineAMat = new THREE.LineBasicMaterial({ color: 0x38bdf8 });
      rotatingPlaneGroup.add(new THREE.Line(rotLineAGeo, rotLineAMat));

      // Boundary line at x = b at this angle
      const rotLineBGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(upper, 0, 0),
        new THREE.Vector3(upper, yU * cosA, yU * sinA),
      ]);
      const rotLineBMat = new THREE.LineBasicMaterial({ color: 0x38bdf8 });
      rotatingPlaneGroup.add(new THREE.Line(rotLineBGeo, rotLineBMat));

      solidGroup.add(rotatingPlaneGroup);
    }
  }, [a, b, fFn]);

  // Handle "TẠO KHỐI TRÒN XOAY" Animation (Slow speed by default, sweeping up to 1800°)
  const handleStartRevolution = () => {
    if (isAnimating) {
      // Pause/Cancel
      setIsAnimating(false);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      return;
    }

    setIsAnimating(true);
    // If already near 1800°, restart from 0°
    let current = revolutionAngle >= 1795 ? 0 : revolutionAngle;
    setRevolutionAngle(current);
    angleRef.current = current;
    buildSolidMesh();

    const animateSweep = () => {
      // Get current speed step
      const stepSpeed = SPEED_CONFIG[speedRef.current]?.step ?? 0.8;
      current += stepSpeed;

      if (current >= 1800) {
        current = 1800;
        setRevolutionAngle(1800);
        angleRef.current = 1800;
        buildSolidMesh();
        setIsAnimating(false);
      } else {
        setRevolutionAngle(Math.round(current * 10) / 10);
        angleRef.current = current;
        buildSolidMesh();
        animFrameIdRef.current = requestAnimationFrame(animateSweep);
      }
    };

    animFrameIdRef.current = requestAnimationFrame(animateSweep);
  };

  // Reset back to initial state (0° planar region)
  const handleResetToInitial = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
    }
    setIsAnimating(false);
    setRevolutionAngle(0);
    angleRef.current = 0;
    buildSolidMesh();
  };

  // Switch camera view between Front (Oxy 2D alignment) and 3D Perspective
  const handleSetViewMode = (mode: '3d' | 'front') => {
    setViewMode(mode);
    const camera = cameraRef.current;
    if (!camera) return;

    const midX = (a + b) / 2;
    const yMid = fFn(midX);
    const midY = !isNaN(yMid) && isFinite(yMid) ? yMid / 2 : 0;

    if (mode === 'front') {
      sphericalRef.current = { radius: 12, theta: 0, phi: Math.PI / 2 };
      camera.position.set(midX, midY, 12);
      camera.lookAt(midX, midY, 0);
    } else {
      sphericalRef.current = { radius: 12, theta: 0.4, phi: 1.25 };
      camera.position.set(7, 5, 10);
      camera.lookAt(midX, midY, 0);
    }
  };

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, []);

  // Update mesh when angle, color, opacity, or wireframe change
  useEffect(() => {
    buildSolidMesh();
  }, [revolutionAngle, solidColor, solidOpacity, wireframe, buildSolidMesh]);

  // Dynamically toggle grid helper visibility
  useEffect(() => {
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = showGrid;
    }
  }, [showGrid]);

  // Dynamically toggle 3D axes visibility
  useEffect(() => {
    if (axesGroupRef.current) {
      axesGroupRef.current.visible = show3DAxes;
    }
  }, [show3DAxes]);

  // Three.js Scene Setup
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x050505);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    cameraRef.current = camera;
    const midX = (a + b) / 2;
    camera.position.set(midX + 6, 5, 10);
    camera.lookAt(midX, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    rendererRef.current = renderer;
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    container.appendChild(renderer.domElement);

    // Ambient & Directional Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(12, 16, 12);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x60a5fa, 0.6);
    dirLight2.position.set(-12, -8, -12);
    scene.add(dirLight2);

    // Coordinate Grid (Mặc định ẩn/đã bỏ lưới tọa độ)
    const grid = new THREE.GridHelper(20, 20, 0x3f3f46, 0x222225);
    grid.position.set(0, 0, 0);
    grid.visible = showGridRef.current;
    gridHelperRef.current = grid;
    scene.add(grid);

    // Axes Group
    const axesGroup = new THREE.Group();

    // Ox axis (Red) - PROMINENT AXIS OF REVOLUTION
    const xMat = new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 2.5 });
    const xGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-10, 0, 0),
      new THREE.Vector3(10, 0, 0),
    ]);
    axesGroup.add(new THREE.Line(xGeo, xMat));

    // Oy axis (Green)
    const yMat = new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 1.5 });
    const yGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -6, 0),
      new THREE.Vector3(0, 6, 0),
    ]);
    axesGroup.add(new THREE.Line(yGeo, yMat));

    // Oz axis (Blue)
    const zMat = new THREE.LineBasicMaterial({ color: 0x3b82f6, linewidth: 1.5 });
    const zGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -6),
      new THREE.Vector3(0, 0, 6),
    ]);
    axesGroup.add(new THREE.Line(zGeo, zMat));

    axesGroup.visible = show3DAxesRef.current;
    axesGroupRef.current = axesGroup;
    scene.add(axesGroup);

    // Solid Group
    const solidGroup = new THREE.Group();
    solidGroupRef.current = solidGroup;
    scene.add(solidGroup);

    // Initial Mesh Build
    buildSolidMesh();

    // Orbit Controls
    let isMouseDown = false;
    let prevMousePos = { x: 0, y: 0 };
    const spherical = sphericalRef.current;

    const updateCameraPosition = () => {
      const cX = (a + b) / 2;
      camera.position.x = cX + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y = spherical.radius * Math.cos(spherical.phi);
      camera.position.z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.lookAt(cX, 0, 0);
    };
    updateCameraPosition();

    const onMouseDown = (e: MouseEvent) => {
      isMouseDown = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isMouseDown) return;
      const deltaX = e.clientX - prevMousePos.x;
      const deltaY = e.clientY - prevMousePos.y;

      spherical.theta -= deltaX * 0.01;
      spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi - deltaY * 0.01));
      updateCameraPosition();
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isMouseDown = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      spherical.radius = Math.max(3, Math.min(35, spherical.radius + e.deltaY * 0.015));
      updateCameraPosition();
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domEl.addEventListener('wheel', onWheel, { passive: false });

    // Render loop (gentle orbit speed when auto-rotate is on)
    let reqId: number;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      if (rotatingRef.current && !isMouseDown) {
        spherical.theta += 0.002;
        updateCameraPosition();
      }
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domEl.removeEventListener('wheel', onWheel);
      if (container.contains(domEl)) {
        container.removeChild(domEl);
      }
      renderer.dispose();
    };
  }, [buildSolidMesh, a, b]);

  // Current revolution cycle calculation
  const completedCycles = Math.floor(revolutionAngle / 360);
  const currentCycleProgress = ((revolutionAngle % 360) || (revolutionAngle > 0 && revolutionAngle % 360 === 0 ? 360 : 0));

  return (
    <div className="space-y-4">
      {/* 2-COLUMN HARMONIOUS LAYOUT: 2D ON THE LEFT, 3D ON THE RIGHT */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* ================= CỬA SỔ BÊN TRÁI: ĐỒ THỊ DẠNG 2D ================= */}
        <div className="xl:col-span-6 space-y-3 flex flex-col">
          {/* Header Bar */}
          <div className="flex items-center justify-between px-3 py-2 bg-[#111] rounded-lg border border-zinc-800 text-xs font-mono">
            <span className="font-bold text-white flex items-center gap-2 uppercase tracking-wide">
              <Box className="w-4 h-4 text-blue-400" />
              CỬA SỔ 2D: MIỀN PHẲNG GIỚI HẠN (H)
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {/* Tùy chỉnh màu sắc Miền [a; b] */}
              <div className="flex items-center gap-1.5 bg-[#18181b] px-2 py-0.5 rounded border border-zinc-800 text-[10px] font-mono">
                <Palette className="w-3 h-3 text-pink-400" />
                <span className="text-zinc-400">Màu miền [a;b]:</span>
                <div className="flex items-center gap-1">
                  {COLOR_PRESETS.slice(0, 6).map(preset => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setSolidColor(preset.hex)}
                      className={`w-3 h-3 rounded-full transition-transform ${
                        solidColor.toLowerCase() === preset.hex.toLowerCase()
                          ? 'ring-2 ring-white scale-110 shadow-sm'
                          : 'opacity-70 hover:opacity-100 hover:scale-105'
                      }`}
                      style={{ backgroundColor: preset.hex }}
                      title={`Chọn màu ${preset.name}`}
                    />
                  ))}
                  <input
                    type="color"
                    value={solidColor}
                    onChange={e => setSolidColor(e.target.value)}
                    className="w-3.5 h-3.5 p-0 rounded cursor-pointer border-0 bg-transparent ml-0.5"
                    title="Bảng màu tùy chọn"
                  />
                </div>
              </div>

              <button
                onClick={() => setShow2DAxes(!show2DAxes)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                  show2DAxes
                    ? 'bg-blue-950/60 text-blue-400 border-blue-800/80 font-semibold'
                    : 'bg-[#18181b] text-zinc-400 border-zinc-700 hover:text-white'
                }`}
                title={show2DAxes ? 'Đang hiện trục Oxy 2D - Bấm để ẩn' : 'Đang ẩn trục Oxy 2D - Bấm để hiện'}
              >
                <span>{show2DAxes ? 'Trục Oxy: BẬT' : 'Trục Oxy: TẮT'}</span>
              </button>
              <span className="text-[10px] text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-800/60 font-semibold font-mono">
                Trục quay Ox (y = 0)
              </span>
            </div>
          </div>

          {/* 2D Canvas */}
          <Revolution2DCanvas
            fFn={fFn}
            fExpr={fExpr}
            a={a}
            b={b}
            area={area}
            solidColor={solidColor}
            revolutionAngle={revolutionAngle}
            isAnimating={isAnimating}
            showAxes={show2DAxes}
          />

          {/* Action Button & Sweep Angle Controls */}
          <div className="bg-[#0a0a0a] p-3 rounded-xl border border-zinc-800 shadow-lg space-y-2.5">
            {/* Angle & Round Progress Display */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                THAO TÁC QUAY QUANH TRỤC OX
              </span>
              <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-2">
                <span>
                  Góc quét: <span className="text-blue-400 font-bold">{revolutionAngle}°</span> / 1800°
                </span>
                <span className="text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/60 text-[10px] font-semibold">
                  {revolutionAngle === 0
                    ? '0 vòng'
                    : `Vòng ${(revolutionAngle / 360).toFixed(1)} / 5`}
                </span>
              </div>
            </div>

            {/* Speed Selector Toggle */}
            <div className="bg-[#121214] p-2 rounded-lg border border-zinc-800 flex items-center justify-between text-xs font-mono">
              <span className="text-[11px] text-zinc-400 flex items-center gap-1.5 font-semibold">
                <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                Tốc độ quay:
              </span>
              <div className="grid grid-cols-4 gap-1">
                {(['very_slow', 'slow', 'medium', 'fast'] as SpeedLevel[]).map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => setRotationSpeed(lvl)}
                    className={`px-2 py-1 rounded text-[10px] font-semibold transition-all border ${
                      rotationSpeed === lvl
                        ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                        : 'bg-[#18181b] text-zinc-400 border-zinc-800 hover:text-white'
                    }`}
                    title={SPEED_CONFIG[lvl].desc}
                  >
                    {lvl === 'slow' ? 'Chậm' : lvl === 'very_slow' ? 'Rất chậm' : lvl === 'medium' ? 'Vừa' : 'Nhanh'}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Action Button */}
            <div className="flex gap-2">
              <button
                onClick={handleStartRevolution}
                className={`flex-1 py-2.5 px-4 rounded-lg font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md ${
                  isAnimating
                    ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'
                }`}
              >
                <RotateCw className={`w-4 h-4 ${isAnimating ? 'animate-spin' : ''}`} />
                {isAnimating
                  ? `ĐANG QUAY (${revolutionAngle}° / 1800°)... [BẤM ĐỂ TẠM DỪNG]`
                  : revolutionAngle === 0
                  ? 'TẠO KHỐI TRÒN XOAY (QUAY TỚI 1800° QUANH OX)'
                  : revolutionAngle >= 1800
                  ? 'QUAY LẠI TỪ 0° (QUAY TỚI 1800°)'
                  : `QUAY TIẾP TỚI 1800° (HIỆN TẠI ${revolutionAngle}°)`}
              </button>

              {/* Reset back to 0° planar region */}
              {revolutionAngle > 0 && (
                <button
                  onClick={handleResetToInitial}
                  className="px-3 py-2.5 rounded-lg font-mono font-bold text-xs uppercase bg-[#141416] hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors"
                  title="Về trạng thái mặt phẳng ban đầu (0°)"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                  <span>Về 0°</span>
                </button>
              )}
            </div>

            {/* Quick Angle Presets up to 1800° */}
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-zinc-500 uppercase">Mốc góc quét nhanh:</div>
              <div className="grid grid-cols-7 gap-1 text-[11px] font-mono">
                {[
                  { deg: 0, label: '0°' },
                  { deg: 180, label: '180°' },
                  { deg: 360, label: '360°' },
                  { deg: 720, label: '720°' },
                  { deg: 1080, label: '1080°' },
                  { deg: 1440, label: '1440°' },
                  { deg: 1800, label: '1800°' },
                ].map(item => (
                  <button
                    key={item.deg}
                    onClick={() => {
                      setRevolutionAngle(item.deg);
                      angleRef.current = item.deg;
                      buildSolidMesh();
                    }}
                    className={`py-1 rounded border transition-colors text-center ${
                      revolutionAngle === item.deg
                        ? 'bg-blue-950/80 text-blue-300 border-blue-600 font-bold'
                        : 'bg-[#141416] text-zinc-400 border-zinc-800 hover:text-white'
                    }`}
                    title={`${item.deg}° (${item.deg / 360} vòng)`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bounded Region Math Specs */}
            <div className="bg-[#111] p-2.5 rounded-lg border border-zinc-900 text-[11px] text-zinc-400 space-y-1.5">
              <div className="flex items-center justify-between text-zinc-300 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-400" />
                  Quy cách miền phẳng (H) ban đầu:
                </span>
                {area !== undefined && (
                  <span className="text-emerald-400 font-mono font-bold">
                    S = {area.toFixed(4)} đvdt
                  </span>
                )}
              </div>
              <p className="pl-5 text-zinc-400 leading-relaxed">
                Được giới hạn bởi đường cong <span className="text-blue-300 font-semibold">y = f(x)</span>, trục hoành <span className="text-red-400 font-semibold">Ox: y = 0</span>, và hai cận <span className="text-purple-300 font-semibold">x = {a}</span>, <span className="text-purple-300 font-semibold">x = {b}</span>.
              </p>
            </div>
          </div>
        </div>

        {/* ================= CỬA SỔ BÊN PHẢI: MÔ PHỎNG 3D KHỐI TRÒN XOAY ================= */}
        <div className="xl:col-span-6 space-y-3 flex flex-col">
          {/* Header Bar */}
          <div className="flex items-center justify-between px-3 py-2 bg-[#111] rounded-lg border border-zinc-800 text-xs font-mono">
            <span className="font-bold text-white flex items-center gap-2 uppercase tracking-wide truncate">
              <Box className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {revolutionAngle === 0
                  ? 'CỬA SỔ 3D: DIỆN TÍCH MẶT PHẲNG (H) BAN ĐẦU'
                  : `CỬA SỔ 3D: MÔ PHỎNG QUAY (${revolutionAngle}° / 1800°)`}
              </span>
            </span>

            {/* 3D View Mode, Orbit & Wireframe Controls */}
            <div className="flex items-center gap-1.5 text-xs shrink-0">
              <button
                onClick={() => handleSetViewMode(viewMode === '3d' ? 'front' : '3d')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                  viewMode === 'front'
                    ? 'bg-blue-950/60 text-blue-400 border-blue-800/80 font-semibold'
                    : 'bg-[#18181b] text-zinc-400 border-zinc-800'
                }`}
                title="Chuyển đổi giữa góc nhìn chính diện Oxy và góc nhìn 3D"
              >
                <Compass className="w-3 h-3" />
                <span>{viewMode === 'front' ? 'Chính diện Oxy' : 'Góc 3D'}</span>
              </button>

              <button
                onClick={() => setIsRotating(!isRotating)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                  isRotating
                    ? 'bg-blue-950/60 text-blue-400 border-blue-800/80'
                    : 'bg-[#18181b] text-zinc-400 border-zinc-800'
                }`}
                title="Bật/Tắt tự xoay camera 3D (Tốc độ nhẹ nhàng)"
              >
                {isRotating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isRotating ? 'Dừng' : 'Tự Xoay'}</span>
              </button>

              <button
                onClick={() => setShow3DAxes(!show3DAxes)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                  show3DAxes
                    ? 'bg-blue-950/60 text-blue-400 border-blue-800/80 font-semibold'
                    : 'bg-[#18181b] text-zinc-400 border-zinc-800 hover:text-white'
                }`}
                title={show3DAxes ? 'Đang hiện các trục Oxyz - Bấm để ẩn' : 'Đang ẩn các trục Oxyz - Bấm để hiển thị'}
              >
                <span>{show3DAxes ? 'Trục Oxyz: BẬT' : 'Trục Oxyz: TẮT'}</span>
              </button>

              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                  showGrid
                    ? 'bg-blue-950/60 text-blue-400 border-blue-800/80 font-semibold'
                    : 'bg-[#18181b] text-zinc-400 border-zinc-800 hover:text-white'
                }`}
                title={showGrid ? 'Đang bật lưới tọa độ - Bấm để bỏ lưới' : 'Đang bỏ lưới tọa độ - Bấm để hiển thị'}
              >
                <Grid className="w-3 h-3" />
                <span>{showGrid ? 'Bỏ lưới tọa độ' : 'Lưới tọa độ'}</span>
              </button>

              <button
                onClick={() => setWireframe(!wireframe)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                  wireframe
                    ? 'bg-blue-950/60 text-blue-400 border-blue-800/80'
                    : 'bg-[#18181b] text-zinc-400 border-zinc-800'
                }`}
                title="Bật/Tắt lưới khung đa giác"
              >
                Lưới Khung
              </button>
            </div>
          </div>

          {/* 3D WebGL Viewport */}
          <div
            ref={mountRef}
            className="w-full h-[360px] rounded-lg overflow-hidden relative cursor-grab active:cursor-grabbing border border-zinc-800/80 bg-[#050505] shadow-inner"
          >
            {/* Overlay Axes Guide */}
            {show3DAxes && (
              <div className="absolute top-2 left-2 pointer-events-none bg-[#09090b]/85 backdrop-blur border border-zinc-800 px-2 py-1 rounded text-[10px] font-mono space-y-0.5">
                <div className="text-red-400 flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-0.5 bg-red-500 inline-block"></span>
                  <span>Trục Ox (Trục quay)</span>
                </div>
                <div className="text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-0.5 bg-emerald-500 inline-block"></span>
                  <span>Trục Oy</span>
                </div>
                <div className="text-blue-400 flex items-center gap-1.5">
                  <span className="w-2 h-0.5 bg-blue-500 inline-block"></span>
                  <span>Trục Oz</span>
                </div>
              </div>
            )}

            {/* Bottom-left Planar & Volume Indicator */}
            <div className="absolute bottom-2 left-2 pointer-events-none bg-[#09090b]/85 backdrop-blur border border-zinc-800/80 px-2 py-1 rounded text-[10px] font-mono text-zinc-300">
              {revolutionAngle === 0 ? (
                <span className="text-amber-300 font-medium">
                  Đang hiển thị diện tích mặt phẳng (H) chuẩn bị tạo khối tròn xoay
                </span>
              ) : (
                <span className="text-zinc-300 flex items-center gap-1.5">
                  <span className="text-blue-400 font-bold">Góc quét: {revolutionAngle}°</span>
                  <span className="text-zinc-500">|</span>
                  <span className="text-purple-300">Vòng {(revolutionAngle / 360).toFixed(2)} / 5</span>
                </span>
              )}
            </div>

            {/* Interaction hint */}
            <div className="absolute bottom-2 right-2 pointer-events-none bg-[#09090b]/80 px-2 py-0.5 rounded text-[10px] font-mono text-zinc-400 border border-zinc-800">
              Chuột trái: Xoay 3D | Cuộn: Thu/Phóng
            </div>
          </div>

          {/* COLOR CUSTOMIZATION & MATERIAL SETTINGS */}
          <div className="bg-[#0a0a0a] p-3 rounded-xl border border-zinc-800 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-white">
                <Palette className="w-3.5 h-3.5 text-pink-400" />
                <span>TÙY BIẾN MÀU SẮC KHỐI & MIỀN PHẲNG</span>
              </div>

              {/* Native Color Picker for Free Choice */}
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
                <span>Tùy chọn:</span>
                <input
                  type="color"
                  value={solidColor}
                  onChange={e => setSolidColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border border-zinc-700 bg-transparent p-0"
                  title="Chọn màu tự do trong bảng màu"
                />
              </div>
            </div>

            {/* Palette Swatches */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {COLOR_PRESETS.map(preset => {
                const isSelected = solidColor.toLowerCase() === preset.hex.toLowerCase();
                return (
                  <button
                    key={preset.hex}
                    onClick={() => setSolidColor(preset.hex)}
                    className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-all ${
                      isSelected
                        ? 'border-white bg-zinc-800/80 shadow-md scale-105'
                        : 'border-zinc-800 hover:border-zinc-700 bg-[#111]'
                    }`}
                    title={preset.name}
                  >
                    <div
                      className="w-5 h-5 rounded-full border border-white/20 shadow-sm"
                      style={{ backgroundColor: preset.hex }}
                    />
                    <span className="text-[9px] font-mono text-zinc-400 truncate w-full text-center">
                      {preset.name.split(' ')[1] || preset.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sliders: Angle (0 - 1800°) & Opacity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-zinc-800/80 text-xs">
              {/* Angle Slider up to 1800° */}
              <div className="space-y-1 bg-[#111] p-2 rounded-lg border border-zinc-900">
                <div className="flex justify-between text-zinc-300 font-mono text-[11px]">
                  <span>Góc quét quay (0° - 1800°):</span>
                  <span className="font-bold text-blue-400">{revolutionAngle}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1800"
                  step="5"
                  value={revolutionAngle}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setRevolutionAngle(val);
                    angleRef.current = val;
                    buildSolidMesh();
                  }}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>0° (0 vòng)</span>
                  <span>360° (1 vòng)</span>
                  <span>900° (2.5v)</span>
                  <span>1800° (5 vòng)</span>
                </div>
              </div>

              {/* Opacity Slider */}
              <div className="space-y-1 bg-[#111] p-2 rounded-lg border border-zinc-900">
                <div className="flex justify-between text-zinc-300 font-mono text-[11px]">
                  <span>Độ trong suốt (Opacity):</span>
                  <span className="font-bold text-emerald-400">{Math.round(solidOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={solidOpacity}
                  onChange={e => setSolidOpacity(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>20% (Trong)</span>
                  <span>60%</span>
                  <span>100% (Đặc)</span>
                </div>
              </div>
            </div>

            {/* Side-by-side Comparative Math Cards: Diện tích S và Thể tích V */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs font-mono">
              {/* Card 1: Diện tích mặt phẳng ban đầu */}
              <div className="bg-[#111] p-2.5 rounded-lg border border-zinc-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-400">
                    Diện tích miền phẳng (H):
                  </div>
                  <div className="text-sm font-bold text-amber-400">
                    S = {area !== undefined ? area.toFixed(4) : '0.0000'} (đvdt)
                  </div>
                </div>
                <div className="text-[11px] text-zinc-300 bg-[#0a0a0a] px-2 py-1 rounded border border-zinc-800">
                  <KatexMath math={`S = \\int_{${a}}^{${b}} |f(x)| dx`} />
                </div>
              </div>

              {/* Card 2: Thể tích khối tròn xoay 360° */}
              <div className="bg-[#111] p-2.5 rounded-lg border border-zinc-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-400">
                    Thể tích tròn xoay Ox (360°):
                  </div>
                  <div className="text-sm font-bold text-emerald-400">
                    V = {volume.toFixed(4)} (đvtt)
                  </div>
                </div>
                <div className="text-[11px] text-zinc-300 bg-[#0a0a0a] px-2 py-1 rounded border border-zinc-800">
                  <KatexMath math={`V = \\pi \\int_{${a}}^{${b}} [f(x)]^2 dx`} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
