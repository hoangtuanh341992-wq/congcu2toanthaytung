import React, { useState, useRef } from 'react';
import {
  Save,
  Trash2,
  Edit3,
  Copy,
  Download,
  Upload,
  Check,
  Clock,
  Layers,
  Box,
  Plus,
  Search,
  ShieldCheck,
  X,
  RefreshCw,
  FolderHeart,
  AlertCircle,
} from 'lucide-react';
import { SavedScene3D, Point3D, Vector3D, Segment3D, Line3D, Plane3D, Solid3D } from '../../types/math';
import {
  getSavedScenes,
  saveScene,
  updateScene,
  deleteScene,
  duplicateScene,
  exportSceneToJsonFile,
  parseSceneFromJson,
} from '../../utils/sceneStorage';

interface SavedFiguresModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Current 3D scene data
  currentPoints: Point3D[];
  currentVectors: Vector3D[];
  currentSegments: Segment3D[];
  currentLines: Line3D[];
  currentPlanes: Plane3D[];
  currentSolids: Solid3D[];
  // Currently active figure ID (if opened from library)
  activeFigureId: string | null;
  activeFigureName: string | null;
  // Handlers
  onLoadFigure: (figure: SavedScene3D) => void;
  onSetActiveFigureInfo: (id: string | null, name: string | null) => void;
  onOpenUnfoldForScene?: (scene: SavedScene3D) => void;
}

