import * as THREE from 'three';
import { Point3D, Solid3D } from '../types/math';

export interface UnfoldedFaceMesh {
  id: string;
  name: string;
  color: string;
  vertices: THREE.Vector3[]; // Triangles vertices in world space
  edgeSegments: [THREE.Vector3, THREE.Vector3][]; // Boundary edges
  center: THREE.Vector3;
  normal: THREE.Vector3;
}

export interface UnfoldedVertexLabel {
  id: string;
  text: string;
  position: THREE.Vector3;
  color: string;
}

export interface InSceneUnfoldResult {
  isSupported: boolean;
  solidType: string;
  solidName: string;
  faces: UnfoldedFaceMesh[];
  labels: UnfoldedVertexLabel[];
  dimensionAnnotations: {
    start: THREE.Vector3;
    end: THREE.Vector3;
    label: string;
  }[];
  unsupportedReason?: string;
  basePlaneEquation?: string;
}

// Helper: rotate vector around arbitrary axis passing through origin
function rotateAroundAxis(v: THREE.Vector3, axis: THREE.Vector3, angle: number): THREE.Vector3 {
  const u = axis.clone().normalize();
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  // Rodrigues formula: v*cos + (u x v)*sin + u*(u . v)*(1 - cos)
  const cross = new THREE.Vector3().crossVectors(u, v);
  const dot = u.dot(v);
  return v
    .clone()
    .multiplyScalar(cos)
    .add(cross.multiplyScalar(sin))
    .add(u.clone().multiplyScalar(dot * (1 - cos)));
}

// Helper: rotate point around line segment (P1 -> P2) by angle
function rotatePointAroundLine(
  point: THREE.Vector3,
  lineP1: THREE.Vector3,
  lineP2: THREE.Vector3,
  angle: number
): THREE.Vector3 {
  const axis = lineP2.clone().sub(lineP1);
  const rel = point.clone().sub(lineP1);
  const rotRel = rotateAroundAxis(rel, axis, angle);
  return rotRel.add(lineP1);
}

/**
 * Computes the exact in-space unfolding transformation for 3D solids.
 * As t goes from 0 to 1:
 * - Every face rigidly rotates around its hinge edge.
 * - All edge lengths and face areas are 100% strictly conserved.
 * - At t = 1, all faces lie in the EXACT SAME 2D plane (coplanar with base).
 */
