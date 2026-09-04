import React, { useState, useMemo } from 'react';
import {
  MoveUpRight,
  Minus,
  Maximize2,
  Layers,
  Plus,
  Check,
  AlertCircle,
  Sparkles,
  Palette,
} from 'lucide-react';
import { Point3D, Vector3D, Segment3D, Line3D, Plane3D } from '../../types/math';
import {
  vec,
  planeFrom3Points,
  planeFrom4Points,
  formatPlaneEquation,
  formatLineParametricLatex,
  formatLineCanonical,
  projectPointOnLine,
  orthogonalVector,
  VectorXYZ,
} from '../../utils/oxyzMath';
import { KatexMath } from '../common/KatexMath';

interface GeometryConstructionPanelProps {
  points: Point3D[];
  vectors: Vector3D[];
  segments: Segment3D[];
  lines: Line3D[];
  planes: Plane3D[];
  onAddVector: (v: Vector3D) => void;
  onAddSegment: (s: Segment3D, midpoint?: Point3D) => void;
  onAddLine: (l: Line3D, footPoint?: Point3D) => void;
  onAddPlane: (p: Plane3D) => void;
  onAddPoint: (p: Point3D) => void;
}

const COLOR_OPTIONS = [
  { label: 'Xanh ngọc', value: '#10b981' },
  { label: 'Xanh dương', value: '#3b82f6' },
  { label: 'Cam vàng', value: '#f59e0b' },
  { label: 'Hồng sen', value: '#ec4899' },
  { label: 'Tím hoa', value: '#8b5cf6' },
  { label: 'Xanh lam', value: '#06b6d4' },
];

