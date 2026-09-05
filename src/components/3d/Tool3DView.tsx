import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Plus,
  Trash2,
  Compass,
  Maximize,
  Layers,
  Sparkles,
  ChevronRight,
  Calculator,
  ArrowRight,
  Sliders,
  Eye,
  EyeOff,
  Palette,
  Save,
  FolderHeart,
  ShieldCheck,
  Check,
  RotateCcw,
} from 'lucide-react';
import { Point3D, Vector3D, Segment3D, Line3D, Plane3D, Solid3D, SavedScene3D } from '../../types/math';
import {
  vec,
  angleBetweenVectors,
  angleBetweenLines,
  angleLineAndPlane,
  angleBetweenPlanes,
  distancePoints,
  distancePointToPlane,
  planeFrom3Points,
  volumeTetrahedron,
  formatPlaneEquation,
  OXYZ_PRESETS,
  GeometricPreset,
} from '../../utils/oxyzMath';
import {
  saveActiveSession,
  getActiveSession,
  getSavedScenes,
  saveScene,
} from '../../utils/sceneStorage';
import { SavedFiguresModal } from './SavedFiguresModal';
import { Canvas3D } from './Canvas3D';
import { KatexMath } from '../common/KatexMath';
import { GeometryConstructionPanel } from './GeometryConstructionPanel';
import { Unfold2DModal } from './Unfold2DModal';

