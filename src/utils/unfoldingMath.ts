import { Point3D, Solid3D, Solid3DType } from '../types/math';

export interface UnfoldedShapeData {
  type: Solid3DType;
  name: string;
  isSupported: boolean;
  unsupportedReason?: string;
  // Dimensions
  dimensions: {
    a?: number; // length or edge 1
    b?: number; // width or edge 2
    c?: number; // height or edge 3
    radius?: number;
    height?: number;
    slantHeight?: number; // l for cone
    sectorAngleDeg?: number; // for cone sector (degrees)
    circumference?: number; // 2 * pi * R for cylinder
  };
  // Metrics
  metrics: {
    volume: number;
    surfaceArea: number;
    lateralArea: number; // S_xq
    baseArea: number;    // S_day
  };
  // Vertex names
  vertexLabels: {
    base?: string[];
    top?: string[];
    apex?: string;
    center?: string;
  };
  // Formulas
  formulas: {
    lateralAreaFormula: string;
    totalAreaFormula: string;
    volumeFormula: string;
    unfoldingDescription: string;
  };
}

// Distance between 2 points in 3D
function dist3D(
  p1: { x: number; y: number; z: number },
  p2: { x: number; y: number; z: number }
): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Analyze any solid, points, or preset and extract normalized unfolding parameters
 */