export const GeometryConstructionPanel: React.FC<GeometryConstructionPanelProps> = ({
  points,
  vectors,
  segments: _segments,
  lines,
  planes,
  onAddVector,
  onAddSegment,
  onAddLine,
  onAddPlane,
  onAddPoint: _onAddPoint,
}) => {
  // Main tool type: vector | segment | line | plane
  const [toolCategory, setToolCategory] = useState<'vector' | 'segment' | 'line' | 'plane'>('vector');

  // Success flash message
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const flashSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // -------------------------------------------------------------
  // 1. TOOL: VÉC TƠ TỪ 2 ĐIỂM
  // -------------------------------------------------------------
  const [vecStartId, setVecStartId] = useState<string>(points[0]?.id || '');
  const [vecEndId, setVecEndId] = useState<string>(points[1]?.id || points[0]?.id || '');
  const [vecColor, setVecColor] = useState<string>('#10b981');
  const [vecName, setVecName] = useState<string>('');

  const pStart = points.find(p => p.id === vecStartId) || points[0];
  const pEnd = points.find(p => p.id === vecEndId) || points[1];

  const calculatedVec = useMemo(() => {
    if (!pStart || !pEnd) return null;
    const dx = Number((pEnd.x - pStart.x).toFixed(4));
    const dy = Number((pEnd.y - pStart.y).toFixed(4));
    const dz = Number((pEnd.z - pStart.z).toFixed(4));
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return { dx, dy, dz, length };
  }, [pStart, pEnd]);

  const handleCreateVector = () => {
    if (!pStart || !pEnd) return;
    if (pStart.id === pEnd.id) {
      alert('Vui lòng chọn 2 điểm phân biệt để dựng véc tơ!');
      return;
    }
    const name = vecName.trim() || `vec(${pStart.name}${pEnd.name})`;
    const newV: Vector3D = {
      id: `v_${Date.now()}`,
      name,
      from: pStart.id,
      to: pEnd.id,
      x: calculatedVec?.dx || 0,
      y: calculatedVec?.dy || 0,
      z: calculatedVec?.dz || 0,
      color: vecColor,
    };
    onAddVector(newV);
    flashSuccess(`Đã dựng thành công véc tơ ${name}!`);
    setVecName('');
  };

  // -------------------------------------------------------------
  // 2. TOOL: ĐOẠN THẲNG QUA 2 ĐIỂM
  // -------------------------------------------------------------
  const [segP1Id, setSegP1Id] = useState<string>(points[0]?.id || '');
  const [segP2Id, setSegP2Id] = useState<string>(points[1]?.id || points[0]?.id || '');
  const [segColor, setSegColor] = useState<string>('#f59e0b');
  const [segName, setSegName] = useState<string>('');
  const [segAddMidpoint, setSegAddMidpoint] = useState<boolean>(true);

  const pSeg1 = points.find(p => p.id === segP1Id) || points[0];
  const pSeg2 = points.find(p => p.id === segP2Id) || points[1];

  const calculatedSeg = useMemo(() => {
    if (!pSeg1 || !pSeg2) return null;
    const dx = pSeg2.x - pSeg1.x;
    const dy = pSeg2.y - pSeg1.y;
    const dz = pSeg2.z - pSeg1.z;
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const mid = {
      x: Number(((pSeg1.x + pSeg2.x) / 2).toFixed(4)),
      y: Number(((pSeg1.y + pSeg2.y) / 2).toFixed(4)),
      z: Number(((pSeg1.z + pSeg2.z) / 2).toFixed(4)),
    };
    return { length, mid };
  }, [pSeg1, pSeg2]);

  const handleCreateSegment = () => {
    if (!pSeg1 || !pSeg2) return;
    if (pSeg1.id === pSeg2.id) {
      alert('Vui lòng chọn 2 điểm phân biệt để tạo đoạn thẳng!');
      return;
    }
    const name = segName.trim() || `${pSeg1.name}${pSeg2.name}`;
    const newSeg: Segment3D = {
      id: `seg_${Date.now()}`,
      name,
      point1Id: pSeg1.id,
      point2Id: pSeg2.id,
      color: segColor,
      length: calculatedSeg?.length,
    };

    let midPt: Point3D | undefined = undefined;
    if (segAddMidpoint && calculatedSeg) {
      midPt = {
        id: `pt_mid_${Date.now()}`,
        name: `M_${pSeg1.name}${pSeg2.name}`,
        x: calculatedSeg.mid.x,
        y: calculatedSeg.mid.y,
        z: calculatedSeg.mid.z,
        color: segColor,
      };
    }

    onAddSegment(newSeg, midPt);
    flashSuccess(`Đã dựng đoạn thẳng ${name} (độ dài: ${calculatedSeg?.length.toFixed(2)})!`);
    setSegName('');
  };

  // -------------------------------------------------------------
  // 3. TOOL: ĐƯỜNG THẲNG
  // 4 chế độ: qua 2 điểm | qua 1 điểm + VTCP | song song | vuông góc
  // -------------------------------------------------------------
  const [lineMode, setLineMode] = useState<'2points' | 'point_dir' | 'point_parallel' | 'point_perp'>('2points');
  const [lineP1Id, setLineP1Id] = useState<string>(points[0]?.id || '');
  const [lineP2Id, setLineP2Id] = useState<string>(points[1]?.id || points[0]?.id || '');
  const [linePassPtId, setLinePassPtId] = useState<string>(points[0]?.id || '');
  const [lineDirVec, setLineDirVec] = useState<VectorXYZ>({ x: 2, y: 1, z: 3 });
  const [lineRefLineId, setLineRefLineId] = useState<string>(lines[0]?.id || '');
  const [linePerpAddFoot, setLinePerpAddFoot] = useState<boolean>(true);
  const [lineColor, setLineColor] = useState<string>('#ec4899');
  const [lineName, setLineName] = useState<string>('');

  // Determine line's passing point and direction based on mode
  const calculatedLineData = useMemo(() => {
    let passPoint: Point3D | null = null;
    let dir: VectorXYZ = { x: 0, y: 0, z: 0 };
    let footPoint: Point3D | null = null;
    let perpDistance: number | null = null;
    let desc = '';

    if (lineMode === '2points') {
      const p1 = points.find(p => p.id === lineP1Id);
      const p2 = points.find(p => p.id === lineP2Id);
      if (p1 && p2 && p1.id !== p2.id) {
        passPoint = p1;
        dir = {
          x: Number((p2.x - p1.x).toFixed(4)),
          y: Number((p2.y - p1.y).toFixed(4)),
          z: Number((p2.z - p1.z).toFixed(4)),
        };
        desc = `Đường thẳng qua 2 điểm ${p1.name} và ${p2.name}`;
      }
    } else if (lineMode === 'point_dir') {
      const p = points.find(p => p.id === linePassPtId);
      if (p) {
        passPoint = p;
        dir = lineDirVec;
        desc = `Đường thẳng qua ${p.name} có VTCP u⃗(${dir.x}; ${dir.y}; ${dir.z})`;
      }
    } else if (lineMode === 'point_parallel') {
      const p = points.find(p => p.id === linePassPtId);
      const refLine = lines.find(l => l.id === lineRefLineId);
      if (p && refLine) {
        passPoint = p;
        // Find direction of ref line
        if (refLine.point1Id && refLine.point2Id) {
          const rp1 = points.find(pt => pt.id === refLine.point1Id);
          const rp2 = points.find(pt => pt.id === refLine.point2Id);
          if (rp1 && rp2) {
            dir = { x: rp2.x - rp1.x, y: rp2.y - rp1.y, z: rp2.z - rp1.z };
          }
        } else if (refLine.dir) {
          dir = { ...refLine.dir };
        }
        desc = `Đường thẳng qua ${p.name} song song với ${refLine.name}`;
      }
    } else if (lineMode === 'point_perp') {
      const p = points.find(p => p.id === linePassPtId);
      const refLine = lines.find(l => l.id === lineRefLineId);
      if (p && refLine) {
        passPoint = p;
        let refA = { x: 0, y: 0, z: 0 };
        let refDir = { x: 1, y: 0, z: 0 };
        if (refLine.point1Id && refLine.point2Id) {
          const rp1 = points.find(pt => pt.id === refLine.point1Id);
          const rp2 = points.find(pt => pt.id === refLine.point2Id);
          if (rp1 && rp2) {
            refA = { x: rp1.x, y: rp1.y, z: rp1.z };
            refDir = { x: rp2.x - rp1.x, y: rp2.y - rp1.y, z: rp2.z - rp1.z };
          }
        } else if (refLine.point && refLine.dir) {
          refA = refLine.point;
          refDir = refLine.dir;
        }

        const proj = projectPointOnLine(p, refA, refDir);
        footPoint = {
          id: `pt_foot_${Date.now()}`,
          name: `H_${p.name}`,
          x: proj.point.x,
          y: proj.point.y,
          z: proj.point.z,
          color: '#ec4899',
        };
        perpDistance = proj.dist;

        if (proj.dist > 1e-4) {
          // Normal vector from P to H
          dir = {
            x: Number((proj.point.x - p.x).toFixed(4)),
            y: Number((proj.point.y - p.y).toFixed(4)),
            z: Number((proj.point.z - p.z).toFixed(4)),
          };
        } else {
          // P lies on refLine, pick orthogonal vector
          dir = orthogonalVector(refDir);
        }
        desc = `Đường thẳng qua ${p.name} vuông góc với ${refLine.name}`;
      }
    }

    const isDirValid = Math.abs(dir.x) + Math.abs(dir.y) + Math.abs(dir.z) > 1e-6;

    return {
      passPoint,
      dir,
      footPoint,
      perpDistance,
      desc,
      isDirValid,
    };
  }, [lineMode, lineP1Id, lineP2Id, linePassPtId, lineDirVec, lineRefLineId, lines, points]);

  const handleCreateLine = () => {
    if (!calculatedLineData.passPoint || !calculatedLineData.isDirValid) {
      alert('Thông số đường thẳng chưa hợp lệ hoặc VTCP bằng véc tơ không (0, 0, 0)!');
      return;
    }
    const defaultName =
      lineMode === '2points'
        ? `d(${points.find(p => p.id === lineP1Id)?.name}${points.find(p => p.id === lineP2Id)?.name})`
        : lineMode === 'point_parallel'
        ? `d // ${lines.find(l => l.id === lineRefLineId)?.name || 'd_ref'}`
        : lineMode === 'point_perp'
        ? `d ⊥ ${lines.find(l => l.id === lineRefLineId)?.name || 'd_ref'}`
        : `d(${calculatedLineData.passPoint.name})`;

    const name = lineName.trim() || defaultName;

    const newLine: Line3D = {
      id: `line_${Date.now()}`,
      name,
      point1Id: lineMode === '2points' ? lineP1Id : calculatedLineData.passPoint.id,
      point2Id: lineMode === '2points' ? lineP2Id : undefined,
      point: {
        x: calculatedLineData.passPoint.x,
        y: calculatedLineData.passPoint.y,
        z: calculatedLineData.passPoint.z,
      },
      dir: calculatedLineData.dir,
      color: lineColor,
    };

    onAddLine(
      newLine,
      lineMode === 'point_perp' && linePerpAddFoot && calculatedLineData.footPoint
        ? calculatedLineData.footPoint
        : undefined
    );

    flashSuccess(`Đã dựng đường thẳng ${name}!`);
    setLineName('');
  };

  // -------------------------------------------------------------
  // 4. TOOL: MẶT PHẲNG
  // 4 chế độ: qua 3 điểm | qua 1 điểm + VTPT | song song | vuông góc
  // -------------------------------------------------------------
  const [planeMode, setPlaneMode] = useState<'3points' | '4points' | 'point_normal' | 'point_parallel' | 'point_perp'>('3points');
  const [planeP1Id, setPlaneP1Id] = useState<string>(points[0]?.id || '');
  const [planeP2Id, setPlaneP2Id] = useState<string>(points[1]?.id || points[0]?.id || '');
  const [planeP3Id, setPlaneP3Id] = useState<string>(points[2]?.id || points[0]?.id || '');
  const [planeP4Id, setPlaneP4Id] = useState<string>(points[3]?.id || points[0]?.id || '');
  const [planePassPtId, setPlanePassPtId] = useState<string>(points[0]?.id || '');
  const [planeNormVec, setPlaneNormVec] = useState({ a: 1, b: 2, c: 2 });
  const [planeRefPlaneId, setPlaneRefPlaneId] = useState<string>(planes[0]?.id || '');
  // Sub-choice for perpendicular: with line or with plane
  const [planePerpKind, setPlanePerpKind] = useState<'perp_line' | 'perp_plane'>('perp_line');
  const [planePerpLineId, setPlanePerpLineId] = useState<string>(lines[0]?.id || '');
  const [planePerpPt2Id, setPlanePerpPt2Id] = useState<string>(points[1]?.id || '');
  const [planeColor, setPlaneColor] = useState<string>('#38bdf8');
  const [planeOpacity, setPlaneOpacity] = useState<number>(0.35);
  const [planeFillColor, setPlaneFillColor] = useState<boolean>(true);
  const [planeRegionOnly, setPlaneRegionOnly] = useState<boolean>(false);
  const [planeName, setPlaneName] = useState<string>('');

  const calculatedPlaneData = useMemo(() => {
    let a = 0;
    let b = 0;
    let c = 0;
    let d = 0;
    let pointIds: string[] | undefined = undefined;
    let isValid = false;
    let errorMsg = '';
    let desc = '';

    if (planeMode === '3points') {
      const p1 = points.find(p => p.id === planeP1Id);
      const p2 = points.find(p => p.id === planeP2Id);
      const p3 = points.find(p => p.id === planeP3Id);
      if (p1 && p2 && p3) {
        if (p1.id === p2.id || p2.id === p3.id || p1.id === p3.id) {
          errorMsg = '3 điểm phải phân biệt nhau!';
        } else {
          const pl = planeFrom3Points(p1, p2, p3);
          if (!pl) {
            errorMsg = '3 điểm thẳng hàng, không xác định duy nhất một mặt phẳng!';
          } else {
            a = pl.a;
            b = pl.b;
            c = pl.c;
            d = pl.d;
            pointIds = [p1.id, p2.id, p3.id];
            isValid = true;
            desc = `Mặt phẳng qua 3 điểm ${p1.name}, ${p2.name}, ${p3.name}`;
          }
        }
      }
    } else if (planeMode === '4points') {
      const p1 = points.find(p => p.id === planeP1Id);
      const p2 = points.find(p => p.id === planeP2Id);
      const p3 = points.find(p => p.id === planeP3Id);
      const p4 = points.find(p => p.id === planeP4Id);
      if (p1 && p2 && p3 && p4) {
        const uniqueIds = new Set([p1.id, p2.id, p3.id, p4.id]);
        if (uniqueIds.size !== 4) {
          errorMsg = '4 điểm được chọn phải đôi một phân biệt nhau!';
        } else {
          const res = planeFrom4Points(p1, p2, p3, p4);
          if (!res) {
            errorMsg = 'Cả 4 điểm đều thẳng hàng, không xác định được duy nhất một mặt phẳng!';
          } else if (!res.isCoplanar) {
            errorMsg = `4 điểm KHÔNG đồng phẳng! Điểm ${p4.name} cách mặt phẳng (${p1.name}${p2.name}${p3.name}) một khoảng d = ${res.coplanarDistance.toFixed(3)}. Không thể lập mặt phẳng qua cả 4 điểm!`;
          } else {
            a = res.a;
            b = res.b;
            c = res.c;
            d = res.d;
            pointIds = [p1.id, p2.id, p3.id, p4.id];
            isValid = true;
            desc = `Mặt phẳng qua 4 điểm đồng phẳng ${p1.name}, ${p2.name}, ${p3.name}, ${p4.name}`;
          }
        }
      }
    } else if (planeMode === 'point_normal') {
      const p = points.find(p => p.id === planePassPtId);
      if (p) {
        a = planeNormVec.a;
        b = planeNormVec.b;
        c = planeNormVec.c;
        const mag = Math.sqrt(a * a + b * b + c * c);
        if (mag < 1e-6) {
          errorMsg = 'VTPT n⃗ không được là véc tơ không (0, 0, 0)!';
        } else {
          d = -(a * p.x + b * p.y + c * p.z);
          pointIds = [p.id];
          isValid = true;
          desc = `Mặt phẳng qua ${p.name} có VTPT n⃗(${a}; ${b}; ${c})`;
        }
      }
    } else if (planeMode === 'point_parallel') {
      const p = points.find(p => p.id === planePassPtId);
      const refPl = planes.find(pl => pl.id === planeRefPlaneId);
      if (p && refPl) {
        a = refPl.a;
        b = refPl.b;
        c = refPl.c;
        d = -(a * p.x + b * p.y + c * p.z);
        pointIds = [p.id];
        isValid = true;
        desc = `Mặt phẳng qua ${p.name} song song với ${refPl.name}`;
      }
    } else if (planeMode === 'point_perp') {
      const p = points.find(p => p.id === planePassPtId);
      if (p) {
        if (planePerpKind === 'perp_line') {
          // Vuông góc với đường thẳng d => VTPT là VTCP của d
          const refLine = lines.find(l => l.id === planePerpLineId);
          if (refLine) {
            let uDir: VectorXYZ = { x: 0, y: 0, z: 0 };
            if (refLine.point1Id && refLine.point2Id) {
              const rp1 = points.find(pt => pt.id === refLine.point1Id);
              const rp2 = points.find(pt => pt.id === refLine.point2Id);
              if (rp1 && rp2) {
                uDir = { x: rp2.x - rp1.x, y: rp2.y - rp1.y, z: rp2.z - rp1.z };
              }
            } else if (refLine.dir) {
              uDir = refLine.dir;
            }
            const mag = Math.sqrt(uDir.x * uDir.x + uDir.y * uDir.y + uDir.z * uDir.z);
            if (mag < 1e-6) {
              errorMsg = 'Đường thẳng tham chiếu không hợp lệ!';
            } else {
              a = uDir.x;
              b = uDir.y;
              c = uDir.z;
              d = -(a * p.x + b * p.y + c * p.z);
              pointIds = [p.id];
              isValid = true;
              desc = `Mặt phẳng qua ${p.name} vuông góc với đường thẳng ${refLine.name}`;
            }
          }
        } else {
          // Vuông góc với mặt phẳng (P) và đi qua thêm 1 điểm N
          const refPl = planes.find(pl => pl.id === planeRefPlaneId);
          const p2 = points.find(pt => pt.id === planePerpPt2Id);
          if (refPl && p2) {
            if (p.id === p2.id) {
              errorMsg = 'Vui lòng chọn 2 điểm phân biệt để định hướng mặt phẳng!';
            } else {
              const vecMN = { x: p2.x - p.x, y: p2.y - p.y, z: p2.z - p.z };
              const normPl = { x: refPl.a, y: refPl.b, z: refPl.c };
              const normal = vec.cross(vecMN, normPl);
              const mag = vec.magnitude(normal);
              if (mag < 1e-6) {
                errorMsg = `Đoạn ${p.name}${p2.name} song song hoặc cùng phương với VTPT của ${refPl.name}!`;
              } else {
                a = Number(normal.x.toFixed(4));
                b = Number(normal.y.toFixed(4));
                c = Number(normal.z.toFixed(4));
                d = Number((-(a * p.x + b * p.y + c * p.z)).toFixed(4));
                pointIds = [p.id, p2.id];
                isValid = true;
                desc = `Mặt phẳng qua ${p.name}, ${p2.name} vuông góc với ${refPl.name}`;
              }
            }
          }
        }
      }
    }

    return { a, b, c, d, pointIds, isValid, errorMsg, desc };
  }, [
    planeMode,
    planeP1Id,
    planeP2Id,
    planeP3Id,
    planePassPtId,
    planeNormVec,
    planeRefPlaneId,
    planePerpKind,
    planePerpLineId,
    planePerpPt2Id,
    points,
    lines,
    planes,
  ]);

  const handleCreatePlane = () => {
    if (!calculatedPlaneData.isValid) {
      alert(calculatedPlaneData.errorMsg || 'Thông số mặt phẳng chưa hợp lệ!');
      return;
    }
    const defaultName =
      planeMode === '3points'
        ? `(${points.find(p => p.id === planeP1Id)?.name}${points.find(p => p.id === planeP2Id)?.name}${
            points.find(p => p.id === planeP3Id)?.name
          })`
        : planeMode === 'point_parallel'
        ? `(Q // ${planes.find(pl => pl.id === planeRefPlaneId)?.name || 'P'})`
        : planeMode === 'point_perp'
        ? `(P ⊥ ${planePerpKind === 'perp_line' ? lines.find(l => l.id === planePerpLineId)?.name || 'd' : planes.find(pl => pl.id === planeRefPlaneId)?.name || 'P'})`
        : `(P_${points.find(p => p.id === planePassPtId)?.name || 'M'})`;

    const name = planeName.trim() || defaultName;

    const newPlane: Plane3D = {
      id: `pl_${Date.now()}`,
      name,
      a: calculatedPlaneData.a,
      b: calculatedPlaneData.b,
      c: calculatedPlaneData.c,
      d: calculatedPlaneData.d,
      pointIds: calculatedPlaneData.pointIds,
      color: planeColor,
      opacity: planeOpacity,
      fillColor: planeFillColor,
      regionOnly: calculatedPlaneData.pointIds && calculatedPlaneData.pointIds.length >= 3 ? planeRegionOnly : false,
      visible: true,
    };

    onAddPlane(newPlane);
    flashSuccess(`Đã dựng mặt phẳng ${name}: ${formatPlaneEquation(newPlane)}!`);
    setPlaneName('');
  };

  return (
    <div className="space-y-3.5 text-xs">
      {/* 4 Tool Category Selectors */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-[#111] rounded-lg border border-[#222]">
        <button
          type="button"
          onClick={() => setToolCategory('vector')}
          className={`py-1.5 px-1 rounded flex flex-col items-center gap-1 font-mono font-bold transition-colors ${
            toolCategory === 'vector'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
          }`}
        >
          <MoveUpRight className="w-3.5 h-3.5" />
          <span className="text-[10px] uppercase tracking-wider">Véc tơ</span>
        </button>

        <button
          type="button"
          onClick={() => setToolCategory('segment')}
          className={`py-1.5 px-1 rounded flex flex-col items-center gap-1 font-mono font-bold transition-colors ${
            toolCategory === 'segment'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
          }`}
        >
          <Minus className="w-3.5 h-3.5" />
          <span className="text-[10px] uppercase tracking-wider">Đoạn thẳng</span>
        </button>

        <button
          type="button"
          onClick={() => setToolCategory('line')}
          className={`py-1.5 px-1 rounded flex flex-col items-center gap-1 font-mono font-bold transition-colors ${
            toolCategory === 'line'
              ? 'bg-pink-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
          }`}
        >
          <Maximize2 className="w-3.5 h-3.5 rotate-45" />
          <span className="text-[10px] uppercase tracking-wider">Đường thẳng</span>
        </button>

        <button
          type="button"
          onClick={() => setToolCategory('plane')}
          className={`py-1.5 px-1 rounded flex flex-col items-center gap-1 font-mono font-bold transition-colors ${
            toolCategory === 'plane'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="text-[10px] uppercase tracking-wider">Mặt phẳng</span>
        </button>
      </div>

      {/* Success notification banner */}
      {successMsg && (
        <div className="flex items-center gap-2 p-2 bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 rounded text-[11px] font-mono animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 1. VÉC TƠ TỪ 2 ĐIỂM */}
      {/* ------------------------------------------------------------------ */}
      {toolCategory === 'vector' && (
        <div className="space-y-3 bg-[#111] p-3 rounded-lg border border-zinc-800/90 font-mono">
          <div className="flex items-center justify-between text-zinc-300">
            <span className="font-bold uppercase text-[11px] text-emerald-400 flex items-center gap-1.5">
              <MoveUpRight className="w-3.5 h-3.5" />
              Công cụ dựng véc tơ từ 2 điểm
            </span>
            <span className="text-[10px] text-zinc-500">u⃗ = vec(AB)</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-zinc-400 text-[10px] block mb-1">Điểm đầu (gốc):</label>
              <select
                value={vecStartId}
                onChange={e => setVecStartId(e.target.value)}
                className="w-full bg-[#18181b] border border-zinc-700 text-white rounded p-1.5 font-bold"
              >
                {points.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.x}; {p.y}; {p.z})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-zinc-400 text-[10px] block mb-1">Điểm cuối (ngọn):</label>
              <select
                value={vecEndId}
                onChange={e => setVecEndId(e.target.value)}
                className="w-full bg-[#18181b] border border-zinc-700 text-white rounded p-1.5 font-bold"
              >
                {points.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.x}; {p.y}; {p.z})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Real-time Math Preview */}
          {calculatedVec && (
            <div className="p-2.5 bg-[#0a0a0a] rounded border border-zinc-800 space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-zinc-400">Tọa độ véc tơ:</span>
                <span className="text-emerald-400 font-bold">
                  ({calculatedVec.dx}; {calculatedVec.dy}; {calculatedVec.dz})
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-zinc-400">Độ dài |u⃗|:</span>
                <span className="text-zinc-200 font-bold">{calculatedVec.length.toFixed(4)}</span>
              </div>
              <div className="pt-1 border-t border-zinc-800/80 text-[11px] text-zinc-300">
                <KatexMath
                  math={`\\vec{${pStart?.name || 'A'}${pEnd?.name || 'B'}} = (${calculatedVec.dx};\\; ${calculatedVec.dy};\\; ${calculatedVec.dz})`}
                />
              </div>
            </div>
          )}

          {/* Styling & Custom Name */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-800/60">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 text-[10px]">Màu:</span>
              <div className="flex gap-1">
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setVecColor(c.value)}
                    style={{ backgroundColor: c.value }}
                    className={`w-4 h-4 rounded-full transition-transform ${
                      vecColor === c.value ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-1 max-w-[170px]">
              <span className="text-zinc-400 text-[10px]">Tên:</span>
              <input
                type="text"
                placeholder={`vec(${pStart?.name || 'A'}${pEnd?.name || 'B'})`}
                value={vecName}
                onChange={e => setVecName(e.target.value)}
                className="w-full bg-[#18181b] border border-zinc-700 text-white rounded px-1.5 py-0.5 text-[11px]"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreateVector}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/40 transition-all active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            DỰNG VÉC TƠ LÊN KHÔNG GIAN 3D
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 2. ĐOẠN THẲNG QUA 2 ĐIỂM */}
      {/* ------------------------------------------------------------------ */}
      {toolCategory === 'segment' && (
        <div className="space-y-3 bg-[#111] p-3 rounded-lg border border-zinc-800/90 font-mono">
          <div className="flex items-center justify-between text-zinc-300">
            <span className="font-bold uppercase text-[11px] text-amber-400 flex items-center gap-1.5">
              <Minus className="w-3.5 h-3.5" />
              Công cụ dựng đoạn thẳng qua 2 điểm
            </span>
            <span className="text-[10px] text-zinc-500">AB [a; b]</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-zinc-400 text-[10px] block mb-1">Điểm mút thứ nhất:</label>
              <select
                value={segP1Id}
                onChange={e => setSegP1Id(e.target.value)}
                className="w-full bg-[#18181b] border border-zinc-700 text-white rounded p-1.5 font-bold"
              >
                {points.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.x}; {p.y}; {p.z})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-zinc-400 text-[10px] block mb-1">Điểm mút thứ hai:</label>
              <select
                value={segP2Id}
                onChange={e => setSegP2Id(e.target.value)}
                className="w-full bg-[#18181b] border border-zinc-700 text-white rounded p-1.5 font-bold"
              >
                {points.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.x}; {p.y}; {p.z})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Live Segment Math Calculation */}
          {calculatedSeg && (
            <div className="p-2.5 bg-[#0a0a0a] rounded border border-zinc-800 space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-zinc-400">Độ dài đoạn thẳng:</span>
                <span className="text-amber-400 font-bold">d = {calculatedSeg.length.toFixed(4)}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-zinc-400">Trung điểm M:</span>
                <span className="text-zinc-200 font-bold">
                  ({calculatedSeg.mid.x}; {calculatedSeg.mid.y}; {calculatedSeg.mid.z})
                </span>
              </div>
              <div className="pt-1 border-t border-zinc-800/80 text-[11px] text-zinc-300">
                <KatexMath
                  math={`M\\left(\\frac{x_A+x_B}{2}; \\frac{y_A+y_B}{2}; \\frac{z_A+z_B}{2}\\right) = (${calculatedSeg.mid.x};\\, ${calculatedSeg.mid.y};\\, ${calculatedSeg.mid.z})`}
                />
              </div>
            </div>
          )}

          {/* Option: Add Midpoint to Point list */}
          <label className="flex items-center gap-2 text-zinc-300 text-[11px] cursor-pointer bg-[#0a0a0a] p-2 rounded border border-zinc-800">
            <input
              type="checkbox"
              checked={segAddMidpoint}
              onChange={e => setSegAddMidpoint(e.target.checked)}
              className="rounded accent-amber-500 w-3.5 h-3.5"
            />
            <span>Tự động thêm trung điểm M vào không gian 3D</span>
          </label>

          {/* Styling */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-800/60">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 text-[10px]">Màu:</span>
              <div className="flex gap-1">
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setSegColor(c.value)}
                    style={{ backgroundColor: c.value }}
                    className={`w-4 h-4 rounded-full transition-transform ${
                      segColor === c.value ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-1 max-w-[170px]">
              <span className="text-zinc-400 text-[10px]">Tên:</span>
              <input
                type="text"
                placeholder={`${pSeg1?.name || 'A'}${pSeg2?.name || 'B'}`}
                value={segName}
                onChange={e => setSegName(e.target.value)}
                className="w-full bg-[#18181b] border border-zinc-700 text-white rounded px-1.5 py-0.5 text-[11px]"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreateSegment}
            className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded flex items-center justify-center gap-1.5 shadow-md shadow-amber-900/40 transition-all active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            DỰNG ĐOẠN THẲNG LÊN 3D
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 3. ĐƯỜNG THẲNG */}
      {/* 4 chế độ: qua 2 điểm | qua 1 điểm + VTCP | song song | vuông góc */}
      {/* ------------------------------------------------------------------ */}
      {toolCategory === 'line' && (
        <div className="space-y-3 bg-[#111] p-3 rounded-lg border border-zinc-800/90 font-mono">
          <div className="flex items-center justify-between text-zinc-300">
            <span className="font-bold uppercase text-[11px] text-pink-400 flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 rotate-45" />
              Công cụ dựng đường thẳng (Line)
            </span>
          </div>

          {/* Sub-mode selector */}
          <div className="grid grid-cols-2 gap-1 bg-[#0a0a0a] p-1 rounded border border-zinc-800">
            {[
              { id: '2points', label: 'Qua 2 điểm' },
              { id: 'point_dir', label: '1 điểm + VTCP' },
              { id: 'point_parallel', label: 'Song song đ.thẳng' },
              { id: 'point_perp', label: 'Vuông góc đ.thẳng' },
            ].map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setLineMode(m.id as any)}
                className={`py-1 px-1.5 rounded text-[10px] font-bold transition-colors text-center ${
                  lineMode === m.id
                    ? 'bg-pink-600 text-white'
                    : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Chế độ 1: Qua 2 điểm */}
          {lineMode === '2points' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-zinc-400 text-[10px] block mb-1">Điểm A:</label>
                <select
                  value={lineP1Id}
                  onChange={e => setLineP1Id(e.target.value)}
                  className="w-full bg-[#18181b] border border-zinc-700 text-white rounded p-1.5 font-bold"
                >
                  {points.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.x}; {p.y}; {p.z})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-zinc-400 text-[10px] block mb-1">Điểm B:</label>
                <select
                  value={lineP2Id}
                  onChange={e => setLineP2Id(e.target.value)}
                  className="w-full bg-[#18181b] border border-zinc-700 text-white rounded p-1.5 font-bold"
                >
                  {points.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.x}; {p.y}; {p.z})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Chế độ 2: Qua 1 điểm và VTCP */}
          {lineMode === 'point_dir' && (
            <div className="space-y-2">
              <div>
                <label className="text-zinc-400 text-[10px] block mb-1">Điểm đi qua M:</label>
                <select
                  value={linePassPtId}
                  onChange={e => setLinePassPtId(e.target.value)}
                  className="w-full bg-[#18181b] border border-zinc-700 text-white rounded p-1.5 font-bold"
                >
                  {points.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.x}; {p.y}; {p.z})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-zinc-400 text-[10px] block mb-1">Véc tơ chỉ phương u⃗ = (a; b; c):</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <input
                    type="number"
                    value={lineDirVec.x}
                    onChange={e => setLineDirVec(prev => ({ ...prev, x: Number(e.target.value) }))}
                    className="bg-[#18181b] border border-zinc-700 text-white rounded p-1 text-center font-bold"
                    placeholder="a"
                  />
                  <input
                    type="number"
                    value={lineDirVec.y}
                    onChange={e => setLineDirVec(prev => ({ ...prev, y: Number(e.target.value) }))}
                    className="bg-[#18181b] border border-zinc-700 text-white rounded p-1 text-center font-bold"
                    placeholder="b"
                  />
                  <input
                    type="number"
                    value={lineDirVec.z}
                    onChange={e => setLineDirVec(prev => ({ ...prev, z: Number(e.target.value) }))}
                    className="bg-[#18181b] border border-zinc-700 text-white rounded p-1 text-center font-bold"
                    placeholder="c"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Chế độ 3: Song song với đường thẳng cho trước */}
          {lineMode === 'point_parallel' && (
            <div className="space-y-2">
              <div>
                <label className="text-zinc-400 text-[10px] block mb-1">Điểm đi qua M:</label>
                <select
                  value={linePassPtId}
                  onChange={e => setLinePassPtId(e.target.value)}
                  className="w-full bg-[#18181b] border border-zinc-700 text-white rounded p-1.5 font-bold"
                >
                  {points.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.x}; {p.y}; {p.z})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-zinc-400 text-[10px] block mb-1">Đường thẳng tham chiếu d (song song):</label>
                {lines.length === 0 ? (
                  <div className="text-amber-400 text-[11px] p-2 bg-amber-950/30 rounded border border-amber-800">
                    Chưa có đường thẳng nào trong không gian. Vui lòng dựng một đường thẳng trước!
                  </div>
                ) : (
                  <select
                    value={lineRefLineId}
                    onChange={e => setLineRefLineId(e.target.value)}
                    className="w-full bg-[#18181b] border border-zinc-700 text-white rounded p-1.5 font-bold"
                  >
                    {lines.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          {/* Chế độ 4: Vuông góc với đường thẳng cho trước */}
          {lineMode === 'point_perp' && (
            <div className="space-y-2">
              <div>
                <label className="text-zinc-400 text-[10px] block mb-1">Điểm đi qua M:</label>
                <select
                  value={linePassPtId}
                  onChange={e => setLinePassPtId(e.target.value)}
                  className="w-full bg-[#18181b] border border-zinc-700 text-white rounded p-1.5 font-bold"
                >
                  {points.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.x}; {p.y}; {p.z})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-zinc-400 text-[10px] block mb-1">Đường thẳng tham chiếu d (vuông góc):</label>
                {lines.length === 0 ? (
                  <div className="text-amber-400 text-[11px] p-2 bg-amber-950/30 rounded border border-amber-800">
                    Chưa có đường thẳng nào. Vui lòng dựng một đường thẳng trước!
                  </div>
                ) : (
                  <select
                    value={lineRefLineId}
                    onChange={e => setLineRefLineId(e.target.value)}
                    className="w-full bg-[#18181b] border border-zinc-700 text-white rounded p-1.5 font-bold"
                  >
                    {lines.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {calculatedLineData.footPoint && (
                <div className="p-2 bg-[#0a0a0a] rounded border border-zinc-800 space-y-1 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Hình chiếu vuông góc H:</span>
                    <span className="text-pink-400 font-bold">
                      H({calculatedLineData.footPoint.x}; {calculatedLineData.footPoint.y}; {calculatedLineData.footPoint.z})
                    </span>
                  </div>
                  {calculatedLineData.perpDistance !== null && (
                    <div className="flex justify-between items-center text-[10px] text-zinc-400">
                      <span>Khoảng cách d(M, d) = MH:</span>
                      <span className="text-zinc-200 font-bold">{calculatedLineData.perpDistance.toFixed(3)}</span>
                    </div>
                  )}
                  <label className="flex items-center gap-1.5 text-zinc-300 text-[10px] cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={linePerpAddFoot}
                      onChange={e => setLinePerpAddFoot(e.target.checked)}
                      className="rounded accent-pink-500"
                    />
                    <span>Thêm điểm hình chiếu H vào không gian 3D</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Mathematical Equations Preview (Tham số & Chính tắc) */}
          {calculatedLineData.passPoint && calculatedLineData.isDirValid && (
            <div className="p-2.5 bg-[#0a0a0a] rounded border border-zinc-800 space-y-2">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-zinc-400">VTCP u⃗:</span>
                <span className="text-pink-400 font-bold">
                  ({calculatedLineData.dir.x}; {calculatedLineData.dir.y}; {calculatedLineData.dir.z})
                </span>
              </div>

              <div className="space-y-1 border-t border-zinc-800/80 pt-1.5">
                <span className="text-zinc-500 text-[10px] uppercase font-bold block">Phương trình tham số:</span>
                <div className="text-zinc-200 text-[11px] overflow-x-auto py-0.5">
                  <KatexMath
                    math={formatLineParametricLatex(calculatedLineData.passPoint, calculatedLineData.dir)}
                  />
                </div>
              </div>

              {formatLineCanonical(calculatedLineData.passPoint, calculatedLineData.dir) && (
                <div className="space-y-1 border-t border-zinc-800/80 pt-1.5">
                  <span className="text-zinc-500 text-[10px] uppercase font-bold block">Phương trình chính tắc:</span>
                  <div className="text-emerald-400 text-[11px] overflow-x-auto py-0.5">
                    <KatexMath
                      math={formatLineCanonical(calculatedLineData.passPoint, calculatedLineData.dir) || ''}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Styling */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-800/60">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 text-[10px]">Màu:</span>
              <div className="flex gap-1">
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setLineColor(c.value)}
                    style={{ backgroundColor: c.value }}
                    className={`w-4 h-4 rounded-full transition-transform ${
                      lineColor === c.value ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-1 max-w-[170px]">
              <span className="text-zinc-400 text-[10px]">Tên:</span>
              <input
                type="text"
                placeholder="d"
                value={lineName}
                onChange={e => setLineName(e.target.value)}
                className="w-full bg-[#18181b] border border-zinc-700 text-white rounded px-1.5 py-0.5 text-[11px]"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreateLine}
            className="w-full py-2 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded flex items-center justify-center gap-1.5 shadow-md shadow-pink-900/40 transition-all active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            DỰNG ĐƯỜNG THẲNG LÊN 3D
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 4. MẶT PHẲNG */}
      {/* 4 chế độ: qua 3 điểm | qua 1 điểm + VTPT | song song | vuông góc */}
      {/* ------------------------------------------------------------------ */}
      {toolCategory === 'plane' && (
        <div className="space-y-3 bg-[#111] p-3 rounded-lg border border-zinc-800/90 font-mono">
          <div className="flex items-center justify-between text-zinc-300">
            <span className="font-bold uppercase text-[11px] text-blue-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Công cụ dựng mặt phẳng (Plane)
            </span>
          </div>

          {/* Sub-mode selector */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 bg-[#0a0a0a] p-1 rounded border border-zinc-800">
            {[
              { id: '3points', label: 'Qua 3 điểm' },
              { id: '4points', label: 'Qua 4 điểm' },
              { id: 'point_normal', label: '1 điểm + VTPT' },
              { id: 'point_parallel', label: 'Song song mp' },
              { id: 'point_perp', label: 'Vuông góc' },
            ].map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPlaneMode(m.id as any)}
                className={`py-1 px-1.5 rounded text-[10px] font-bold transition-colors text-center ${
                  planeMode === m.id
                    ? 'bg-blue-600 text-white'
                    : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Chế độ 1: Mặt phẳng qua 3 điểm */}
          {planeMode === '3points' && (
            <div className="grid grid-cols-3 gap-1.5">
              <div>
                <label className="text-zinc-400 text-[10px] block mb-1">Điểm A:</label>
                <select
                  value={planeP1Id}
                  onChange={e => setPlaneP1Id(e.target.value)}
                  className="w-full bg-[#18181b] border border-zinc-700 text-white rounded p-1 font-bold text-center"
                >
                  {points.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-zinc-400 text-[10px] block mb-1">Điểm B:</label>
                <select
                  value={planeP2Id}
                  onChange={e => setPlaneP2Id(e.target.value)}
                  className="w-full bg-[#18181b] border border-zinc-700 text-white rounded p-1 font-bold text-center"
                >
                  {points.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-zinc-400 text-[10px] block mb-1">Điểm C:</label>
                <select
                  value={planeP3Id}
                  onChange={e => setPlaneP3Id(e.target.value)}
                  className="w-full bg-[#18181b] border border-zinc-700 text-white rounded p-1 font-bold text-center"
                >
                  {points.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Chế độ 1B: Mặt phẳng qua 4 điểm */}
          {planeMode === '4points' && (
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <div>
                  <label className="text-zinc-400 text-[10px] block mb-1">Điểm 1 (A):</label>
                  <select
                    value={planeP1Id}
                    onChange={e => setPlaneP1Id(e.target.value)}
                    className="w-full bg-[#18181b] border border-zinc-700 text-white rounded p-1 font-bold text-center"
                  >
                    {points.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400 text-[10px] block mb-1">Điểm 2 (B):</label>
                  <select
                    value={planeP2Id}
                    onChange={e => setPlaneP2Id(e.target.value)}
                    className="w-full bg-[#18181b] border border-zinc-700 text-white rounded p-1 font-bold text-center"
                  >
                    {points.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400 text-[10px] block mb-1">Điểm 3 (C):</label>
                  <select
                    value={planeP3Id}
                    onChange={e => setPlaneP3Id(e.target.value)}
                    className="w-full bg-[#18181b] border border-zinc-700 text-white rounded p-1 font-bold text-center"
                  >
                    {points.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400 text-[10px] block mb-1">Điểm 4 (D):</label>
                  <select
                    value={planeP4Id}
                    onChange={e => setPlaneP4Id(e.target.value)}
                    className="w-full bg-[#18181b] border border-zinc-700 text-white rounded p-1 font-bold text-center"
                  >
                    {points.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-[10px] text-zinc-500 italic">
                Điều kiện đồng phẳng: [AB, AC]·AD = 0. Nếu 4 điểm không đồng phẳng hệ thống sẽ cảnh báo chi tiết.
              </p>
            </div>
          )}

          {/* Chế độ 2: Mặt phẳng qua 1 điểm và VTPT */}
          {planeMode === 'point_normal' && (
            <div className="space-y-2">
              <div>
                <label className="text-zinc-400 text-[10px] block mb-1">Điểm đi qua M:</label>
                <select
                  value={planePassPtId}
                  onChange={e => setPlanePassPtId(e.target.value)}
                  className="w-full bg-[#18181b] border border-zinc-700 text-white rounded p-1.5 font-bold"
                >
                  {points.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.x}; {p.y}; {p.z})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-zinc-400 text-[10px] block mb-1">Véc tơ pháp tuyến n⃗ = (A; B; C):</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <input
                    type="number"
                    value={planeNormVec.a}
                    onChange={e => setPlaneNormVec(prev => ({ ...prev, a: Number(e.target.value) }))}
                    className="bg-[#18181b] border border-zinc-700 text-white rounded p-1 text-center font-bold"
                    placeholder="A"
                  />
                  <input
                    type="number"
                    value={planeNormVec.b}
                    onChange={e => setPlaneNormVec(prev => ({ ...prev, b: Number(e.target.value) }))}
                    className="bg-[#18181b] border border-zinc-700 text-white rounded p-1 text-center font-bold"
                    placeholder="B"
                  />
                  <input
                    type="number"
                    value={planeNormVec.c}
                    onChange={e => setPlaneNormVec(prev => ({ ...prev, c: Number(e.target.value) }))}
                    className="bg-[#18181b] border border-zinc-700 text-white rounded p-1 text-center font-bold"
                    placeholder="C"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Chế độ 3: Mặt phẳng song song mặt phẳng cho trước */}
          {planeMode === 'point_parallel' && (
            <div className="space-y-2">
              <div>
                <label className="text-zinc-400 text-[10px] block mb-1">Điểm đi qua M:</label>
                <select
                  value={planePassPtId}
                  onChange={e => setPlanePassPtId(e.target.value)}
                  className="w-full bg-[#18181b] border border-zinc-700 text-white rounded p-1.5 font-bold"
                >
                  {points.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.x}; {p.y}; {p.z})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-zinc-400 text-[10px] block mb-1">Mặt phẳng tham chiếu (P) (song song):</label>
                {planes.length === 0 ? (
                  <div className="text-amber-400 text-[11px] p-2 bg-amber-950/30 rounded border border-amber-800">
                    Chưa có mặt phẳng nào trong không gian. Vui lòng dựng một mặt phẳng trước!
                  </div>
                ) : (
                  <select
                    value={planeRefPlaneId}
                    onChange={e => setPlaneRefPlaneId(e.target.value)}
                    className="w-full bg-[#18181b] border border-zinc-700 text-white rounded p-1.5 font-bold"
                  >
                    {planes.map(pl => (
                      <option key={pl.id} value={pl.id}>
                        {pl.name}: {formatPlaneEquation(pl)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          {/* Chế độ 4: Mặt phẳng vuông góc */}
          {planeMode === 'point_perp' && (
            <div className="space-y-2">
              <div>
                <label className="text-zinc-400 text-[10px] block mb-1">Điểm đi qua M:</label>
                <select
                  value={planePassPtId}
                  onChange={e => setPlanePassPtId(e.target.value)}
                  className="w-full bg-[#18181b] border border-zinc-700 text-white rounded p-1.5 font-bold"
                >
                  {points.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.x}; {p.y}; {p.z})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sub-choice: Vuông góc đường thẳng hay mặt phẳng */}
              <div className="flex gap-2 text-[10px]">
                <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300">
                  <input
                    type="radio"
                    name="perpKind"
                    checked={planePerpKind === 'perp_line'}
                    onChange={() => setPlanePerpKind('perp_line')}
                    className="accent-blue-500"
                  />
                  <span>Vuông góc đường thẳng d</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300">
                  <input
                    type="radio"
                    name="perpKind"
                    checked={planePerpKind === 'perp_plane'}
                    onChange={() => setPlanePerpKind('perp_plane')}
                    className="accent-blue-500"
                  />
                  <span>Vuông góc mặt phẳng (P)</span>
                </label>
              </div>

              {planePerpKind === 'perp_line' ? (
                <div>
                  <label className="text-zinc-400 text-[10px] block mb-1">Đường thẳng tham chiếu d (vuông góc):</label>
                  {lines.length === 0 ? (
                    <div className="text-amber-400 text-[11px] p-2 bg-amber-950/30 rounded border border-amber-800">
                      Chưa có đường thẳng nào. Vui lòng dựng một đường thẳng trước!
                    </div>
                  ) : (
                    <select
                      value={planePerpLineId}
                      onChange={e => setPlanePerpLineId(e.target.value)}
                      className="w-full bg-[#18181b] border border-zinc-700 text-white rounded p-1.5 font-bold"
                    >
                      {lines.map(l => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-zinc-400 text-[10px] block mb-1">Mặt phẳng (P):</label>
                    <select
                      value={planeRefPlaneId}
                      onChange={e => setPlaneRefPlaneId(e.target.value)}
                      className="w-full bg-[#18181b] border border-zinc-700 text-white rounded p-1.5 font-bold"
                    >
                      {planes.map(pl => (
                        <option key={pl.id} value={pl.id}>
                          {pl.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-zinc-400 text-[10px] block mb-1">Điểm thứ hai N:</label>
                    <select
                      value={planePerpPt2Id}
                      onChange={e => setPlanePerpPt2Id(e.target.value)}
                      className="w-full bg-[#18181b] border border-zinc-700 text-white rounded p-1.5 font-bold"
                    >
                      {points.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Plane Equation Preview */}
          {calculatedPlaneData.isValid ? (
            <div className="p-2.5 bg-[#0a0a0a] rounded border border-zinc-800 space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-zinc-400">VTPT n⃗:</span>
                <span className="text-blue-400 font-bold">
                  ({calculatedPlaneData.a}; {calculatedPlaneData.b}; {calculatedPlaneData.c})
                </span>
              </div>
              <div className="pt-1 border-t border-zinc-800/80">
                <span className="text-zinc-500 text-[10px] uppercase font-bold block mb-1">
                  Phương trình tổng quát:
                </span>
                <div className="text-emerald-400 text-[12px] font-bold py-0.5">
                  <KatexMath
                    math={formatPlaneEquation({
                      a: calculatedPlaneData.a,
                      b: calculatedPlaneData.b,
                      c: calculatedPlaneData.c,
                      d: calculatedPlaneData.d,
                    })}
                  />
                </div>
              </div>
            </div>
          ) : (
            calculatedPlaneData.errorMsg && (
              <div className="flex items-center gap-2 p-2 bg-amber-950/40 border border-amber-800/60 text-amber-300 rounded text-[11px]">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{calculatedPlaneData.errorMsg}</span>
              </div>
            )
          )}

          {/* Styling & Opacity */}
          <div className="space-y-2 pt-1 border-t border-zinc-800/60">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400 text-[10px]">Màu:</span>
                <div className="flex gap-1">
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setPlaneColor(c.value)}
                      style={{ backgroundColor: c.value }}
                      className={`w-4 h-4 rounded-full transition-transform ${
                        planeColor === c.value ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-1 max-w-[170px]">
                <span className="text-zinc-400 text-[10px]">Tên:</span>
                <input
                  type="text"
                  placeholder="(P)"
                  value={planeName}
                  onChange={e => setPlaneName(e.target.value)}
                  className="w-full bg-[#18181b] border border-zinc-700 text-white rounded px-1.5 py-0.5 text-[11px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-zinc-400">
              <span>Độ trong suốt:</span>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0.1"
                  max="0.8"
                  step="0.05"
                  value={planeOpacity}
                  onChange={e => setPlaneOpacity(Number(e.target.value))}
                  className="w-24 accent-blue-500"
                />
                <span className="text-zinc-200 font-bold">{Math.round(planeOpacity * 100)}%</span>
              </div>
            </div>

            {/* Tô màu mặt phẳng & Miền giới hạn qua các điểm */}
            <div className="space-y-1.5 p-2 bg-[#0a0a0a] rounded border border-zinc-800/80">
              <label className="flex items-center justify-between cursor-pointer text-[11px]">
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <Palette className="w-3.5 h-3.5 text-purple-400" />
                  <span>Tô màu bề mặt mặt phẳng:</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPlaneFillColor(!planeFillColor)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border font-semibold transition-colors ${
                    planeFillColor
                      ? 'bg-purple-950/50 text-purple-300 border-purple-800/60'
                      : 'bg-zinc-900 text-zinc-500 border-zinc-700'
                  }`}
                >
                  {planeFillColor ? 'ĐANG BẬT' : 'ĐANG TẮT'}
                </button>
              </label>

              {(planeMode === '3points' || planeMode === '4points') && (
                <label className="flex items-center gap-2 cursor-pointer text-[10px] text-zinc-400 pt-1 border-t border-zinc-800/60">
                  <input
                    type="checkbox"
                    checked={planeRegionOnly}
                    onChange={e => setPlaneRegionOnly(e.target.checked)}
                    className="rounded bg-[#18181b] border-zinc-700 text-blue-500 focus:ring-0 w-3.5 h-3.5 accent-blue-600"
                  />
                  <span>
                    {planeMode === '3points'
                      ? `Chỉ tô miền tam giác giới hạn qua 3 điểm (${points.find(p => p.id === planeP1Id)?.name}${points.find(p => p.id === planeP2Id)?.name}${points.find(p => p.id === planeP3Id)?.name})`
                      : `Chỉ tô miền tứ giác giới hạn qua 4 điểm (${points.find(p => p.id === planeP1Id)?.name}${points.find(p => p.id === planeP2Id)?.name}${points.find(p => p.id === planeP3Id)?.name}${points.find(p => p.id === planeP4Id)?.name})`}
                  </span>
                </label>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreatePlane}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded flex items-center justify-center gap-1.5 shadow-md shadow-blue-900/40 transition-all active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            DỰNG MẶT PHẲNG LÊN 3D
          </button>
        </div>
      )}
    </div>
  );
};