export const SavedFiguresModal: React.FC<SavedFiguresModalProps> = ({
  isOpen,
  onClose,
  currentPoints,
  currentVectors,
  currentSegments,
  currentLines,
  currentPlanes,
  currentSolids,
  activeFigureId,
  activeFigureName,
  onLoadFigure,
  onSetActiveFigureInfo,
  onOpenUnfoldForScene,
}) => {
  const [savedScenes, setSavedScenes] = useState<SavedScene3D[]>(() => getSavedScenes());
  const [searchQuery, setSearchQuery] = useState('');
  const [saveMode, setSaveMode] = useState<'browse' | 'save_new' | 'rename'>('browse');

  // Form states for saving
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [saveError, setSaveError] = useState('');
  const [targetRenameId, setTargetRenameId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const refreshList = () => {
    setSavedScenes(getSavedScenes());
  };

  // Open Save New Form
  const handleOpenSaveForm = () => {
    // Generate intelligent default name
    let defaultName = 'Mô hình 3D mới';
    if (currentSolids.length > 0) {
      defaultName = currentSolids[0].name;
    } else if (currentPoints.length > 0) {
      const names = currentPoints.slice(0, 4).map(p => p.name).join('');
      defaultName = `Hình (${names})`;
    }
    setSaveName(activeFigureName ? `${activeFigureName} (Chỉnh sửa)` : defaultName);
    setSaveDesc('');
    setSaveError('');
    setSaveMode('save_new');
  };

  // Save as new scene
  const handleConfirmSaveNew = () => {
    if (!saveName.trim()) {
      setSaveError('Vui lòng nhập tên cho mô hình!');
      return;
    }

    const saved = saveScene({
      name: saveName.trim(),
      description: saveDesc.trim() || undefined,
      points: currentPoints,
      vectors: currentVectors,
      segments: currentSegments,
      lines: currentLines,
      planes: currentPlanes,
      solids: currentSolids,
    });

    onSetActiveFigureInfo(saved.id, saved.name);
    refreshList();
    setSaveMode('browse');
    showToast(`Đã lưu "${saved.name}" an toàn vào bộ nhớ máy!`);
  };

  // Overwrite / Update active figure
  const handleOverwriteCurrent = (id: string, name: string) => {
    const updated = updateScene(id, {
      name,
      points: currentPoints,
      vectors: currentVectors,
      segments: currentSegments,
      lines: currentLines,
      planes: currentPlanes,
      solids: currentSolids,
    });

    if (updated) {
      onSetActiveFigureInfo(updated.id, updated.name);
      refreshList();
      showToast(`Đã cập nhật dữ liệu cho "${name}"!`);
    }
  };

  // Delete scene
  const handleDeleteScene = (id: string) => {
    deleteScene(id);
    if (activeFigureId === id) {
      onSetActiveFigureInfo(null, null);
    }
    setDeleteConfirmId(null);
    refreshList();
    showToast('Đã xóa hình khỏi bộ nhớ!');
  };

  // Duplicate scene
  const handleDuplicateScene = (id: string) => {
    const dup = duplicateScene(id);
    if (dup) {
      refreshList();
      showToast(`Đã nhân bản thành "${dup.name}"!`);
    }
  };

  // Rename scene
  const handleStartRename = (scene: SavedScene3D) => {
    setTargetRenameId(scene.id);
    setSaveName(scene.name);
    setSaveDesc(scene.description || '');
    setSaveMode('rename');
  };

  const handleConfirmRename = () => {
    if (!targetRenameId || !saveName.trim()) return;
    const updated = updateScene(targetRenameId, {
      name: saveName.trim(),
      description: saveDesc.trim() || undefined,
    });
    if (updated && activeFigureId === targetRenameId) {
      onSetActiveFigureInfo(updated.id, updated.name);
    }
    refreshList();
    setSaveMode('browse');
    setTargetRenameId(null);
    showToast('Đã đổi tên mô hình!');
  };

  // Load scene into 3D workspace
  const handleLoad = (scene: SavedScene3D) => {
    onLoadFigure(scene);
    onSetActiveFigureInfo(scene.id, scene.name);
    showToast(`Đã tải "${scene.name}" vào không gian 3D!`);
    onClose();
  };

  // Export JSON file
  const handleExport = (scene: SavedScene3D) => {
    exportSceneToJsonFile(scene);
    showToast(`Đã tải tệp "${scene.name}.json" về máy tính!`);
  };

  // Import JSON file
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      const parsed = parseSceneFromJson(content);
      if (parsed) {
        saveScene(parsed);
        refreshList();
        showToast(`Đã nhập thành công "${parsed.name}"!`);
      } else {
        alert('Tệp JSON không đúng định dạng mô hình MathCore 3D!');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Filtered scenes
  const filteredScenes = savedScenes.filter(
    s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0e0e11] border border-zinc-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800/80 bg-[#121217] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-950/60 border border-blue-800/60 flex items-center justify-center text-blue-400 shadow-inner">
              <FolderHeart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white font-mono">
                  MÔ HÌNH 3D ĐÃ LƯU
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 font-mono font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Offline-Safe (100% không mất dữ liệu)
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Lưu trữ an toàn trên thiết bị: không mất khi mất mạng hoặc tải lại trang web. Có thể chỉnh sửa hoặc xóa bất cứ lúc nào.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast alert */}
        {toastMessage && (
          <div className="bg-emerald-900/60 border-b border-emerald-700/50 text-emerald-200 px-4 py-2 text-xs font-mono flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Action Toolbar */}
        <div className="p-3 sm:px-5 bg-[#0a0a0c] border-b border-zinc-800/60 flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm kiếm hình đã lưu..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#18181b] border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-zinc-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Save current scene button */}
            <button
              type="button"
              onClick={handleOpenSaveForm}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-md shadow-blue-950/50 active:scale-95"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu hình 3D hiện tại ({currentPoints.length} điểm)</span>
            </button>

            {/* Import JSON button */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#18181b] hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors"
              title="Nhập mô hình từ tệp tin JSON"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Nhập JSON</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* FORM: SAVE CURRENT SCENE AS NEW */}
          {saveMode === 'save_new' && (
            <div className="bg-[#121217] border border-blue-900/60 rounded-xl p-4 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="font-bold text-blue-400 flex items-center gap-1.5">
                  <Save className="w-4 h-4" />
                  LƯU HÌNH 3D VÀO BỘ NHỚ THIẾT BỊ
                </span>
                <button
                  type="button"
                  onClick={() => setSaveMode('browse')}
                  className="text-zinc-500 hover:text-zinc-300"
                >
                  Hủy
                </button>
              </div>

              {/* Currently loaded note */}
              {activeFigureId && (
                <div className="p-2 bg-blue-950/30 border border-blue-800/40 rounded text-[11px] text-blue-300 flex items-center justify-between">
                  <span>
                    Bạn đang thao tác trên mô hình: <strong>{activeFigureName}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOverwriteCurrent(activeFigureId, activeFigureName || saveName)}
                    className="px-2 py-1 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded text-[10px] transition-colors"
                  >
                    Ghi đè & Cập nhật hình này
                  </button>
                </div>
              )}

              <div className="space-y-2">
                <div>
                  <label className="text-zinc-400 block mb-1">Tên mô hình:</label>
                  <input
                    type="text"
                    value={saveName}
                    onChange={e => setSaveName(e.target.value)}
                    placeholder="Ví dụ: Chóp tứ giác đều S.ABCD"
                    className="w-full bg-[#18181b] border border-zinc-700 rounded p-2 text-white font-bold text-xs"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1">Ghi chú / Đề bài (tùy chọn):</label>
                  <textarea
                    value={saveDesc}
                    onChange={e => setSaveDesc(e.target.value)}
                    placeholder="Ví dụ: Đáy hình vuông cạnh 4, SA vuông góc đáy, tính khoảng cách..."
                    rows={2}
                    className="w-full bg-[#18181b] border border-zinc-700 rounded p-2 text-zinc-300 text-xs"
                  />
                </div>

                {saveError && (
                  <div className="text-amber-400 flex items-center gap-1.5 text-[11px]">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{saveError}</span>
                  </div>
                )}

                {/* Summary of objects being saved */}
                <div className="p-2 bg-[#0a0a0a] rounded border border-zinc-800/80 text-[11px] text-zinc-400 flex flex-wrap gap-3">
                  <span>Điểm: <strong className="text-white">{currentPoints.length}</strong></span>
                  <span>Đoạn thẳng: <strong className="text-white">{currentSegments.length}</strong></span>
                  <span>Đường thẳng: <strong className="text-white">{currentLines.length}</strong></span>
                  <span>Mặt phẳng: <strong className="text-white">{currentPlanes.length}</strong></span>
                  <span>Khối đa diện: <strong className="text-white">{currentSolids.length}</strong></span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSaveMode('browse')}
                  className="px-3 py-1.5 bg-[#18181b] hover:bg-zinc-800 text-zinc-300 rounded"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSaveNew}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded flex items-center gap-1.5 shadow-md shadow-blue-900/40"
                >
                  <Check className="w-3.5 h-3.5" />
                  Xác nhận lưu an toàn
                </button>
              </div>
            </div>
          )}

          {/* FORM: RENAME SCENE */}
          {saveMode === 'rename' && (
            <div className="bg-[#121217] border border-purple-900/60 rounded-xl p-4 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="font-bold text-purple-400 flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4" />
                  ĐỔI TÊN & GHI CHÚ MÔ HÌNH
                </span>
                <button
                  type="button"
                  onClick={() => setSaveMode('browse')}
                  className="text-zinc-500 hover:text-zinc-300"
                >
                  Hủy
                </button>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="text-zinc-400 block mb-1">Tên mô hình:</label>
                  <input
                    type="text"
                    value={saveName}
                    onChange={e => setSaveName(e.target.value)}
                    className="w-full bg-[#18181b] border border-zinc-700 rounded p-2 text-white font-bold text-xs"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1">Ghi chú:</label>
                  <textarea
                    value={saveDesc}
                    onChange={e => setSaveDesc(e.target.value)}
                    rows={2}
                    className="w-full bg-[#18181b] border border-zinc-700 rounded p-2 text-zinc-300 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSaveMode('browse')}
                  className="px-3 py-1.5 bg-[#18181b] hover:bg-zinc-800 text-zinc-300 rounded"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRename}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  Cập nhật thông tin
                </button>
              </div>
            </div>
          )}

          {/* LIST OF SAVED FIGURES */}
          <div className="space-y-2.5">
            {filteredScenes.length === 0 ? (
              <div className="p-8 text-center bg-[#0a0a0a] rounded-xl border border-dashed border-zinc-800 space-y-2">
                <Box className="w-8 h-8 text-zinc-600 mx-auto" />
                <p className="text-zinc-400 text-xs font-mono">
                  {searchQuery ? 'Không tìm thấy mô hình nào khớp với tìm kiếm.' : 'Chưa có mô hình 3D nào được lưu.'}
                </p>
                <button
                  type="button"
                  onClick={handleOpenSaveForm}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-xs inline-flex items-center gap-1.5 mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Lưu mô hình hiện tại ngay
                </button>
              </div>
            ) : (
              filteredScenes.map(scene => {
                const isActive = activeFigureId === scene.id;
                const isDeleteConfirm = deleteConfirmId === scene.id;
                const dateStr = new Date(scene.updatedAt).toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={scene.id}
                    className={`bg-[#121217] rounded-xl border p-3.5 transition-all font-mono ${
                      isActive
                        ? 'border-blue-700/80 bg-blue-950/15 shadow-lg shadow-blue-950/40'
                        : 'border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      {/* Left: Info */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-white truncate">
                            {scene.name}
                          </span>
                          {isActive && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/60 font-semibold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                              Đang mở
                            </span>
                          )}
                          <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {dateStr}
                          </span>
                        </div>

                        {scene.description && (
                          <p className="text-xs text-zinc-400 line-clamp-2">
                            {scene.description}
                          </p>
                        )}

                        {/* Elements Counters */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-zinc-400">
                          <span className="px-1.5 py-0.5 rounded bg-[#18181b] border border-zinc-800">
                            {scene.points.length} điểm ({scene.points.map(p => p.name).join(', ')})
                          </span>
                          {scene.segments.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-[#18181b] border border-zinc-800">
                              {scene.segments.length} đoạn thẳng
                            </span>
                          )}
                          {scene.planes.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-[#18181b] border border-zinc-800">
                              {scene.planes.length} mặt phẳng
                            </span>
                          )}
                          {scene.solids.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-[#18181b] border border-zinc-800 text-blue-300">
                              {scene.solids.map(s => s.name).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800/80">
                        {isDeleteConfirm ? (
                          <div className="flex items-center gap-1.5 bg-red-950/50 p-1 rounded border border-red-800">
                            <span className="text-[10px] text-red-300 px-1">Xác nhận xóa?</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteScene(scene.id)}
                              className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-bold"
                            >
                              Xóa
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-1.5 py-0.5 bg-zinc-800 text-zinc-300 rounded text-[10px]"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <>
                            {/* Open / Load button */}
                            <button
                              type="button"
                              onClick={() => handleLoad(scene)}
                              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 transition-colors shadow-sm"
                              title="Tải mô hình này vào không gian 3D để xem và chỉnh sửa"
                            >
                              <Box className="w-3.5 h-3.5" />
                              <span>Mở hình</span>
                            </button>

                            {/* 2D Unfolding Button */}
                            {onOpenUnfoldForScene && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (scene.solids.some(s => s.type === 'sphere')) {
                                    alert('Khối cầu (Sphere) không thể trải phẳng 2D theo Định lý Egregium của Gauss.');
                                    return;
                                  }
                                  onOpenUnfoldForScene(scene);
                                }}
                                className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors font-medium border ${
                                  scene.solids.some(s => s.type === 'sphere')
                                    ? 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed'
                                    : 'bg-indigo-950/60 text-indigo-300 border-indigo-700/60 hover:bg-indigo-900/80 hover:text-white shadow-sm shadow-indigo-950/40'
                                }`}
                                title={
                                  scene.solids.some(s => s.type === 'sphere')
                                    ? 'Khối cầu không hỗ trợ trải phẳng 2D'
                                    : 'Trải phẳng 2D đối tượng này (2D Net)'
                                }
                              >
                                <Layers className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Trải phẳng</span>
                              </button>
                            )}

                            {/* Overwrite with current workspace button */}
                            <button
                              type="button"
                              onClick={() => handleOverwriteCurrent(scene.id, scene.name)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-300 hover:bg-emerald-950/40 border border-transparent hover:border-emerald-800 transition-colors"
                              title="Cập nhật (ghi đè) hình này bằng dữ liệu hiện tại đang có trên 3D"
                            >
                              <Save className="w-4 h-4" />
                            </button>

                            {/* Rename */}
                            <button
                              type="button"
                              onClick={() => handleStartRename(scene)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                              title="Đổi tên hoặc sửa ghi chú"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {/* Duplicate */}
                            <button
                              type="button"
                              onClick={() => handleDuplicateScene(scene.id)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                              title="Nhân bản hình này"
                            >
                              <Copy className="w-4 h-4" />
                            </button>

                            {/* Export JSON */}
                            <button
                              type="button"
                              onClick={() => handleExport(scene)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                              title="Tải tệp JSON về máy"
                            >
                              <Download className="w-4 h-4" />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(scene.id)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                              title="Xóa mô hình này"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:px-5 bg-[#121217] border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Đã lưu an toàn {savedScenes.length} mô hình trên thiết bị</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#18181b] hover:bg-zinc-800 text-white rounded-lg transition-colors font-bold"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
