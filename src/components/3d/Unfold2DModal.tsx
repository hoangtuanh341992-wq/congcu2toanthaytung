import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Printer,
  Download,
  Eye,
  Layers,
  Box,
  Sliders,
  Scissors,
  Sparkles,
  Info,
  AlertTriangle,
  ChevronRight,
  Compass,
  FileSpreadsheet,
} from 'lucide-react';
import * as THREE from 'three';
import { Point3D, Solid3D, SavedScene3D } from '../../types/math';
import { OXYZ_PRESETS, GeometricPreset } from '../../utils/oxyzMath';
import { getSavedScenes } from '../../utils/sceneStorage';
import { analyzeShapeForUnfolding, UnfoldedShapeData } from '../../utils/unfoldingMath';

interface Unfold2DModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Current active 3D workspace data
  currentPoints: Point3D[];
  currentSolids: Solid3D[];
  currentFigureName?: string | null;
  // Optional preselected scene to unfold
  initialTargetScene?: SavedScene3D | null;
}

export const Unfold2DModal: React.FC<Unfold2DModalProps> = ({
  isOpen,
  onClose,
  currentPoints,
  currentSolids,
  currentFigureName,
  initialTargetScene,
}) => {
  // Source selection: 'current' | preset_name | saved_id
  const [selectedSourceKey, setSelectedSourceKey] = useState<string>('current');
  const [activeTab, setActiveTab] = useState<'net2d' | 'hinged3d' | 'specs'>('net2d');

  // Animation & folding progress (0 = 3D closed, 100 = 2D flat)
  const [foldProgress, setFoldProgress] = useState<number>(100);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playDirection, setPlayDirection] = useState<'forward' | 'backward'>('forward');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // 2D View settings
  const [showEdgeLengths, setShowEdgeLengths] = useState<boolean>(true);
  const [showVertexLabels, setShowVertexLabels] = useState<boolean>(true);
  const [showGlueTabs, setShowGlueTabs] = useState<boolean>(true);
  const [showFaceNames, setShowFaceNames] = useState<boolean>(true);

  // 3D Canvas Ref
  const threeMountRef = useRef<HTMLDivElement>(null);
  const threeSceneRef = useRef<THREE.Scene | null>(null);
  const threeRendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const threeCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const threeHingesGroupRef = useRef<THREE.Group | null>(null);

  // Saved scenes list
  const savedScenes = useMemo(() => getSavedScenes(), [isOpen]);

  // Handle initial target scene if passed
  useEffect(() => {
    if (initialTargetScene) {
      setSelectedSourceKey(`saved_${initialTargetScene.id}`);
    } else {
      setSelectedSourceKey('current');
    }
    setFoldProgress(100);
    setIsPlaying(false);
  }, [initialTargetScene, isOpen]);

  // Resolve shape data based on selectedSourceKey
  const activeShapeData: UnfoldedShapeData = useMemo(() => {
    if (selectedSourceKey === 'current') {
      const activeSolid = currentSolids.length > 0 ? currentSolids[0] : null;
      return analyzeShapeForUnfolding(
        activeSolid,
        currentPoints,
        currentFigureName || undefined
      );
    }

    if (selectedSourceKey.startsWith('preset_')) {
      const pName = selectedSourceKey.replace('preset_', '');
      const preset = OXYZ_PRESETS.find(p => p.name === pName);
      if (preset) {
        const dummySolid: Solid3D = {
          id: `preset_${preset.type}`,
          name: preset.name,
          type: preset.type,
          pointIds: preset.points.map(p => p.id),
          radius: preset.params?.radius,
          height: preset.params?.height,
        };
        return analyzeShapeForUnfolding(dummySolid, preset.points, preset.name);
      }
    }

    if (selectedSourceKey.startsWith('saved_')) {
      const sId = selectedSourceKey.replace('saved_', '');
      const scene = savedScenes.find(s => s.id === sId);
      if (scene) {
        const solid = scene.solids.length > 0 ? scene.solids[0] : null;
        return analyzeShapeForUnfolding(solid, scene.points, scene.name);
      }
    }

    return analyzeShapeForUnfolding(null, currentPoints, 'Mô hình 3D');
  }, [selectedSourceKey, currentSolids, currentPoints, currentFigureName, savedScenes]);

  // Animation Loop for Folding
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setFoldProgress(prev => {
        const step = 1.2 * playbackSpeed;
        if (playDirection === 'forward') {
          if (prev + step >= 100) {
            setPlayDirection('backward');
            return 100;
          }
          return prev + step;
        } else {
          if (prev - step <= 0) {
            setPlayDirection('forward');
            return 0;
          }
          return prev - step;
        }
      });
    }, 25);

    return () => clearInterval(interval);
  }, [isPlaying, playDirection, playbackSpeed]);

  // --------------------------------------------------------------------------
  // THREE.JS 3D HINGED UNFOLDING RENDERER
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'hinged3d' || !threeMountRef.current || !activeShapeData.isSupported) {
      return;
    }

    const container = threeMountRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0c);
    threeSceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(12, 10, 14);
    camera.lookAt(0, 0, 0);
    threeCameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    threeRendererRef.current = renderer;
    container.replaceChildren(renderer.domElement);

    // Lights
    const ambLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambLight);
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(10, 20, 15);
    scene.add(dirLight1);
    const dirLight2 = new THREE.DirectionalLight(0x60a5fa, 0.4);
    dirLight2.position.set(-10, -10, -10);
    scene.add(dirLight2);

    // Grid Floor
    const grid = new THREE.GridHelper(16, 16, 0x3f3f46, 0x1f1f23);
    grid.position.y = -0.01;
    scene.add(grid);

    // Hinges Group
    const hingesGroup = new THREE.Group();
    scene.add(hingesGroup);
    threeHingesGroupRef.current = hingesGroup;

    // Orbit controls manual tracking
    let isMouseDown = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let rotX = 0.5;
    let rotY = 0.6;
    let camDist = 18;

    const updateCam = () => {
      camera.position.x = camDist * Math.sin(rotY) * Math.cos(rotX);
      camera.position.y = camDist * Math.sin(rotX);
      camera.position.z = camDist * Math.cos(rotY) * Math.cos(rotX);
      camera.lookAt(0, 1, 0);
    };
    updateCam();

    const onMouseDown = (e: MouseEvent) => {
      isMouseDown = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isMouseDown) return;
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
      rotY -= dx * 0.008;
      rotX = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, rotX + dy * 0.008));
      updateCam();
    };
    const onMouseUp = () => {
      isMouseDown = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camDist = Math.max(8, Math.min(40, camDist + e.deltaY * 0.02));
      updateCam();
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    // Render loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      renderer.dispose();
    };
  }, [activeTab, activeShapeData]);

  // Update 3D Hinges Geometry when foldProgress or shape changes
  useEffect(() => {
    if (activeTab !== 'hinged3d' || !threeHingesGroupRef.current || !activeShapeData.isSupported) {
      return;
    }

    const group = threeHingesGroupRef.current;
    // Clear old children
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
    }

    const t = foldProgress / 100; // 0 = 3D, 1 = Flat
    const type = activeShapeData.type;

    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      roughness: 0.35,
      metalness: 0.1,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const sideMat1 = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.35,
      metalness: 0.1,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const sideMat2 = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.35,
      metalness: 0.1,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const sideMat3 = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      roughness: 0.35,
      metalness: 0.1,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });

    const edgeLineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });

    // Helper: create mesh with wireframe edges
    const makePanel = (geom: THREE.BufferGeometry, mat: THREE.Material) => {
      const pGroup = new THREE.Group();
      const mesh = new THREE.Mesh(geom, mat);
      pGroup.add(mesh);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geom), edgeLineMat);
      pGroup.add(edges);
      return pGroup;
    };

    // ----------------------------------------------------------------
    // 1. BOX (Hình hộp chữ nhật)
    // ----------------------------------------------------------------
    if (type === 'box') {
      const a = activeShapeData.dimensions.a || 4;
      const b = activeShapeData.dimensions.b || 3;
      const c = activeShapeData.dimensions.c || 5;

      // Center Base (ABCD): lying on y = 0
      const baseGeom = new THREE.PlaneGeometry(a, b);
      baseGeom.rotateX(-Math.PI / 2);
      group.add(makePanel(baseGeom, baseMat));

      // Front Face: hinge at z = b/2
      const frontGeom = new THREE.PlaneGeometry(a, c);
      frontGeom.translate(0, c / 2, 0);
      const frontHinge = new THREE.Group();
      frontHinge.position.set(0, 0, b / 2);
      // Closed: rotX = 0 (vertical upwards), Open: rotX = Math.PI / 2
      const angleFront = THREE.MathUtils.lerp(0, Math.PI / 2, t);
      frontHinge.rotation.x = angleFront;
      frontHinge.add(makePanel(frontGeom, sideMat1));
      group.add(frontHinge);

      // Back Face: hinge at z = -b/2
      const backGeom = new THREE.PlaneGeometry(a, c);
      backGeom.translate(0, c / 2, 0);
      const backHinge = new THREE.Group();
      backHinge.position.set(0, 0, -b / 2);
      const angleBack = THREE.MathUtils.lerp(0, -Math.PI / 2, t);
      backHinge.rotation.x = angleBack;
      backHinge.add(makePanel(backGeom, sideMat1));
      group.add(backHinge);

      // Top Lid: hinges at the far edge of Back Face (distance c)
      const topGeom = new THREE.PlaneGeometry(a, b);
      topGeom.translate(0, b / 2, 0);
      const topHinge = new THREE.Group();
      topHinge.position.set(0, c, 0);
      // When closed, lid is perpendicular to back face (rotX = -Math.PI/2)
      // When flat, lid is aligned with back face (rotX = 0)
      const angleTop = THREE.MathUtils.lerp(Math.PI / 2, 0, t);
      topHinge.rotation.x = angleTop;
      topHinge.add(makePanel(topGeom, baseMat));
      backHinge.add(topHinge);

      // Right Face: hinge at x = a/2
      const rightGeom = new THREE.PlaneGeometry(c, b);
      rightGeom.rotateY(-Math.PI / 2);
      rightGeom.translate(0, c / 2, 0);
      const rightHinge = new THREE.Group();
      rightHinge.position.set(a / 2, 0, 0);
      const angleRight = THREE.MathUtils.lerp(0, -Math.PI / 2, t);
      rightHinge.rotation.z = angleRight;
      rightHinge.add(makePanel(rightGeom, sideMat2));
      group.add(rightHinge);

      // Left Face: hinge at x = -a/2
      const leftGeom = new THREE.PlaneGeometry(c, b);
      leftGeom.rotateY(Math.PI / 2);
      leftGeom.translate(0, c / 2, 0);
      const leftHinge = new THREE.Group();
      leftHinge.position.set(-a / 2, 0, 0);
      const angleLeft = THREE.MathUtils.lerp(0, Math.PI / 2, t);
      leftHinge.rotation.z = angleLeft;
      leftHinge.add(makePanel(leftGeom, sideMat3));
      group.add(leftHinge);
    }

    // ----------------------------------------------------------------
    // 2. PYRAMID QUAD (Chóp tứ giác S.ABCD)
    // ----------------------------------------------------------------
    else if (type === 'pyramid_quad') {
      const a = activeShapeData.dimensions.a || 4;
      const b = activeShapeData.dimensions.b || 4;
      const h = activeShapeData.dimensions.height || 5;

      // Slant heights
      const slant1 = Math.sqrt(h * h + (b / 2) * (b / 2));
      const slant2 = Math.sqrt(h * h + (a / 2) * (a / 2));

      // Base ABCD
      const baseGeom = new THREE.PlaneGeometry(a, b);
      baseGeom.rotateX(-Math.PI / 2);
      group.add(makePanel(baseGeom, baseMat));

      // 4 Triangular side faces
      // Front Triangle
      const makeTriGeom = (baseW: number, slantH: number) => {
        const geo = new THREE.BufferGeometry();
        const vertices = new Float32Array([
          -baseW / 2, 0, 0,
          baseW / 2, 0, 0,
          0, slantH, 0,
        ]);
        geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geo.computeVertexNormals();
        return geo;
      };

      const closedAngleX1 = Math.atan2(h, b / 2); // angle from horizontal
      const openAngleX1 = 0; // flat
      const curAngleX1 = THREE.MathUtils.lerp(Math.PI / 2 - closedAngleX1, Math.PI / 2, t);

      // Front Face
      const frontHinge = new THREE.Group();
      frontHinge.position.set(0, 0, b / 2);
      frontHinge.rotation.x = curAngleX1;
      frontHinge.add(makePanel(makeTriGeom(a, slant1), sideMat1));
      group.add(frontHinge);

      // Back Face
      const backHinge = new THREE.Group();
      backHinge.position.set(0, 0, -b / 2);
      backHinge.rotation.x = -curAngleX1;
      backHinge.add(makePanel(makeTriGeom(a, slant1), sideMat1));
      group.add(backHinge);

      // Right Face
      const closedAngleZ = Math.atan2(h, a / 2);
      const curAngleZ = THREE.MathUtils.lerp(Math.PI / 2 - closedAngleZ, Math.PI / 2, t);
      const rightHinge = new THREE.Group();
      rightHinge.position.set(a / 2, 0, 0);
      rightHinge.rotation.z = -curAngleZ;
      rightHinge.rotation.y = -Math.PI / 2;
      rightHinge.add(makePanel(makeTriGeom(b, slant2), sideMat2));
      group.add(rightHinge);

      // Left Face
      const leftHinge = new THREE.Group();
      leftHinge.position.set(-a / 2, 0, 0);
      leftHinge.rotation.z = curAngleZ;
      leftHinge.rotation.y = Math.PI / 2;
      leftHinge.add(makePanel(makeTriGeom(b, slant2), sideMat3));
      group.add(leftHinge);
    }

    // ----------------------------------------------------------------
    // 3. TETRAHEDRON (Tứ diện S.ABC)
    // ----------------------------------------------------------------
    else if (type === 'tetrahedron') {
      const s = 4.5;
      const hTri = (s * Math.sqrt(3)) / 2;

      // Base equilateral triangle
      const baseGeo = new THREE.BufferGeometry();
      const bVerts = new Float32Array([
        -s / 2, 0, -hTri / 3,
        s / 2, 0, -hTri / 3,
        0, 0, (2 * hTri) / 3,
      ]);
      baseGeo.setAttribute('position', new THREE.BufferAttribute(bVerts, 3));
      baseGeo.computeVertexNormals();
      group.add(makePanel(baseGeo, baseMat));

      // Side triangle template
      const sideGeo = new THREE.BufferGeometry();
      const sVerts = new Float32Array([
        -s / 2, 0, 0,
        s / 2, 0, 0,
        0, hTri, 0,
      ]);
      sideGeo.setAttribute('position', new THREE.BufferAttribute(sVerts, 3));
      sideGeo.computeVertexNormals();

      // Dihedral angle of regular tetrahedron is ~70.53 deg
      const closedAngle = 70.53 * (Math.PI / 180);
      const curAngle = THREE.MathUtils.lerp(Math.PI / 2 - closedAngle / 2, Math.PI / 2, t);

      // Edge 1 (Back edge: z = -hTri/3)
      const hinge1 = new THREE.Group();
      hinge1.position.set(0, 0, -hTri / 3);
      hinge1.rotation.x = -curAngle;
      hinge1.add(makePanel(sideGeo, sideMat1));
      group.add(hinge1);

      // Edge 2
      const hinge2 = new THREE.Group();
      hinge2.position.set(s / 4, 0, hTri / 6);
      hinge2.rotation.y = -(2 * Math.PI) / 3;
      hinge2.rotation.x = -curAngle;
      hinge2.add(makePanel(sideGeo, sideMat2));
      group.add(hinge2);

      // Edge 3
      const hinge3 = new THREE.Group();
      hinge3.position.set(-s / 4, 0, hTri / 6);
      hinge3.rotation.y = (2 * Math.PI) / 3;
      hinge3.rotation.x = -curAngle;
      hinge3.add(makePanel(sideGeo, sideMat3));
      group.add(hinge3);
    }

    // ----------------------------------------------------------------
    // 4. PRISM TRI (Lăng trụ tam giác ABC.A'B'C')
    // ----------------------------------------------------------------
    else if (type === 'prism_tri') {
      const a = 4;
      const b = 3.5;
      const c = 3.8;
      const h = activeShapeData.dimensions.height || 5;

      // Base Wall (ABB'A') lies in middle
      const centerWallGeo = new THREE.PlaneGeometry(a, h);
      centerWallGeo.rotateX(-Math.PI / 2);
      group.add(makePanel(centerWallGeo, sideMat1));

      // Right Wall (BCC'B') hinged at x = a/2
      const rightWallGeo = new THREE.PlaneGeometry(b, h);
      rightWallGeo.rotateX(-Math.PI / 2);
      rightWallGeo.translate(b / 2, 0, 0);
      const rightHinge = new THREE.Group();
      rightHinge.position.set(a / 2, 0, 0);
      const angleRight = THREE.MathUtils.lerp(Math.PI / 3, 0, t);
      rightHinge.rotation.z = angleRight;
      rightHinge.add(makePanel(rightWallGeo, sideMat2));
      group.add(rightHinge);

      // Left Wall (CAA'C') hinged at x = -a/2
      const leftWallGeo = new THREE.PlaneGeometry(c, h);
      leftWallGeo.rotateX(-Math.PI / 2);
      leftWallGeo.translate(-c / 2, 0, 0);
      const leftHinge = new THREE.Group();
      leftHinge.position.set(-a / 2, 0, 0);
      const angleLeft = THREE.MathUtils.lerp(-Math.PI / 3, 0, t);
      leftHinge.rotation.z = angleLeft;
      leftHinge.add(makePanel(leftWallGeo, sideMat3));
      group.add(leftHinge);

      // Bottom triangle hinged at z = -h/2
      const triGeo = new THREE.BufferGeometry();
      const tVerts = new Float32Array([
        -a / 2, 0, 0,
        a / 2, 0, 0,
        0, 0, -2.5,
      ]);
      triGeo.setAttribute('position', new THREE.BufferAttribute(tVerts, 3));
      triGeo.computeVertexNormals();

      const botHinge = new THREE.Group();
      botHinge.position.set(0, 0, -h / 2);
      const angleCap = THREE.MathUtils.lerp(Math.PI / 2, 0, t);
      botHinge.rotation.x = angleCap;
      botHinge.add(makePanel(triGeo, baseMat));
      group.add(botHinge);

      // Top triangle hinged at z = h/2
      const topHinge = new THREE.Group();
      topHinge.position.set(0, 0, h / 2);
      topHinge.rotation.x = -angleCap;
      topHinge.add(makePanel(triGeo, baseMat));
      group.add(topHinge);
    }

    // ----------------------------------------------------------------
    // 5. CYLINDER (Hình trụ)
    // ----------------------------------------------------------------
    else if (type === 'cylinder') {
      const r = activeShapeData.dimensions.radius || 2.2;
      const h = activeShapeData.dimensions.height || 4.5;

      // Curved surface: unfold from theta = 2PI to theta = 0 (flat)
      const segments = 32;
      const curOpenAngle = THREE.MathUtils.lerp(2 * Math.PI, 0.001, t);
      const effectiveR = (2 * Math.PI * r) / curOpenAngle;

      const cylGeo = new THREE.BufferGeometry();
      const pos: number[] = [];
      const indices: number[] = [];

      for (let i = 0; i <= segments; i++) {
        const u = i / segments;
        const angle = (u - 0.5) * curOpenAngle;
        let x: number, z: number;

        if (t > 0.98) {
          x = (u - 0.5) * 2 * Math.PI * r;
          z = 0;
        } else {
          x = effectiveR * Math.sin(angle);
          z = effectiveR * (1 - Math.cos(angle));
        }

        pos.push(x, -h / 2, z);
        pos.push(x, h / 2, z);
      }

      for (let i = 0; i < segments; i++) {
        const p1 = i * 2;
        const p2 = p1 + 1;
        const p3 = (i + 1) * 2;
        const p4 = p3 + 1;
        indices.push(p1, p3, p2);
        indices.push(p2, p3, p4);
      }

      cylGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      cylGeo.setIndex(indices);
      cylGeo.computeVertexNormals();

      group.add(makePanel(cylGeo, sideMat1));

      // 2 Base Discs
      const discGeo = new THREE.CircleGeometry(r, 32);
      discGeo.rotateX(-Math.PI / 2);

      // Bottom Disc
      const botHinge = new THREE.Group();
      botHinge.position.set(0, -h / 2, 0);
      const angleCap = THREE.MathUtils.lerp(0, Math.PI / 2, t);
      botHinge.rotation.x = angleCap;
      botHinge.add(makePanel(discGeo, baseMat));
      group.add(botHinge);

      // Top Disc
      const topHinge = new THREE.Group();
      topHinge.position.set(0, h / 2, 0);
      topHinge.rotation.x = -angleCap;
      topHinge.add(makePanel(discGeo, baseMat));
      group.add(topHinge);
    }

    // ----------------------------------------------------------------
    // 6. CONE (Hình nón)
    // ----------------------------------------------------------------
    else if (type === 'cone') {
      const r = activeShapeData.dimensions.radius || 2.5;
      const h = activeShapeData.dimensions.height || 4.5;
      const l = activeShapeData.dimensions.slantHeight || Math.sqrt(r * r + h * h);
      const sectorAngle = (2 * Math.PI * r) / l;

      // Mặt xung quanh hình nón: Trải phẳng thành HÌNH QUẠT TRÒN bán kính l
      const segments = 48;
      const curOpenAngle = THREE.MathUtils.lerp(2 * Math.PI, sectorAngle, t);
      const curR = THREE.MathUtils.lerp(r, l, t);

      const coneGeo = new THREE.BufferGeometry();
      const pos: number[] = [];
      const indices: number[] = [];

      // Apex point S (Đỉnh nón)
      const apexY = THREE.MathUtils.lerp(h, 0, t);
      pos.push(0, apexY, 0); // Index 0

      for (let i = 0; i <= segments; i++) {
        const u = i / segments;
        const angle = (u - 0.5) * curOpenAngle;
        // Cung quạt tròn với bán kính curR (bằng l khi t = 1)
        const x = curR * Math.sin(angle);
        const z = curR * Math.cos(angle);
        pos.push(x, 0, z);
      }

      for (let i = 1; i <= segments; i++) {
        indices.push(0, i, i + 1);
      }

      coneGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      coneGeo.setIndex(indices);
      coneGeo.computeVertexNormals();

      group.add(makePanel(coneGeo, sideMat1));

      // Mặt đáy: HÌNH TRÒN bán kính R
      // Khi t = 1, nằm phẳng hoàn toàn trên mặt phẳng y = 0, tâm tại (0, 0, l + r)
      const diskGeo = new THREE.CircleGeometry(r, 36);
      diskGeo.rotateX(-Math.PI / 2); // Chuẩn hóa về mặt phẳng ngang
      const baseHinge = new THREE.Group();
      if (t > 0.98) {
        baseHinge.position.set(0, 0, l + r);
        baseHinge.rotation.set(0, 0, 0);
      } else {
        baseHinge.position.set(
          0,
          -r * Math.sin(Math.PI * t) * (1 - t),
          curR - r * Math.cos(Math.PI * t)
        );
        baseHinge.rotation.x = Math.PI * t;
      }
      baseHinge.add(makePanel(diskGeo, baseMat));
      group.add(baseHinge);
    }
  }, [foldProgress, activeTab, activeShapeData]);

  if (!isOpen) return null;

  // Print 2D Net SVG
  const handlePrint = () => {
    window.print();
  };

  // Download SVG
  const handleDownloadSvg = () => {
    const svgElem = document.getElementById('unfolded-svg-net');
    if (!svgElem) return;
    const svgData = new XMLSerializer().serializeToString(svgElem);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TraiPhang_2D_${activeShapeData.type}_${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-fadeIn">
      <div className="bg-[#0e0e12] border border-zinc-800 rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans text-zinc-100">
        {/* -------------------------------------------------------------- */}
        {/* HEADER BAR */}
        {/* -------------------------------------------------------------- */}
        <div className="p-3.5 sm:px-5 bg-[#14141a] border-b border-zinc-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-900/30">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Trải phẳng 2D đối tượng 3D (2D Net Unfolder)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800 font-mono">
                  {activeShapeData.type.toUpperCase()}
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400 font-mono">
                {activeShapeData.name} • Tỷ lệ trải phẳng thực tế
              </p>
            </div>
          </div>

          {/* Model Selector & Close */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#1a1a24] border border-zinc-700/80 rounded-lg px-2 py-1 text-xs">
              <span className="text-zinc-400 font-mono hidden sm:inline">Chọn hình:</span>
              <select
                value={selectedSourceKey}
                onChange={e => setSelectedSourceKey(e.target.value)}
                className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer max-w-[190px] truncate"
              >
                <optgroup label="Không gian làm việc hiện tại">
                  <option value="current">
                    Mô hình đang xem {currentFigureName ? `(${currentFigureName})` : ''}
                  </option>
                </optgroup>

                <optgroup label="Mẫu hình học chuẩn (Presets)">
                  {OXYZ_PRESETS.map(p => (
                    <option
                      key={p.name}
                      value={`preset_${p.name}`}
                      disabled={p.type === 'sphere'}
                    >
                      {p.name} {p.type === 'sphere' ? '(Hình cầu - không trải)' : ''}
                    </option>
                  ))}
                </optgroup>

                {savedScenes.length > 0 && (
                  <optgroup label="Thư viện mô hình đã lưu">
                    {savedScenes.map(s => {
                      const isSph = s.solids[0]?.type === 'sphere';
                      return (
                        <option
                          key={s.id}
                          value={`saved_${s.id}`}
                          disabled={isSph}
                        >
                          {s.name} {isSph ? '(Hình cầu - không trải)' : ''}
                        </option>
                      );
                    })}
                  </optgroup>
                )}
              </select>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* -------------------------------------------------------------- */}
        {/* CONTROLLER TOOLBAR: SLIDER + PLAY/PAUSE + PRESETS + VIEW TABS */}
        {/* -------------------------------------------------------------- */}
        <div className="px-4 py-2.5 bg-[#121218] border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left: View Tabs */}
          <div className="flex items-center gap-1 bg-[#1a1a24] p-1 rounded-lg border border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveTab('net2d')}
              className={`px-3 py-1 rounded font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'net2d'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Bản vẽ trải phẳng 2D</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('hinged3d')}
              className={`px-3 py-1 rounded font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'hinged3d'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Mô phỏng 3D Gấp/Mở</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('specs')}
              className={`px-3 py-1 rounded font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'specs'
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>Công thức & Diện tích</span>
            </button>
          </div>

          {/* Center: Folding Slider & Controls (if supported) */}
          {activeShapeData.isSupported ? (
            <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-md min-w-[280px]">
              {/* Play / Pause Toggle */}
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-1.5 rounded-lg border flex items-center justify-center transition-all ${
                  isPlaying
                    ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-900/30'
                    : 'bg-[#1e1e28] text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                }`}
                title={isPlaying ? 'Tạm dừng hoạt họa' : 'Tự động mở / gấp'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>

              {/* Slider 0 -> 100 */}
              <div className="flex-1 flex flex-col gap-0.5">
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                  <span>Khối 3D (0%)</span>
                  <span className="text-blue-400 font-bold">{Math.round(foldProgress)}% phẳng</span>
                  <span>Trải phẳng (100%)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={foldProgress}
                  onChange={e => {
                    setIsPlaying(false);
                    setFoldProgress(Number(e.target.value));
                  }}
                  className="w-full accent-blue-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                />
              </div>

              {/* Quick Jump Buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setFoldProgress(0);
                  }}
                  className="px-2 py-1 bg-[#1e1e28] hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded text-[11px] font-mono"
                  title="Đưa về khối 3D khép kín"
                >
                  3D
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setFoldProgress(50);
                  }}
                  className="px-2 py-1 bg-[#1e1e28] hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded text-[11px] font-mono"
                  title="Mở bung 50%"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setFoldProgress(100);
                  }}
                  className="px-2 py-1 bg-blue-950 text-blue-300 border border-blue-800 hover:bg-blue-900 rounded text-[11px] font-mono font-bold"
                  title="Trải phẳng hoàn toàn 2D"
                >
                  Phẳng
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-rose-400 font-mono text-xs">
              <AlertTriangle className="w-4 h-4" />
              <span>Đối tượng hình học không thể trải phẳng</span>
            </div>
          )}

          {/* Right: Export / Print Tools */}
          {activeTab === 'net2d' && activeShapeData.isSupported && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrint}
                className="px-2.5 py-1 bg-[#1e1e28] hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded flex items-center gap-1.5 transition-colors font-mono"
                title="In bản vẽ trải phẳng ra giấy để cắt dán"
              >
                <Printer className="w-3.5 h-3.5 text-zinc-400" />
                <span className="hidden sm:inline">In bản vẽ</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadSvg}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded flex items-center gap-1.5 transition-colors font-mono font-semibold"
                title="Tải tệp vector SVG sắc nét"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tải SVG</span>
              </button>
            </div>
          )}
        </div>

        {/* -------------------------------------------------------------- */}
        {/* MAIN DISPLAY AREA */}
        {/* -------------------------------------------------------------- */}
        <div className="flex-1 overflow-hidden relative flex flex-col bg-[#0b0b0e]">
          {/* CASE 1: UNSUPPORTED SHAPE (SPHERE) */}
          {!activeShapeData.isSupported ? (
            <div className="h-full flex items-center justify-center p-6 text-center">
              <div className="max-w-md p-6 bg-rose-950/30 border border-rose-800/60 rounded-2xl space-y-3 font-mono">
                <div className="w-12 h-12 rounded-full bg-rose-900/50 text-rose-400 flex items-center justify-center mx-auto border border-rose-700">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-rose-300">
                  Khối cầu (Sphere): Không thể trải phẳng 2D
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed text-left">
                  {activeShapeData.unsupportedReason}
                </p>
                <div className="pt-2 border-t border-rose-900/50 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSourceKey('preset_Hình chóp tứ giác đều S.ABCD')}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold"
                  >
                    Xem chóp tứ giác
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSourceKey('preset_Hình hộp chữ nhật ABCD.A\'B\'C\'D\'')}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs"
                  >
                    Xem hình hộp
                  </button>
                </div>
              </div>
            </div>
          ) : activeTab === 'net2d' ? (
            /* CASE 2: TAB 2D NET BLUEPRINT */
            <div className="h-full flex flex-col">
              {/* Toggles Strip */}
              <div className="p-2 bg-[#101016] border-b border-zinc-800/80 flex items-center justify-between gap-2 text-[11px] font-mono flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 uppercase">Tùy chọn hiển thị:</span>
                  <label className="flex items-center gap-1 text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showEdgeLengths}
                      onChange={e => setShowEdgeLengths(e.target.checked)}
                      className="accent-blue-500"
                    />
                    <span>Kích thước cạnh</span>
                  </label>
                  <label className="flex items-center gap-1 text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showVertexLabels}
                      onChange={e => setShowVertexLabels(e.target.checked)}
                      className="accent-blue-500"
                    />
                    <span>Tên đỉnh</span>
                  </label>
                  <label className="flex items-center gap-1 text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showGlueTabs}
                      onChange={e => setShowGlueTabs(e.target.checked)}
                      className="accent-blue-500"
                    />
                    <span>Mép dán gấp giấy (Tabs)</span>
                  </label>
                  <label className="flex items-center gap-1 text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showFaceNames}
                      onChange={e => setShowFaceNames(e.target.checked)}
                      className="accent-blue-500"
                    />
                    <span>Tên các mặt</span>
                  </label>
                </div>

                <div className="flex items-center gap-3 text-zinc-400">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-red-500 inline-block" /> Đường cắt viền
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-0.5 border-b border-dashed border-blue-400 inline-block" /> Đường nếp gấp
                  </span>
                </div>
              </div>

              {/* SVG Canvas Container */}
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[#070709] relative">
                <NetSvgRenderer
                  shapeData={activeShapeData}
                  foldProgress={foldProgress}
                  showEdgeLengths={showEdgeLengths}
                  showVertexLabels={showVertexLabels}
                  showGlueTabs={showGlueTabs}
                  showFaceNames={showFaceNames}
                />
              </div>
            </div>
          ) : activeTab === 'hinged3d' ? (
            /* CASE 3: TAB 3D HINGED UNFOLDING */
            <div className="h-full flex flex-col relative">
              <div
                ref={threeMountRef}
                className="w-full h-full cursor-grab active:cursor-grabbing"
              />
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-zinc-800 text-[11px] font-mono text-zinc-300 pointer-events-none">
                Kéo chuột để xoay 3D • Cuộn chuột để phóng to/thu nhỏ • Kéo thanh trượt để gấp/mở
              </div>
            </div>
          ) : (
            /* CASE 4: TAB SPECS & FORMULAS */
            <div className="h-full overflow-y-auto p-5 sm:p-8 space-y-6 max-w-4xl mx-auto w-full font-mono">
              <div className="bg-[#14141c] border border-zinc-800 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Quy luật trải phẳng hình học: {activeShapeData.name}</span>
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {activeShapeData.formulas.unfoldingDescription}
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-[#121218] border border-zinc-800 rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] text-zinc-500 uppercase">Diện tích xung quanh</span>
                  <div className="text-lg font-bold text-amber-400">
                    {activeShapeData.metrics.lateralArea.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono">
                    {activeShapeData.formulas.lateralAreaFormula}
                  </div>
                </div>

                <div className="bg-[#121218] border border-zinc-800 rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] text-zinc-500 uppercase">Diện tích đáy</span>
                  <div className="text-lg font-bold text-blue-400">
                    {activeShapeData.metrics.baseArea.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono">
                    Mặt phẳng đáy chuẩn
                  </div>
                </div>

                <div className="bg-[#121218] border border-zinc-800 rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] text-zinc-500 uppercase">Diện tích toàn phần</span>
                  <div className="text-lg font-bold text-emerald-400">
                    {activeShapeData.metrics.surfaceArea.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono">
                    {activeShapeData.formulas.totalAreaFormula}
                  </div>
                </div>

                <div className="bg-[#121218] border border-zinc-800 rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] text-zinc-500 uppercase">Thể tích khối</span>
                  <div className="text-lg font-bold text-purple-400">
                    {activeShapeData.metrics.volume.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono">
                    {activeShapeData.formulas.volumeFormula}
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="bg-[#14141c] border border-zinc-800 rounded-xl p-5 space-y-3">
                <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  Kích thước hình học trích xuất từ tọa độ:
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  {activeShapeData.dimensions.a !== undefined && (
                    <div className="p-2.5 rounded bg-[#1c1c26] border border-zinc-800">
                      <span className="text-zinc-400 block text-[10px]">Cạnh / Chiều dài a:</span>
                      <span className="font-bold text-white">{activeShapeData.dimensions.a.toFixed(2)}</span>
                    </div>
                  )}
                  {activeShapeData.dimensions.b !== undefined && (
                    <div className="p-2.5 rounded bg-[#1c1c26] border border-zinc-800">
                      <span className="text-zinc-400 block text-[10px]">Cạnh / Chiều rộng b:</span>
                      <span className="font-bold text-white">{activeShapeData.dimensions.b.toFixed(2)}</span>
                    </div>
                  )}
                  {activeShapeData.dimensions.c !== undefined && (
                    <div className="p-2.5 rounded bg-[#1c1c26] border border-zinc-800">
                      <span className="text-zinc-400 block text-[10px]">Chiều cao c / h:</span>
                      <span className="font-bold text-white">{activeShapeData.dimensions.c.toFixed(2)}</span>
                    </div>
                  )}
                  {activeShapeData.dimensions.radius !== undefined && (
                    <div className="p-2.5 rounded bg-[#1c1c26] border border-zinc-800">
                      <span className="text-zinc-400 block text-[10px]">Bán kính đáy R:</span>
                      <span className="font-bold text-white">{activeShapeData.dimensions.radius.toFixed(2)}</span>
                    </div>
                  )}
                  {activeShapeData.dimensions.height !== undefined && (
                    <div className="p-2.5 rounded bg-[#1c1c26] border border-zinc-800">
                      <span className="text-zinc-400 block text-[10px]">Chiều cao h:</span>
                      <span className="font-bold text-white">{activeShapeData.dimensions.height.toFixed(2)}</span>
                    </div>
                  )}
                  {activeShapeData.dimensions.slantHeight !== undefined && (
                    <div className="p-2.5 rounded bg-[#1c1c26] border border-zinc-800">
                      <span className="text-zinc-400 block text-[10px]">Đường sinh l:</span>
                      <span className="font-bold text-white">{activeShapeData.dimensions.slantHeight.toFixed(2)}</span>
                    </div>
                  )}
                  {activeShapeData.dimensions.sectorAngleDeg !== undefined && (
                    <div className="p-2.5 rounded bg-[#1c1c26] border border-zinc-800">
                      <span className="text-zinc-400 block text-[10px]">Góc ở tâm quạt tròn θ:</span>
                      <span className="font-bold text-amber-400">{activeShapeData.dimensions.sectorAngleDeg.toFixed(1)}°</span>
                    </div>
                  )}
                  {activeShapeData.dimensions.circumference !== undefined && (
                    <div className="p-2.5 rounded bg-[#1c1c26] border border-zinc-800">
                      <span className="text-zinc-400 block text-[10px]">Chu vi đáy (2πR):</span>
                      <span className="font-bold text-white">{activeShapeData.dimensions.circumference.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* -------------------------------------------------------------- */}
        {/* FOOTER */}
        {/* -------------------------------------------------------------- */}
        <div className="p-3 sm:px-5 bg-[#14141a] border-t border-zinc-800 flex items-center justify-between text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>
              Mô hình: <strong>{activeShapeData.name}</strong> • Hỗ trợ trải phẳng 2D chuẩn xác
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1f1f2a] hover:bg-zinc-800 text-white rounded-lg transition-colors font-bold"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

// --------------------------------------------------------------------------
// 2D SVG NET BLUEPRINT RENDERER
// --------------------------------------------------------------------------
export interface NetSvgRendererProps {
  shapeData: UnfoldedShapeData;
  foldProgress: number; // 0 -> 100
  showEdgeLengths: boolean;
  showVertexLabels: boolean;
  showGlueTabs: boolean;
  showFaceNames: boolean;
}

export const NetSvgRenderer: React.FC<NetSvgRendererProps> = ({
  shapeData,
  foldProgress,
  showEdgeLengths,
  showVertexLabels,
  showGlueTabs,
  showFaceNames,
}) => {
  const type = shapeData.type;
  const t = foldProgress / 100; // 0 = 3D scale, 1 = 2D full scale

  // SVG dimensions
  const svgWidth = 800;
  const svgHeight = 650;
  const cx = svgWidth / 2;
  const cy = svgHeight / 2;

  // Colors
  const fillBase = 'rgba(59, 130, 246, 0.18)';
  const strokeBase = '#3b82f6';
  const fillSide1 = 'rgba(245, 158, 11, 0.18)';
  const strokeSide1 = '#f59e0b';
  const fillSide2 = 'rgba(16, 185, 129, 0.18)';
  const strokeSide2 = '#10b981';
  const fillSide3 = 'rgba(168, 85, 247, 0.18)';
  const strokeSide3 = '#a855f7';
  const creaseStroke = '#38bdf8';
  const cutStroke = '#ef4444';
  const tabFill = 'rgba(113, 113, 122, 0.15)';
  const tabStroke = '#71717a';

  // 1. BOX (Cross / T-net)
  if (type === 'box') {
    const rawA = shapeData.dimensions.a || 4;
    const rawB = shapeData.dimensions.b || 3;
    const rawC = shapeData.dimensions.c || 5;

    // Scale so it fits in 500x500
    const maxDim = 2 * rawC + rawA + rawB;
    const scale = 380 / maxDim;

    const w = rawA * scale;
    const d = rawB * scale;
    const h = rawC * scale * (0.1 + 0.9 * t); // folds open with t

    const x0 = cx - w / 2;
    const y0 = cy - d / 2;

    return (
      <svg
        id="unfolded-svg-net"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-full max-w-2xl select-none"
      >
        <defs>
          <pattern id="grid-net" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={svgWidth} height={svgHeight} fill="url(#grid-net)" />

        <g id="box-net">
          {/* Base Face ABCD */}
          <rect
            x={x0}
            y={y0}
            width={w}
            height={d}
            fill={fillBase}
            stroke={creaseStroke}
            strokeWidth="2"
            strokeDasharray="4 3"
          />
          {showFaceNames && (
            <text x={cx} y={cy} fill="#93c5fd" fontSize="12" fontWeight="bold" textAnchor="middle">
              ĐÁY DƯỚI (ABCD)
            </text>
          )}

          {/* Front Face (below base): hinged at y0 + d */}
          <rect
            x={x0}
            y={y0 + d}
            width={w}
            height={h}
            fill={fillSide1}
            stroke={cutStroke}
            strokeWidth="2"
          />
          {showFaceNames && (
            <text x={cx} y={y0 + d + h / 2} fill="#fcd34d" fontSize="11" textAnchor="middle">
              Mặt trước (ABB'A')
            </text>
          )}

          {/* Back Face (above base): hinged at y0 */}
          <rect
            x={x0}
            y={y0 - h}
            width={w}
            height={h}
            fill={fillSide1}
            stroke={creaseStroke}
            strokeWidth="2"
            strokeDasharray="4 3"
          />
          {showFaceNames && (
            <text x={cx} y={y0 - h / 2} fill="#fcd34d" fontSize="11" textAnchor="middle">
              Mặt sau (CDD'C')
            </text>
          )}

          {/* Top Lid (above Back face): hinged at y0 - h */}
          <rect
            x={x0}
            y={y0 - h - d * (0.1 + 0.9 * t)}
            width={w}
            height={d * (0.1 + 0.9 * t)}
            fill={fillBase}
            stroke={cutStroke}
            strokeWidth="2"
          />
          {showFaceNames && (
            <text
              x={cx}
              y={y0 - h - (d * (0.1 + 0.9 * t)) / 2}
              fill="#93c5fd"
              fontSize="11"
              fontWeight="bold"
              textAnchor="middle"
            >
              ĐÁY TRÊN (A'B'C'D')
            </text>
          )}

          {/* Right Face: hinged at x0 + w */}
          <rect
            x={x0 + w}
            y={y0}
            width={h}
            height={d}
            fill={fillSide2}
            stroke={cutStroke}
            strokeWidth="2"
          />
          {showFaceNames && (
            <text x={x0 + w + h / 2} y={cy} fill="#6ee7b7" fontSize="10" textAnchor="middle">
              Mặt phải
            </text>
          )}

          {/* Left Face: hinged at x0 */}
          <rect
            x={x0 - h}
            y={y0}
            width={h}
            height={d}
            fill={fillSide3}
            stroke={cutStroke}
            strokeWidth="2"
          />
          {showFaceNames && (
            <text x={x0 - h / 2} y={cy} fill="#d8b4fe" fontSize="10" textAnchor="middle">
              Mặt trái
            </text>
          )}

          {/* Glue Tabs */}
          {showGlueTabs && (
            <g opacity="0.6">
              <polygon
                points={`${x0 + w + h},${y0 + 6} ${x0 + w + h + 14},${y0 + 16} ${x0 + w + h + 14},${y0 + d - 16} ${x0 + w + h},${y0 + d - 6}`}
                fill={tabFill}
                stroke={tabStroke}
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <polygon
                points={`${x0 - h},${y0 + 6} ${x0 - h - 14},${y0 + 16} ${x0 - h - 14},${y0 + d - 16} ${x0 - h},${y0 + d - 6}`}
                fill={tabFill}
                stroke={tabStroke}
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            </g>
          )}

          {/* Edge Length Labels */}
          {showEdgeLengths && (
            <g fill="#a1a1aa" fontSize="10" fontFamily="monospace">
              <text x={cx} y={y0 + d + 12} textAnchor="middle">
                a = {rawA}
              </text>
              <text x={x0 - 14} y={cy} textAnchor="end">
                b = {rawB}
              </text>
              <text x={x0 + w + h / 2} y={y0 - 6} textAnchor="middle">
                c = {rawC}
              </text>
            </g>
          )}

          {/* Vertex Labels */}
          {showVertexLabels && (
            <g fill="#ffffff" fontSize="12" fontWeight="bold" fontFamily="monospace">
              <text x={x0 - 8} y={y0 - 8}>A</text>
              <text x={x0 + w + 8} y={y0 - 8}>B</text>
              <text x={x0 + w + 8} y={y0 + d + 14}>C</text>
              <text x={x0 - 8} y={y0 + d + 14}>D</text>
              <text x={x0 - 8} y={y0 - h - 8}>A'</text>
              <text x={x0 + w + 8} y={y0 - h - 8}>B'</text>
            </g>
          )}
        </g>
      </svg>
    );
  }

  // 2. PYRAMID QUAD (Chóp tứ giác)
  if (type === 'pyramid_quad') {
    const rawA = shapeData.dimensions.a || 4;
    const rawB = shapeData.dimensions.b || 4;
    const rawSlant = shapeData.dimensions.slantHeight || 5.7;

    const scale = 360 / (rawA + 2 * rawSlant);
    const w = rawA * scale;
    const d = rawB * scale;
    const slant = rawSlant * scale * (0.1 + 0.9 * t);

    const x0 = cx - w / 2;
    const y0 = cy - d / 2;

    return (
      <svg
        id="unfolded-svg-net"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-full max-w-2xl select-none"
      >
        <g id="pyramid-net">
          {/* Base ABCD */}
          <rect
            x={x0}
            y={y0}
            width={w}
            height={d}
            fill={fillBase}
            stroke={creaseStroke}
            strokeWidth="2"
            strokeDasharray="4 3"
          />
          {showFaceNames && (
            <text x={cx} y={cy} fill="#93c5fd" fontSize="12" fontWeight="bold" textAnchor="middle">
              ĐÁY (ABCD)
            </text>
          )}

          {/* Bottom Side Triangle (S_AB) */}
          <polygon
            points={`${x0},${y0 + d} ${x0 + w},${y0 + d} ${cx},${y0 + d + slant}`}
            fill={fillSide1}
            stroke={cutStroke}
            strokeWidth="2"
          />
          {showFaceNames && (
            <text x={cx} y={y0 + d + slant / 2} fill="#fcd34d" fontSize="11" textAnchor="middle">
              ΔSAB
            </text>
          )}

          {/* Top Side Triangle (S_CD) */}
          <polygon
            points={`${x0},${y0} ${x0 + w},${y0} ${cx},${y0 - slant}`}
            fill={fillSide1}
            stroke={cutStroke}
            strokeWidth="2"
          />
          {showFaceNames && (
            <text x={cx} y={y0 - slant / 2} fill="#fcd34d" fontSize="11" textAnchor="middle">
              ΔSCD
            </text>
          )}

          {/* Right Side Triangle (S_BC) */}
          <polygon
            points={`${x0 + w},${y0} ${x0 + w},${y0 + d} ${x0 + w + slant},${cy}`}
            fill={fillSide2}
            stroke={cutStroke}
            strokeWidth="2"
          />
          {showFaceNames && (
            <text x={x0 + w + slant / 2} y={cy} fill="#6ee7b7" fontSize="11" textAnchor="middle">
              ΔSBC
            </text>
          )}

          {/* Left Side Triangle (S_DA) */}
          <polygon
            points={`${x0},${y0} ${x0},${y0 + d} ${x0 - slant},${cy}`}
            fill={fillSide3}
            stroke={cutStroke}
            strokeWidth="2"
          />
          {showFaceNames && (
            <text x={x0 - slant / 2} y={cy} fill="#d8b4fe" fontSize="11" textAnchor="middle">
              ΔSDA
            </text>
          )}

          {/* Glue Tabs */}
          {showGlueTabs && (
            <g opacity="0.6">
              <polygon
                points={`${cx},${y0 + d + slant} ${cx - 16},${y0 + d + slant - 14} ${x0 + 12},${y0 + d + 8} ${x0},${y0 + d}`}
                fill={tabFill}
                stroke={tabStroke}
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            </g>
          )}

          {/* Vertex Labels */}
          {showVertexLabels && (
            <g fill="#ffffff" fontSize="12" fontWeight="bold" fontFamily="monospace">
              <text x={x0 - 8} y={y0 - 8}>A</text>
              <text x={x0 + w + 8} y={y0 - 8}>B</text>
              <text x={x0 + w + 8} y={y0 + d + 14}>C</text>
              <text x={x0 - 8} y={y0 + d + 14}>D</text>
              <text x={cx} y={y0 - slant - 8} textAnchor="middle" fill="#f59e0b">S₁</text>
              <text x={cx} y={y0 + d + slant + 18} textAnchor="middle" fill="#f59e0b">S₂</text>
              <text x={x0 + w + slant + 14} y={cy + 4} fill="#f59e0b">S₃</text>
              <text x={x0 - slant - 24} y={cy + 4} fill="#f59e0b">S₄</text>
            </g>
          )}
        </g>
      </svg>
    );
  }

  // 3. TETRAHEDRON (Tứ diện)
  if (type === 'tetrahedron') {
    const s = 140;
    const hTri = (s * Math.sqrt(3)) / 2;
    const ext = hTri * (0.1 + 0.9 * t);

    // Central Base Triangle ABC (pointing up)
    const pA = { x: cx - s / 2, y: cy + hTri / 3 };
    const pB = { x: cx + s / 2, y: cy + hTri / 3 };
    const pC = { x: cx, y: cy - (2 * hTri) / 3 };

    // 3 outer triangles hinged on AB, BC, CA
    const pS_bot = { x: cx, y: cy + hTri / 3 + ext };
    const pS_right = { x: cx + s / 2 + (ext * Math.sqrt(3)) / 2, y: cy - hTri / 3 - ext / 2 };
    const pS_left = { x: cx - s / 2 - (ext * Math.sqrt(3)) / 2, y: cy - hTri / 3 - ext / 2 };

    return (
      <svg
        id="unfolded-svg-net"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-full max-w-2xl select-none"
      >
        <g id="tetra-net">
          {/* Base Triangle ABC */}
          <polygon
            points={`${pA.x},${pA.y} ${pB.x},${pB.y} ${pC.x},${pC.y}`}
            fill={fillBase}
            stroke={creaseStroke}
            strokeWidth="2"
            strokeDasharray="4 3"
          />
          {showFaceNames && (
            <text x={cx} y={cy + 5} fill="#93c5fd" fontSize="12" fontWeight="bold" textAnchor="middle">
              ĐÁY (ABC)
            </text>
          )}

          {/* Bottom Triangle on AB */}
          <polygon
            points={`${pA.x},${pA.y} ${pB.x},${pB.y} ${pS_bot.x},${pS_bot.y}`}
            fill={fillSide1}
            stroke={cutStroke}
            strokeWidth="2"
          />
          {/* Right Triangle on BC */}
          <polygon
            points={`${pB.x},${pB.y} ${pC.x},${pC.y} ${pS_right.x},${pS_right.y}`}
            fill={fillSide2}
            stroke={cutStroke}
            strokeWidth="2"
          />
          {/* Left Triangle on CA */}
          <polygon
            points={`${pC.x},${pC.y} ${pA.x},${pA.y} ${pS_left.x},${pS_left.y}`}
            fill={fillSide3}
            stroke={cutStroke}
            strokeWidth="2"
          />

          {/* Glue tabs */}
          {showGlueTabs && (
            <g opacity="0.6">
              <polygon
                points={`${pA.x},${pA.y} ${pS_bot.x},${pS_bot.y} ${pS_bot.x - 12},${pS_bot.y - 8} ${pA.x - 8},${pA.y + 4}`}
                fill={tabFill}
                stroke={tabStroke}
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            </g>
          )}

          {/* Vertex Labels */}
          {showVertexLabels && (
            <g fill="#ffffff" fontSize="12" fontWeight="bold" fontFamily="monospace">
              <text x={pA.x - 14} y={pA.y + 14}>A</text>
              <text x={pB.x + 8} y={pB.y + 14}>B</text>
              <text x={pC.x} y={pC.y - 12} textAnchor="middle">C</text>
              <text x={pS_bot.x} y={pS_bot.y + 18} textAnchor="middle" fill="#f59e0b">S₁</text>
              <text x={pS_right.x + 14} y={pS_right.y} fill="#f59e0b">S₂</text>
              <text x={pS_left.x - 22} y={pS_left.y} fill="#f59e0b">S₃</text>
            </g>
          )}
        </g>
      </svg>
    );
  }

  // 4. CYLINDER (Hình trụ)
  if (type === 'cylinder') {
    const rawR = shapeData.dimensions.radius || 2.5;
    const rawH = shapeData.dimensions.height || 5;
    const rawC = 2 * Math.PI * rawR;

    const scale = 360 / Math.max(rawC, rawH + 4 * rawR);
    const rectW = rawC * scale * (0.2 + 0.8 * t);
    const rectH = rawH * scale;
    const discR = rawR * scale;

    const x0 = cx - rectW / 2;
    const y0 = cy - rectH / 2;

    return (
      <svg
        id="unfolded-svg-net"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-full max-w-2xl select-none"
      >
        <g id="cylinder-net">
          {/* Rectangular lateral sheet */}
          <rect
            x={x0}
            y={y0}
            width={rectW}
            height={rectH}
            fill={fillSide1}
            stroke={cutStroke}
            strokeWidth="2"
          />
          {showFaceNames && (
            <text x={cx} y={cy} fill="#fcd34d" fontSize="12" fontWeight="bold" textAnchor="middle">
              MẶT XUNG QUANH (Hình chữ nhật 2πR × h)
            </text>
          )}

          {/* Top Circle Disc */}
          <circle
            cx={cx}
            cy={y0 - discR * (0.2 + 0.8 * t)}
            r={discR}
            fill={fillBase}
            stroke={cutStroke}
            strokeWidth="2"
          />
          {showFaceNames && (
            <text x={cx} y={y0 - discR * (0.2 + 0.8 * t)} fill="#93c5fd" fontSize="10" textAnchor="middle">
              ĐÁY TRÊN (O')
            </text>
          )}

          {/* Bottom Circle Disc */}
          <circle
            cx={cx}
            cy={y0 + rectH + discR * (0.2 + 0.8 * t)}
            r={discR}
            fill={fillBase}
            stroke={cutStroke}
            strokeWidth="2"
          />
          {showFaceNames && (
            <text x={cx} y={y0 + rectH + discR * (0.2 + 0.8 * t)} fill="#93c5fd" fontSize="10" textAnchor="middle">
              ĐÁY DƯỚI (O)
            </text>
          )}

          {/* Crease dashed tangents */}
          <line
            x1={cx - 15}
            y1={y0}
            x2={cx + 15}
            y2={y0}
            stroke={creaseStroke}
            strokeWidth="2"
            strokeDasharray="4 3"
          />
          <line
            x1={cx - 15}
            y1={y0 + rectH}
            x2={cx + 15}
            y2={y0 + rectH}
            stroke={creaseStroke}
            strokeWidth="2"
            strokeDasharray="4 3"
          />

          {/* Glue tab on right edge */}
          {showGlueTabs && (
            <polygon
              points={`${x0 + rectW},${y0 + 6} ${x0 + rectW + 16},${y0 + 16} ${x0 + rectW + 16},${y0 + rectH - 16} ${x0 + rectW},${y0 + rectH - 6}`}
              fill={tabFill}
              stroke={tabStroke}
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          )}

          {/* Dimensions */}
          {showEdgeLengths && (
            <g fill="#a1a1aa" fontSize="11" fontFamily="monospace">
              <text x={cx} y={y0 - 6} textAnchor="middle">
                Chu vi = 2πR ≈ {rawC.toFixed(2)}
              </text>
              <text x={x0 - 12} y={cy} textAnchor="end">
                h = {rawH}
              </text>
              <text x={cx + discR + 8} y={y0 + rectH + discR} textAnchor="start">
                R = {rawR}
              </text>
            </g>
          )}
        </g>
      </svg>
    );
  }

  // 5. CONE (Hình nón)
  if (type === 'cone') {
    const rawR = shapeData.dimensions.radius || 3;
    const rawH = shapeData.dimensions.height || 5;
    const rawL = shapeData.dimensions.slantHeight || Math.sqrt(rawR * rawR + rawH * rawH);
    const sectorAngleDeg = (360 * rawR) / rawL;
    const sectorRad = (sectorAngleDeg * Math.PI) / 180;

    const scale = 260 / (rawL + rawR);
    const l = rawL * scale;
    const r = rawR * scale;

    // Apex at top center
    const apexX = cx;
    const apexY = 120;

    // Sector arc endpoints
    const startAngle = Math.PI / 2 - (sectorRad / 2) * (0.2 + 0.8 * t);
    const endAngle = Math.PI / 2 + (sectorRad / 2) * (0.2 + 0.8 * t);

    const x1 = apexX + l * Math.cos(startAngle);
    const y1 = apexY + l * Math.sin(startAngle);
    const x2 = apexX + l * Math.cos(endAngle);
    const y2 = apexY + l * Math.sin(endAngle);

    const largeArc = sectorAngleDeg > 180 ? 1 : 0;
    const sectorPath = `M ${apexX} ${apexY} L ${x1} ${y1} A ${l} ${l} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    // Disc tangent to midpoint of arc
    const midX = apexX;
    const midY = apexY + l;
    const discCenterY = midY + r * (0.2 + 0.8 * t);

    return (
      <svg
        id="unfolded-svg-net"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-full max-w-2xl select-none"
      >
        <g id="cone-net">
          {/* Sector (Mặt xung quanh hình nón: Hình quạt tròn) */}
          <path
            d={sectorPath}
            fill={fillSide1}
            stroke={cutStroke}
            strokeWidth="2.5"
          />
          {showFaceNames && (
            <g textAnchor="middle">
              <text x={apexX} y={apexY + l * 0.45} fill="#fcd34d" fontSize="13" fontWeight="bold">
                MẶT XUNG QUANH: HÌNH QUẠT TRÒN
              </text>
              <text x={apexX} y={apexY + l * 0.45 + 16} fill="#fbbf24" fontSize="11">
                Bán kính quạt l = {rawL.toFixed(2)} • Góc ở tâm θ = {sectorAngleDeg.toFixed(1)}°
              </text>
            </g>
          )}

          {/* Circular Base (Mặt đáy: Hình tròn bán kính R) */}
          <circle
            cx={midX}
            cy={discCenterY}
            r={r}
            fill={fillBase}
            stroke={cutStroke}
            strokeWidth="2.5"
          />
          {showFaceNames && (
            <g textAnchor="middle">
              <text x={midX} y={discCenterY - 6} fill="#93c5fd" fontSize="12" fontWeight="bold">
                ĐÁY: HÌNH TRÒN
              </text>
              <text x={midX} y={discCenterY + 12} fill="#60a5fa" fontSize="11">
                Bán kính R = {rawR.toFixed(2)} • Chu vi = 2πR ≈ {(2 * Math.PI * rawR).toFixed(2)}
              </text>
            </g>
          )}

          {/* Crease tangent line */}
          <line
            x1={midX - 20}
            y1={midY}
            x2={midX + 20}
            y2={midY}
            stroke={creaseStroke}
            strokeWidth="2"
            strokeDasharray="4 3"
          />

          {/* Glue Tab along straight edge SA */}
          {showGlueTabs && (
            <polygon
              points={`${apexX},${apexY} ${x1},${y1} ${x1 + 14},${y1 - 10} ${apexX + 10},${apexY + 8}`}
              fill={tabFill}
              stroke={tabStroke}
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          )}

          {/* Vertex Labels */}
          {showVertexLabels && (
            <g fill="#ffffff" fontSize="12" fontWeight="bold" fontFamily="monospace">
              <text x={apexX} y={apexY - 12} textAnchor="middle" fill="#f59e0b">S (Đỉnh quạt & Đỉnh nón)</text>
              <text x={x1 + 10} y={y1 + 10}>A</text>
              <text x={x2 - 24} y={y2 + 10}>A'</text>
              <text x={midX} y={discCenterY + r + 20} textAnchor="middle" fill="#93c5fd">O (Tâm đáy tròn)</text>
            </g>
          )}

          {/* Dimensions */}
          {showEdgeLengths && (
            <g fill="#a1a1aa" fontSize="11" fontFamily="monospace">
              <text x={(apexX + x1) / 2 + 14} y={(apexY + y1) / 2 - 4} fill="#fbbf24">
                Đường sinh l = {rawL.toFixed(2)}
              </text>
              <text x={(apexX + x2) / 2 - 14} y={(apexY + y2) / 2 - 4} textAnchor="end" fill="#fbbf24">
                Đường sinh l = {rawL.toFixed(2)}
              </text>
              <text x={apexX} y={apexY + 36} textAnchor="middle" fill="#f59e0b" fontWeight="bold">
                θ = {sectorAngleDeg.toFixed(1)}°
              </text>
              <text x={midX} y={midY - 8} textAnchor="middle" fill="#34d399">
                Độ dài cung quạt = 2πR ≈ {(2 * Math.PI * rawR).toFixed(2)}
              </text>
            </g>
          )}
        </g>
      </svg>
    );
  }

  // 6. PRISM TRI (Lăng trụ tam giác)
  // Default to prism tri
  const a = 110;
  const b = 100;
  const c = 95;
  const h = 130 * (0.2 + 0.8 * t);
  const totalW = a + b + c;
  const x0 = cx - totalW / 2;
  const y0 = cy - h / 2;

  return (
    <svg
      id="unfolded-svg-net"
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="w-full h-full max-w-2xl select-none"
    >
      <g id="prism-net">
        {/* 3 Lateral Rectangles in a row */}
        <rect
          x={x0}
          y={y0}
          width={a}
          height={h}
          fill={fillSide1}
          stroke={cutStroke}
          strokeWidth="2"
        />
        <rect
          x={x0 + a}
          y={y0}
          width={b}
          height={h}
          fill={fillSide2}
          stroke={cutStroke}
          strokeWidth="2"
        />
        <rect
          x={x0 + a + b}
          y={y0}
          width={c}
          height={h}
          fill={fillSide3}
          stroke={cutStroke}
          strokeWidth="2"
        />

        {/* Crease lines between faces */}
        <line x1={x0 + a} y1={y0} x2={x0 + a} y2={y0 + h} stroke={creaseStroke} strokeWidth="2" strokeDasharray="4 3" />
        <line x1={x0 + a + b} y1={y0} x2={x0 + a + b} y2={y0 + h} stroke={creaseStroke} strokeWidth="2" strokeDasharray="4 3" />

        {/* Top Base Triangle on face 1 */}
        <polygon
          points={`${x0},${y0} ${x0 + a},${y0} ${x0 + a * 0.4},${y0 - 75 * (0.2 + 0.8 * t)}`}
          fill={fillBase}
          stroke={cutStroke}
          strokeWidth="2"
        />
        {/* Bottom Base Triangle on face 1 */}
        <polygon
          points={`${x0},${y0 + h} ${x0 + a},${y0 + h} ${x0 + a * 0.4},${y0 + h + 75 * (0.2 + 0.8 * t)}`}
          fill={fillBase}
          stroke={cutStroke}
          strokeWidth="2"
        />

        {/* Face Labels */}
        {showFaceNames && (
          <g fill="#fcd34d" fontSize="11" textAnchor="middle">
            <text x={x0 + a / 2} y={cy}>Mặt 1</text>
            <text x={x0 + a + b / 2} y={cy} fill="#6ee7b7">Mặt 2</text>
            <text x={x0 + a + b + c / 2} y={cy} fill="#d8b4fe">Mặt 3</text>
            <text x={x0 + a / 2} y={y0 - 25} fill="#93c5fd">ĐÁY TRÊN</text>
            <text x={x0 + a / 2} y={y0 + h + 35} fill="#93c5fd">ĐÁY DƯỚI</text>
          </g>
        )}

        {/* Glue tab */}
        {showGlueTabs && (
          <polygon
            points={`${x0 + totalW},${y0 + 6} ${x0 + totalW + 15},${y0 + 16} ${x0 + totalW + 15},${y0 + h - 16} ${x0 + totalW},${y0 + h - 6}`}
            fill={tabFill}
            stroke={tabStroke}
            strokeWidth="1"
            strokeDasharray="2 2"
          />
        )}
      </g>
    </svg>
  );
};
