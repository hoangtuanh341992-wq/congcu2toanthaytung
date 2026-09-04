import { Point3D, Vector3D } from '../types/math';

export interface VectorXYZ {
  x: number;
  y: number;
  z: number;
}

export const vec = {
  create: (x: number, y: number, z: number): VectorXYZ => ({ x, y, z }),
  fromPoints: (p1: Point3D, p2: Point3D): VectorXYZ => ({
    x: p2.x - p1.x,
    y: p2.y - p1.y,
    z: p2.z - p1.z,
  }),
  dot: (u: VectorXYZ, v: VectorXYZ): number => u.x * v.x + u.y * v.y + u.z * v.z,
  cross: (u: VectorXYZ, v: VectorXYZ): VectorXYZ => ({
    x: u.y * v.z - u.z * v.y,
    y: u.z * v.x - u.x * v.z,
    z: u.x * v.y - u.y * v.x,
  }),
  magnitude: (u: VectorXYZ): number => Math.sqrt(u.x * u.x + u.y * u.y + u.z * u.z),
  normalize: (u: VectorXYZ): VectorXYZ => {
    const mag = vec.magnitude(u);
    if (mag < 1e-9) return { x: 0, y: 0, z: 0 };
    return { x: u.x / mag, y: u.y / mag, z: u.z / mag };
  },
  add: (u: VectorXYZ, v: VectorXYZ): VectorXYZ => ({
    x: u.x + v.x,
    y: u.y + v.y,
    z: u.z + v.z,
  }),
  sub: (u: VectorXYZ, v: VectorXYZ): VectorXYZ => ({
    x: u.x - v.x,
    y: u.y - v.y,
    z: u.z - v.z,
  }),
  scale: (u: VectorXYZ, s: number): VectorXYZ => ({
    x: u.x * s,
    y: u.y * s,
    z: u.z * s,
  }),
};

// Angle between 2 vectors in degrees
export function angleBetweenVectors(u: VectorXYZ, v: VectorXYZ): number {
  const magU = vec.magnitude(u);
  const magV = vec.magnitude(v);
  if (magU < 1e-9 || magV < 1e-9) return 0;
  const cosTheta = Math.max(-1, Math.min(1, vec.dot(u, v) / (magU * magV)));
  return (Math.acos(cosTheta) * 180) / Math.PI;
}

// Angle between 2 lines (direction vectors u1, u2): cos in [0, 1]
export function angleBetweenLines(u1: VectorXYZ, u2: VectorXYZ): number {
  const mag1 = vec.magnitude(u1);
  const mag2 = vec.magnitude(u2);
  if (mag1 < 1e-9 || mag2 < 1e-9) return 0;
  const cosVal = Math.abs(vec.dot(u1, u2)) / (mag1 * mag2);
  const clamped = Math.max(0, Math.min(1, cosVal));
  return (Math.acos(clamped) * 180) / Math.PI;
}

// Angle between line (direction u) and plane (normal n): sin in [0, 1]
export function angleLineAndPlane(u: VectorXYZ, n: VectorXYZ): number {
  const magU = vec.magnitude(u);
  const magN = vec.magnitude(n);
  if (magU < 1e-9 || magN < 1e-9) return 0;
  const sinVal = Math.abs(vec.dot(u, n)) / (magU * magN);
  const clamped = Math.max(0, Math.min(1, sinVal));
  return (Math.asin(clamped) * 180) / Math.PI;
}

// Angle between 2 planes (normals n1, n2): cos in [0, 1]
export function angleBetweenPlanes(n1: VectorXYZ, n2: VectorXYZ): number {
  const mag1 = vec.magnitude(n1);
  const mag2 = vec.magnitude(n2);
  if (mag1 < 1e-9 || mag2 < 1e-9) return 0;
  const cosVal = Math.abs(vec.dot(n1, n2)) / (mag1 * mag2);
  const clamped = Math.max(0, Math.min(1, cosVal));
  return (Math.acos(clamped) * 180) / Math.PI;
}

// Distance between 2 points
export function distancePoints(p1: Point3D, p2: Point3D): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2 + (p2.z - p1.z) ** 2);
}

// Distance from point M to plane Ax + By + Cz + D = 0
export function distancePointToPlane(
  m: Point3D,
  plane: { a: number; b: number; c: number; d: number }
): number {
  const num = Math.abs(plane.a * m.x + plane.b * m.y + plane.c * m.z + plane.d);
  const den = Math.sqrt(plane.a ** 2 + plane.b ** 2 + plane.c ** 2);
  if (den < 1e-9) return 0;
  return num / den;
}

