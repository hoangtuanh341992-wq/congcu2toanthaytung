export interface FunctionAnalysis {
  fExpr: string;
  gExpr: string;
  a: number;
  b: number;
  // Calculus
  fDerivative: string;
  gDerivative: string;
  fAntiderivative: string;
  gAntiderivative: string;
  integralF: number | null;
  integralG: number | null;
  areaBetween: number | null;
  revolutionVolumeOx: number | null;
  revolutionVolumeOy: number | null;
  tangentLine?: { x0: number; y0: number; k: number; eq: string; normalEq: string };
  // Extrema & Monotonicity
  criticalPoints: { x: number; y: number; type: 'cực đại' | 'cực tiểu' | 'điểm uốn' | 'dừng' }[];
  rootsF: number[];
  rootsG: number[];
  intersectionPoints: { x: number; y: number }[];
  monotonicIntervals: { interval: string; type: 'đồng biến' | 'nghịch biến' }[];
  asymptotes: { vertical: number[]; horizontal: number[] };
}

export interface VariationPoint {
  x: number;
  xLabel: string;
  derivativeVal: number | null; // 0, undefined (vertical asymptote), or sign transition
  isAsymptote?: boolean;
  fxVal: number | null;
  fxLabel: string;
  leftLimit?: { level: 'top' | 'middle' | 'bottom'; label: string };
  rightLimit?: { level: 'top' | 'middle' | 'bottom'; label: string };
  type?: 'cực đại' | 'cực tiểu' | 'không xác định' | 'vô cực';
}

export interface VariationInterval {
  sign: '+' | '-' | '0';
  isUndefined?: boolean;
}

export interface VariationSegment {
  startIndex: number;
  endIndex: number;
  startLabel: string;
  endLabel: string;
  startLevel: 'top' | 'middle' | 'bottom';
  endLevel: 'top' | 'middle' | 'bottom';
  direction: 'up' | 'down' | 'flat';
  sign: '+' | '-' | '0';
  isLeftOfAsymptote?: boolean;
  isRightOfAsymptote?: boolean;
}

export interface TextbookVariationData {
  points: VariationPoint[];
  intervals: VariationInterval[];
  segments: VariationSegment[];
  domainText: string;
}

export interface Point3D {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  color?: string;
}

export interface Vector3D {
  id: string;
  name: string;
  from?: string; // Point ID
  to?: string;   // Point ID
  x: number;
  y: number;
  z: number;
  color?: string;
}

export interface Segment3D {
  id: string;
  name: string;
  point1Id: string;
  point2Id: string;
  color?: string;
  length?: number;
}

export interface Line3D {
  id: string;
  name: string;
  point1Id?: string;
  point2Id?: string;
  point?: { x: number; y: number; z: number };
  dir?: { x: number; y: number; z: number };
  color?: string;
}

export interface Plane3D {
  id: string;
  name: string;
  // Ax + By + Cz + D = 0
  a: number;
  b: number;
  c: number;
  d: number;
  pointIds?: string[];
  color?: string;
  opacity?: number;
  visible?: boolean;       // Ẩn / Hiện mặt phẳng (mặc định true)
  fillColor?: boolean;     // Ẩn / Hiện chức năng tô màu (mặc định true)
  regionOnly?: boolean;    // Chỉ tô màu miền giới hạn bởi các điểm (mặc định true khi có pointIds)
}

export type Solid3DType = 'tetrahedron' | 'pyramid_quad' | 'prism_tri' | 'box' | 'cylinder' | 'sphere' | 'cone';

export interface Solid3D {
  id: string;
  name: string;
  type: Solid3DType;
  pointIds: string[];
  // For cylinder / sphere / cone
  radius?: number;
  height?: number;
  centerId?: string;
  apexId?: string;
  color?: string;
  volume?: number;
  surfaceArea?: number;
}

export interface SavedScene3D {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  points: Point3D[];
  vectors: Vector3D[];
  segments: Segment3D[];
  lines: Line3D[];
  planes: Plane3D[];
  solids: Solid3D[];
}
