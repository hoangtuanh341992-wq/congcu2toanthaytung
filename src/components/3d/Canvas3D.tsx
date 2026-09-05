import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Layers,
  Eye,
  EyeOff,
  Crosshair,
  Compass,
  Box,
  Palette,
  Play,
  Pause,
  Sliders,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Point3D, Vector3D, Line3D, Segment3D, Plane3D, Solid3D } from '../../types/math';
import { computeInSceneUnfolding } from '../../utils/inSceneUnfolding';

interface Canvas3DProps {
  points: Point3D[];
  vectors: Vector3D[];
  segments?: Segment3D[];
  lines: Line3D[];
  planes: Plane3D[];
  solids: Solid3D[];
  selectedPointId: string | null;
  onSelectPoint?: (id: string | null) => void;
  showPlaneShading?: boolean;
  onTogglePlaneShading?: () => void;
  onResetToInitial?: () => void;
  onOpenUnfold?: () => void;
  foldProgress?: number;
  onFoldProgressChange?: (progress: number) => void;
}

export const Canvas3D: React.FC<Canvas3DProps> = ({
  points,
  vectors,
  segments = [],
  lines,
  planes,
  solids,
  selectedPointId,
  onSelectPoint,
  showPlaneShading: externalShowPlaneShading,
  onTogglePlaneShading,
  onResetToInitial,
  onOpenUnfold,
  foldProgress: externalFoldProgress,
  onFoldProgressChange,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Fullscreen state & toggle
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const toggleFullscreen = useCallback(async () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      if (rootRef.current && document.fullscreenEnabled && !document.fullscreenElement) {
        try {
          await rootRef.current.requestFullscreen();
        } catch {
          // CSS fixed overlay handles fullscreen gracefully in iframes
        }
      }
    } else {
      setIsFullscreen(false);
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch {
          // ignore
        }
      }
    }
  }, [isFullscreen]);

  // Esc key and fullscreen change listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen]);

  // Settings
  const [showAxes, setShowAxes] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [isRotating, setIsRotating] = useState<boolean>(false);
  const [localShowPlaneShading, setLocalShowPlaneShading] = useState<boolean>(true);

  // In-Scene 3D Unfolding State (Mở/gấp trực tiếp trên Canvas không gian)
  const [selectedUnfoldSolidId, setSelectedUnfoldSolidId] = useState<string | null>(null);
  const [foldProgress, setFoldProgress] = useState<number>(0); // 0 (3D solid) -> 100 (flat 2D net)
  const [isPlayingFold, setIsPlayingFold] = useState<boolean>(false);
  const [foldSpeed, setFoldSpeed] = useState<number>(1); // 1x, 2x
  const [showFaceLabels, setShowFaceLabels] = useState<boolean>(true);
  const [isUnfoldPanelOpen, setIsUnfoldPanelOpen] = useState<boolean>(true);

  const effectiveFoldProgress =
    externalFoldProgress !== undefined ? externalFoldProgress : foldProgress;

  const updateFoldProgress = (val: number) => {
    setFoldProgress(val);
    if (onFoldProgressChange) {
      onFoldProgressChange(val);
    }
  };

  // Current active solid for unfolding
  const activeSolidToUnfold =
    solids.find(s => s.id === selectedUnfoldSolidId) ||
    solids[0] ||
    null;

  // Auto-play folding/unfolding animation
  useEffect(() => {
    if (!isPlayingFold) return;
    const interval = setInterval(() => {
      const nextVal =
        effectiveFoldProgress >= 100
          ? 100
          : Math.min(100, Math.round((effectiveFoldProgress + 1.2 * foldSpeed) * 10) / 10);
      if (nextVal >= 100) {
        setIsPlayingFold(false);
      }
      updateFoldProgress(nextVal);
    }, 30);
    return () => clearInterval(interval);
  }, [isPlayingFold, foldSpeed, effectiveFoldProgress]);

  const effectiveShowPlaneShading =
    externalShowPlaneShading !== undefined ? externalShowPlaneShading : localShowPlaneShading;

  const handleTogglePlaneShading = () => {
    if (onTogglePlaneShading) {
      onTogglePlaneShading();
    } else {
      setLocalShowPlaneShading(prev => !prev);
    }
  };

  const handleResetToInitial = () => {
    sphericalRef.current = { radius: 24, theta: 0.8, phi: 1.1 };
    updateCamera();
    setIsRotating(false);
    if (onResetToInitial) {
      onResetToInitial();
    }
  };

  // References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const dynamicGroupRef = useRef<THREE.Group | null>(null);

  // Spherical camera angles
  const sphericalRef = useRef({ radius: 24, theta: 0.8, phi: 1.1 });
  const isMouseDownRef = useRef(false);
  const prevMousePosRef = useRef({ x: 0, y: 0 });

  // Update camera position
  const updateCamera = useCallback(() => {
    if (!cameraRef.current) return;
    const { radius, theta, phi } = sphericalRef.current;
    cameraRef.current.position.x = radius * Math.sin(phi) * Math.sin(theta);
    cameraRef.current.position.y = radius * Math.cos(phi);
    cameraRef.current.position.z = radius * Math.sin(phi) * Math.cos(theta);
    cameraRef.current.lookAt(0, 1, 0);
  }, []);

  // Text label sprite generator with clean typography
  const createTextSprite = (text: string, color: string = '#ffffff', isPointLabel = false) => {
    const canvas = document.createElement('canvas');
    if (isPointLabel) {
      // Sleek, compact circular/pill badge for point names (e.g. A, B, C, S)
      canvas.width = 96;
      canvas.height = 96;
      const ctx = canvas.getContext('2d');
      if (!ctx) return new THREE.Sprite();

      ctx.fillStyle = 'rgba(8, 8, 12, 0.88)';
      ctx.beginPath();
      ctx.arc(48, 48, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = color;
      ctx.stroke();

      ctx.font = 'bold 42px monospace';
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 48, 49);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(0.48, 0.48, 1);
      return sprite;
    }

    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Sprite();

    ctx.fillStyle = 'rgba(8, 8, 12, 0.85)';
    ctx.roundRect(10, 20, 236, 88, 16);
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#27272a';
    ctx.stroke();

    ctx.font = 'bold 38px monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.2, 0.6, 1);
    return sprite;
  };

  // 1. Initialize Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x050505);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    cameraRef.current = camera;
    updateCamera();

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    rendererRef.current = renderer;
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight1.position.set(15, 25, 20);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x818cf8, 0.8);
    dirLight2.position.set(-15, 10, -20);
    scene.add(dirLight2);

    // Dynamic Objects Group
    const dynamicGroup = new THREE.Group();
    dynamicGroupRef.current = dynamicGroup;
    scene.add(dynamicGroup);

    // Render loop
    let reqId: number;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      if (isRotating && !isMouseDownRef.current) {
        sphericalRef.current.theta += 0.004;
        updateCamera();
      }
      renderer.render(scene, camera);
    };
    animate();

    // Mouse drag rotation
    const onMouseDown = (e: MouseEvent) => {
      isMouseDownRef.current = true;
      prevMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isMouseDownRef.current) return;
      const deltaX = e.clientX - prevMousePosRef.current.x;
      const deltaY = e.clientY - prevMousePosRef.current.y;

      sphericalRef.current.theta -= deltaX * 0.008;
      sphericalRef.current.phi = Math.max(
        0.05,
        Math.min(Math.PI - 0.05, sphericalRef.current.phi - deltaY * 0.008)
      );
      updateCamera();
      prevMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isMouseDownRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      sphericalRef.current.radius = Math.max(
        5,
        Math.min(80, sphericalRef.current.radius + e.deltaY * 0.03)
      );
      updateCamera();
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(reqId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      if (container.contains(dom)) {
        container.removeChild(dom);
      }
      renderer.dispose();
    };
  }, [updateCamera, isRotating]);

  // 2. Re-render dynamic 3D objects whenever data changes
  useEffect(() => {
    const group = dynamicGroupRef.current;
    if (!group) return;

    // Clear previous objects
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
    }

    // Grid Floor
    if (showGrid) {
      const grid = new THREE.GridHelper(20, 20, 0x3f3f46, 0x18181b);
      grid.position.y = 0;
      group.add(grid);
    }

    // Helper: Map Oxyz -> Three.js (x, z, -y)
    const mapCoord = (x: number, y: number, z: number) => {
      return new THREE.Vector3(x, z, -y);
    };

    // Axes
    if (showAxes) {
      const axisLen = 10;
      // Ox (Red)
      const xMat = new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 2 });
      const xGeo = new THREE.BufferGeometry().setFromPoints([
        mapCoord(0, 0, 0),
        mapCoord(axisLen, 0, 0),
      ]);
      group.add(new THREE.Line(xGeo, xMat));
      const xLabel = createTextSprite('Ox', '#ef4444');
      const posOx = mapCoord(axisLen + 0.6, 0, 0);
      xLabel.position.copy(posOx);
      group.add(xLabel);

      // Oy (Green)
      const yMat = new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 2 });
      const yGeo = new THREE.BufferGeometry().setFromPoints([
        mapCoord(0, 0, 0),
        mapCoord(0, axisLen, 0),
      ]);
      group.add(new THREE.Line(yGeo, yMat));
      const yLabel = createTextSprite('Oy', '#10b981');
      const posOy = mapCoord(0, axisLen + 0.6, 0);
      yLabel.position.copy(posOy);
      group.add(yLabel);

      // Oz (Blue)
      const zMat = new THREE.LineBasicMaterial({ color: 0x3b82f6, linewidth: 2 });
      const zGeo = new THREE.BufferGeometry().setFromPoints([
        mapCoord(0, 0, 0),
        mapCoord(0, 0, axisLen),
      ]);
      group.add(new THREE.Line(zGeo, zMat));
      const zLabel = createTextSprite('Oz', '#3b82f6');
      const posOz = mapCoord(0, 0, axisLen + 0.6);
      zLabel.position.copy(posOz);
      group.add(zLabel);
    }

    // Draw Points
    points.forEach(p => {
      const pos = mapCoord(p.x, p.y, p.z);
      const isSelected = p.id === selectedPointId;

      // Sphere marker: compact and balanced size (radius 0.09 normal, 0.15 selected)
      const geo = new THREE.SphereGeometry(isSelected ? 0.15 : 0.09, 20, 20);
      const mat = new THREE.MeshStandardMaterial({
        color: isSelected ? 0x38bdf8 : new THREE.Color(p.color || '#60a5fa'),
        emissive: isSelected ? 0x0284c7 : 0x000000,
        emissiveIntensity: isSelected ? 0.7 : 0,
        roughness: 0.3,
        metalness: 0.2,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      group.add(mesh);

      // Label sprite: ONLY point name, NO coordinates
      const sprite = createTextSprite(p.name, p.color || '#ffffff', true);
      sprite.position.set(pos.x, pos.y + 0.22, pos.z);
      group.add(sprite);
    });

    // Draw Vectors
    vectors.forEach(v => {
      let fromPos = mapCoord(0, 0, 0);
      if (v.from) {
        const ptFrom = points.find(p => p.id === v.from);
        if (ptFrom) fromPos = mapCoord(ptFrom.x, ptFrom.y, ptFrom.z);
      }

      let toPos = mapCoord(v.x, v.y, v.z);
      if (v.to) {
        const ptTo = points.find(p => p.id === v.to);
        if (ptTo) toPos = mapCoord(ptTo.x, ptTo.y, ptTo.z);
      } else if (v.from) {
        toPos = fromPos.clone().add(mapCoord(v.x, v.y, v.z));
      }

      const dir = toPos.clone().sub(fromPos);
      const len = dir.length();
      if (len > 0.01) {
        dir.normalize();
        const arrow = new THREE.ArrowHelper(
          dir,
          fromPos,
          len,
          new THREE.Color(v.color || '#10b981').getHex(),
          0.5,
          0.25
        );
        group.add(arrow);

        const mid = fromPos.clone().add(toPos).multiplyScalar(0.5);
        const vSprite = createTextSprite(v.name, v.color || '#10b981');
        vSprite.position.set(mid.x, mid.y + 0.25, mid.z);
        group.add(vSprite);
      }
    });

    // Draw Segments (Đoạn thẳng sạch sẽ, không ký hiệu/chấm vàng gây rối)
    (segments || []).forEach(seg => {
      const p1 = points.find(p => p.id === seg.point1Id);
      const p2 = points.find(p => p.id === seg.point2Id);
      if (p1 && p2) {
        const pos1 = mapCoord(p1.x, p1.y, p1.z);
        const pos2 = mapCoord(p2.x, p2.y, p2.z);

        const sMat = new THREE.LineBasicMaterial({
          color: new THREE.Color(seg.color || '#38bdf8'),
          linewidth: 2.5,
        });
        const sGeo = new THREE.BufferGeometry().setFromPoints([pos1, pos2]);
        group.add(new THREE.Line(sGeo, sMat));
      }
    });

    // Draw Lines (Đường thẳng vô hạn về 2 phía)
    lines.forEach(l => {
      let pos1: THREE.Vector3 | null = null;
      let dir: THREE.Vector3 | null = null;

      if (l.point1Id && l.point2Id) {
        const p1 = points.find(p => p.id === l.point1Id);
        const p2 = points.find(p => p.id === l.point2Id);
        if (p1 && p2) {
          pos1 = mapCoord(p1.x, p1.y, p1.z);
          const pos2 = mapCoord(p2.x, p2.y, p2.z);
          dir = pos2.clone().sub(pos1).normalize();
        }
      } else if (l.point && l.dir) {
        pos1 = mapCoord(l.point.x, l.point.y, l.point.z);
        dir = new THREE.Vector3(l.dir.x, l.dir.z, -l.dir.y).normalize();
      }

      if (pos1 && dir && dir.length() > 0.01) {
        const ext1 = pos1.clone().addScaledVector(dir, -25);
        const ext2 = pos1.clone().addScaledVector(dir, 25);

        const lMat = new THREE.LineBasicMaterial({
          color: new THREE.Color(l.color || '#ec4899'),
          linewidth: 2,
        });
        const lGeo = new THREE.BufferGeometry().setFromPoints([ext1, ext2]);
        group.add(new THREE.Line(lGeo, lMat));
      }
    });

    // Draw Planes (Mặt phẳng & Miền mặt phẳng đa giác qua các điểm chỉ định)
    planes.forEach(pl => {
      if (pl.visible === false) return;

      const lenSq = pl.a * pl.a + pl.b * pl.b + pl.c * pl.c;
      if (lenSq < 1e-8) return;

      const planeColor = new THREE.Color(pl.color || '#38bdf8');
      const isShaded = effectiveShowPlaneShading && pl.fillColor !== false;

      // Check if this plane is defined by specified points (miền mặt phẳng qua các điểm chỉ định)
      if (pl.pointIds && pl.pointIds.length >= 3) {
        const planePts = pl.pointIds
          .map(id => points.find(p => p.id === id))
          .filter(Boolean) as Point3D[];

        if (planePts.length >= 3) {
          const vList = planePts.map(p => mapCoord(p.x, p.y, p.z));

          // Calculate centroid of points
          const center = new THREE.Vector3(0, 0, 0);
          vList.forEach(v => center.add(v));
          center.multiplyScalar(1 / vList.length);

          // Normal vector in Three.js coordinates
          let normal = new THREE.Vector3(pl.a, pl.c, -pl.b);
          if (normal.lengthSq() < 1e-6) {
            normal = vList[1].clone().sub(vList[0]).cross(vList[2].clone().sub(vList[0]));
          }
          normal.normalize();

          // Create 2D orthonormal basis on the plane to sort vertices in cyclical order
          let u = vList[0].clone().sub(center);
          if (u.lengthSq() < 1e-6) {
            u = new THREE.Vector3(1, 0, 0).cross(normal);
          }
          u.normalize();
          const v = normal.clone().cross(u).normalize();

          // Sort vertices by angle around the centroid
          const sorted = [...vList].sort((pA, pB) => {
            const dA = pA.clone().sub(center);
            const dB = pB.clone().sub(center);
            const angA = Math.atan2(dA.dot(v), dA.dot(u));
            const angB = Math.atan2(dB.dot(v), dB.dot(u));
            return angA - angB;
          });

          // 1. Shaded polygon mesh (Tô màu miền mặt phẳng khi BẬT)
          if (isShaded) {
            const vertices: number[] = [];
            for (let i = 1; i < sorted.length - 1; i++) {
              vertices.push(
                sorted[0].x, sorted[0].y, sorted[0].z,
                sorted[i].x, sorted[i].y, sorted[i].z,
                sorted[i + 1].x, sorted[i + 1].y, sorted[i + 1].z
              );
            }

            const polyGeo = new THREE.BufferGeometry();
            polyGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            polyGeo.computeVertexNormals();

            const polyMat = new THREE.MeshStandardMaterial({
              color: planeColor,
              transparent: true,
              opacity: pl.opacity !== undefined ? pl.opacity : 0.45,
              side: THREE.DoubleSide,
              roughness: 0.35,
              metalness: 0.1,
              depthWrite: false,
            });
            const polyMesh = new THREE.Mesh(polyGeo, polyMat);
            group.add(polyMesh);
          }

          // 2. Perimeter border line around the polygon
          const borderPts = [...sorted, sorted[0]];
          const borderGeo = new THREE.BufferGeometry().setFromPoints(borderPts);
          const borderMat = new THREE.LineBasicMaterial({
            color: planeColor,
            linewidth: 2,
          });
          group.add(new THREE.Line(borderGeo, borderMat));

          // 3. Name sprite near centroid
          const pSprite = createTextSprite(pl.name, pl.color || '#38bdf8');
          pSprite.position.set(center.x, center.y + 0.28, center.z);
          group.add(pSprite);

          // If regionOnly is false, continue to draw the full infinite sheet below; otherwise finish here
          if (pl.regionOnly !== false) {
            return;
          }
        }
      }

      // Draw standard bounded sheet for general plane Ax + By + Cz + D = 0
      const t0 = -pl.d / lenSq;
      const centerMath = {
        x: t0 * pl.a,
        y: t0 * pl.b,
        z: t0 * pl.c,
      };
      const centerThree = mapCoord(centerMath.x, centerMath.y, centerMath.z);

      // Normal in Three.js coordinates: (A, C, -B)
      const normalThree = new THREE.Vector3(pl.a, pl.c, -pl.b).normalize();
      const defaultNormal = new THREE.Vector3(0, 0, 1);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(defaultNormal, normalThree);

      // Mesh fill (if shading enabled)
      if (isShaded) {
        const planeGeo = new THREE.PlaneGeometry(16, 16);
        const planeMat = new THREE.MeshStandardMaterial({
          color: planeColor,
          transparent: true,
          opacity: pl.opacity !== undefined ? pl.opacity : 0.3,
          side: THREE.DoubleSide,
          roughness: 0.5,
          metalness: 0.1,
          depthWrite: false,
        });
        const planeMesh = new THREE.Mesh(planeGeo, planeMat);
        planeMesh.quaternion.copy(quaternion);
        planeMesh.position.copy(centerThree);
        group.add(planeMesh);
      }

      // Wireframe border grid
      const wireGeo = new THREE.WireframeGeometry(new THREE.PlaneGeometry(16, 16, 4, 4));
      const wireMat = new THREE.LineBasicMaterial({
        color: planeColor,
        transparent: true,
        opacity: isShaded ? 0.35 : 0.6,
      });
      const wire = new THREE.LineSegments(wireGeo, wireMat);
      wire.quaternion.copy(quaternion);
      wire.position.copy(centerThree);
      group.add(wire);

      // Normal vector indicator arrow
      const arrow = new THREE.ArrowHelper(
        normalThree,
        centerThree,
        2.0,
        planeColor.getHex(),
        0.4,
        0.2
      );
      group.add(arrow);

      // Name sprite
      const pSprite = createTextSprite(`${pl.name}`, pl.color || '#38bdf8');
      pSprite.position.copy(centerThree.clone().add(normalThree.clone().multiplyScalar(2.1)).add(new THREE.Vector3(0, 0.25, 0)));
      group.add(pSprite);
    });

    // Draw Solids
    solids.forEach(solid => {
      // Check if this solid is currently being unfolded in-scene
      const isUnfoldingThisSolid =
        activeSolidToUnfold &&
        activeSolidToUnfold.id === solid.id &&
        effectiveFoldProgress > 0;

      if (isUnfoldingThisSolid) {
        const unfoldResult = computeInSceneUnfolding(solid, points, effectiveFoldProgress, mapCoord);
        if (unfoldResult.isSupported && unfoldResult.faces.length > 0) {
          // Render each unfolded face
          unfoldResult.faces.forEach(face => {
            const flatVerts: number[] = [];
            face.vertices.forEach(vt => flatVerts.push(vt.x, vt.y, vt.z));

            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(flatVerts, 3));
            geo.computeVertexNormals();

            const mat = new THREE.MeshStandardMaterial({
              color: new THREE.Color(face.color),
              transparent: true,
              opacity: effectiveShowPlaneShading ? 0.75 : 0.4,
              side: THREE.DoubleSide,
              roughness: 0.35,
              metalness: 0.1,
            });
            group.add(new THREE.Mesh(geo, mat));

            // Face boundary lines
            face.edgeSegments.forEach(([pA, pB]) => {
              const eGeo = new THREE.BufferGeometry().setFromPoints([pA, pB]);
              group.add(new THREE.Line(eGeo, new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 })));
            });

            // Face label
            if (showFaceLabels) {
              const fSprite = createTextSprite(face.name, face.color);
              fSprite.position.copy(face.center.clone().add(new THREE.Vector3(0, 0.2, 0)));
              group.add(fSprite);
            }
          });

          // Vertex labels
          unfoldResult.labels.forEach(lbl => {
            const vSprite = createTextSprite(lbl.text, lbl.color, true);
            vSprite.position.copy(lbl.position);
            group.add(vSprite);
          });

          return; // Handled by in-scene unfolding
        }
      }

      const color = new THREE.Color(solid.color || '#3b82f6');

      // 1. Tetrahedron
      if (solid.type === 'tetrahedron' && solid.pointIds.length >= 4) {
        const pts = solid.pointIds.map(id => points.find(p => p.id === id)).filter(Boolean) as Point3D[];
        if (pts.length >= 4) {
          const v = pts.map(p => mapCoord(p.x, p.y, p.z));

          const indices = [
            0, 1, 2, // bottom
            0, 1, 3, // side 1
            1, 2, 3, // side 2
            2, 0, 3, // side 3
          ];
          const vertices: number[] = [];
          indices.forEach(idx => {
            vertices.push(v[idx].x, v[idx].y, v[idx].z);
          });

          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
          geo.computeVertexNormals();

          const mat = new THREE.MeshStandardMaterial({
            color,
            transparent: true,
            opacity: effectiveShowPlaneShading ? 0.65 : 0.15,
            side: THREE.DoubleSide,
            roughness: 0.4,
          });
          group.add(new THREE.Mesh(geo, mat));

          // Wireframe edges
          const edges = [
            [0, 1], [1, 2], [2, 0],
            [0, 3], [1, 3], [2, 3],
          ];
          edges.forEach(([i, j]) => {
            const eGeo = new THREE.BufferGeometry().setFromPoints([v[i], v[j]]);
            group.add(new THREE.Line(eGeo, new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 })));
          });
        }
      }

      // 2. Pyramid Quad (S.ABCD)
      if (solid.type === 'pyramid_quad' && solid.pointIds.length >= 5) {
        const pts = solid.pointIds.map(id => points.find(p => p.id === id)).filter(Boolean) as Point3D[];
        if (pts.length >= 5) {
          const S = mapCoord(pts[0].x, pts[0].y, pts[0].z);
          const A = mapCoord(pts[1].x, pts[1].y, pts[1].z);
          const B = mapCoord(pts[2].x, pts[2].y, pts[2].z);
          const C = mapCoord(pts[3].x, pts[3].y, pts[3].z);
          const D = mapCoord(pts[4].x, pts[4].y, pts[4].z);

          const verts: THREE.Vector3[] = [
            // Base ABCD
            A, B, C, A, C, D,
            // Sides
            S, A, B,
            S, B, C,
            S, C, D,
            S, D, A,
          ];

          const flatVerts: number[] = [];
          verts.forEach(vt => flatVerts.push(vt.x, vt.y, vt.z));

          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.Float32BufferAttribute(flatVerts, 3));
          geo.computeVertexNormals();

          const mat = new THREE.MeshStandardMaterial({
            color,
            transparent: true,
            opacity: effectiveShowPlaneShading ? 0.65 : 0.15,
            side: THREE.DoubleSide,
            roughness: 0.3,
          });
          group.add(new THREE.Mesh(geo, mat));

          // Edges
          const edgePairs = [
            [A, B], [B, C], [C, D], [D, A],
            [S, A], [S, B], [S, C], [S, D],
          ];
          edgePairs.forEach(([pA, pB]) => {
            const eGeo = new THREE.BufferGeometry().setFromPoints([pA, pB]);
            group.add(new THREE.Line(eGeo, new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 })));
          });
        }
      }

      // 3. Triangular Prism ABC.A'B'C' (Lăng trụ tam giác đứng)
      if (solid.type === 'prism_tri' && solid.pointIds.length >= 6) {
        const pts = solid.pointIds.map(id => points.find(p => p.id === id)).filter(Boolean) as Point3D[];
        if (pts.length >= 6) {
          const A = mapCoord(pts[0].x, pts[0].y, pts[0].z);
          const B = mapCoord(pts[1].x, pts[1].y, pts[1].z);
          const C = mapCoord(pts[2].x, pts[2].y, pts[2].z);
          const A1 = mapCoord(pts[3].x, pts[3].y, pts[3].z);
          const B1 = mapCoord(pts[4].x, pts[4].y, pts[4].z);
          const C1 = mapCoord(pts[5].x, pts[5].y, pts[5].z);

          // 8 triangular faces
          const verts: THREE.Vector3[] = [
            // Bottom base ABC
            A, B, C,
            // Top base A'B'C'
            A1, C1, B1,
            // Side face ABB'A'
            A, B, B1,
            A, B1, A1,
            // Side face BCC'B'
            B, C, C1,
            B, C1, B1,
            // Side face CAA'C'
            C, A, A1,
            C, A1, C1,
          ];

          const flatVerts: number[] = [];
          verts.forEach(vt => flatVerts.push(vt.x, vt.y, vt.z));

          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.Float32BufferAttribute(flatVerts, 3));
          geo.computeVertexNormals();

          const mat = new THREE.MeshStandardMaterial({
            color,
            transparent: true,
            opacity: effectiveShowPlaneShading ? 0.65 : 0.15,
            side: THREE.DoubleSide,
            roughness: 0.35,
            metalness: 0.1,
          });
          group.add(new THREE.Mesh(geo, mat));

          // 9 Edges of triangular prism
          const edgePairs = [
            // Bottom base
            [A, B], [B, C], [C, A],
            // Top base
            [A1, B1], [B1, C1], [C1, A1],
            // Lateral side edges
            [A, A1], [B, B1], [C, C1],
          ];
          edgePairs.forEach(([pA, pB]) => {
            const eGeo = new THREE.BufferGeometry().setFromPoints([pA, pB]);
            group.add(new THREE.Line(eGeo, new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 })));
          });
        }
      }

      // 4. Rectangular Box / Cuboid ABCD.A'B'C'D' (Hình hộp chữ nhật)
      if (solid.type === 'box' && solid.pointIds.length >= 8) {
        const pts = solid.pointIds.map(id => points.find(p => p.id === id)).filter(Boolean) as Point3D[];
        if (pts.length >= 8) {
          const A = mapCoord(pts[0].x, pts[0].y, pts[0].z);
          const B = mapCoord(pts[1].x, pts[1].y, pts[1].z);
          const C = mapCoord(pts[2].x, pts[2].y, pts[2].z);
          const D = mapCoord(pts[3].x, pts[3].y, pts[3].z);
          const A1 = mapCoord(pts[4].x, pts[4].y, pts[4].z);
          const B1 = mapCoord(pts[5].x, pts[5].y, pts[5].z);
          const C1 = mapCoord(pts[6].x, pts[6].y, pts[6].z);
          const D1 = mapCoord(pts[7].x, pts[7].y, pts[7].z);

          // 12 triangular faces (6 rectangular faces * 2)
          const verts: THREE.Vector3[] = [
            // Bottom base ABCD
            A, B, C,
            A, C, D,
            // Top base A'B'C'D'
            A1, B1, C1,
            A1, C1, D1,
            // Side face ABB'A'
            A, B, B1,
            A, B1, A1,
            // Side face BCC'B'
            B, C, C1,
            B, C1, B1,
            // Side face CDD'C'
            C, D, D1,
            C, D1, C1,
            // Side face DAA'D'
            D, A, A1,
            D, A1, D1,
          ];

          const flatVerts: number[] = [];
          verts.forEach(vt => flatVerts.push(vt.x, vt.y, vt.z));

          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.Float32BufferAttribute(flatVerts, 3));
          geo.computeVertexNormals();

          const mat = new THREE.MeshStandardMaterial({
            color,
            transparent: true,
            opacity: effectiveShowPlaneShading ? 0.6 : 0.15,
            side: THREE.DoubleSide,
            roughness: 0.35,
            metalness: 0.1,
          });
          group.add(new THREE.Mesh(geo, mat));

          // 12 Edges of box
          const edgePairs = [
            // Bottom base
            [A, B], [B, C], [C, D], [D, A],
            // Top base
            [A1, B1], [B1, C1], [C1, D1], [D1, A1],
            // Vertical column edges
            [A, A1], [B, B1], [C, C1], [D, D1],
          ];
          edgePairs.forEach(([pA, pB]) => {
            const eGeo = new THREE.BufferGeometry().setFromPoints([pA, pB]);
            group.add(new THREE.Line(eGeo, new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 })));
          });
        }
      }

      // 5. Sphere
      if (solid.type === 'sphere') {
        const cPt = solid.centerId ? points.find(p => p.id === solid.centerId) : points[0];
        const center = cPt ? mapCoord(cPt.x, cPt.y, cPt.z) : mapCoord(0, 0, 0);
        const radius = solid.radius || 3;

        const sGeo = new THREE.SphereGeometry(radius, 32, 24);
        const sMat = new THREE.MeshStandardMaterial({
          color: 0xec4899,
          transparent: true,
          opacity: effectiveShowPlaneShading ? 0.6 : 0.15,
          roughness: 0.3,
        });
        const mesh = new THREE.Mesh(sGeo, sMat);
        mesh.position.copy(center);
        group.add(mesh);

        // Wireframe rings
        const wf = new THREE.WireframeGeometry(sGeo);
        const wfLine = new THREE.LineSegments(wf, new THREE.LineBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.35 }));
        wfLine.position.copy(center);
        group.add(wfLine);
      }

      // 6. Cylinder
      if (solid.type === 'cylinder') {
        const radius = solid.radius || 2.5;
        const height = solid.height || 5;

        const cylGeo = new THREE.CylinderGeometry(radius, radius, height, 32);
        const cylMat = new THREE.MeshStandardMaterial({
          color: 0x10b981,
          transparent: true,
          opacity: effectiveShowPlaneShading ? 0.65 : 0.15,
          side: THREE.DoubleSide,
          roughness: 0.3,
        });
        const mesh = new THREE.Mesh(cylGeo, cylMat);
        mesh.position.set(0, height / 2, 0);
        group.add(mesh);

        // Cylinder wireframe outlines
        const cylWfGeo = new THREE.WireframeGeometry(new THREE.CylinderGeometry(radius, radius, height, 16, 1));
        const cylWfLine = new THREE.LineSegments(
          cylWfGeo,
          new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.4 })
        );
        cylWfLine.position.set(0, height / 2, 0);
        group.add(cylWfLine);
      }

      // 7. Cone (Hình nón tròn xoay)
      if (solid.type === 'cone') {
        const radius = solid.radius || 3;
        const height = solid.height || 5;
        const coneColor = solid.color ? new THREE.Color(solid.color).getHex() : 0xf59e0b;

        const oPt = solid.centerId ? points.find(p => p.id === solid.centerId) : points.find(p => p.name === 'O');
        const sPt = solid.apexId ? points.find(p => p.id === solid.apexId) : points.find(p => p.name === 'S');

        const basePos = oPt ? mapCoord(oPt.x, oPt.y, oPt.z) : mapCoord(0, 0, 0);
        const apexPos = sPt ? mapCoord(sPt.x, sPt.y, sPt.z) : mapCoord(0, 0, height);

        const axisVec = apexPos.clone().sub(basePos);
        const actualH = axisVec.length() > 0.001 ? axisVec.length() : height;
        const midPos = basePos.clone().add(apexPos).multiplyScalar(0.5);

        const coneGeo = new THREE.ConeGeometry(radius, actualH, 36);
        const coneMat = new THREE.MeshStandardMaterial({
          color: coneColor,
          transparent: true,
          opacity: effectiveShowPlaneShading ? 0.65 : 0.15,
          side: THREE.DoubleSide,
          roughness: 0.35,
          metalness: 0.1,
        });

        const coneMesh = new THREE.Mesh(coneGeo, coneMat);

        // Orient cone along axisVec: Default Cone points along (0, 1, 0)
        const defaultAxis = new THREE.Vector3(0, 1, 0);
        const normAxis = axisVec.clone().normalize();
        if (normAxis.lengthSq() > 0.5) {
          coneMesh.quaternion.setFromUnitVectors(defaultAxis, normAxis);
        }
        coneMesh.position.copy(midPos);
        group.add(coneMesh);

        // Outlines: Wireframe and circular base outline
        const coneWfGeo = new THREE.WireframeGeometry(new THREE.ConeGeometry(radius, actualH, 16, 1));
        const coneWfLine = new THREE.LineSegments(
          coneWfGeo,
          new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: effectiveShowPlaneShading ? 0.35 : 0.6,
            linewidth: 1.5,
          })
        );
        if (normAxis.lengthSq() > 0.5) {
          coneWfLine.quaternion.setFromUnitVectors(defaultAxis, normAxis);
        }
        coneWfLine.position.copy(midPos);
        group.add(coneWfLine);

        // Circular base ring outline (Vòng tròn viền đáy sắc nét)
        const circlePts: THREE.Vector3[] = [];
        const ringSegments = 48;
        for (let i = 0; i <= ringSegments; i++) {
          const theta = (i / ringSegments) * Math.PI * 2;
          circlePts.push(new THREE.Vector3(radius * Math.cos(theta), -actualH / 2, radius * Math.sin(theta)));
        }
        const circleGeo = new THREE.BufferGeometry().setFromPoints(circlePts);
        const circleLine = new THREE.Line(
          circleGeo,
          new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 })
        );
        if (normAxis.lengthSq() > 0.5) {
          circleLine.quaternion.setFromUnitVectors(defaultAxis, normAxis);
        }
        circleLine.position.copy(midPos);
        group.add(circleLine);
      }
    });
  }, [
    points,
    vectors,
    segments,
    lines,
    planes,
    solids,
    showAxes,
    showGrid,
    effectiveShowPlaneShading,
    selectedPointId,
    effectiveFoldProgress,
    activeSolidToUnfold,
    showFaceLabels,
  ]);

  return (
    <div
      ref={rootRef}
      id="projection-3d-canvas-container"
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 flex flex-col w-screen h-screen bg-[#070707] overflow-hidden'
          : 'flex flex-col h-full bg-[#0a0a0a] rounded-xl border border-[#222] overflow-hidden shadow-lg shadow-black/40'
      }
    >
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-[#111] border-b border-[#222] gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs uppercase tracking-wider text-zinc-300 flex items-center gap-1.5 font-bold">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block shadow-sm shadow-blue-500"></span>
            3D_PROJECTION (OXYZ)
          </span>
          <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">
            Ox (Đỏ) • Oy (Xanh lá) • Oz (Xanh dương)
          </span>

          {/* Nút Phóng To / Thu Nhỏ Toàn Màn Hình */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-all flex items-center gap-1.5 ml-1 ${
              isFullscreen
                ? 'bg-amber-950/80 text-amber-300 border-amber-500/80 font-bold shadow-md shadow-amber-950/70 ring-1 ring-amber-500/50'
                : 'bg-blue-950/60 text-blue-300 border-blue-700/80 hover:bg-blue-900/70 hover:text-white font-medium shadow-sm shadow-blue-950/40'
            }`}
            title={
              isFullscreen
                ? 'Thoát chế độ toàn màn hình cửa sổ 3D_PROJECTION (OXYZ) (Phím Esc)'
                : 'Hiển thị cửa sổ 3D_PROJECTION (OXYZ) full toàn màn hình'
            }
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
            )}
            <span>{isFullscreen ? 'Thoát Full màn hình (Esc)' : 'Full màn hình'}</span>
          </button>
        </div>

        {/* Visibility toggles */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Nút Về ban đầu (Làm trống cửa sổ không có hình nào) */}
          <button
            type="button"
            onClick={handleResetToInitial}
            className="px-2.5 py-0.5 rounded text-[11px] font-mono border transition-all flex items-center gap-1.5 bg-rose-950/40 text-rose-300 border-rose-800/60 hover:bg-rose-900/60 active:scale-95 font-medium shadow-sm shadow-rose-950/40"
            title="Về ban đầu: Trạng thái cửa sổ trống không có hình nào cả"
          >
            <RotateCcw className="w-3 h-3 text-rose-400" />
            <span>Về ban đầu</span>
          </button>

          {/* Nút Mở/Gấp 3D Trực tiếp trên Canvas (Phương án 1) */}
          {solids.length > 0 && (
            <button
              type="button"
              onClick={() => setIsUnfoldPanelOpen(prev => !prev)}
              className={`px-2.5 py-0.5 rounded text-[11px] font-mono border transition-all flex items-center gap-1.5 ${
                isUnfoldPanelOpen || effectiveFoldProgress > 0
                  ? 'bg-cyan-950/60 text-cyan-300 border-cyan-700/80 font-semibold shadow-sm shadow-cyan-950/50'
                  : 'bg-[#18181b] text-zinc-400 border-zinc-800 hover:text-zinc-200'
              }`}
              title="Bật/Tắt bảng thanh trượt mở/gấp trực tiếp khối 3D trên Canvas không gian"
            >
              <Sliders className="w-3 h-3 text-cyan-400" />
              <span>Mở/Gấp 3D {effectiveFoldProgress > 0 ? `(${Math.round(effectiveFoldProgress)}%)` : ''}</span>
            </button>
          )}

          {/* Nút Trải phẳng 2D */}
          {onOpenUnfold && (
            <button
              type="button"
              onClick={onOpenUnfold}
              className="px-2.5 py-0.5 rounded text-[11px] font-mono border transition-all flex items-center gap-1.5 bg-indigo-950/50 text-indigo-300 border-indigo-700/70 hover:bg-indigo-900/70 active:scale-95 font-semibold shadow-sm shadow-indigo-950/50"
              title="Mở bộ điều khiển trải phẳng 2D tương tác (Bản vẽ 2D Net & Mô phỏng gấp mở 3D)"
            >
              <Layers className="w-3 h-3 text-indigo-400" />
              <span>Trải phẳng 2D</span>
            </button>
          )}

          {/* Nút Ẩn/Hiện Tô màu Mặt phẳng & Miền mặt phẳng */}
          <button
            type="button"
            onClick={handleTogglePlaneShading}
            className={`px-2.5 py-0.5 rounded text-[11px] font-mono border transition-colors flex items-center gap-1.5 ${
              effectiveShowPlaneShading
                ? 'bg-purple-950/40 text-purple-300 border-purple-800/60 font-semibold shadow-sm shadow-purple-950/50'
                : 'bg-[#18181b] text-zinc-400 border-zinc-800'
            }`}
            title="Bật/Tắt tô màu mặt phẳng & miền mặt phẳng qua các điểm chỉ định"
          >
            <Palette className={`w-3 h-3 ${effectiveShowPlaneShading ? 'text-purple-400' : 'text-zinc-500'}`} />
            <span>Tô màu MP: {effectiveShowPlaneShading ? 'HIỆN' : 'ẨN'}</span>
          </button>

          <button
            onClick={() => setShowAxes(!showAxes)}
            className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
              showAxes
                ? 'bg-blue-950/40 text-blue-400 border-blue-800/60 font-semibold'
                : 'bg-[#18181b] text-zinc-500 border-zinc-800'
            }`}
          >
            {showAxes ? 'Trục Oxyz: BẬT' : 'Trục Oxyz: TẮT'}
          </button>

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
              showGrid
                ? 'bg-blue-950/40 text-blue-400 border-blue-800/60'
                : 'bg-[#18181b] text-zinc-500 border-zinc-800'
            }`}
          >
            Mặt Oxy
          </button>

          <button
            onClick={() => setIsRotating(!isRotating)}
            className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
              isRotating
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
                : 'bg-[#18181b] text-zinc-500 border-zinc-800'
            }`}
          >
            {isRotating ? 'Dừng Xoay' : 'Tự Xoay'}
          </button>

          <button
            onClick={() => {
              sphericalRef.current = { radius: 24, theta: 0.8, phi: 1.1 };
              updateCamera();
            }}
            title="Đưa về góc nhìn chuẩn (Reset camera)"
            className="p-1 rounded bg-[#18181b] hover:bg-zinc-800 text-zinc-300 border border-zinc-800"
          >
            <Compass className="w-3.5 h-3.5 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas */}
      <div
        ref={mountRef}
        className="relative flex-1 min-h-[460px] cursor-grab active:cursor-grabbing bg-[#050505]"
      >
        {/* Helper Hint Overlay */}
        <div className="absolute top-2 left-2 text-[10px] text-zinc-500 font-mono pointer-events-none bg-[#0a0a0a]/80 px-2.5 py-1 rounded border border-zinc-800">
          Kéo chuột: Xoay 360° • Cuộn chuột: Phóng to/Thu nhỏ
        </div>

        {/* Floating Quick Exit Fullscreen Button */}
        {isFullscreen && (
          <button
            type="button"
            onClick={toggleFullscreen}
            className="absolute top-3 right-3 z-30 px-3 py-1.5 rounded-lg bg-[#111]/90 backdrop-blur-md border border-amber-600/80 text-amber-300 text-xs font-mono font-bold flex items-center gap-2 shadow-xl hover:bg-amber-950/90 hover:border-amber-400 transition-all active:scale-95"
            title="Thoát chế độ toàn màn hình (Phím Esc)"
          >
            <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Thoát Full màn hình</span>
            <kbd className="px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-zinc-400 border border-zinc-700 font-mono">
              ESC
            </kbd>
          </button>
        )}

        {/* Floating In-Scene Unfolding Controller (Phương án 1: Trực tiếp trên Canvas 3D) */}
        {solids.length > 0 && isUnfoldPanelOpen && activeSolidToUnfold && (
          <div
            className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-[420px] bg-[#0c1222]/95 backdrop-blur-md rounded-xl border border-cyan-800/60 shadow-2xl p-3 z-20 text-xs font-sans text-zinc-200 shadow-black/80"
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-cyan-950/80 mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-cyan-950/80 border border-cyan-800/70 text-cyan-400">
                  <Sliders className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-semibold text-zinc-100 flex items-center gap-1.5 text-[12px]">
                    <span>Mở / Gấp Khối 3D Trực Tiếp</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-900/60 text-cyan-300 font-mono border border-cyan-700/50">
                      OXYZ
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Bảo toàn độ dài cạnh & diện tích các mặt
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {solids.length > 1 && (
                  <select
                    value={activeSolidToUnfold.id}
                    onChange={e => {
                      setSelectedUnfoldSolidId(e.target.value);
                      updateFoldProgress(0);
                      setIsPlayingFold(false);
                    }}
                    className="text-[10px] bg-[#111] border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-200 font-mono focus:outline-none"
                  >
                    {solids.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name || s.type}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={() => setIsUnfoldPanelOpen(false)}
                  className="p-1 text-zinc-400 hover:text-zinc-200 rounded hover:bg-white/5 transition-colors"
                  title="Thu nhỏ bảng điều khiển"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Slider & Percentage */}
            <div className="space-y-1.5 mb-2.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-zinc-400">Khối 3D (0%)</span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800/70 text-cyan-300 font-bold">
                  {Math.round(effectiveFoldProgress)}% • {effectiveFoldProgress === 0 ? 'Khối gốc' : effectiveFoldProgress >= 100 ? 'Trải phẳng 2D' : `Mở ${(effectiveFoldProgress * 0.9).toFixed(0)}°`}
                </span>
                <span className="text-zinc-400">Trải phẳng (100%)</span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={effectiveFoldProgress}
                onChange={e => {
                  updateFoldProgress(Number(e.target.value));
                  setIsPlayingFold(false);
                }}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
              />
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between gap-1.5 mb-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    updateFoldProgress(0);
                    setIsPlayingFold(false);
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-mono border transition-all ${
                    effectiveFoldProgress === 0
                      ? 'bg-blue-600 text-white border-blue-500 font-bold'
                      : 'bg-zinc-900/90 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                  }`}
                  title="Gấp lại thành khối 3D nguyên bản (0%)"
                >
                  0% Gấp 3D
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (effectiveFoldProgress >= 100) {
                      updateFoldProgress(0);
                      setIsPlayingFold(true);
                    } else {
                      setIsPlayingFold(prev => !prev);
                    }
                  }}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono border flex items-center gap-1 transition-all ${
                    isPlayingFold
                      ? 'bg-amber-600 text-white border-amber-500 font-bold animate-pulse'
                      : 'bg-cyan-950/80 text-cyan-300 border-cyan-700/80 hover:bg-cyan-900/80'
                  }`}
                  title={isPlayingFold ? 'Tạm dừng mô phỏng' : 'Tự động mở trải phẳng mượt mà'}
                >
                  {isPlayingFold ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span>{isPlayingFold ? 'Dừng' : 'Chạy'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    updateFoldProgress(100);
                    setIsPlayingFold(false);
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-mono border transition-all ${
                    effectiveFoldProgress === 100
                      ? 'bg-emerald-600 text-white border-emerald-500 font-bold'
                      : 'bg-zinc-900/90 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                  }`}
                  title="Mở phẳng hoàn toàn 100% cùng mặt phẳng đáy"
                >
                  100% Phẳng
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setFoldSpeed(s => (s === 1 ? 2 : 1))}
                  className="px-1.5 py-1 rounded text-[10px] font-mono bg-zinc-900 border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  title="Tốc độ hoạt ảnh"
                >
                  {foldSpeed}x
                </button>

                <button
                  type="button"
                  onClick={() => setShowFaceLabels(prev => !prev)}
                  className={`px-1.5 py-1 rounded text-[10px] font-mono border transition-colors ${
                    showFaceLabels
                      ? 'bg-cyan-950/70 text-cyan-300 border-cyan-800'
                      : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                  }`}
                  title="Bật/Tắt hiển thị nhãn tên các mặt và các đỉnh trên mô hình"
                >
                  Nhãn: {showFaceLabels ? 'BẬT' : 'TẮT'}
                </button>
              </div>
            </div>

            {/* Educational Geometric Explanation */}
            <div className="p-2 rounded-lg bg-black/40 border border-cyan-950/80 text-[10px] text-zinc-300 space-y-1">
              {activeSolidToUnfold.type === 'sphere' ? (
                <div className="text-amber-300 flex items-start gap-1">
                  <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Định lý Egregium của Gauss:</strong> Mặt cầu có độ cong Gauss K &gt; 0, không thể trải phẳng lên mặt phẳng 2D mà không làm biến dạng hoặc rách bề mặt.
                  </span>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1 text-cyan-300">
                    <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span>
                      {foldProgress === 0
                        ? 'Khối 3D kín: Thể tích & các góc nhị diện nguyên bản.'
                        : foldProgress >= 100
                        ? 'Tất cả các mặt đã đồng phẳng 2D, giữ nguyên 100% kích thước cạnh & diện tích.'
                        : `Các mặt bên đang quay cứng quanh các cạnh đáy bản lề (${(foldProgress * 0.9).toFixed(0)}°).`}
                    </span>
                  </div>
                  {onOpenUnfold && (
                    <button
                      type="button"
                      onClick={onOpenUnfold}
                      className="text-indigo-300 hover:text-indigo-200 underline font-mono shrink-0"
                    >
                      Bản vẽ Net ↗
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Compact Toggle Pill when panel is minimized */}
        {solids.length > 0 && !isUnfoldPanelOpen && (
          <button
            type="button"
            onClick={() => setIsUnfoldPanelOpen(true)}
            className="absolute bottom-3 left-3 bg-[#0c1222]/90 hover:bg-[#0c1222] backdrop-blur-md rounded-lg border border-cyan-800/80 shadow-lg px-2.5 py-1.5 z-20 text-[11px] font-mono text-cyan-300 flex items-center gap-1.5 transition-all active:scale-95 shadow-black/60"
            title="Mở bảng điều khiển mở/gấp 3D"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Mở/Gấp 3D ({foldProgress}%)</span>
            <ChevronUp className="w-3 h-3 text-cyan-400" />
          </button>
        )}
      </div>
    </div>
  );
};