// Distance from point M to line through point A with direction u
export function distancePointToLine(m: Point3D, a: Point3D, u: VectorXYZ): number {
  const am = vec.fromPoints(a, m);
  const cross = vec.cross(am, u);
  const magCross = vec.magnitude(cross);
  const magU = vec.magnitude(u);
  if (magU < 1e-9) return distancePoints(m, a);
  return magCross / magU;
}

// Distance between two lines
// Line 1: through M1 with u1
// Line 2: through M2 with u2
export function distanceLineToLine(
  m1: Point3D,
  u1: VectorXYZ,
  m2: Point3D,
  u2: VectorXYZ
): number {
  const cross = vec.cross(u1, u2);
  const magCross = vec.magnitude(cross);
  const m1m2 = vec.fromPoints(m1, m2);

  // If parallel lines (cross product ~ 0)
  if (magCross < 1e-7) {
    return distancePointToLine(m2, m1, u1);
  }
  // Skew lines or intersecting
  return Math.abs(vec.dot(cross, m1m2)) / magCross;
}

// Plane passing through 3 non-collinear points A, B, C
export function planeFrom3Points(
  a: Point3D,
  b: Point3D,
  c: Point3D
): { a: number; b: number; c: number; d: number; normal: VectorXYZ } | null {
  const ab = vec.fromPoints(a, b);
  const ac = vec.fromPoints(a, c);
  const normal = vec.cross(ab, ac);
  const mag = vec.magnitude(normal);
  if (mag < 1e-8) return null; // Points are collinear

  // Normal vector: A, B, C
  // Plane equation: A(x - x_A) + B(y - y_A) + C(z - z_A) = 0
  // => A*x + B*y + C*z + (-A*x_A - B*y_A - C*z_A) = 0
  const d = -(normal.x * a.x + normal.y * a.y + normal.z * a.z);
  return {
    a: Number(normal.x.toFixed(4)),
    b: Number(normal.y.toFixed(4)),
    c: Number(normal.z.toFixed(4)),
    d: Number(d.toFixed(4)),
    normal,
  };
}

// Plane passing through 4 coplanar points A, B, C, D
export function planeFrom4Points(
  a: Point3D,
  b: Point3D,
  c: Point3D,
  d: Point3D
): {
  a: number;
  b: number;
  c: number;
  d: number;
  normal: VectorXYZ;
  isCoplanar: boolean;
  coplanarDistance: number;
} | null {
  // Find a valid base triangle from triplets of points
  let basePl = planeFrom3Points(a, b, c);
  let fourthPt = d;

  if (!basePl) {
    basePl = planeFrom3Points(a, b, d);
    fourthPt = c;
  }
  if (!basePl) {
    basePl = planeFrom3Points(a, c, d);
    fourthPt = b;
  }
  if (!basePl) {
    basePl = planeFrom3Points(b, c, d);
    fourthPt = a;
  }

  // If no 3 points form a plane, all 4 points are collinear
  if (!basePl) return null;

  // Calculate distance from fourth point to the plane
  const dist = distancePointToPlane(fourthPt, basePl);
  const isCoplanar = dist < 1e-4;

  return {
    a: basePl.a,
    b: basePl.b,
    c: basePl.c,
    d: basePl.d,
    normal: basePl.normal,
    isCoplanar,
    coplanarDistance: Number(dist.toFixed(4)),
  };
}

// Volume of tetrahedron ABCD: V = 1/6 * |[AB, AC] . AD|
export function volumeTetrahedron(a: Point3D, b: Point3D, c: Point3D, d: Point3D): number {
  const ab = vec.fromPoints(a, b);
  const ac = vec.fromPoints(a, c);
  const ad = vec.fromPoints(a, d);
  const cross = vec.cross(ab, ac);
  const mixed = vec.dot(cross, ad);
  return Math.abs(mixed) / 6;
}

// Triangle area from 3 points
export function areaTriangle(a: Point3D, b: Point3D, c: Point3D): number {
  const ab = vec.fromPoints(a, b);
  const ac = vec.fromPoints(a, c);
  return vec.magnitude(vec.cross(ab, ac)) / 2;
}

// Format plane equation string Ax + By + Cz + D = 0
export function formatPlaneEquation(p: { a: number; b: number; c: number; d: number }): string {
  let res = '';
  if (p.a !== 0) res += `${p.a === 1 ? '' : p.a === -1 ? '-' : p.a}x`;
  if (p.b !== 0) {
    const sign = p.b > 0 && res ? ' + ' : p.b < 0 ? ' - ' : '';
    const absB = Math.abs(p.b);
    res += `${sign}${absB === 1 ? '' : absB}y`;
  }
  if (p.c !== 0) {
    const sign = p.c > 0 && res ? ' + ' : p.c < 0 ? ' - ' : '';
    const absC = Math.abs(p.c);
    res += `${sign}${absC === 1 ? '' : absC}z`;
  }
  if (p.d !== 0) {
    const sign = p.d > 0 && res ? ' + ' : p.d < 0 ? ' - ' : '';
    res += `${sign}${Math.abs(p.d)}`;
  }
  if (!res) return '0 = 0';
  return `${res} = 0`;
}

