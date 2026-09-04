import { Point3D, Vector3D, Segment3D, Line3D, Plane3D, Solid3D, SavedScene3D } from '../types/math';
import { OXYZ_PRESETS } from './oxyzMath';

export const KEY_SAVED_FIGURES = 'mathcore_3d_saved_figures_v1';
export const KEY_ACTIVE_SESSION = 'mathcore_3d_active_session_v1';

// Seed default figures if user's local library is empty
export const DEFAULT_SAVED_FIGURES: SavedScene3D[] = [
  {
    id: 'seed_pyramid_quad',
    name: 'Chóp tứ giác đều S.ABCD',
    description: 'Chóp đều S.ABCD với đáy hình vuông tâm O(0;0;0), đỉnh S(0;0;5) trên trục Oz',
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
    points: [
      { id: 'S', name: 'S', x: 0, y: 0, z: 5, color: '#f43f5e' },
      { id: 'A', name: 'A', x: -3, y: -3, z: 0, color: '#38bdf8' },
      { id: 'B', name: 'B', x: 3, y: -3, z: 0, color: '#38bdf8' },
      { id: 'C', name: 'C', x: 3, y: 3, z: 0, color: '#38bdf8' },
      { id: 'D', name: 'D', x: -3, y: 3, z: 0, color: '#38bdf8' },
      { id: 'O', name: 'O', x: 0, y: 0, z: 0, color: '#a1a1aa' },
    ],
    vectors: [],
    segments: [
      { id: 'seg_ab', name: 'AB', point1Id: 'A', point2Id: 'B', color: '#38bdf8' },
      { id: 'seg_bc', name: 'BC', point1Id: 'B', point2Id: 'C', color: '#38bdf8' },
      { id: 'seg_cd', name: 'CD', point1Id: 'C', point2Id: 'D', color: '#38bdf8' },
      { id: 'seg_da', name: 'DA', point1Id: 'D', point2Id: 'A', color: '#38bdf8' },
      { id: 'seg_sa', name: 'SA', point1Id: 'S', point2Id: 'A', color: '#f43f5e' },
      { id: 'seg_sb', name: 'SB', point1Id: 'S', point2Id: 'B', color: '#f43f5e' },
      { id: 'seg_sc', name: 'SC', point1Id: 'S', point2Id: 'C', color: '#f43f5e' },
      { id: 'seg_sd', name: 'SD', point1Id: 'S', point2Id: 'D', color: '#f43f5e' },
      { id: 'seg_so', name: 'SO', point1Id: 'S', point2Id: 'O', color: '#eab308' },
    ],
    lines: [],
    planes: [
      {
        id: 'pl_base',
        name: '(ABCD)',
        a: 0,
        b: 0,
        c: 1,
        d: 0,
        pointIds: ['A', 'B', 'C', 'D'],
        color: '#38bdf8',
        opacity: 0.35,
        fillColor: true,
        regionOnly: true,
        visible: true,
      },
      {
        id: 'pl_sab',
        name: '(SAB)',
        a: 5,
        b: 0,
        c: 3,
        d: 0,
        pointIds: ['S', 'A', 'B'],
        color: '#f43f5e',
        opacity: 0.3,
        fillColor: true,
        regionOnly: true,
        visible: true,
      },
    ],
    solids: [
      {
        id: 'solid_pyramid',
        name: 'Chóp S.ABCD',
        type: 'pyramid_quad',
        pointIds: ['S', 'A', 'B', 'C', 'D'],
        color: '#3b82f6',
      },
    ],
  },
  {
    id: 'seed_tetrahedron_right',
    name: 'Tứ diện vuông O.ABC',
    description: 'Tứ diện có 3 cạnh OA, OB, OC đôi một vuông góc nằm trên 3 trục tọa độ',
    createdAt: 1710000100000,
    updatedAt: 1710000100000,
    points: [
      { id: 'O', name: 'O', x: 0, y: 0, z: 0, color: '#a1a1aa' },
      { id: 'A', name: 'A', x: 4, y: 0, z: 0, color: '#ef4444' },
      { id: 'B', name: 'B', x: 0, y: 5, z: 0, color: '#22c55e' },
      { id: 'C', name: 'C', x: 0, y: 0, z: 6, color: '#3b82f6' },
    ],
    vectors: [],
    segments: [
      { id: 's_oa', name: 'OA', point1Id: 'O', point2Id: 'A', color: '#ef4444' },
      { id: 's_ob', name: 'OB', point1Id: 'O', point2Id: 'B', color: '#22c55e' },
      { id: 's_oc', name: 'OC', point1Id: 'O', point2Id: 'C', color: '#3b82f6' },
      { id: 's_ab', name: 'AB', point1Id: 'A', point2Id: 'B', color: '#eab308' },
      { id: 's_bc', name: 'BC', point1Id: 'B', point2Id: 'C', color: '#eab308' },
      { id: 's_ca', name: 'CA', point1Id: 'C', point2Id: 'A', color: '#eab308' },
    ],
    lines: [],
    planes: [
      {
        id: 'pl_abc',
        name: '(ABC)',
        a: 15,
        b: 12,
        c: 10,
        d: -60,
        pointIds: ['A', 'B', 'C'],
        color: '#eab308',
        opacity: 0.35,
        fillColor: true,
        regionOnly: true,
        visible: true,
      },
    ],
    solids: [
      {
        id: 'solid_tetra',
        name: 'Tứ diện O.ABC',
        type: 'tetrahedron',
        pointIds: ['O', 'A', 'B', 'C'],
        color: '#3b82f6',
      },
    ],
  },
  {
    id: 'seed_prism_tri',
    name: "Lăng trụ tam giác đứng ABC.A'B'C'",
    description: "Đáy ABC nằm trên mặt Oxy, các cạnh bên AA', BB', CC' song song với trục Oz",
    createdAt: 1710000200000,
    updatedAt: 1710000200000,
    points: [
      { id: 'A', name: 'A', x: 0, y: 0, z: 0, color: '#38bdf8' },
      { id: 'B', name: 'B', x: 4, y: 0, z: 0, color: '#38bdf8' },
      { id: 'C', name: 'C', x: 1, y: 3, z: 0, color: '#38bdf8' },
      { id: 'A1', name: "A'", x: 0, y: 0, z: 4, color: '#a78bfa' },
      { id: 'B1', name: "B'", x: 4, y: 0, z: 4, color: '#a78bfa' },
      { id: 'C1', name: "C'", x: 1, y: 3, z: 4, color: '#a78bfa' },
    ],
    vectors: [],
    segments: [
      { id: 'seg_ab', name: 'AB', point1Id: 'A', point2Id: 'B', color: '#38bdf8' },
      { id: 'seg_bc', name: 'BC', point1Id: 'B', point2Id: 'C', color: '#38bdf8' },
      { id: 'seg_ca', name: 'CA', point1Id: 'C', point2Id: 'A', color: '#38bdf8' },
      { id: 'seg_a1b1', name: "A'B'", point1Id: 'A1', point2Id: 'B1', color: '#a78bfa' },
      { id: 'seg_b1c1', name: "B'C'", point1Id: 'B1', point2Id: 'C1', color: '#a78bfa' },
      { id: 'seg_c1a1', name: "C'A'", point1Id: 'C1', point2Id: 'A1', color: '#a78bfa' },
      { id: 'seg_aa1', name: "AA'", point1Id: 'A', point2Id: 'A1', color: '#06b6d4' },
      { id: 'seg_bb1', name: "BB'", point1Id: 'B', point2Id: 'B1', color: '#06b6d4' },
      { id: 'seg_cc1', name: "CC'", point1Id: 'C', point2Id: 'C1', color: '#06b6d4' },
    ],
    lines: [],
    planes: [],
    solids: [
      {
        id: 'sol_prism',
        name: "Lăng trụ ABC.A'B'C'",
        type: 'prism_tri',
        pointIds: ['A', 'B', 'C', 'A1', 'B1', 'C1'],
        color: '#06b6d4',
      },
    ],
  },
  {
    id: 'seed_box',
    name: "Hình hộp chữ nhật ABCD.A'B'C'D'",
    description: 'Hình hộp chữ nhật kích thước 4 x 3 x 5 trong hệ tọa độ Oxyz',
    createdAt: 1710000300000,
    updatedAt: 1710000300000,
    points: [
      { id: 'A', name: 'A', x: 0, y: 0, z: 0, color: '#38bdf8' },
      { id: 'B', name: 'B', x: 4, y: 0, z: 0, color: '#38bdf8' },
      { id: 'C', name: 'C', x: 4, y: 3, z: 0, color: '#38bdf8' },
      { id: 'D', name: 'D', x: 0, y: 3, z: 0, color: '#38bdf8' },
      { id: 'A1', name: "A'", x: 0, y: 0, z: 5, color: '#06b6d4' },
      { id: 'B1', name: "B'", x: 4, y: 0, z: 5, color: '#06b6d4' },
      { id: 'C1', name: "C'", x: 4, y: 3, z: 5, color: '#06b6d4' },
      { id: 'D1', name: "D'", x: 0, y: 3, z: 5, color: '#06b6d4' },
    ],
    vectors: [],
    segments: [
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
    ],
    lines: [],
    planes: [],
    solids: [
      {
        id: 'sol_box',
        name: "Hình hộp ABCD.A'B'C'D'",
        type: 'box',
        pointIds: ['A', 'B', 'C', 'D', 'A1', 'B1', 'C1', 'D1'],
        color: '#06b6d4',
      },
    ],
  },
  {
    id: 'seed_cone',
    name: "Hình nón tròn xoay (N) đỉnh S, đáy tâm O, R = 3, h = 5",
    description: "Trục Oz, đỉnh S(0;0;5), tâm đáy O(0;0;0), bán kính đáy R = 3, đường sinh l = √34 ≈ 5.83",
    createdAt: 1710000400000,
    updatedAt: 1710000400000,
    points: [
      { id: 'S', name: 'S', x: 0, y: 0, z: 5, color: '#f59e0b' },
      { id: 'O', name: 'O', x: 0, y: 0, z: 0, color: '#64748b' },
      { id: 'A', name: 'A', x: 3, y: 0, z: 0, color: '#38bdf8' },
      { id: 'B', name: 'B', x: 0, y: 3, z: 0, color: '#38bdf8' },
      { id: 'C', name: 'C', x: -3, y: 0, z: 0, color: '#38bdf8' },
    ],
    vectors: [],
    segments: [
      { id: 'seg_so', name: 'SO (Trục)', point1Id: 'S', point2Id: 'O', color: '#f59e0b' },
      { id: 'seg_sa', name: 'SA (Đường sinh)', point1Id: 'S', point2Id: 'A', color: '#38bdf8' },
      { id: 'seg_sb', name: 'SB (Đường sinh)', point1Id: 'S', point2Id: 'B', color: '#38bdf8' },
      { id: 'seg_sc', name: 'SC (Đường sinh)', point1Id: 'S', point2Id: 'C', color: '#38bdf8' },
      { id: 'seg_oa', name: 'OA (Bán kính)', point1Id: 'O', point2Id: 'A', color: '#10b981' },
      { id: 'seg_ob', name: 'OB (Bán kính)', point1Id: 'O', point2Id: 'B', color: '#10b981' },
      { id: 'seg_ac', name: 'AC (Đường kính)', point1Id: 'A', point2Id: 'C', color: '#64748b' },
    ],
    lines: [],
    planes: [],
    solids: [
      {
        id: 'sol_cone',
        name: "Hình nón tròn xoay (N)",
        type: 'cone',
        pointIds: ['S', 'O', 'A', 'B', 'C'],
        apexId: 'S',
        centerId: 'O',
        radius: 3,
        height: 5,
        color: '#f59e0b',
      },
    ],
  },
];