export function analyzeShapeForUnfolding(
  solid?: Solid3D | null,
  points: Point3D[] = [],
  nameOverride?: string
): UnfoldedShapeData {
  const shapeType: Solid3DType = solid?.type || (
    points.length === 4 ? 'tetrahedron' :
    points.length === 5 ? 'pyramid_quad' :
    points.length === 6 ? 'prism_tri' :
    points.length >= 8 ? 'box' : 'tetrahedron'
  );

  const shapeName = nameOverride || solid?.name || (
    shapeType === 'tetrahedron' ? 'Tứ diện' :
    shapeType === 'pyramid_quad' ? 'Hình chóp tứ giác' :
    shapeType === 'prism_tri' ? 'Lăng trụ tam giác' :
    shapeType === 'box' ? 'Hình hộp chữ nhật' :
    shapeType === 'cylinder' ? 'Hình trụ tròn xoay' :
    shapeType === 'cone' ? 'Hình nón tròn xoay' : 'Khối cầu'
  );

  // 1. SPHERE: Unsupported
  if (shapeType === 'sphere') {
    const r = solid?.radius || 3;
    return {
      type: 'sphere',
      name: shapeName,
      isSupported: false,
      unsupportedReason:
        'Theo Định lý Egregium của Gauss (Theorema Egregium), mặt cầu có độ cong Gauss K = 1/R² > 0, trong khi mặt phẳng có K = 0. Vì vậy, mặt cầu là mặt không thể trải phẳng (non-developable surface) lên mặt phẳng 2D mà không làm biến dạng khoảng cách hoặc rách bề mặt.',
      dimensions: { radius: r },
      metrics: {
        volume: (4 / 3) * Math.PI * Math.pow(r, 3),
        surfaceArea: 4 * Math.PI * Math.pow(r, 2),
        lateralArea: 0,
        baseArea: 0,
      },
      vertexLabels: {},
      formulas: {
        lateralAreaFormula: 'N/A (Mặt cầu kín)',
        totalAreaFormula: 'S = 4πR²',
        volumeFormula: 'V = (4/3)πR³',
        unfoldingDescription: 'Không thể trải phẳng 2D tuyệt đối',
      },
    };
  }

  // 2. CYLINDER (Hình trụ)
  if (shapeType === 'cylinder') {
    const r = solid?.radius || 2.5;
    const h = solid?.height || 5;
    const circum = 2 * Math.PI * r;
    const sXq = 2 * Math.PI * r * h;
    const sDay = Math.PI * r * r;
    const sTp = sXq + 2 * sDay;
    const v = sDay * h;

    return {
      type: 'cylinder',
      name: shapeName,
      isSupported: true,
      dimensions: {
        radius: r,
        height: h,
        circumference: circum,
      },
      metrics: {
        volume: v,
        surfaceArea: sTp,
        lateralArea: sXq,
        baseArea: sDay,
      },
      vertexLabels: {
        base: ["O (Đáy dưới)"],
        top: ["O' (Đáy trên)"],
        center: 'O',
      },
      formulas: {
        lateralAreaFormula: 'S_xq = 2πRh = C_đáy × h',
        totalAreaFormula: 'S_tp = 2πRh + 2πR² = 2πR(h + R)',
        volumeFormula: 'V = πR²h = S_đáy × h',
        unfoldingDescription: 'Trải phẳng thành 1 hình chữ nhật kích thước (2πR × h) và 2 hình tròn đáy bán kính R tiếp xúc 2 cạnh dài.',
      },
    };
  }

  // 3. CONE (Hình nón)
  if (shapeType === 'cone') {
    const r = solid?.radius || 3;
    const h = solid?.height || 5;
    const l = Math.sqrt(r * r + h * h);
    const sectorAngleDeg = (360 * r) / l; // degrees
    const sXq = Math.PI * r * l;
    const sDay = Math.PI * r * r;
    const sTp = sXq + sDay;
    const v = (1 / 3) * Math.PI * r * r * h;

    return {
      type: 'cone',
      name: shapeName,
      isSupported: true,
      dimensions: {
        radius: r,
        height: h,
        slantHeight: l,
        sectorAngleDeg: sectorAngleDeg,
      },
      metrics: {
        volume: v,
        surfaceArea: sTp,
        lateralArea: sXq,
        baseArea: sDay,
      },
      vertexLabels: {
        apex: 'S (Đỉnh)',
        center: 'O (Tâm đáy)',
        base: ['A', 'B', 'C'],
      },
      formulas: {
        lateralAreaFormula: 'S_xq = πRl',
        totalAreaFormula: 'S_tp = πRl + πR² = πR(l + R)',
        volumeFormula: 'V = (1/3)πR²h',
        unfoldingDescription: `Trải phẳng thành 1 hình quạt tròn bán kính l = √(${r}² + ${h}²) ≈ ${l.toFixed(2)} với góc ở tâm θ = (R/l) × 360° ≈ ${sectorAngleDeg.toFixed(1)}° và 1 hình tròn đáy bán kính R = ${r}.`,
      },
    };
  }

  // 4. TETRAHEDRON (Tứ diện)
  if (shapeType === 'tetrahedron') {
    // Determine points
    const pO = points.find(p => p.name === 'O' || p.name === 'S' || p.name === 'D') || points[0] || { x: 0, y: 0, z: 4, name: 'S' };
    const pA = points.find(p => p.name === 'A') || points[1] || { x: 0, y: 0, z: 0, name: 'A' };
    const pB = points.find(p => p.name === 'B') || points[2] || { x: 4, y: 0, z: 0, name: 'B' };
    const pC = points.find(p => p.name === 'C') || points[3] || { x: 0, y: 4, z: 0, name: 'C' };

    const eAB = dist3D(pA, pB) || 4;
    const eBC = dist3D(pB, pC) || 4;
    const eCA = dist3D(pC, pA) || 4;
    const eOA = dist3D(pO, pA) || 4;
    const eOB = dist3D(pO, pB) || 4;
    const eOC = dist3D(pO, pC) || 4;

    // Triangle Heron area helper
    const heron = (x: number, y: number, z: number) => {
      const s = (x + y + z) / 2;
      return Math.sqrt(Math.max(0, s * (s - x) * (s - y) * (s - z)));
    };

    const sBase = heron(eAB, eBC, eCA) || 6.93;
    const sSide1 = heron(eAB, eOA, eOB) || 8;
    const sSide2 = heron(eBC, eOB, eOC) || 8;
    const sSide3 = heron(eCA, eOC, eOA) || 8;

    const sTp = sBase + sSide1 + sSide2 + sSide3;
    const vApprox = (1 / 6) * eOA * eOB * eOC; // exact for orthogonal corner

    return {
      type: 'tetrahedron',
      name: shapeName,
      isSupported: true,
      dimensions: {
        a: eAB,
        b: eBC,
        c: eCA,
      },
      metrics: {
        volume: vApprox,
        surfaceArea: sTp,
        lateralArea: sSide1 + sSide2 + sSide3,
        baseArea: sBase,
      },
      vertexLabels: {
        apex: pO.name,
        base: [pA.name, pB.name, pC.name],
      },
      formulas: {
        lateralAreaFormula: 'S_xq = S_ΔSAB + S_ΔSBC + S_ΔSCA',
        totalAreaFormula: 'S_tp = S_xq + S_đáy(ABC)',
        volumeFormula: 'V = (1/6) |[AB, AC] · AS|',
        unfoldingDescription: 'Trải phẳng với mặt đáy ΔABC ở trung tâm và 3 mặt tam giác bên mở bung ra 3 cạnh AB, BC, CA.',
      },
    };
  }

  // 5. PYRAMID QUAD (Hình chóp tứ giác S.ABCD)
  if (shapeType === 'pyramid_quad') {
    const pS = points.find(p => p.name === 'S') || points[0] || { x: 0, y: 0, z: 5, name: 'S' };
    const pA = points.find(p => p.name === 'A') || points[1] || { x: -2, y: -2, z: 0, name: 'A' };
    const pB = points.find(p => p.name === 'B') || points[2] || { x: 2, y: -2, z: 0, name: 'B' };
    const pC = points.find(p => p.name === 'C') || points[3] || { x: 2, y: 2, z: 0, name: 'C' };
    const pD = points.find(p => p.name === 'D') || points[4] || { x: -2, y: 2, z: 0, name: 'D' };

    const edgeA = dist3D(pA, pB) || 4;
    const edgeB = dist3D(pB, pC) || 4;
    const edgeSA = dist3D(pS, pA) || 5.74;

    const sDay = edgeA * edgeB;
    // Slant heights
    const h = pS.z !== undefined ? Math.abs(pS.z) : 5;
    const d1 = Math.sqrt(h * h + Math.pow(edgeB / 2, 2));
    const d2 = Math.sqrt(h * h + Math.pow(edgeA / 2, 2));
    const sXq = 2 * (0.5 * edgeA * d1) + 2 * (0.5 * edgeB * d2);
    const sTp = sDay + sXq;
    const v = (1 / 3) * sDay * h;

    return {
      type: 'pyramid_quad',
      name: shapeName,
      isSupported: true,
      dimensions: {
        a: edgeA,
        b: edgeB,
        height: h,
        slantHeight: edgeSA,
      },
      metrics: {
        volume: v,
        surfaceArea: sTp,
        lateralArea: sXq,
        baseArea: sDay,
      },
      vertexLabels: {
        apex: pS.name,
        base: [pA.name, pB.name, pC.name, pD.name],
      },
      formulas: {
        lateralAreaFormula: 'S_xq = S_ΔSAB + S_ΔSBC + S_ΔSCD + S_ΔSDA',
        totalAreaFormula: 'S_tp = S_đáy + S_xq',
        volumeFormula: 'V = (1/3) S_đáy × h',
        unfoldingDescription: 'Trải phẳng với mặt đáy tứ giác ABCD ở trung tâm và 4 tam giác bên mở ra 4 phía theo 4 cạnh đáy.',
      },
    };
  }

  // 6. PRISM TRI (Lăng trụ tam giác ABC.A'B'C')
  if (shapeType === 'prism_tri') {
    const pA = points.find(p => p.name === 'A') || points[0] || { x: 0, y: 0, z: 0, name: 'A' };
    const pB = points.find(p => p.name === 'B') || points[1] || { x: 4, y: 0, z: 0, name: 'B' };
    const pC = points.find(p => p.name === 'C') || points[2] || { x: 1, y: 3, z: 0, name: 'C' };
    const pA1 = points.find(p => p.name === "A'" || p.name === 'A1') || points[3] || { x: 0, y: 0, z: 4, name: "A'" };

    const cAB = dist3D(pA, pB) || 4;
    const aBC = dist3D(pB, pC) || 4.24;
    const bCA = dist3D(pC, pA) || 3.16;
    const h = dist3D(pA, pA1) || 4;

    const s = (cAB + aBC + bCA) / 2;
    const sDay = Math.sqrt(Math.max(0, s * (s - cAB) * (s - aBC) * (s - bCA))) || 6;
    const sXq = (cAB + aBC + bCA) * h;
    const sTp = sXq + 2 * sDay;
    const v = sDay * h;

    return {
      type: 'prism_tri',
      name: shapeName,
      isSupported: true,
      dimensions: {
        a: cAB,
        b: aBC,
        c: bCA,
        height: h,
      },
      metrics: {
        volume: v,
        surfaceArea: sTp,
        lateralArea: sXq,
        baseArea: sDay,
      },
      vertexLabels: {
        base: [pA.name, pB.name, pC.name],
        top: ["A'", "B'", "C'"],
      },
      formulas: {
        lateralAreaFormula: 'S_xq = Chu_vi_đáy × h = (AB + BC + CA) × h',
        totalAreaFormula: 'S_tp = S_xq + 2 S_đáy',
        volumeFormula: 'V = S_đáy × h',
        unfoldingDescription: 'Trải phẳng thành 1 dải 3 hình chữ nhật liên tiếp (chiều rộng bằng chu vi đáy, chiều cao h) và 2 đáy tam giác ở 2 cạnh đối diện.',
      },
    };
  }

  // 7. BOX (Hình hộp chữ nhật / Lập phương)
  // Default to box
  const pA = points.find(p => p.name === 'A') || points[0] || { x: 0, y: 0, z: 0, name: 'A' };
  const pB = points.find(p => p.name === 'B') || points[1] || { x: 4, y: 0, z: 0, name: 'B' };
  const pD = points.find(p => p.name === 'D') || points[3] || { x: 0, y: 3, z: 0, name: 'D' };
  const pA1 = points.find(p => p.name === "A'" || p.name === 'A1') || points[4] || { x: 0, y: 0, z: 5, name: "A'" };

  const a = dist3D(pA, pB) || 4;
  const b = dist3D(pA, pD) || 3;
  const c = dist3D(pA, pA1) || 5;

  const sXq = 2 * (a + b) * c;
  const sDay = a * b;
  const sTp = sXq + 2 * sDay;
  const v = a * b * c;

  return {
    type: 'box',
    name: shapeName,
    isSupported: true,
    dimensions: {
      a: a,
      b: b,
      c: c,
      height: c,
    },
    metrics: {
      volume: v,
      surfaceArea: sTp,
      lateralArea: sXq,
      baseArea: sDay,
    },
    vertexLabels: {
      base: ['A', 'B', 'C', 'D'],
      top: ["A'", "B'", "C'", "D'"],
    },
    formulas: {
      lateralAreaFormula: 'S_xq = 2(a + b)c = Chu_vi_đáy × h',
      totalAreaFormula: 'S_tp = 2(ab + bc + ca)',
      volumeFormula: 'V = a × b × c',
      unfoldingDescription: 'Trải phẳng dạng lưới chữ thập (Cross/T-net) gồm mặt đáy ABCD ở giữa, 4 mặt bên mở ra 4 phía và mặt nắp trên gắn ở cạnh đối.',
    },
  };
}