// Format line parametric equation
export function formatLineParametric(point: { x: number; y: number; z: number }, dir: VectorXYZ): { x: string; y: string; z: string } {
  const formatComponent = (pVal: number, dVal: number) => {
    if (dVal === 0) return `${pVal}`;
    const dStr = dVal === 1 ? 't' : dVal === -1 ? '-t' : `${dVal}t`;
    if (pVal === 0) return dStr;
    return dVal > 0 ? `${pVal} + ${dStr}` : `${pVal} - ${Math.abs(dVal)}t`;
  };
  return {
    x: formatComponent(point.x, dir.x),
    y: formatComponent(point.y, dir.y),
    z: formatComponent(point.z, dir.z),
  };
}

// Format line parametric LaTeX equation for KaTeX display
export function formatLineParametricLatex(point: { x: number; y: number; z: number }, dir: VectorXYZ): string {
  const p = formatLineParametric(point, dir);
  return `\\begin{cases} x = ${p.x} \\\\ y = ${p.y} \\\\ z = ${p.z} \\end{cases}`;
}

// Format line canonical equation
export function formatLineCanonical(point: { x: number; y: number; z: number }, dir: VectorXYZ): string | null {
  if (dir.x === 0 || dir.y === 0 || dir.z === 0) {
    return null; // Không viết được chính tắc nếu có mẫu số bằng 0
  }
  const term = (pVal: number, dVal: number, varName: string) => {
    if (pVal === 0) return `\\frac{${varName}}{${dVal}}`;
    if (pVal > 0) return `\\frac{${varName} - ${pVal}}{${dVal}}`;
    return `\\frac{${varName} + ${Math.abs(pVal)}}{${dVal}}`;
  };
  return `${term(point.x, dir.x, 'x')} = ${term(point.y, dir.y, 'y')} = ${term(point.z, dir.z, 'z')}`;
}

// Project point M onto line (A, u)
export function projectPointOnLine(
  m: { x: number; y: number; z: number },
  a: { x: number; y: number; z: number },
  u: VectorXYZ
): { point: { x: number; y: number; z: number }; t: number; dist: number } {
  const am = { x: m.x - a.x, y: m.y - a.y, z: m.z - a.z };
  const uMagSq = u.x * u.x + u.y * u.y + u.z * u.z;
  if (uMagSq < 1e-9) {
    const d = Math.sqrt(am.x * am.x + am.y * am.y + am.z * am.z);
    return { point: { ...a }, t: 0, dist: d };
  }
  const dot = am.x * u.x + am.y * u.y + am.z * u.z;
  const t = dot / uMagSq;
  const h = {
    x: Number((a.x + t * u.x).toFixed(4)),
    y: Number((a.y + t * u.y).toFixed(4)),
    z: Number((a.z + t * u.z).toFixed(4)),
  };
  const mh = { x: h.x - m.x, y: h.y - m.y, z: h.z - m.z };
  const dist = Math.sqrt(mh.x * mh.x + mh.y * mh.y + mh.z * mh.z);
  return { point: h, t, dist };
}

// Find an orthogonal vector to u
export function orthogonalVector(u: VectorXYZ): VectorXYZ {
  const normU = vec.normalize(u);
  if (Math.abs(normU.x) < 0.6) {
    return vec.normalize(vec.cross(normU, { x: 1, y: 0, z: 0 }));
  }
  return vec.normalize(vec.cross(normU, { x: 0, y: 1, z: 0 }));
}

// Standard presets for Oxyz geometric figures
export interface GeometricPreset {
  name: string;
  description: string;
  points: Point3D[];
  type: 'tetrahedron' | 'pyramid_quad' | 'prism_tri' | 'box' | 'cylinder' | 'sphere' | 'cone';
  params?: { radius?: number; height?: number };
}