/**
 * Get all saved scenes from browser offline localStorage.
 * Automatically seeds default figures on first launch.
 */
export function getSavedScenes(): SavedScene3D[] {
  try {
    const raw = localStorage.getItem(KEY_SAVED_FIGURES);
    if (!raw) {
      localStorage.setItem(KEY_SAVED_FIGURES, JSON.stringify(DEFAULT_SAVED_FIGURES));
      return DEFAULT_SAVED_FIGURES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Auto-backfill new standard presets if not present
      let hasChanges = false;
      DEFAULT_SAVED_FIGURES.forEach(seed => {
        if (!parsed.some((p: SavedScene3D) => p.id === seed.id)) {
          parsed.push(seed);
          hasChanges = true;
        }
      });
      if (hasChanges) {
        localStorage.setItem(KEY_SAVED_FIGURES, JSON.stringify(parsed));
      }
      return parsed;
    }
    return DEFAULT_SAVED_FIGURES;
  } catch (err) {
    console.error('Error reading saved scenes from localStorage:', err);
    return DEFAULT_SAVED_FIGURES;
  }
}

/**
 * Save a new scene or update existing one in localStorage.
 * Ensures data is 100% safe offline and across reloads.
 */
export function saveScene(
  sceneData: Omit<SavedScene3D, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: number }
): SavedScene3D {
  const existingList = getSavedScenes();
  const now = Date.now();

  const id = sceneData.id || `fig_${now}_${Math.random().toString(36).substring(2, 7)}`;
  const createdAt = sceneData.createdAt || now;

  const newScene: SavedScene3D = {
    ...sceneData,
    id,
    createdAt,
    updatedAt: now,
  };

  const existingIdx = existingList.findIndex(s => s.id === id);
  let updatedList: SavedScene3D[];

  if (existingIdx >= 0) {
    updatedList = existingList.map((s, idx) => (idx === existingIdx ? newScene : s));
  } else {
    updatedList = [newScene, ...existingList];
  }

  try {
    localStorage.setItem(KEY_SAVED_FIGURES, JSON.stringify(updatedList));
  } catch (err) {
    console.error('Error saving scene to localStorage:', err);
  }

  return newScene;
}