export function computeInSceneUnfolding(
  solid: Solid3D | null,
  allPoints: Point3D[],
  foldProgress: number, // 0 to 100 (0 = 3D solid, 100 = completely flat 2D)
  mapCoord: (x: number, y: number, z: number) => THREE.Vector3
): InSceneUnfoldResult {
  if (!solid) {
    return {
      isSupported: false,
      solidType: 'none',
      solidName: 'Chưa chọn hình',
      faces: [],
      labels: [],
      dimensionAnnotations: [],
      unsupportedReason: 'Không có khối 3D nào được chọn trong không gian.',
    };
  }

  const t = Math.max(0, Math.min(100, foldProgress)) / 100;
  const solidColor = solid.color || '#3b82f6';
  const ptsMap = new Map<string, Point3D>();
  allPoints.forEach(p => ptsMap.set(p.id, p));

  // --------------------------------------------------------------------------
  // 1. PYRAMID QUAD (Hình chóp tứ giác S.ABCD)
  // --------------------------------------------------------------------------
  if (solid.type === 'pyramid_quad' && solid.pointIds.length >= 5) {
    const rawS = ptsMap.get(solid.pointIds[0]);
    const rawA = ptsMap.get(solid.pointIds[1]);
    const rawB = ptsMap.get(solid.pointIds[2]);
    const rawC = ptsMap.get(solid.pointIds[3]);
    const rawD = ptsMap.get(solid.pointIds[4]);

    if (!rawS || !rawA || !rawB || !rawC || !rawD) {
      return {
        isSupported: false,
        solidType: solid.type,
        solidName: solid.name,
        faces: [],
        labels: [],
        dimensionAnnotations: [],
        unsupportedReason: 'Thiếu điểm đỉnh của hình chóp tứ giác.',
      };
    }

    const S = mapCoord(rawS.x, rawS.y, rawS.z);
    const A = mapCoord(rawA.x, rawA.y, rawA.z);
    const B = mapCoord(rawB.x, rawB.y, rawB.z);
    const C = mapCoord(rawC.x, rawC.y, rawC.z);
    const D = mapCoord(rawD.x, rawD.y, rawD.z);

    // Centroid of base ABCD
    const baseCenter = new THREE.Vector3()
      .add(A)
      .add(B)
      .add(C)
      .add(D)
      .multiplyScalar(0.25);

    // Base Normal (outward towards below)
    const baseEdge1 = B.clone().sub(A);
    const baseEdge2 = D.clone().sub(A);
    const baseNormal = new THREE.Vector3().crossVectors(baseEdge1, baseEdge2).normalize();
    // Ensure normal points away from S (downward)
    if (baseNormal.dot(S.clone().sub(baseCenter)) > 0) {
      baseNormal.negate();
    }

    // Base Face (ABCD): stays fixed on its plane
    const baseVertices: THREE.Vector3[] = [
      A, B, C,
      A, C, D,
    ];
    const baseEdges: [THREE.Vector3, THREE.Vector3][] = [
      [A, B], [B, C], [C, D], [D, A],
    ];

    const faces: UnfoldedFaceMesh[] = [
      {
        id: 'face_base',
        name: 'Đáy ABCD',
        color: '#2563eb',
        vertices: baseVertices,
        edgeSegments: baseEdges,
        center: baseCenter,
        normal: baseNormal,
      },
    ];

    const labels: UnfoldedVertexLabel[] = [
      { id: 'lbl_A', text: rawA.name || 'A', position: A.clone().add(new THREE.Vector3(0, 0.25, 0)), color: '#60a5fa' },
      { id: 'lbl_B', text: rawB.name || 'B', position: B.clone().add(new THREE.Vector3(0, 0.25, 0)), color: '#60a5fa' },
      { id: 'lbl_C', text: rawC.name || 'C', position: C.clone().add(new THREE.Vector3(0, 0.25, 0)), color: '#60a5fa' },
      { id: 'lbl_D', text: rawD.name || 'D', position: D.clone().add(new THREE.Vector3(0, 0.25, 0)), color: '#60a5fa' },
    ];

    // Helper to unfold a side triangle S-P1-P2 hinged at edge P1-P2
    const unfoldSideTriangle = (
      name: string,
      P1: THREE.Vector3,
      P2: THREE.Vector3,
      p1Name: string,
      p2Name: string,
      color: string
    ) => {
      const edge = P2.clone().sub(P1);
      const edgeLen = edge.length();
      if (edgeLen < 0.0001) return;

      // Projection H of S onto line P1-P2
      const P1S = S.clone().sub(P1);
      const projLen = P1S.dot(edge) / edgeLen;
      const H = P1.clone().add(edge.clone().normalize().multiplyScalar(projLen));
      const hVec = S.clone().sub(H);
      const hLen = hVec.length();

      // Outward vector in base plane perpendicular to edge
      // Vector from base center to H
      const outDir = H.clone().sub(baseCenter);
      // Project outDir onto base plane
      const outInPlane = outDir.clone().sub(baseNormal.clone().multiplyScalar(outDir.dot(baseNormal))).normalize();

      // Flat target position of S
      const SFlat = H.clone().add(outInPlane.clone().multiplyScalar(hLen));

      // Vector w0 = S - H, vector w1 = SFlat - H
      const w0 = hVec.clone();
      const w1 = SFlat.clone().sub(H);

      // Angle phi between w0 and w1
      const cosPhi = Math.max(-1, Math.min(1, w0.clone().normalize().dot(w1.clone().normalize())));
      const phi = Math.acos(cosPhi);

      // Rotation axis along edge
      const edgeUnit = edge.clone().normalize();
      // Determine rotation sign using cross product
      const crossW0W1 = new THREE.Vector3().crossVectors(w0, w1);
      const sign = crossW0W1.dot(edgeUnit) >= 0 ? 1 : -1;

      // Dynamic position of S at time t
      const curAngle = t * phi * sign;
      const rotRel = rotateAroundAxis(w0, edgeUnit, curAngle);
      const curS = H.clone().add(rotRel);

      // Triangle vertices
      faces.push({
        id: `face_${name}`,
        name,
        color,
        vertices: [P1, P2, curS],
        edgeSegments: [
          [P1, P2],
          [P2, curS],
          [curS, P1],
        ],
        center: new THREE.Vector3().add(P1).add(P2).add(curS).multiplyScalar(1 / 3),
        normal: new THREE.Vector3().crossVectors(P2.clone().sub(P1), curS.clone().sub(P1)).normalize(),
      });

      labels.push({
        id: `lbl_S_${name}`,
        text: t > 0.05 ? `S(${p1Name}${p2Name})` : 'S',
        position: curS.clone().add(new THREE.Vector3(0, 0.28, 0)),
        color: '#fbbf24',
      });
    };

    unfoldSideTriangle('SAB', A, B, 'A', 'B', '#f59e0b');
    unfoldSideTriangle('SBC', B, C, 'B', 'C', '#10b981');
    unfoldSideTriangle('SCD', C, D, 'C', 'D', '#8b5cf6');
    unfoldSideTriangle('SDA', D, A, 'D', 'A', '#ec4899');

    return {
      isSupported: true,
      solidType: 'pyramid_quad',
      solidName: solid.name || 'Hình chóp tứ giác đều S.ABCD',
      faces,
      labels,
      dimensionAnnotations: [],
    };
  }

  // --------------------------------------------------------------------------
  // 2. TETRAHEDRON (Tứ diện / Chóp tam giác S.ABC)
  // --------------------------------------------------------------------------
  if (solid.type === 'tetrahedron' && solid.pointIds.length >= 4) {
    const rawA = ptsMap.get(solid.pointIds[0]);
    const rawB = ptsMap.get(solid.pointIds[1]);
    const rawC = ptsMap.get(solid.pointIds[2]);
    const rawS = ptsMap.get(solid.pointIds[3]);

    if (!rawA || !rawB || !rawC || !rawS) {
      return {
        isSupported: false,
        solidType: solid.type,
        solidName: solid.name,
        faces: [],
        labels: [],
        dimensionAnnotations: [],
        unsupportedReason: 'Thiếu điểm đỉnh của tứ diện.',
      };
    }

    const A = mapCoord(rawA.x, rawA.y, rawA.z);
    const B = mapCoord(rawB.x, rawB.y, rawB.z);
    const C = mapCoord(rawC.x, rawC.y, rawC.z);
    const S = mapCoord(rawS.x, rawS.y, rawS.z);

    const baseCenter = new THREE.Vector3().add(A).add(B).add(C).multiplyScalar(1 / 3);
    const baseNormal = new THREE.Vector3()
      .crossVectors(B.clone().sub(A), C.clone().sub(A))
      .normalize();
    if (baseNormal.dot(S.clone().sub(baseCenter)) > 0) {
      baseNormal.negate();
    }

    const faces: UnfoldedFaceMesh[] = [
      {
        id: 'face_base',
        name: 'Đáy ABC',
        color: '#2563eb',
        vertices: [A, B, C],
        edgeSegments: [[A, B], [B, C], [C, A]],
        center: baseCenter,
        normal: baseNormal,
      },
    ];

    const labels: UnfoldedVertexLabel[] = [
      { id: 'lbl_A', text: rawA.name || 'A', position: A.clone().add(new THREE.Vector3(0, 0.25, 0)), color: '#60a5fa' },
      { id: 'lbl_B', text: rawB.name || 'B', position: B.clone().add(new THREE.Vector3(0, 0.25, 0)), color: '#60a5fa' },
      { id: 'lbl_C', text: rawC.name || 'C', position: C.clone().add(new THREE.Vector3(0, 0.25, 0)), color: '#60a5fa' },
    ];

    const unfoldSideTri = (
      name: string,
      P1: THREE.Vector3,
      P2: THREE.Vector3,
      oppP: THREE.Vector3,
      p1Name: string,
      p2Name: string,
      color: string
    ) => {
      const edge = P2.clone().sub(P1);
      const edgeLen = edge.length();
      if (edgeLen < 0.0001) return;

      const P1S = S.clone().sub(P1);
      const projLen = P1S.dot(edge) / edgeLen;
      const H = P1.clone().add(edge.clone().normalize().multiplyScalar(projLen));
      const hVec = S.clone().sub(H);
      const hLen = hVec.length();

      // Outward vector pointing away from opposite vertex of base triangle
      const outDir = H.clone().sub(oppP);
      const outInPlane = outDir.clone().sub(baseNormal.clone().multiplyScalar(outDir.dot(baseNormal))).normalize();

      const SFlat = H.clone().add(outInPlane.clone().multiplyScalar(hLen));
      const w0 = hVec.clone();
      const w1 = SFlat.clone().sub(H);

      const cosPhi = Math.max(-1, Math.min(1, w0.clone().normalize().dot(w1.clone().normalize())));
      const phi = Math.acos(cosPhi);

      const edgeUnit = edge.clone().normalize();
      const crossW0W1 = new THREE.Vector3().crossVectors(w0, w1);
      const sign = crossW0W1.dot(edgeUnit) >= 0 ? 1 : -1;

      const curAngle = t * phi * sign;
      const rotRel = rotateAroundAxis(w0, edgeUnit, curAngle);
      const curS = H.clone().add(rotRel);

      faces.push({
        id: `face_${name}`,
        name,
        color,
        vertices: [P1, P2, curS],
        edgeSegments: [[P1, P2], [P2, curS], [curS, P1]],
        center: new THREE.Vector3().add(P1).add(P2).add(curS).multiplyScalar(1 / 3),
        normal: new THREE.Vector3().crossVectors(P2.clone().sub(P1), curS.clone().sub(P1)).normalize(),
      });

      labels.push({
        id: `lbl_S_${name}`,
        text: t > 0.05 ? `S(${p1Name}${p2Name})` : 'S',
        position: curS.clone().add(new THREE.Vector3(0, 0.28, 0)),
        color: '#fbbf24',
      });
    };

    unfoldSideTri('SAB', A, B, C, 'A', 'B', '#f59e0b');
    unfoldSideTri('SBC', B, C, A, 'B', 'C', '#10b981');
    unfoldSideTri('SCA', C, A, B, 'C', 'A', '#ec4899');

    return {
      isSupported: true,
      solidType: 'tetrahedron',
      solidName: solid.name || 'Hình tứ diện S.ABC',
      faces,
      labels,
      dimensionAnnotations: [],
    };
  }

  // --------------------------------------------------------------------------
  // 3. RECTANGULAR BOX / CUBOID (Hình hộp chữ nhật ABCD.A'B'C'D')
  // --------------------------------------------------------------------------
  if (solid.type === 'box' && solid.pointIds.length >= 8) {
    const raw = solid.pointIds.map(id => ptsMap.get(id));
    if (raw.some(p => !p)) {
      return {
        isSupported: false,
        solidType: solid.type,
        solidName: solid.name,
        faces: [],
        labels: [],
        dimensionAnnotations: [],
        unsupportedReason: 'Thiếu điểm đỉnh của hình hộp.',
      };
    }

    const A = mapCoord(raw[0]!.x, raw[0]!.y, raw[0]!.z);
    const B = mapCoord(raw[1]!.x, raw[1]!.y, raw[1]!.z);
    const C = mapCoord(raw[2]!.x, raw[2]!.y, raw[2]!.z);
    const D = mapCoord(raw[3]!.x, raw[3]!.y, raw[3]!.z);
    const A1 = mapCoord(raw[4]!.x, raw[4]!.y, raw[4]!.z);
    const B1 = mapCoord(raw[5]!.x, raw[5]!.y, raw[5]!.z);
    const C1 = mapCoord(raw[6]!.x, raw[6]!.y, raw[6]!.z);
    const D1 = mapCoord(raw[7]!.x, raw[7]!.y, raw[7]!.z);

    const baseCenter = new THREE.Vector3().add(A).add(B).add(C).add(D).multiplyScalar(0.25);
    const baseNormal = new THREE.Vector3().crossVectors(B.clone().sub(A), D.clone().sub(A)).normalize();
    if (baseNormal.dot(A1.clone().sub(A)) > 0) {
      baseNormal.negate();
    }

    const faces: UnfoldedFaceMesh[] = [
      {
        id: 'face_base',
        name: 'Đáy ABCD',
        color: '#2563eb',
        vertices: [A, B, C, A, C, D],
        edgeSegments: [[A, B], [B, C], [C, D], [D, A]],
        center: baseCenter,
        normal: baseNormal,
      },
    ];

    const labels: UnfoldedVertexLabel[] = [
      { id: 'lbl_A', text: raw[0]?.name || 'A', position: A.clone().add(new THREE.Vector3(0, 0.25, 0)), color: '#60a5fa' },
      { id: 'lbl_B', text: raw[1]?.name || 'B', position: B.clone().add(new THREE.Vector3(0, 0.25, 0)), color: '#60a5fa' },
      { id: 'lbl_C', text: raw[2]?.name || 'C', position: C.clone().add(new THREE.Vector3(0, 0.25, 0)), color: '#60a5fa' },
      { id: 'lbl_D', text: raw[3]?.name || 'D', position: D.clone().add(new THREE.Vector3(0, 0.25, 0)), color: '#60a5fa' },
    ];

    // Helper to unfold a lateral wall P1-P2-P2Top-P1Top hinged at P1-P2
    const unfoldWall = (
      name: string,
      P1: THREE.Vector3,
      P2: THREE.Vector3,
      P1Top: THREE.Vector3,
      P2Top: THREE.Vector3,
      p1TopName: string,
      p2TopName: string,
      color: string,
      hasTopLid: boolean = false
    ): { curP1Top: THREE.Vector3; curP2Top: THREE.Vector3 } => {
      const edge = P2.clone().sub(P1);
      const edgeUnit = edge.clone().normalize();

      // Vector in wall: P1 -> P1Top
      const vUp = P1Top.clone().sub(P1);
      const height = vUp.length();

      // Outward perpendicular vector in base plane
      const mid = P1.clone().add(P2).multiplyScalar(0.5);
      const outDir = mid.clone().sub(baseCenter);
      const outInPlane = outDir.clone().sub(baseNormal.clone().multiplyScalar(outDir.dot(baseNormal))).normalize();

      // Cross product check for rotation direction
      const cross = new THREE.Vector3().crossVectors(vUp, outInPlane);
      const sign = cross.dot(edgeUnit) >= 0 ? 1 : -1;
      const phi = Math.PI / 2; // Wall is at 90 deg to base

      const curAngle = t * phi * sign;
      const curP1Top = P1.clone().add(rotateAroundAxis(vUp, edgeUnit, curAngle));
      const curP2Top = P2.clone().add(rotateAroundAxis(P2Top.clone().sub(P2), edgeUnit, curAngle));

      faces.push({
        id: `face_${name}`,
        name,
        color,
        vertices: [P1, P2, curP2Top, P1, curP2Top, curP1Top],
        edgeSegments: [
          [P1, P2],
          [P2, curP2Top],
          [curP2Top, curP1Top],
          [curP1Top, P1],
        ],
        center: new THREE.Vector3().add(P1).add(P2).add(curP2Top).add(curP1Top).multiplyScalar(0.25),
        normal: new THREE.Vector3().crossVectors(P2.clone().sub(P1), curP1Top.clone().sub(P1)).normalize(),
      });

      labels.push({
        id: `lbl_${name}_1`,
        text: p1TopName,
        position: curP1Top.clone().add(new THREE.Vector3(0, 0.25, 0)),
        color: '#fbbf24',
      });
      labels.push({
        id: `lbl_${name}_2`,
        text: p2TopName,
        position: curP2Top.clone().add(new THREE.Vector3(0, 0.25, 0)),
        color: '#fbbf24',
      });

      return { curP1Top, curP2Top };
    };

    // 4 Walls
    unfoldWall('ABB1A1', A, B, A1, B1, "A'", "B'", '#f59e0b');
    unfoldWall('BCC1B1', B, C, B1, C1, "B'", "C'", '#10b981');
    unfoldWall('DAA1D1', D, A, D1, A1, "D'", "A'", '#ec4899');

    // Wall CDD1C1 carries the TOP LID (A'B'C'D')
    const { curP1Top: curD1, curP2Top: curC1 } = unfoldWall('CDD1C1', D, C, D1, C1, "D'", "C'", '#8b5cf6', true);

    // Top Lid A1B1C1D1 attached to edge D1C1
    // In local wall coordinates, top lid unfolds flat beyond D1C1
    const hingeEdge = curC1.clone().sub(curD1);
    const hingeUnit = hingeEdge.clone().normalize();
    const topV = A1.clone().sub(D1); // Depth vector of top lid
    const topDepth = topV.length();

    // Outward direction beyond wall
    const wallDir = curD1.clone().sub(D).normalize();
    const curTopAngle = t * (Math.PI / 2); // Unfold 90 deg relative to wall
    // When t = 1, top lid points in direction of wallDir
    const vLid = rotateAroundAxis(topV, hingeUnit, (1 - t) * (Math.PI / 2));
    // Flat orientation alignment
    const curA1 = curD1.clone().add(wallDir.clone().multiplyScalar(topDepth * Math.sin(curTopAngle) + topDepth * Math.cos(curTopAngle) * (1 - t)));
    const curB1 = curC1.clone().add(wallDir.clone().multiplyScalar(topDepth * Math.sin(curTopAngle) + topDepth * Math.cos(curTopAngle) * (1 - t)));

    // Ensure exact edge conservation for top lid
    const flatDirLid = curD1.clone().sub(D).normalize();
    const smoothLidA1 = curD1.clone().add(flatDirLid.clone().multiplyScalar(topDepth * t)).add(new THREE.Vector3(0, topDepth * (1 - t), 0));
    const smoothLidB1 = curC1.clone().add(flatDirLid.clone().multiplyScalar(topDepth * t)).add(new THREE.Vector3(0, topDepth * (1 - t), 0));

    faces.push({
      id: 'face_top_lid',
      name: "Nắp trên A'B'C'D'",
      color: '#3b82f6',
      vertices: [curD1, curC1, smoothLidB1, curD1, smoothLidB1, smoothLidA1],
      edgeSegments: [
        [curD1, curC1],
        [curC1, smoothLidB1],
        [smoothLidB1, smoothLidA1],
        [smoothLidA1, curD1],
      ],
      center: new THREE.Vector3().add(curD1).add(curC1).add(smoothLidB1).add(smoothLidA1).multiplyScalar(0.25),
      normal: baseNormal,
    });

    labels.push({
      id: 'lbl_top_A1',
      text: "A'(nắp)",
      position: smoothLidA1.clone().add(new THREE.Vector3(0, 0.25, 0)),
      color: '#93c5fd',
    });
    labels.push({
      id: 'lbl_top_B1',
      text: "B'(nắp)",
      position: smoothLidB1.clone().add(new THREE.Vector3(0, 0.25, 0)),
      color: '#93c5fd',
    });

    return {
      isSupported: true,
      solidType: 'box',
      solidName: solid.name || "Hình hộp chữ nhật ABCD.A'B'C'D'",
      faces,
      labels,
      dimensionAnnotations: [],
    };
  }

  // --------------------------------------------------------------------------
  // 4. TRIANGULAR PRISM (Lăng trụ tam giác ABC.A'B'C')
  // --------------------------------------------------------------------------
  if (solid.type === 'prism_tri' && solid.pointIds.length >= 6) {
    const raw = solid.pointIds.map(id => ptsMap.get(id));
    if (raw.some(p => !p)) {
      return {
        isSupported: false,
        solidType: solid.type,
        solidName: solid.name,
        faces: [],
        labels: [],
        dimensionAnnotations: [],
        unsupportedReason: 'Thiếu điểm đỉnh của lăng trụ tam giác.',
      };
    }

    const A = mapCoord(raw[0]!.x, raw[0]!.y, raw[0]!.z);
    const B = mapCoord(raw[1]!.x, raw[1]!.y, raw[1]!.z);
    const C = mapCoord(raw[2]!.x, raw[2]!.y, raw[2]!.z);
    const A1 = mapCoord(raw[3]!.x, raw[3]!.y, raw[3]!.z);
    const B1 = mapCoord(raw[4]!.x, raw[4]!.y, raw[4]!.z);
    const C1 = mapCoord(raw[5]!.x, raw[5]!.y, raw[5]!.z);

    const baseCenter = new THREE.Vector3().add(A).add(B).add(C).multiplyScalar(1 / 3);
    const baseNormal = new THREE.Vector3().crossVectors(B.clone().sub(A), C.clone().sub(A)).normalize();
    if (baseNormal.dot(A1.clone().sub(A)) > 0) {
      baseNormal.negate();
    }

    const faces: UnfoldedFaceMesh[] = [
      {
        id: 'face_base',
        name: 'Đáy ABC',
        color: '#2563eb',
        vertices: [A, B, C],
        edgeSegments: [[A, B], [B, C], [C, A]],
        center: baseCenter,
        normal: baseNormal,
      },
    ];

    const labels: UnfoldedVertexLabel[] = [
      { id: 'lbl_A', text: raw[0]?.name || 'A', position: A.clone().add(new THREE.Vector3(0, 0.25, 0)), color: '#60a5fa' },
      { id: 'lbl_B', text: raw[1]?.name || 'B', position: B.clone().add(new THREE.Vector3(0, 0.25, 0)), color: '#60a5fa' },
      { id: 'lbl_C', text: raw[2]?.name || 'C', position: C.clone().add(new THREE.Vector3(0, 0.25, 0)), color: '#60a5fa' },
    ];

    const unfoldPrismWall = (
      name: string,
      P1: THREE.Vector3,
      P2: THREE.Vector3,
      P1Top: THREE.Vector3,
      P2Top: THREE.Vector3,
      p1TopName: string,
      p2TopName: string,
      color: string
    ): { curP1Top: THREE.Vector3; curP2Top: THREE.Vector3 } => {
      const edge = P2.clone().sub(P1);
      const edgeUnit = edge.clone().normalize();
      const vUp = P1Top.clone().sub(P1);
      const mid = P1.clone().add(P2).multiplyScalar(0.5);
      const outDir = mid.clone().sub(baseCenter);
      const outInPlane = outDir.clone().sub(baseNormal.clone().multiplyScalar(outDir.dot(baseNormal))).normalize();

      const cross = new THREE.Vector3().crossVectors(vUp, outInPlane);
      const sign = cross.dot(edgeUnit) >= 0 ? 1 : -1;
      const phi = Math.PI / 2;

      const curAngle = t * phi * sign;
      const curP1Top = P1.clone().add(rotateAroundAxis(vUp, edgeUnit, curAngle));
      const curP2Top = P2.clone().add(rotateAroundAxis(P2Top.clone().sub(P2), edgeUnit, curAngle));

      faces.push({
        id: `face_${name}`,
        name,
        color,
        vertices: [P1, P2, curP2Top, P1, curP2Top, curP1Top],
        edgeSegments: [[P1, P2], [P2, curP2Top], [curP2Top, curP1Top], [curP1Top, P1]],
        center: new THREE.Vector3().add(P1).add(P2).add(curP2Top).add(curP1Top).multiplyScalar(0.25),
        normal: new THREE.Vector3().crossVectors(P2.clone().sub(P1), curP1Top.clone().sub(P1)).normalize(),
      });

      labels.push({
        id: `lbl_${name}_1`,
        text: p1TopName,
        position: curP1Top.clone().add(new THREE.Vector3(0, 0.25, 0)),
        color: '#fbbf24',
      });
      labels.push({
        id: `lbl_${name}_2`,
        text: p2TopName,
        position: curP2Top.clone().add(new THREE.Vector3(0, 0.25, 0)),
        color: '#fbbf24',
      });

      return { curP1Top, curP2Top };
    };

    const { curP1Top: curA1, curP2Top: curB1 } = unfoldPrismWall('ABB1A1', A, B, A1, B1, "A'", "B'", '#f59e0b');
    unfoldPrismWall('BCC1B1', B, C, B1, C1, "B'", "C'", '#10b981');
    unfoldPrismWall('CAA1C1', C, A, C1, A1, "C'", "A'", '#ec4899');

    // Top triangle A'B'C' hinged to A'B' of ABB1A1
    const flatWallDir = curA1.clone().sub(A).normalize();
    const cOffsetFromAB = C.clone().sub(A.clone().add(B).multiplyScalar(0.5));
    const smoothC1 = curA1.clone().add(curB1).multiplyScalar(0.5)
      .add(flatWallDir.clone().multiplyScalar(cOffsetFromAB.length() * t))
      .add(new THREE.Vector3(0, cOffsetFromAB.length() * (1 - t), 0));

    faces.push({
      id: 'face_top_tri',
      name: "Đáy trên A'B'C'",
      color: '#3b82f6',
      vertices: [curA1, curB1, smoothC1],
      edgeSegments: [[curA1, curB1], [curB1, smoothC1], [smoothC1, curA1]],
      center: new THREE.Vector3().add(curA1).add(curB1).add(smoothC1).multiplyScalar(1 / 3),
      normal: baseNormal,
    });

    labels.push({
      id: 'lbl_top_C1',
      text: "C'(nắp)",
      position: smoothC1.clone().add(new THREE.Vector3(0, 0.25, 0)),
      color: '#93c5fd',
    });

    return {
      isSupported: true,
      solidType: 'prism_tri',
      solidName: solid.name || "Hình lăng trụ tam giác ABC.A'B'C'",
      faces,
      labels,
      dimensionAnnotations: [],
    };
  }

  // --------------------------------------------------------------------------
  // 5. CYLINDER (Hình trụ)
  // --------------------------------------------------------------------------
  if (solid.type === 'cylinder') {
    const r = solid.radius || 2.5;
    const h = solid.height || 5;

    // Unrolling lateral curved surface into a flat rectangle (2*pi*r by h)
    const segments = 24;
    const openAngle = THREE.MathUtils.lerp(2 * Math.PI, 0.001, t);
    const effectiveR = (2 * Math.PI * r) / openAngle;

    const vertices: THREE.Vector3[] = [];
    const edgeSegments: [THREE.Vector3, THREE.Vector3][] = [];

    const curvePtsTop: THREE.Vector3[] = [];
    const curvePtsBot: THREE.Vector3[] = [];

    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      const angle = (u - 0.5) * openAngle;
      let x: number, z: number;

      if (t > 0.98) {
        x = (u - 0.5) * 2 * Math.PI * r;
        z = 0;
      } else {
        x = effectiveR * Math.sin(angle);
        z = effectiveR * (1 - Math.cos(angle));
      }

      curvePtsBot.push(new THREE.Vector3(x, 0, z));
      curvePtsTop.push(new THREE.Vector3(x, h, z));
    }

    for (let i = 0; i < segments; i++) {
      const b1 = curvePtsBot[i];
      const t1 = curvePtsTop[i];
      const b2 = curvePtsBot[i + 1];
      const t2 = curvePtsTop[i + 1];

      vertices.push(b1, b2, t1);
      vertices.push(t1, b2, t2);

      if (i === 0) edgeSegments.push([b1, t1]);
      if (i === segments - 1) edgeSegments.push([b2, t2]);
      edgeSegments.push([b1, b2]);
      edgeSegments.push([t1, t2]);
    }

    const faces: UnfoldedFaceMesh[] = [
      {
        id: 'face_cyl_lateral',
        name: 'Mặt xung quanh hình trụ (trải thành hình chữ nhật 2πR × h)',
        color: '#10b981',
        vertices,
        edgeSegments,
        center: new THREE.Vector3(0, h / 2, 0),
        normal: new THREE.Vector3(0, 0, 1),
      },
    ];

    // 2 Bases as flat disks
    const diskSegments = 24;
    const makeDisk = (id: string, name: string, yPos: number, rotSign: number) => {
      const diskVerts: THREE.Vector3[] = [];
      const diskEdges: [THREE.Vector3, THREE.Vector3][] = [];
      const hingeY = yPos;
      const angleRot = (Math.PI / 2) * t * rotSign;
      const dCenter = new THREE.Vector3(0, hingeY + (t > 0.98 ? 0 : 0), THREE.MathUtils.lerp(0, -r, t));

      const rimPts: THREE.Vector3[] = [];
      for (let i = 0; i < diskSegments; i++) {
        const theta = (i / diskSegments) * 2 * Math.PI;
        // In local disk coords
        const localPt = new THREE.Vector3(r * Math.cos(theta), 0, r * Math.sin(theta));
        // Rotate around X axis
        const rotPt = rotateAroundAxis(localPt, new THREE.Vector3(1, 0, 0), angleRot);
        rimPts.push(dCenter.clone().add(rotPt));
      }

      for (let i = 0; i < diskSegments; i++) {
        const next = (i + 1) % diskSegments;
        diskVerts.push(dCenter, rimPts[i], rimPts[next]);
        diskEdges.push([rimPts[i], rimPts[next]]);
      }

      faces.push({
        id,
        name,
        color: '#3b82f6',
        vertices: diskVerts,
        edgeSegments: diskEdges,
        center: dCenter,
        normal: new THREE.Vector3(0, rotSign, 0),
      });
    };

    makeDisk('face_cyl_base_bot', 'Đáy dưới hình trụ', 0, 1);
    makeDisk('face_cyl_base_top', 'Đáy trên hình trụ', h, -1);

    return {
      isSupported: true,
      solidType: 'cylinder',
      solidName: solid.name || 'Hình trụ tròn xoay',
      faces,
      labels: [
        { id: 'lbl_h', text: `h = ${h}`, position: new THREE.Vector3((Math.PI * r) + 0.5, h / 2, 0), color: '#38bdf8' },
        { id: 'lbl_2piR', text: `Chu vi đáy 2πR ≈ ${(2 * Math.PI * r).toFixed(2)}`, position: new THREE.Vector3(0, -0.6, 0), color: '#34d399' },
      ],
      dimensionAnnotations: [],
    };
  }

  // --------------------------------------------------------------------------
  // 6. CONE (Hình nón)
  // --------------------------------------------------------------------------
  if (solid.type === 'cone') {
    const r = solid.radius || 2.5;
    const h = solid.height || 5;
    const l = Math.sqrt(r * r + h * h);
    const sectorAngle = (2 * Math.PI * r) / l;

    const segments = 24;
    const openAngle = THREE.MathUtils.lerp(2 * Math.PI, sectorAngle, t);
    const effectiveR = (2 * Math.PI * r) / openAngle;

    const apex = new THREE.Vector3(0, THREE.MathUtils.lerp(h, 0, t), 0);
    const rimPts: THREE.Vector3[] = [];
    const vertices: THREE.Vector3[] = [];
    const edgeSegments: [THREE.Vector3, THREE.Vector3][] = [];

    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      const angle = (u - 0.5) * openAngle;
      let x: number, z: number;

      if (t > 0.98) {
        x = (u - 0.5) * l * sectorAngle;
        z = l;
      } else {
        x = effectiveR * Math.sin(angle);
        z = effectiveR * (1 - Math.cos(angle));
      }
      rimPts.push(new THREE.Vector3(x, 0, z));
    }

    for (let i = 0; i < segments; i++) {
      vertices.push(apex, rimPts[i], rimPts[i + 1]);
      edgeSegments.push([rimPts[i], rimPts[i + 1]]);
    }
    edgeSegments.push([apex, rimPts[0]]);
    edgeSegments.push([apex, rimPts[segments]]);

    const faces: UnfoldedFaceMesh[] = [
      {
        id: 'face_cone_lateral',
        name: `Mặt xung quanh hình nón (trải thành hình quạt bán kính l = ${l.toFixed(2)})`,
        color: '#f59e0b',
        vertices,
        edgeSegments,
        center: new THREE.Vector3(0, h / 3, l / 2),
        normal: new THREE.Vector3(0, 1, 0),
      },
    ];

    // Base disk
    const diskSegments = 24;
    const dCenter = new THREE.Vector3(0, 0, THREE.MathUtils.lerp(0, l + r, t));
    const diskVerts: THREE.Vector3[] = [];
    const diskEdges: [THREE.Vector3, THREE.Vector3][] = [];
    const baseRim: THREE.Vector3[] = [];

    for (let i = 0; i < diskSegments; i++) {
      const theta = (i / diskSegments) * 2 * Math.PI;
      baseRim.push(dCenter.clone().add(new THREE.Vector3(r * Math.cos(theta), 0, r * Math.sin(theta))));
    }
    for (let i = 0; i < diskSegments; i++) {
      const next = (i + 1) % diskSegments;
      diskVerts.push(dCenter, baseRim[i], baseRim[next]);
      diskEdges.push([baseRim[i], baseRim[next]]);
    }

    faces.push({
      id: 'face_cone_base',
      name: 'Đáy hình tròn bán kính R',
      color: '#3b82f6',
      vertices: diskVerts,
      edgeSegments: diskEdges,
      center: dCenter,
      normal: new THREE.Vector3(0, 1, 0),
    });

    return {
      isSupported: true,
      solidType: 'cone',
      solidName: solid.name || 'Hình nón tròn xoay',
      faces,
      labels: [
        { id: 'lbl_l', text: `Đường sinh l ≈ ${l.toFixed(2)}`, position: rimPts[0].clone().add(apex).multiplyScalar(0.5), color: '#fbbf24' },
        { id: 'lbl_theta', text: `Góc quạt θ ≈ ${((sectorAngle * 180) / Math.PI).toFixed(1)}°`, position: apex.clone().add(new THREE.Vector3(0, 0.4, 0.5)), color: '#f59e0b' },
      ],
      dimensionAnnotations: [],
    };
  }

  // --------------------------------------------------------------------------
  // 7. SPHERE (Khối cầu) - Không thể trải phẳng theo Định lý Egregium của Gauss
  // --------------------------------------------------------------------------
  if (solid.type === 'sphere') {
    return {
      isSupported: false,
      solidType: 'sphere',
      solidName: solid.name || 'Hình cầu',
      faces: [],
      labels: [],
      dimensionAnnotations: [],
      unsupportedReason:
        'Theo Định lý Egregium của Carl Friedrich Gauss: Mặt cầu có độ cong Gauss K = 1/R² > 0 (luôn dương), trong khi mặt phẳng có độ cong Gauss K = 0. Do đó không tồn tại bất kỳ phép đẳng cự nào có thể trải phẳng mặt cầu lên mặt phẳng 2D mà không làm biến dạng, co giãn hoặc rách bề mặt.',
    };
  }

  return {
    isSupported: false,
    solidType: solid.type,
    solidName: solid.name || 'Đối tượng 3D',
    faces: [],
    labels: [],
    dimensionAnnotations: [],
    unsupportedReason: 'Dạng khối 3D chưa được hỗ trợ trải phẳng.',
  };
}