export const OXYZ_PRESETS: GeometricPreset[] = [
  {
    name: 'Tứ diện OABC vuông tại O',
    description: 'Tứ diện có 3 cạnh đôi một vuông góc tại gốc O: OA=3, OB=4, OC=5',
    type: 'tetrahedron',
    points: [
      { id: 'O', name: 'O', x: 0, y: 0, z: 0, color: '#64748b' },
      { id: 'A', name: 'A', x: 3, y: 0, z: 0, color: '#ef4444' },
      { id: 'B', name: 'B', x: 0, y: 4, z: 0, color: '#10b981' },
      { id: 'C', name: 'C', x: 0, y: 0, z: 5, color: '#3b82f6' },
    ],
  },
  {
    name: 'Hình chóp tứ giác đều S.ABCD',
    description: 'Chóp có đáy là hình vuông ABCD tâm O, đỉnh S nằm trên trục Oz',
    type: 'pyramid_quad',
    points: [
      { id: 'S', name: 'S', x: 0, y: 0, z: 5, color: '#f59e0b' },
      { id: 'A', name: 'A', x: -2, y: -2, z: 0, color: '#3b82f6' },
      { id: 'B', name: 'B', x: 2, y: -2, z: 0, color: '#3b82f6' },
      { id: 'C', name: 'C', x: 2, y: 2, z: 0, color: '#3b82f6' },
      { id: 'D', name: 'D', x: -2, y: 2, z: 0, color: '#3b82f6' },
      { id: 'O', name: 'O', x: 0, y: 0, z: 0, color: '#64748b' },
    ],
  },
  {
    name: 'Lăng trụ tam giác đứng ABC.A\'B\'C\'',
    description: 'Đáy ABC nằm trên Oxy, các cạnh bên song song với Oz',
    type: 'prism_tri',
    points: [
      { id: 'A', name: 'A', x: 0, y: 0, z: 0, color: '#3b82f6' },
      { id: 'B', name: 'B', x: 4, y: 0, z: 0, color: '#3b82f6' },
      { id: 'C', name: 'C', x: 1, y: 3, z: 0, color: '#3b82f6' },
      { id: 'A1', name: "A'", x: 0, y: 0, z: 4, color: '#8b5cf6' },
      { id: 'B1', name: "B'", x: 4, y: 0, z: 4, color: '#8b5cf6' },
      { id: 'C1', name: "C'", x: 1, y: 3, z: 4, color: '#8b5cf6' },
    ],
  },
  {
    name: 'Hình hộp chữ nhật ABCD.A\'B\'C\'D\'',
    description: 'Kích thước a=4, b=3, c=5 trong hệ trục Oxyz',
    type: 'box',
    points: [
      { id: 'A', name: 'A', x: 0, y: 0, z: 0, color: '#3b82f6' },
      { id: 'B', name: 'B', x: 4, y: 0, z: 0, color: '#3b82f6' },
      { id: 'C', name: 'C', x: 4, y: 3, z: 0, color: '#3b82f6' },
      { id: 'D', name: 'D', x: 0, y: 3, z: 0, color: '#3b82f6' },
      { id: 'A1', name: "A'", x: 0, y: 0, z: 5, color: '#06b6d4' },
      { id: 'B1', name: "B'", x: 4, y: 0, z: 5, color: '#06b6d4' },
      { id: 'C1', name: "C'", x: 4, y: 3, z: 5, color: '#06b6d4' },
      { id: 'D1', name: "D'", x: 0, y: 3, z: 5, color: '#06b6d4' },
    ],
  },
  {
    name: 'Mặt cầu (S) tâm I(1; 2; 3), R = 3',
    description: 'Phương trình (x-1)^2 + (y-2)^2 + (z-3)^2 = 9',
    type: 'sphere',
    points: [
      { id: 'I', name: 'I', x: 1, y: 2, z: 3, color: '#ec4899' },
    ],
    params: { radius: 3 },
  },
  {
    name: 'Hình trụ (T) đáy tâm O, bán kính R = 2.5, chiều cao h = 5',
    description: 'Trục Oz, đáy trên z = 5',
    type: 'cylinder',
    points: [
      { id: 'O', name: 'O', x: 0, y: 0, z: 0, color: '#64748b' },
      { id: 'O1', name: "O'", x: 0, y: 0, z: 5, color: '#64748b' },
    ],
    params: { radius: 2.5, height: 5 },
  },
  {
    name: 'Hình nón tròn xoay (N) đỉnh S, đáy tâm O, R = 3, h = 5',
    description: 'Trục Oz, đỉnh S(0; 0; 5), tâm đáy O(0; 0; 0), bán kính R = 3, đường sinh l = √34 ≈ 5.83',
    type: 'cone',
    points: [
      { id: 'S', name: 'S', x: 0, y: 0, z: 5, color: '#f59e0b' },
      { id: 'O', name: 'O', x: 0, y: 0, z: 0, color: '#64748b' },
      { id: 'A', name: 'A', x: 3, y: 0, z: 0, color: '#38bdf8' },
      { id: 'B', name: 'B', x: 0, y: 3, z: 0, color: '#38bdf8' },
      { id: 'C', name: 'C', x: -3, y: 0, z: 0, color: '#38bdf8' },
    ],
    params: { radius: 3, height: 5 },
  },
];