/**
 * Update metadata or contents of a saved scene.
 */
export function updateScene(id: string, updates: Partial<SavedScene3D>): SavedScene3D | null {
  const list = getSavedScenes();
  const target = list.find(s => s.id === id);
  if (!target) return null;

  const updated: SavedScene3D = {
    ...target,
    ...updates,
    updatedAt: Date.now(),
  };

  const updatedList = list.map(s => (s.id === id ? updated : s));
  try {
    localStorage.setItem(KEY_SAVED_FIGURES, JSON.stringify(updatedList));
  } catch (err) {
    console.error('Error updating scene in localStorage:', err);
  }

  return updated;
}

/**
 * Delete a saved scene by id.
 */
export function deleteScene(id: string): boolean {
  const list = getSavedScenes();
  const updatedList = list.filter(s => s.id !== id);
  try {
    localStorage.setItem(KEY_SAVED_FIGURES, JSON.stringify(updatedList));
    return true;
  } catch (err) {
    console.error('Error deleting scene from localStorage:', err);
    return false;
  }
}

/**
 * Duplicate a saved scene with a copy name.
 */
export function duplicateScene(id: string): SavedScene3D | null {
  const list = getSavedScenes();
  const target = list.find(s => s.id === id);
  if (!target) return null;

  return saveScene({
    ...target,
    id: undefined,
    name: `${target.name} (Bản sao)`,
    createdAt: Date.now(),
  });
}