export const Tool3DView: React.FC = () => {
  // Retrieve any previously active session from offline localStorage
  const initialSession = useMemo(() => getActiveSession(), []);

  // Shared unfolding animation progress
  const [sharedFoldProgress, setSharedFoldProgress] = useState<number>(0);

  // Current 3D scene state
  const [points, setPoints] = useState<Point3D[]>(() => initialSession?.points || OXYZ_PRESETS[1].points);
  const [vectors, setVectors] = useState<Vector3D[]>(() => initialSession?.vectors || [
    { id: 'v1', name: 'u⃗', x: 2, y: 3, z: 4, color: '#10b981' },
  ]);
  const [segments, setSegments] = useState<Segment3D[]>(() => initialSession?.segments || []);
  const [lines, setLines] = useState<Line3D[]>(() => initialSession?.lines || []);
  const [planes, setPlanes] = useState<Plane3D[]>(() => initialSession?.planes || [
    { id: 'p1', name: '(Oxy)', a: 0, b: 0, c: 1, d: 0, color: '#38bdf8', opacity: 0.25, visible: true, fillColor: true },
  ]);
  const [solids, setSolids] = useState<Solid3D[]>(() => initialSession?.solids || [
    {
      id: 'solid1',
      name: 'Chóp S.ABCD',
      type: 'pyramid_quad',
      pointIds: ['S', 'A', 'B', 'C', 'D'],
      color: '#3b82f6',
    },
  ]);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);

  // Persistence & Saved Figures Library State
  const [activeFigureId, setActiveFigureId] = useState<string | null>(() => initialSession?.id || null);
  const [activeFigureName, setActiveFigureName] = useState<string | null>(() => initialSession?.name || null);
  const [isSavedFiguresModalOpen, setIsSavedFiguresModalOpen] = useState(false);
  const [savedFiguresCount, setSavedFiguresCount] = useState<number>(() => getSavedScenes().length);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  // 2D Unfolding Modal State
  const [isUnfoldModalOpen, setIsUnfoldModalOpen] = useState(false);
  const [unfoldTargetScene, setUnfoldTargetScene] = useState<SavedScene3D | null>(null);

  // Auto-save active 3D session so refresh or connection loss NEVER loses work
  useEffect(() => {
    saveActiveSession({
      points,
      vectors,
      segments,
      lines,
      planes,
      solids,
      id: activeFigureId || undefined,
      name: activeFigureName || undefined,
    });
  }, [points, vectors, segments, lines, planes, solids, activeFigureId, activeFigureName]);

  // New point form
  const [newPointName, setNewPointName] = useState<string>('M');
  const [newPointX, setNewPointX] = useState<number>(1);
  const [newPointY, setNewPointY] = useState<number>(2);
  const [newPointZ, setNewPointZ] = useState<number>(3);
  const [newPointColor, setNewPointColor] = useState<string>('#3b82f6');

  // Calculator sub-tab
  const [calcTab, setCalcTab] = useState<'construct' | 'angle' | 'distance' | 'volume'>('construct');

  // Angle calculator state
  const [angleMode, setAngleMode] = useState<'vec_vec' | 'line_line' | 'line_plane' | 'plane_plane'>('vec_vec');
  const [vec1Input, setVec1Input] = useState({ x: 1, y: 2, z: 2 });
  const [vec2Input, setVec2Input] = useState({ x: 0, y: 3, z: 4 });
  const [line1P1, setLine1P1] = useState<string>('S');
  const [line1P2, setLine1P2] = useState<string>('A');
  const [line2P1, setLine2P1] = useState<string>('B');
  const [line2P2, setLine2P2] = useState<string>('C');
  const [planeNorm1, setPlaneNorm1] = useState({ a: 1, b: -1, c: 2, d: 3 });
  const [planeNorm2, setPlaneNorm2] = useState({ a: 2, b: 1, c: -1, d: 0 });

  // Distance calculator state
  const [distMode, setDistMode] = useState<'pt_pt' | 'pt_plane'>('pt_pt');
  const [distPt1, setDistPt1] = useState<string>('S');
  const [distPt2, setDistPt2] = useState<string>('A');

  // Volume calculator state
  const [volTetraA, setVolTetraA] = useState<string>('S');
  const [volTetraB, setVolTetraB] = useState<string>('A');
  const [volTetraC, setVolTetraC] = useState<string>('B');
  const [volTetraD, setVolTetraD] = useState<string>('C');

  // Sphere / Cylinder / Cone params
  const [sphereR, setSphereR] = useState<number>(3);
  const [cylR, setCylR] = useState<number>(2.5);
  const [cylH, setCylH] = useState<number>(5);
  const [coneR, setConeR] = useState<number>(3);
  const [coneH, setConeH] = useState<number>(5);

  // Load a preset
  const applyPreset = (preset: GeometricPreset) => {
    setPoints(preset.points);
    setSelectedPointId(null);
    setVectors([]);
    setSegments([]);
    setActiveFigureId(null);
    setActiveFigureName(preset.name);
    setStatusNotification(`Đã tải mô hình mẫu "${preset.name}"!`);
    setTimeout(() => setStatusNotification(null), 3000);

    if (preset.type === 'tetrahedron') {
      setSolids([
        {
          id: 'sol_tetra',
          name: preset.name,
          type: 'tetrahedron',
          pointIds: preset.points.map(p => p.id),
          color: '#3b82f6',
        },
      ]);
      setSegments([
        { id: 's_oa', name: 'OA', point1Id: 'O', point2Id: 'A', color: '#ef4444' },
        { id: 's_ob', name: 'OB', point1Id: 'O', point2Id: 'B', color: '#10b981' },
        { id: 's_oc', name: 'OC', point1Id: 'O', point2Id: 'C', color: '#3b82f6' },
        { id: 's_ab', name: 'AB', point1Id: 'A', point2Id: 'B', color: '#eab308' },
        { id: 's_bc', name: 'BC', point1Id: 'B', point2Id: 'C', color: '#eab308' },
        { id: 's_ca', name: 'CA', point1Id: 'C', point2Id: 'A', color: '#eab308' },
      ]);
      setLines([]);
    } else if (preset.type === 'pyramid_quad') {
      setSolids([
        {
          id: 'sol_pyr',
          name: preset.name,
          type: 'pyramid_quad',
          pointIds: ['S', 'A', 'B', 'C', 'D'],
          color: '#3b82f6',
        },
      ]);
      setSegments([
        { id: 'seg_ab', name: 'AB', point1Id: 'A', point2Id: 'B', color: '#38bdf8' },
        { id: 'seg_bc', name: 'BC', point1Id: 'B', point2Id: 'C', color: '#38bdf8' },
        { id: 'seg_cd', name: 'CD', point1Id: 'C', point2Id: 'D', color: '#38bdf8' },
        { id: 'seg_da', name: 'DA', point1Id: 'D', point2Id: 'A', color: '#38bdf8' },
        { id: 'seg_sa', name: 'SA', point1Id: 'S', point2Id: 'A', color: '#f59e0b' },
        { id: 'seg_sb', name: 'SB', point1Id: 'S', point2Id: 'B', color: '#f59e0b' },
        { id: 'seg_sc', name: 'SC', point1Id: 'S', point2Id: 'C', color: '#f59e0b' },
        { id: 'seg_sd', name: 'SD', point1Id: 'S', point2Id: 'D', color: '#f59e0b' },
      ]);
      setLines([]);
    } else if (preset.type === 'prism_tri') {
      setSolids([
        {
          id: 'sol_prism',
          name: preset.name,
          type: 'prism_tri',
          pointIds: preset.points.map(p => p.id),
          color: '#06b6d4',
        },
      ]);
      setSegments([
        { id: 'seg_ab', name: 'AB', point1Id: 'A', point2Id: 'B', color: '#38bdf8' },
        { id: 'seg_bc', name: 'BC', point1Id: 'B', point2Id: 'C', color: '#38bdf8' },
        { id: 'seg_ca', name: 'CA', point1Id: 'C', point2Id: 'A', color: '#38bdf8' },
        { id: 'seg_a1b1', name: "A'B'", point1Id: 'A1', point2Id: 'B1', color: '#a78bfa' },
        { id: 'seg_b1c1', name: "B'C'", point1Id: 'B1', point2Id: 'C1', color: '#a78bfa' },
        { id: 'seg_c1a1', name: "C'A'", point1Id: 'C1', point2Id: 'A1', color: '#a78bfa' },
        { id: 'seg_aa1', name: "AA'", point1Id: 'A', point2Id: 'A1', color: '#06b6d4' },
        { id: 'seg_bb1', name: "BB'", point1Id: 'B', point2Id: 'B1', color: '#06b6d4' },
        { id: 'seg_cc1', name: "CC'", point1Id: 'C', point2Id: 'C1', color: '#06b6d4' },
      ]);
      setLines([]);
    } else if (preset.type === 'box') {
      setSolids([
        {
          id: 'sol_box',
          name: preset.name,
          type: 'box',
          pointIds: preset.points.map(p => p.id),
          color: '#06b6d4',
        },
      ]);
      setSegments([
        { id: 'seg_ab', name: 'AB', point1Id: 'A', point2Id: 'B', color: '#38bdf8' },
        { id: 'seg_bc', name: 'BC', point1Id: 'B', point2Id: 'C', color: '#38bdf8' },
        { id: 'seg_cd', name: 'CD', point1Id: 'C', point2Id: 'D', color: '#38bdf8' },
        { id: 'seg_da', name: 'DA', point1Id: 'D', point2Id: 'A', color: '#38bdf8' },
        { id: 'seg_a1b1', name: "A'B'", point1Id: 'A1', point2Id: 'B1', color: '#06b6d4' },
        { id: 'seg_b1c1', name: "B'C'", point1Id: 'B1', point2Id: 'C1', color: '#06b6d4' },
        { id: 'seg_c1d1', name: "C'D'", point1Id: 'C1', point2Id: 'D1', color: '#06b6d4' },
        { id: 'seg_d1a1', name: "D'A'", point1Id: 'D1', point2Id: 'A1', color: '#06b6d4' },
        { id: 'seg_aa1', name: "AA'", point1Id: 'A', point2Id: 'A1', color: '#ec4899' },
        { id: 'seg_bb1', name: "BB'", point1Id: 'B', point2Id: 'B1', color: '#ec4899' },
        { id: 'seg_cc1', name: "CC'", point1Id: 'C', point2Id: 'C1', color: '#ec4899' },
        { id: 'seg_dd1', name: "DD'", point1Id: 'D', point2Id: 'D1', color: '#ec4899' },
      ]);
      setLines([]);
    } else if (preset.type === 'sphere') {
      setSolids([
        {
          id: 'sol_sph',
          name: preset.name,
          type: 'sphere',
          pointIds: [preset.points[0].id],
          centerId: preset.points[0].id,
          radius: preset.params?.radius || 3,
          color: '#ec4899',
        },
      ]);
      setSegments([]);
      setLines([]);
      setSphereR(preset.params?.radius || 3);
    } else if (preset.type === 'cylinder') {
      setSolids([
        {
          id: 'sol_cyl',
          name: preset.name,
          type: 'cylinder',
          pointIds: preset.points.map(p => p.id),
          radius: preset.params?.radius || 2.5,
          height: preset.params?.height || 5,
          color: '#10b981',
        },
      ]);
      setSegments([
        { id: 'seg_oo1', name: "OO'", point1Id: 'O', point2Id: 'O1', color: '#10b981' },
      ]);
      setLines([]);
      setCylR(preset.params?.radius || 2.5);
      setCylH(preset.params?.height || 5);
    } else if (preset.type === 'cone') {
      const r = preset.params?.radius || 3;
      const h = preset.params?.height || 5;
      setSolids([
        {
          id: 'sol_cone',
          name: preset.name,
          type: 'cone',
          pointIds: preset.points.map(p => p.id),
          apexId: 'S',
          centerId: 'O',
          radius: r,
          height: h,
          color: '#f59e0b',
        },
      ]);
      setSegments([
        { id: 'seg_so', name: 'SO (Trục)', point1Id: 'S', point2Id: 'O', color: '#f59e0b' },
        { id: 'seg_sa', name: 'SA (Đường sinh)', point1Id: 'S', point2Id: 'A', color: '#38bdf8' },
        { id: 'seg_sb', name: 'SB (Đường sinh)', point1Id: 'S', point2Id: 'B', color: '#38bdf8' },
        { id: 'seg_sc', name: 'SC (Đường sinh)', point1Id: 'S', point2Id: 'C', color: '#38bdf8' },
        { id: 'seg_oa', name: 'OA (Bán kính)', point1Id: 'O', point2Id: 'A', color: '#10b981' },
        { id: 'seg_ob', name: 'OB (Bán kính)', point1Id: 'O', point2Id: 'B', color: '#10b981' },
        { id: 'seg_ac', name: 'AC (Đường kính)', point1Id: 'A', point2Id: 'C', color: '#64748b' },
      ]);
      setLines([]);
      setConeR(r);
      setConeH(h);
    }
  };

  // Reset scene to blank / initial empty state (Cửa sổ trống không có hình nào cả)
  const handleResetToInitial = () => {
    setPoints([]);
    setVectors([]);
    setSegments([]);
    setLines([]);
    setPlanes([]);
    setSolids([]);
    setSelectedPointId(null);
    setActiveFigureId(null);
    setActiveFigureName(null);
    setNewPointName('A');
    setStatusNotification('Đã về trạng thái ban đầu (cửa sổ trống không có hình nào)!');
    setTimeout(() => setStatusNotification(null), 3500);
  };

  // Quick save current 3D figure
  const handleQuickSaveCurrent = () => {
    let name = activeFigureName;
    if (!name) {
      if (solids.length > 0) name = solids[0].name;
      else if (points.length > 0) name = `Hình (${points.slice(0, 4).map(p => p.name).join('')})`;
      else name = 'Mô hình 3D';
    }

    const saved = saveScene({
      id: activeFigureId || undefined,
      name,
      points,
      vectors,
      segments,
      lines,
      planes,
      solids,
    });

    setActiveFigureId(saved.id);
    setActiveFigureName(saved.name);
    setSavedFiguresCount(getSavedScenes().length);
    setStatusNotification(`Đã lưu "${saved.name}" an toàn vào bộ nhớ máy!`);
    setTimeout(() => setStatusNotification(null), 3500);
  };

  // Load a saved figure from library
  const handleLoadFigure = (fig: SavedScene3D) => {
    setPoints(fig.points);
    setVectors(fig.vectors || []);
    setSegments(fig.segments || []);
    setLines(fig.lines || []);
    setPlanes(fig.planes || []);
    setSolids(fig.solids || []);
    setActiveFigureId(fig.id);
    setActiveFigureName(fig.name);
    setSelectedPointId(null);
    setSavedFiguresCount(getSavedScenes().length);
    setStatusNotification(`Đã mở mô hình "${fig.name}"!`);
    setTimeout(() => setStatusNotification(null), 3500);
  };

  // Add new point
  const handleAddPoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPointName.trim()) return;
    const newPt: Point3D = {
      id: `pt_${Date.now()}`,
      name: newPointName.trim().toUpperCase(),
      x: Number(newPointX),
      y: Number(newPointY),
      z: Number(newPointZ),
      color: newPointColor,
    };
    setPoints(prev => [...prev, newPt]);
    const nextChar = String.fromCharCode(newPointName.charCodeAt(0) + 1);
    if (/^[A-Z]$/.test(nextChar)) setNewPointName(nextChar);
  };

  const handleDeletePoint = (id: string) => {
    setPoints(prev => prev.filter(p => p.id !== id));
    setSegments(prev => prev.filter(s => s.point1Id !== id && s.point2Id !== id));
    setLines(prev => prev.filter(l => l.point1Id !== id && l.point2Id !== id));
    setVectors(prev => prev.filter(v => v.from !== id && v.to !== id));
    if (selectedPointId === id) setSelectedPointId(null);
  };

  // Construction Handlers
  const handleAddVector = (v: Vector3D) => {
    setVectors(prev => [...prev, v]);
  };

  const handleAddSegment = (s: Segment3D, midpoint?: Point3D) => {
    setSegments(prev => [...prev, s]);
    if (midpoint) {
      setPoints(prev => [...prev, midpoint]);
    }
  };

  const handleAddLine = (l: Line3D, footPoint?: Point3D) => {
    setLines(prev => [...prev, l]);
    if (footPoint) {
      setPoints(prev => [...prev, footPoint]);
    }
  };

  const handleAddPlane = (p: Plane3D) => {
    setPlanes(prev => [...prev, p]);
  };

  const handleDeleteVector = (id: string) => {
    setVectors(prev => prev.filter(v => v.id !== id));
  };

  const handleDeleteSegment = (id: string) => {
    setSegments(prev => prev.filter(s => s.id !== id));
  };

  const handleDeleteLine = (id: string) => {
    setLines(prev => prev.filter(l => l.id !== id));
  };

  const handleDeletePlane = (id: string) => {
    setPlanes(prev => prev.filter(p => p.id !== id));
  };

  const handleTogglePlaneVisibility = (id: string) => {
    setPlanes(prev =>
      prev.map(p => (p.id === id ? { ...p, visible: p.visible === false ? true : false } : p))
    );
  };

  const handleTogglePlaneFill = (id: string) => {
    setPlanes(prev =>
      prev.map(p => (p.id === id ? { ...p, fillColor: p.fillColor === false ? true : false } : p))
    );
  };

  // Quick vector AB creator
  const createVectorFromPoints = (idA: string, idB: string) => {
    const pA = points.find(p => p.id === idA);
    const pB = points.find(p => p.id === idB);
    if (pA && pB) {
      const v: Vector3D = {
        id: `v_${Date.now()}`,
        name: `vec(${pA.name}${pB.name})`,
        from: pA.id,
        to: pB.id,
        x: pB.x - pA.x,
        y: pB.y - pA.y,
        z: pB.z - pA.z,
        color: '#10b981',
      };
      setVectors(prev => [...prev, v]);
    }
  };

  // Quick plane from 3 points (Tạo miền đa giác mặt phẳng tô màu qua 3 điểm)
  const createPlaneFrom3Points = (idA: string, idB: string, idC: string) => {
    const pA = points.find(p => p.id === idA);
    const pB = points.find(p => p.id === idB);
    const pC = points.find(p => p.id === idC);
    if (pA && pB && pC) {
      const pl = planeFrom3Points(pA, pB, pC);
      if (pl) {
        setPlanes(prev => [
          ...prev,
          {
            id: `pl_${Date.now()}`,
            name: `(${pA.name}${pB.name}${pC.name})`,
            a: pl.a,
            b: pl.b,
            c: pl.c,
            d: pl.d,
            pointIds: [pA.id, pB.id, pC.id],
            color: '#38bdf8',
            opacity: 0.35,
            fillColor: true,
            regionOnly: true,
            visible: true,
          },
        ]);
      }
    }
  };

  const getPoint = (id: string) => points.find(p => p.id === id);

  // Render danh sách đối tượng hình học đã dựng
  const renderConstructedObjects = () => (
    <div className="bg-[#0a0a0a] rounded-xl border border-[#222] p-4 shadow-lg shadow-black/40 text-xs space-y-3 font-mono">
      <div className="flex items-center justify-between border-b border-[#222] pb-2">
        <span className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          ĐỐI TƯỢNG ĐÃ DỰNG ({vectors.length + segments.length + lines.length + planes.length})
        </span>
        <span className="text-[10px] text-zinc-500">
          {vectors.length} véc tơ • {segments.length} đoạn • {lines.length} đường • {planes.length} mặt
        </span>
      </div>

      {/* Véc tơ */}
      {vectors.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-zinc-500 font-bold block text-[10px] uppercase text-emerald-400">
            Véc tơ ({vectors.length}):
          </span>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {vectors.map(v => (
              <div
                key={v.id}
                className="bg-[#111] px-2.5 py-1.5 rounded border border-zinc-800 flex justify-between items-center text-[11px]"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: v.color || '#10b981' }}
                  />
                  <span className="font-bold text-zinc-200">{v.name}</span>
                  <span className="text-zinc-400">({v.x}; {v.y}; {v.z})</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteVector(v.id)}
                  className="text-zinc-500 hover:text-red-400 p-1 rounded hover:bg-zinc-800 transition-colors"
                  title="Xóa véc tơ này"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Đoạn thẳng */}
      {segments.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-zinc-800/60">
          <span className="text-zinc-500 font-bold block text-[10px] uppercase text-amber-400">
            Đoạn thẳng ({segments.length}):
          </span>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {segments.map(s => {
              const p1 = points.find(p => p.id === s.point1Id);
              const p2 = points.find(p => p.id === s.point2Id);
              return (
                <div
                  key={s.id}
                  className="bg-[#111] px-2.5 py-1.5 rounded border border-zinc-800 flex justify-between items-center text-[11px]"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: s.color || '#f59e0b' }}
                    />
                    <span className="font-bold text-zinc-200">{s.name}</span>
                    <span className="text-zinc-400">
                      [{p1?.name || '?'}, {p2?.name || '?'}]
                    </span>
                    {s.length && (
                      <span className="text-zinc-500 text-[10px]">d = {s.length.toFixed(2)}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteSegment(s.id)}
                    className="text-zinc-500 hover:text-red-400 p-1 rounded hover:bg-zinc-800 transition-colors"
                    title="Xóa đoạn thẳng này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Đường thẳng */}
      {lines.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-zinc-800/60">
          <span className="text-zinc-500 font-bold block text-[10px] uppercase text-pink-400">
            Đường thẳng ({lines.length}):
          </span>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {lines.map(l => {
              const p1 = points.find(p => p.id === l.point1Id);
              const p2 = points.find(p => p.id === l.point2Id);
              return (
                <div
                  key={l.id}
                  className="bg-[#111] px-2.5 py-1.5 rounded border border-zinc-800 flex justify-between items-center text-[11px]"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: l.color || '#ec4899' }}
                    />
                    <span className="font-bold text-zinc-200 flex-shrink-0">{l.name}</span>
                    {l.dir ? (
                      <span className="text-zinc-400 truncate text-[10px]">
                        u⃗({l.dir.x}; {l.dir.y}; {l.dir.z})
                      </span>
                    ) : (
                      <span className="text-zinc-400 text-[10px]">
                        ({p1?.name || '?'}{p2?.name || '?'})
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteLine(l.id)}
                    className="text-zinc-500 hover:text-red-400 p-1 rounded hover:bg-zinc-800 transition-colors flex-shrink-0"
                    title="Xóa đường thẳng này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mặt phẳng */}
      {planes.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-zinc-800/60">
          <span className="text-zinc-500 font-bold block text-[10px] uppercase text-blue-400">
            Mặt phẳng ({planes.length}):
          </span>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {planes.map(pl => {
              const isVisible = pl.visible !== false;
              const isFilled = pl.fillColor !== false;
              return (
                <div
                  key={pl.id}
                  className={`bg-[#111] px-2.5 py-1.5 rounded border transition-colors flex justify-between items-center text-[11px] ${
                    !isVisible ? 'opacity-40 border-zinc-900' : 'border-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: pl.color || '#38bdf8' }}
                    />
                    <span className="font-bold text-zinc-200">{pl.name}:</span>
                    <span className="text-zinc-300 truncate text-[10px]">{formatPlaneEquation(pl)}</span>
                    {pl.pointIds && pl.pointIds.length >= 3 && pl.regionOnly && (
                      <span className="text-[9px] px-1 py-0.2 bg-blue-950/60 text-blue-300 rounded border border-blue-900/50 flex-shrink-0 font-mono">
                        Miền đa giác
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleTogglePlaneFill(pl.id)}
                      className={`p-1 rounded transition-colors ${
                        isFilled
                          ? 'text-purple-400 hover:bg-purple-950/40'
                          : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800'
                      }`}
                      title={isFilled ? 'Tắt tô màu bề mặt (chỉ hiện khung viền)' : 'Bật tô màu bề mặt'}
                    >
                      <Palette className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTogglePlaneVisibility(pl.id)}
                      className={`p-1 rounded transition-colors ${
                        isVisible
                          ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                          : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800'
                      }`}
                      title={isVisible ? 'Ẩn mặt phẳng này' : 'Hiện mặt phẳng này'}
                    >
                      {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeletePlane(pl.id)}
                      className="text-zinc-500 hover:text-red-400 p-1 rounded hover:bg-zinc-800 transition-colors"
                      title="Xóa mặt phẳng này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Top Presets & Storage Header */}
      <div className="bg-[#0a0a0a] rounded-xl border border-[#222] p-4 shadow-lg shadow-black/40">
        {/* Status notification toast */}
        {statusNotification && (
          <div className="mb-3 p-2 bg-emerald-950/70 border border-emerald-700/60 rounded-lg text-emerald-200 text-xs font-mono flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{statusNotification}</span>
            </div>
            <span className="text-[10px] text-emerald-400/80 bg-emerald-900/50 px-2 py-0.5 rounded">Offline-Safe</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-[#222] pb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-blue-400 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-900/50">
              3D OXYZ WORKSPACE
            </span>

            {/* Indicator of currently active figure */}
            {activeFigureName ? (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-950/70 text-blue-300 border border-blue-800/60 font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span>Đang mở: <strong>{activeFigureName}</strong></span>
              </span>
            ) : (
              <span className="text-xs text-zinc-400 font-mono hidden sm:inline">
                Nhập tọa độ điểm (x; y; z), dựng đường thẳng, mặt phẳng & tính toán
              </span>
            )}
          </div>

          {/* Action Strip: Presets + Save + Saved Figures Library */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Reset to Blank Button */}
            <button
              type="button"
              onClick={handleResetToInitial}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 border border-rose-800/60 font-mono text-xs font-semibold transition-all active:scale-95 shadow-sm"
              title="Đưa về trạng thái ban đầu: Làm trống cửa sổ không có hình nào cả"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span>Về ban đầu</span>
            </button>

            {/* 2D Unfolding Button */}
            <button
              type="button"
              onClick={() => {
                setUnfoldTargetScene(null);
                setIsUnfoldModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-700/70 font-mono text-xs font-semibold transition-all active:scale-95 shadow-sm shadow-indigo-950/40"
              title="Mở bộ điều khiển trải phẳng 2D cho các đối tượng hình học 3D (bản vẽ Net & mô phỏng gấp mở)"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Trải phẳng 2D</span>
            </button>

            {/* Quick Save Current Figure */}
            <button
              type="button"
              onClick={handleQuickSaveCurrent}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-all shadow-sm active:scale-95"
              title="Lưu hình 3D này vào thiết bị để không bao giờ mất khi mất mạng hoặc tải lại trang"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu hình 3D</span>
            </button>

            {/* Saved Library Modal Trigger */}
            <button
              type="button"
              onClick={() => {
                setSavedFiguresCount(getSavedScenes().length);
                setIsSavedFiguresModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border border-blue-800/70 font-mono text-xs font-semibold transition-colors"
              title="Xem và quản lý tất cả hình 3D đã lưu (chỉnh sửa, xóa, nhân bản, xuất/nhập tệp)"
            >
              <FolderHeart className="w-3.5 h-3.5 text-blue-400" />
              <span>Thư viện hình đã lưu ({savedFiguresCount})</span>
            </button>

            {/* Presets dropdown */}
            <div className="flex items-center gap-1.5 pl-1 border-l border-zinc-800">
              <span className="text-[11px] font-mono text-zinc-500 uppercase hidden sm:inline">Mẫu:</span>
              <select
                onChange={e => {
                  if (e.target.value === '__EMPTY__') {
                    handleResetToInitial();
                    return;
                  }
                  const found = OXYZ_PRESETS.find(p => p.name === e.target.value);
                  if (found) applyPreset(found);
                }}
                defaultValue={OXYZ_PRESETS[1].name}
                className="text-xs bg-[#111] border border-zinc-800 rounded px-2 py-1 text-zinc-300 font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="__EMPTY__">[ Cửa sổ trống - Về ban đầu ]</option>
                {OXYZ_PRESETS.map(p => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Add Point Form & Current Points Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
          {/* Form to add a point */}
          <form
            onSubmit={handleAddPoint}
            className="lg:col-span-6 flex flex-wrap items-center gap-2 bg-[#111] p-2.5 rounded border border-zinc-800 text-xs font-mono"
          >
            <span className="text-zinc-400 font-semibold text-[11px] uppercase">Thêm điểm:</span>
            <input
              type="text"
              value={newPointName}
              onChange={e => setNewPointName(e.target.value)}
              placeholder="Tên"
              maxLength={3}
              className="w-12 px-2 py-1 bg-[#18181b] border border-zinc-700 text-white rounded text-center font-bold"
            />
            <div className="flex items-center gap-1 font-mono">
              <span className="text-zinc-600">(</span>
              <input
                type="number"
                step="0.5"
                value={newPointX}
                onChange={e => setNewPointX(Number(e.target.value))}
                placeholder="x"
                className="w-12 px-1 py-1 bg-[#18181b] border border-zinc-700 text-white rounded text-center text-xs"
              />
              <span className="text-zinc-600">;</span>
              <input
                type="number"
                step="0.5"
                value={newPointY}
                onChange={e => setNewPointY(Number(e.target.value))}
                placeholder="y"
                className="w-12 px-1 py-1 bg-[#18181b] border border-zinc-700 text-white rounded text-center text-xs"
              />
              <span className="text-zinc-600">;</span>
              <input
                type="number"
                step="0.5"
                value={newPointZ}
                onChange={e => setNewPointZ(Number(e.target.value))}
                placeholder="z"
                className="w-12 px-1 py-1 bg-[#18181b] border border-zinc-700 text-white rounded text-center text-xs"
              />
              <span className="text-zinc-600">)</span>
            </div>

            <button
              type="submit"
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs uppercase tracking-wider font-bold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm</span>
            </button>
          </form>

          {/* List of points chips */}
          <div className="lg:col-span-6 flex flex-wrap items-center gap-1.5 max-h-24 overflow-y-auto">
            {points.map(p => (
              <div
                key={p.id}
                onClick={() => setSelectedPointId(p.id === selectedPointId ? null : p.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono cursor-pointer transition-all ${
                  selectedPointId === p.id
                    ? 'bg-blue-950/80 border-blue-500 text-blue-300 font-bold shadow-sm'
                    : 'bg-[#111] border-zinc-800 text-zinc-300 hover:border-zinc-700'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: p.color || '#3b82f6' }}
                />
                <span>
                  {p.name}({p.x}; {p.y}; {p.z})
                </span>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    handleDeletePoint(p.id);
                  }}
                  className="text-zinc-500 hover:text-red-400 ml-1"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN STAGE: 3D Canvas (7 cols) + Máy tính hình học & Danh sách đối tượng (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 3D Canvas (7 cols) */}
        <div className="lg:col-span-7 min-h-[520px]">
          <Canvas3D
            points={points}
            vectors={vectors}
            segments={segments}
            lines={lines}
            planes={planes}
            solids={solids}
            selectedPointId={selectedPointId}
            onSelectPoint={setSelectedPointId}
            onResetToInitial={handleResetToInitial}
            onOpenUnfold={() => {
              setUnfoldTargetScene(null);
              setIsUnfoldModalOpen(true);
            }}
            foldProgress={sharedFoldProgress}
            onFoldProgressChange={setSharedFoldProgress}
          />
        </div>

        {/* Cột chứa Máy tính hình học OXYZ & Danh sách đối tượng (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Calculator Tabs */}
          <div className="bg-[#0a0a0a] rounded-xl border border-[#222] p-4 shadow-lg shadow-black/40">
            <div className="flex items-center justify-between border-b border-[#222] pb-2 mb-3">
              <span className="font-mono font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-blue-400" />
                MÁY TÍNH HÌNH HỌC OXYZ
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCalcTab('construct')}
                  className={`px-2.5 py-1 text-xs rounded font-mono font-medium transition-colors flex items-center gap-1 ${
                    calcTab === 'construct'
                      ? 'bg-blue-600 text-white'
                      : 'text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  Dựng Hình
                </button>
                <button
                  onClick={() => setCalcTab('angle')}
                  className={`px-2.5 py-1 text-xs rounded font-mono font-medium transition-colors ${
                    calcTab === 'angle'
                      ? 'bg-blue-600 text-white'
                      : 'text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  Góc
                </button>
                <button
                  onClick={() => setCalcTab('distance')}
                  className={`px-2.5 py-1 text-xs rounded font-mono font-medium transition-colors ${
                    calcTab === 'distance'
                      ? 'bg-blue-600 text-white'
                      : 'text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  Khoảng Cách
                </button>
                <button
                  onClick={() => setCalcTab('volume')}
                  className={`px-2.5 py-1 text-xs rounded font-mono font-medium transition-colors ${
                    calcTab === 'volume'
                      ? 'bg-blue-600 text-white'
                      : 'text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  Thể Tích
                </button>
              </div>
            </div>

            {/* TAB 0: CÔNG CỤ DỰNG HÌNH HỌC (VÉC TƠ, ĐOẠN THẲNG, ĐƯỜNG THẲNG, MẶT PHẲNG) */}
            {calcTab === 'construct' && (
              <GeometryConstructionPanel
                points={points}
                vectors={vectors}
                segments={segments}
                lines={lines}
                planes={planes}
                onAddVector={handleAddVector}
                onAddSegment={handleAddSegment}
                onAddLine={handleAddLine}
                onAddPlane={handleAddPlane}
                onAddPoint={pt => setPoints(prev => [...prev, pt])}
              />
            )}

            {/* TAB 1: TÍNH GÓC */}
            {calcTab === 'angle' && (
              <div className="space-y-3 text-xs">
                <div className="flex gap-1 border-b border-[#222] pb-2">
                  {[
                    { id: 'vec_vec', label: '2 Véc tơ' },
                    { id: 'line_line', label: '2 Đường thẳng' },
                    { id: 'line_plane', label: 'Đường & Mặt' },
                    { id: 'plane_plane', label: '2 Mặt phẳng' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setAngleMode(tab.id as any)}
                      className={`px-2 py-1 rounded text-[11px] font-mono font-medium transition-colors ${
                        angleMode === tab.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-[#111] text-zinc-400 hover:bg-zinc-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Sub-mode: 2 Véc tơ */}
                {angleMode === 'vec_vec' && (() => {
                  const deg = angleBetweenVectors(vec1Input, vec2Input);
                  return (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 font-mono">
                        <div>
                          <span className="text-zinc-400 block mb-1 text-[11px]">Véc tơ u⃗:</span>
                          <div className="flex gap-1">
                            <input
                              type="number"
                              value={vec1Input.x}
                              onChange={e => setVec1Input({ ...vec1Input, x: Number(e.target.value) })}
                              className="w-full bg-[#111] border border-zinc-800 text-white px-1.5 py-1 rounded text-center"
                            />
                            <input
                              type="number"
                              value={vec1Input.y}
                              onChange={e => setVec1Input({ ...vec1Input, y: Number(e.target.value) })}
                              className="w-full bg-[#111] border border-zinc-800 text-white px-1.5 py-1 rounded text-center"
                            />
                            <input
                              type="number"
                              value={vec1Input.z}
                              onChange={e => setVec1Input({ ...vec1Input, z: Number(e.target.value) })}
                              className="w-full bg-[#111] border border-zinc-800 text-white px-1.5 py-1 rounded text-center"
                            />
                          </div>
                        </div>
                        <div>
                          <span className="text-zinc-400 block mb-1 text-[11px]">Véc tơ v⃗:</span>
                          <div className="flex gap-1">
                            <input
                              type="number"
                              value={vec2Input.x}
                              onChange={e => setVec2Input({ ...vec2Input, x: Number(e.target.value) })}
                              className="w-full bg-[#111] border border-zinc-800 text-white px-1.5 py-1 rounded text-center"
                            />
                            <input
                              type="number"
                              value={vec2Input.y}
                              onChange={e => setVec2Input({ ...vec2Input, y: Number(e.target.value) })}
                              className="w-full bg-[#111] border border-zinc-800 text-white px-1.5 py-1 rounded text-center"
                            />
                            <input
                              type="number"
                              value={vec2Input.z}
                              onChange={e => setVec2Input({ ...vec2Input, z: Number(e.target.value) })}
                              className="w-full bg-[#111] border border-zinc-800 text-white px-1.5 py-1 rounded text-center"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-[#111] rounded border border-zinc-800 flex justify-between items-center font-mono">
                        <span className="text-zinc-400">Góc giữa 2 véc tơ:</span>
                        <span className="text-base text-blue-400 font-bold">
                          {deg.toFixed(2)}°
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Sub-mode: 2 Đường thẳng */}
                {angleMode === 'line_line' && (() => {
                  const p1 = getPoint(line1P1) || points[0];
                  const p2 = getPoint(line1P2) || points[1];
                  const p3 = getPoint(line2P1) || points[2];
                  const p4 = getPoint(line2P2) || points[3];
                  const u1 = p1 && p2 ? vec.fromPoints(p1, p2) : { x: 1, y: 0, z: 0 };
                  const u2 = p3 && p4 ? vec.fromPoints(p3, p4) : { x: 0, y: 1, z: 0 };
                  const deg = angleBetweenLines(u1, u2);
                  return (
                    <div className="space-y-2 font-mono">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-zinc-400 block mb-1 text-[11px]">Đường thẳng d₁:</span>
                          <div className="flex gap-1">
                            <select
                              value={line1P1}
                              onChange={e => setLine1P1(e.target.value)}
                              className="w-full bg-[#111] border border-zinc-800 text-white rounded p-1"
                            >
                              {points.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <select
                              value={line1P2}
                              onChange={e => setLine1P2(e.target.value)}
                              className="w-full bg-[#111] border border-zinc-800 text-white rounded p-1"
                            >
                              {points.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          </div>
                        </div>
                        <div>
                          <span className="text-zinc-400 block mb-1 text-[11px]">Đường thẳng d₂:</span>
                          <div className="flex gap-1">
                            <select
                              value={line2P1}
                              onChange={e => setLine2P1(e.target.value)}
                              className="w-full bg-[#111] border border-zinc-800 text-white rounded p-1"
                            >
                              {points.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <select
                              value={line2P2}
                              onChange={e => setLine2P2(e.target.value)}
                              className="w-full bg-[#111] border border-zinc-800 text-white rounded p-1"
                            >
                              {points.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-[#111] rounded border border-zinc-800 space-y-1">
                        <div className="text-zinc-400 text-[11px]">
                          VTCP d₁: ({u1.x}; {u1.y}; {u1.z}) | VTCP d₂: ({u2.x}; {u2.y}; {u2.z})
                        </div>
                        <div className="text-xs font-bold text-white flex items-center justify-between border-t border-zinc-900 pt-1.5">
                          <span className="text-zinc-400">Góc giữa 2 đường thẳng:</span>
                          <span className="text-base text-blue-400">{deg.toFixed(2)}°</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Sub-mode: Đường & Mặt */}
                {angleMode === 'line_plane' && (() => {
                  const p1 = getPoint(line1P1) || points[0];
                  const p2 = getPoint(line1P2) || points[1];
                  const u = p1 && p2 ? vec.fromPoints(p1, p2) : { x: 1, y: 0, z: 0 };
                  const n = { x: planeNorm1.a, y: planeNorm1.b, z: planeNorm1.c };
                  const deg = angleLineAndPlane(u, n);
                  return (
                    <div className="space-y-2 font-mono">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-zinc-400 block mb-1 text-[11px]">Đường thẳng:</span>
                          <div className="flex gap-1">
                            <select
                              value={line1P1}
                              onChange={e => setLine1P1(e.target.value)}
                              className="w-full bg-[#111] border border-zinc-800 text-white rounded p-1"
                            >
                              {points.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <select
                              value={line1P2}
                              onChange={e => setLine1P2(e.target.value)}
                              className="w-full bg-[#111] border border-zinc-800 text-white rounded p-1"
                            >
                              {points.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          </div>
                        </div>
                        <div>
                          <span className="text-zinc-400 block mb-1 text-[11px]">VTPT (P) n⃗(A; B; C):</span>
                          <div className="flex gap-1">
                            <input
                              type="number"
                              value={planeNorm1.a}
                              onChange={e => setPlaneNorm1({ ...planeNorm1, a: Number(e.target.value) })}
                              className="w-full bg-[#111] border border-zinc-800 text-white rounded p-1 text-center"
                            />
                            <input
                              type="number"
                              value={planeNorm1.b}
                              onChange={e => setPlaneNorm1({ ...planeNorm1, b: Number(e.target.value) })}
                              className="w-full bg-[#111] border border-zinc-800 text-white rounded p-1 text-center"
                            />
                            <input
                              type="number"
                              value={planeNorm1.c}
                              onChange={e => setPlaneNorm1({ ...planeNorm1, c: Number(e.target.value) })}
                              className="w-full bg-[#111] border border-zinc-800 text-white rounded p-1 text-center"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-[#111] rounded border border-zinc-800 flex justify-between items-center">
                        <span className="text-zinc-400">Góc giữa đường thẳng & mặt phẳng:</span>
                        <span className="text-base text-blue-400 font-bold">{deg.toFixed(2)}°</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Sub-mode: 2 Mặt phẳng */}
                {angleMode === 'plane_plane' && (() => {
                  const n1 = { x: planeNorm1.a, y: planeNorm1.b, z: planeNorm1.c };
                  const n2 = { x: planeNorm2.a, y: planeNorm2.b, z: planeNorm2.c };
                  const deg = angleBetweenPlanes(n1, n2);
                  return (
                    <div className="space-y-2 font-mono">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-zinc-400 block mb-1 text-[11px]">VTPT (P) n⃗₁:</span>
                          <div className="flex gap-1">
                            <input
                              type="number"
                              value={planeNorm1.a}
                              onChange={e => setPlaneNorm1({ ...planeNorm1, a: Number(e.target.value) })}
                              className="w-full bg-[#111] border border-zinc-800 text-white rounded p-1 text-center"
                            />
                            <input
                              type="number"
                              value={planeNorm1.b}
                              onChange={e => setPlaneNorm1({ ...planeNorm1, b: Number(e.target.value) })}
                              className="w-full bg-[#111] border border-zinc-800 text-white rounded p-1 text-center"
                            />
                            <input
                              type="number"
                              value={planeNorm1.c}
                              onChange={e => setPlaneNorm1({ ...planeNorm1, c: Number(e.target.value) })}
                              className="w-full bg-[#111] border border-zinc-800 text-white rounded p-1 text-center"
                            />
                          </div>
                        </div>
                        <div>
                          <span className="text-zinc-400 block mb-1 text-[11px]">VTPT (Q) n⃗₂:</span>
                          <div className="flex gap-1">
                            <input
                              type="number"
                              value={planeNorm2.a}
                              onChange={e => setPlaneNorm2({ ...planeNorm2, a: Number(e.target.value) })}
                              className="w-full bg-[#111] border border-zinc-800 text-white rounded p-1 text-center"
                            />
                            <input
                              type="number"
                              value={planeNorm2.b}
                              onChange={e => setPlaneNorm2({ ...planeNorm2, b: Number(e.target.value) })}
                              className="w-full bg-[#111] border border-zinc-800 text-white rounded p-1 text-center"
                            />
                            <input
                              type="number"
                              value={planeNorm2.c}
                              onChange={e => setPlaneNorm2({ ...planeNorm2, c: Number(e.target.value) })}
                              className="w-full bg-[#111] border border-zinc-800 text-white rounded p-1 text-center"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-[#111] rounded border border-zinc-800 flex justify-between items-center">
                        <span className="text-zinc-400">Góc giữa 2 mặt phẳng:</span>
                        <span className="text-base text-blue-400 font-bold">{deg.toFixed(2)}°</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* TAB 2: TÍNH KHOẢNG CÁCH */}
            {calcTab === 'distance' && (
              <div className="space-y-3 text-xs font-mono">
                <div className="flex gap-1 border-b border-[#222] pb-2">
                  {[
                    { id: 'pt_pt', label: 'Điểm - Điểm' },
                    { id: 'pt_plane', label: 'Điểm - M.Phẳng' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setDistMode(tab.id as any)}
                      className={`px-2 py-1 rounded text-[11px] font-mono font-medium transition-colors ${
                        distMode === tab.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-[#111] text-zinc-400 hover:bg-zinc-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {distMode === 'pt_pt' && (() => {
                  const pA = getPoint(distPt1) || points[0];
                  const pB = getPoint(distPt2) || points[1];
                  const d = pA && pB ? distancePoints(pA, pB) : 0;
                  return (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-zinc-400 block mb-1 text-[11px]">Điểm A:</span>
                          <select
                            value={distPt1}
                            onChange={e => setDistPt1(e.target.value)}
                            className="w-full bg-[#111] border border-zinc-800 text-white rounded p-1 font-semibold"
                          >
                            {points.map(p => <option key={p.id} value={p.id}>{p.name}({p.x}; {p.y}; {p.z})</option>)}
                          </select>
                        </div>
                        <div>
                          <span className="text-zinc-400 block mb-1 text-[11px]">Điểm B:</span>
                          <select
                            value={distPt2}
                            onChange={e => setDistPt2(e.target.value)}
                            className="w-full bg-[#111] border border-zinc-800 text-white rounded p-1 font-semibold"
                          >
                            {points.map(p => <option key={p.id} value={p.id}>{p.name}({p.x}; {p.y}; {p.z})</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="p-3 bg-[#111] rounded border border-zinc-800 flex justify-between items-center">
                        <span className="text-zinc-400">d({pA?.name}, {pB?.name}):</span>
                        <span className="text-base text-emerald-400 font-bold">{d.toFixed(3)}</span>
                      </div>
                    </div>
                  );
                })()}

                {distMode === 'pt_plane' && (() => {
                  const pM = getPoint(distPt1) || points[0];
                  const d = pM ? distancePointToPlane(pM, planeNorm1) : 0;
                  return (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-zinc-400 block mb-1 text-[11px]">Điểm M:</span>
                          <select
                            value={distPt1}
                            onChange={e => setDistPt1(e.target.value)}
                            className="w-full bg-[#111] border border-zinc-800 text-white rounded p-1"
                          >
                            {points.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <span className="text-zinc-400 block mb-1 text-[11px]">Mặt phẳng (P): Ax+By+Cz+D=0</span>
                          <div className="flex gap-1 font-mono">
                            <input
                              type="number"
                              value={planeNorm1.a}
                              onChange={e => setPlaneNorm1({ ...planeNorm1, a: Number(e.target.value) })}
                              className="w-full bg-[#111] border border-zinc-800 text-white rounded p-1 text-center"
                              title="A"
                            />
                            <input
                              type="number"
                              value={planeNorm1.b}
                              onChange={e => setPlaneNorm1({ ...planeNorm1, b: Number(e.target.value) })}
                              className="w-full bg-[#111] border border-zinc-800 text-white rounded p-1 text-center"
                              title="B"
                            />
                            <input
                              type="number"
                              value={planeNorm1.c}
                              onChange={e => setPlaneNorm1({ ...planeNorm1, c: Number(e.target.value) })}
                              className="w-full bg-[#111] border border-zinc-800 text-white rounded p-1 text-center"
                              title="C"
                            />
                            <input
                              type="number"
                              value={planeNorm1.d}
                              onChange={e => setPlaneNorm1({ ...planeNorm1, d: Number(e.target.value) })}
                              className="w-full bg-[#111] border border-zinc-800 text-white rounded p-1 text-center"
                              title="D"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-[#111] rounded border border-zinc-800 flex justify-between items-center">
                        <span className="text-zinc-400">d({pM?.name}, (P)):</span>
                        <span className="text-base text-emerald-400 font-bold">{d.toFixed(3)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* TAB 3: THỂ TÍCH & DIỆN TÍCH KHỐI 3D */}
            {calcTab === 'volume' && (() => {
              const pA = getPoint(volTetraA) || points[0];
              const pB = getPoint(volTetraB) || points[1];
              const pC = getPoint(volTetraC) || points[2];
              const pD = getPoint(volTetraD) || points[3];
              const vTetra = (pA && pB && pC && pD) ? volumeTetrahedron(pA, pB, pC, pD) : 0;

              const nameA = pA?.name || 'A';
              const nameB = pB?.name || 'B';
              const nameC = pC?.name || 'C';
              const nameD = pD?.name || 'D';

              const vSphere = (4 / 3) * Math.PI * Math.pow(sphereR, 3);
              const sSphere = 4 * Math.PI * Math.pow(sphereR, 2);
              const vCylinder = Math.PI * Math.pow(cylR, 2) * cylH;
              const sXqCylinder = 2 * Math.PI * cylR * cylH;

              const coneL = Math.sqrt(Math.pow(coneR, 2) + Math.pow(coneH, 2));
              const vCone = (1 / 3) * Math.PI * Math.pow(coneR, 2) * coneH;
              const sXqCone = Math.PI * coneR * coneL;
              const sTpCone = Math.PI * coneR * (coneL + coneR);

              return (
                <div className="space-y-3 text-xs font-mono">
                  {/* Tứ diện */}
                  <div className="p-3 bg-[#111] rounded border border-zinc-800 space-y-2">
                    <span className="text-zinc-400 font-semibold block text-[11px] uppercase">
                      1. Thể tích Tứ diện {nameA}{nameB}{nameC}{nameD}:
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                      <select
                        value={volTetraA}
                        onChange={e => setVolTetraA(e.target.value)}
                        className="bg-[#18181b] border border-zinc-700 text-white rounded p-1 text-center font-bold"
                      >
                        {points.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <select
                        value={volTetraB}
                        onChange={e => setVolTetraB(e.target.value)}
                        className="bg-[#18181b] border border-zinc-700 text-white rounded p-1 text-center font-bold"
                      >
                        {points.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <select
                        value={volTetraC}
                        onChange={e => setVolTetraC(e.target.value)}
                        className="bg-[#18181b] border border-zinc-700 text-white rounded p-1 text-center font-bold"
                      >
                        {points.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <select
                        value={volTetraD}
                        onChange={e => setVolTetraD(e.target.value)}
                        className="bg-[#18181b] border border-zinc-700 text-white rounded p-1 text-center font-bold"
                      >
                        {points.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>

                    <div className="text-zinc-300 bg-[#0a0a0a] p-2.5 rounded border border-zinc-800 flex flex-wrap justify-between items-center gap-2">
                      <div className="text-sm font-mono text-zinc-100">
                        <KatexMath
                          math={`V_{${nameA}${nameB}${nameC}${nameD}} = \\frac{1}{6} \\left| \\left[ \\overrightarrow{${nameA}${nameB}}, \\overrightarrow{${nameA}${nameC}} \\right] \\cdot \\overrightarrow{${nameA}${nameD}} \\right|`}
                        />
                      </div>
                      <span className="text-base text-emerald-400 font-bold">{vTetra.toFixed(3)} u³</span>
                    </div>
                  </div>

                  {/* Mặt cầu, Hình trụ & Hình nón */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="p-2.5 bg-[#111] rounded border border-zinc-800 space-y-1">
                      <span className="text-zinc-400 block text-[11px] uppercase">Cầu (R = {sphereR}):</span>
                      <div className="text-pink-400 font-bold">
                        V = {vSphere.toFixed(2)} u³
                      </div>
                      <div className="text-zinc-500 text-[10px]">
                        S_mặt = {sSphere.toFixed(2)} u²
                      </div>
                    </div>

                    <div className="p-2.5 bg-[#111] rounded border border-zinc-800 space-y-1">
                      <span className="text-zinc-400 block text-[11px] uppercase">Trụ (R={cylR}, h={cylH}):</span>
                      <div className="text-emerald-400 font-bold">
                        V = {vCylinder.toFixed(2)} u³
                      </div>
                      <div className="text-zinc-500 text-[10px]">
                        S_xq = {sXqCylinder.toFixed(2)} u²
                      </div>
                    </div>

                    <div className="p-2.5 bg-[#111] rounded border border-zinc-800 space-y-1">
                      <span className="text-amber-400 block text-[11px] uppercase font-semibold">Nón (R={coneR}, h={coneH}):</span>
                      <div className="text-amber-300 font-bold">
                        V = {vCone.toFixed(2)} u³
                      </div>
                      <div className="text-zinc-500 text-[10px] truncate" title={`Đường sinh l = ${coneL.toFixed(2)}, S_xq = ${sXqCone.toFixed(2)}, S_tp = ${sTpCone.toFixed(2)}`}>
                        l = {coneL.toFixed(2)} • S_xq = {sXqCone.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Danh sách đối tượng nằm bên dưới Máy tính ở cột 5 */}
          {renderConstructedObjects()}
        </div>
      </div>

      {/* Modal Quản lý & Lưu Trữ Hình 3D (100% Offline-Safe) */}
      <SavedFiguresModal
        isOpen={isSavedFiguresModalOpen}
        onClose={() => {
          setIsSavedFiguresModalOpen(false);
          setSavedFiguresCount(getSavedScenes().length);
        }}
        currentPoints={points}
        currentVectors={vectors}
        currentSegments={segments}
        currentLines={lines}
        currentPlanes={planes}
        currentSolids={solids}
        activeFigureId={activeFigureId}
        activeFigureName={activeFigureName}
        onLoadFigure={handleLoadFigure}
        onSetActiveFigureInfo={(id, name) => {
          setActiveFigureId(id);
          setActiveFigureName(name);
        }}
        onOpenUnfoldForScene={scene => {
          setUnfoldTargetScene(scene);
          setIsUnfoldModalOpen(true);
        }}
      />

      {/* Modal Trải Phẳng 2D Cho Tất Cả Các Đối Tượng Hình 3D */}
      <Unfold2DModal
        isOpen={isUnfoldModalOpen}
        onClose={() => {
          setIsUnfoldModalOpen(false);
          setUnfoldTargetScene(null);
        }}
        currentPoints={points}
        currentSolids={solids}
        currentFigureName={activeFigureName}
        initialTargetScene={unfoldTargetScene}
      />
    </div>
  );
};