/**
 * Auto-save current working scene (active workspace) so refresh or network disconnect never loses work.
 */
export function saveActiveSession(data: {
  points: Point3D[];
  vectors: Vector3D[];
  segments: Segment3D[];
  lines: Line3D[];
  planes: Plane3D[];
  solids: Solid3D[];
  id?: string;
  name?: string;
}): void {
  try {
    localStorage.setItem(KEY_ACTIVE_SESSION, JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch (err) {
    console.error('Error auto-saving active 3D session:', err);
  }
}

/**
 * Retrieve current active session on reload.
 */
export function getActiveSession(): {
  points: Point3D[];
  vectors: Vector3D[];
  segments: Segment3D[];
  lines: Line3D[];
  planes: Plane3D[];
  solids: Solid3D[];
  id?: string;
  name?: string;
  savedAt?: number;
} | null {
  try {
    const raw = localStorage.getItem(KEY_ACTIVE_SESSION);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.points)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Download a saved 3D figure as a JSON file to local computer disk.
 */
export function exportSceneToJsonFile(scene: SavedScene3D): void {
  const jsonStr = JSON.stringify(scene, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = scene.name.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_');
  a.href = url;
  a.download = `MathCore_3D_${safeName}_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parse an imported JSON file string into a valid SavedScene3D.
 */
export function parseSceneFromJson(jsonString: string): SavedScene3D | null {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed && Array.isArray(parsed.points)) {
      const now = Date.now();
      return {
        id: parsed.id || `imported_${now}`,
        name: parsed.name || 'Mô hình 3D đã nhập',
        description: parsed.description || 'Mô hình nhập từ tệp tin JSON',
        createdAt: parsed.createdAt || now,
        updatedAt: now,
        points: parsed.points || [],
        vectors: parsed.vectors || [],
        segments: parsed.segments || [],
        lines: parsed.lines || [],
        planes: parsed.planes || [],
        solids: parsed.solids || [],
      };
    }
    return null;
  } catch (err) {
    console.error('Failed to parse 3D scene JSON:', err);
    return null;
  }
}
