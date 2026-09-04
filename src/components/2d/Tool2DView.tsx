import React, { useState, useMemo } from 'react';
import {
  Play,
  RotateCcw,
  Sparkles,
  Sliders,
  ChevronRight,
  Info,
  Compass,
  Layers,
  ArrowRight,
  BookOpen,
  Box,
  Calculator,
  Split,
  Crosshair,
  TrendingUp,
} from 'lucide-react';
import {
  evaluateExpressionSafe,
  analyzeFunction,
  approximateDefiniteIntegral,
  approximateAreaBetween,
  approximateRevolutionVolume,
  MATH_PRESETS_2D,
  DEFAULT_MATH_INPUT_2D,
  toLatexSafe,
} from '../../utils/mathParser';
import { Canvas2D } from './Canvas2D';
import { VariationTable } from './VariationTable';
import { Revolution3DView } from './Revolution3DView';
import { AntiderivativeView } from './AntiderivativeView';
import { DefiniteIntegralView } from './DefiniteIntegralView';
import { PlaneAreaView } from './PlaneAreaView';
import { RevolutionVolumeDetailView } from './RevolutionVolumeDetailView';
import { TangentLineView } from './TangentLineView';
import { KatexMath } from '../common/KatexMath';

// Feature list with "Khảo sát" combining 2D Graph (left) and Variation Table (right)
export type FunctionFeatureKey =
  | 'khao_sat'
  | 'mo_phong_3d'
  | 'nguyen_ham_f'
  | 'nguyen_ham_g'
  | 'tich_phan'
  | 'dien_tich'
  | 'the_tich'
  | 'tiep_tuyen';

interface FeatureOption {
  id: FunctionFeatureKey;
  label: string;
  shortDesc: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  badgeColor: string;
}

export const FEATURE_OPTIONS: FeatureOption[] = [
  {
    id: 'khao_sat',
    label: 'Khảo sát',
    shortDesc: 'Đồ thị 2D (nằm bên trái) & Bảng biến thiên và Đơn điệu (nằm bên phải)',
    icon: TrendingUp,
    badge: 'Đồ thị & BBT',
    badgeColor: 'text-blue-400 border-blue-800 bg-blue-950/40',
  },
  {
    id: 'mo_phong_3d',
    label: 'Mô phỏng Khối tròn xoay 3D',
    shortDesc: 'Mô hình không gian 3D xoay quanh trục Ox',
    icon: Layers,
    badge: '3D Mesh',
    badgeColor: 'text-purple-400 border-purple-800 bg-purple-950/40',
  },
  {
    id: 'nguyen_ham_f',
    label: 'Nguyên hàm hàm số f(x)',
    shortDesc: 'Tìm họ nguyên hàm ∫ f(x) dx + C và quy tắc giải',
    icon: Sparkles,
    badge: 'Giải tích',
    badgeColor: 'text-sky-400 border-sky-800 bg-sky-950/40',
  },
  {
    id: 'nguyen_ham_g',
    label: 'Nguyên hàm hàm số g(x)',
    shortDesc: 'Tìm họ nguyên hàm ∫ g(x) dx + C',
    icon: BookOpen,
    badge: 'Giải tích',
    badgeColor: 'text-teal-400 border-teal-800 bg-teal-950/40',
  },
  {
    id: 'tich_phan',
    label: 'Tích phân',
    shortDesc: 'Tính tích phân xác định trên [a; b] theo Newton-Leibniz',
    icon: Calculator,
    badge: 'Đại số',
    badgeColor: 'text-indigo-400 border-indigo-800 bg-indigo-950/40',
  },
  {
    id: 'dien_tich',
    label: 'Diện tích hình phẳng',
    shortDesc: 'Tính S = ∫ |f(x) - g(x)| dx trên đoạn [a; b]',
    icon: Split,
    badge: 'Ứng dụng',
    badgeColor: 'text-amber-400 border-amber-800 bg-amber-950/40',
  },
  {
    id: 'the_tich',
    label: 'Thể tích Khối tròn xoay',
    shortDesc: 'Tính V = π ∫ [f(x)]² dx khi quay quanh trục Ox',
    icon: Box,
    badge: 'Không gian',
    badgeColor: 'text-rose-400 border-rose-800 bg-rose-950/40',
  },
  {
    id: 'tiep_tuyen',
    label: 'Tiếp tuyến',
    shortDesc: 'Viết phương trình tiếp tuyến tại tiếp điểm x₀',
    icon: Crosshair,
    badge: 'Đạo hàm',
    badgeColor: 'text-orange-400 border-orange-800 bg-orange-950/40',
  },
];

export const Tool2DView: React.FC = () => {
  // Input form state (user-editable)
  const [fInput, setFInput] = useState<string>(DEFAULT_MATH_INPUT_2D.fExpr);
  const [gInput, setGInput] = useState<string>(DEFAULT_MATH_INPUT_2D.gExpr);
  const [aInput, setAInput] = useState<number>(DEFAULT_MATH_INPUT_2D.a);
  const [bInput, setBInput] = useState<number>(DEFAULT_MATH_INPUT_2D.b);
  const [tangentXInput, setTangentXInput] = useState<number>(1);

  // Selected feature in the combobox (can be modified before clicking "Tiến Hành")
  const [selectedFeature, setSelectedFeature] = useState<FunctionFeatureKey>('khao_sat');

  // Applied state (only updated and executed when user clicks "Tiến Hành")
  const [appliedFeature, setAppliedFeature] = useState<FunctionFeatureKey>('khao_sat');
  const [currentF, setCurrentF] = useState<string>(DEFAULT_MATH_INPUT_2D.fExpr);
  const [currentG, setCurrentG] = useState<string>(DEFAULT_MATH_INPUT_2D.gExpr);
  const [currentA, setCurrentA] = useState<number>(DEFAULT_MATH_INPUT_2D.a);
  const [currentB, setCurrentB] = useState<number>(DEFAULT_MATH_INPUT_2D.b);
  const [appliedTangentX, setAppliedTangentX] = useState<number>(1);

  // Graph display toggle for g(x)
  const [showG, setShowG] = useState<boolean>(true);

  // Handle execution when clicking "Tiến Hành"
  const handleExecute = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCurrentF(fInput);
    setCurrentG(gInput);
    setCurrentA(Number(aInput));
    setCurrentB(Number(bInput));
    setAppliedTangentX(Number(tangentXInput));
    setAppliedFeature(selectedFeature);
  };

  // Safe numerical functions
  const fFn = useMemo(() => evaluateExpressionSafe(currentF), [currentF]);
  const gFn = useMemo(() => evaluateExpressionSafe(currentG), [currentG]);

  // Deep analytical properties
  const analysis = useMemo(
    () => analyzeFunction(currentF, currentG, currentA, currentB),
    [currentF, currentG, currentA, currentB]
  );

  // Derivative numerical function
  const fDerivFn = useMemo(
    () => (x: number) => {
      const h = 1e-5;
      return (fFn(x + h) - fFn(x - h)) / (2 * h);
    },
    [fFn]
  );

  // Area and Volume calculations
  const areaValue = useMemo(
    () => approximateAreaBetween(fFn, gFn, currentA, currentB),
    [fFn, gFn, currentA, currentB]
  );

  const integralFValue = useMemo(
    () => approximateDefiniteIntegral(fFn, currentA, currentB),
    [fFn, currentA, currentB]
  );

  const integralGValue = useMemo(
    () => approximateDefiniteIntegral(gFn, currentA, currentB),
    [gFn, currentA, currentB]
  );

  const revVolumeValue = useMemo(
    () => approximateRevolutionVolume(fFn, currentA, currentB),
    [fFn, currentA, currentB]
  );

  // Load preset
  const applyPreset = (preset: (typeof MATH_PRESETS_2D)[0]) => {
    setFInput(preset.f);
    setGInput(preset.g);
    setAInput(preset.a);
    setBInput(preset.b);
    setCurrentF(preset.f);
    setCurrentG(preset.g);
    setCurrentA(preset.a);
    setCurrentB(preset.b);
  };

  // Quick insertion of math symbols
  const insertSymbol = (sym: string) => {
    setFInput(prev => prev + sym);
  };

  const currentOption = FEATURE_OPTIONS.find(o => o.id === appliedFeature) || FEATURE_OPTIONS[0];

  return (
    <div className="space-y-4">
      {/* 1. KHUNG NHẬP LIỆU TOÁN HỌC ĐẦU VÀO: f(x), g(x), cận a, cận b */}
      <div className="bg-[#0a0a0a] rounded-xl border border-[#222] p-4 shadow-lg shadow-black/40">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-[#222] pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-blue-400 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-900/50">
              NHẬP LIỆU TOÁN HỌC ĐẦU VÀO
            </span>
            <span className="text-xs text-zinc-400 font-mono hidden sm:inline">
              Nhập hàm số f(x), g(x) và các cận [a; b]
            </span>
          </div>

          {/* Presets selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-zinc-500 uppercase">Hàm mẫu SGK:</span>
            <select
              onChange={e => {
                const found = MATH_PRESETS_2D.find(p => p.name === e.target.value);
                if (found) applyPreset(found);
              }}
              defaultValue=""
              className="text-xs bg-[#111] border border-zinc-800 rounded px-2 py-1 text-zinc-300 font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="" disabled>
                -- Chọn bài toán mẫu --
              </option>
              {MATH_PRESETS_2D.map(p => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Form Inputs Grid */}
        <form onSubmit={handleExecute} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Hàm số f(x) */}
            <div className="md:col-span-5 bg-[#111] p-2.5 rounded-lg border border-zinc-800 space-y-1.5 focus-within:border-blue-500 transition-colors">
              <div className="flex justify-between items-center text-xs">
                <span className="text-blue-400 font-mono text-xs font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                  f(x) =
                </span>
                <div className="flex gap-1 text-[10px] font-mono">
                  {['x^2', 'sin(x)', 'cos(x)', 'exp(x)', 'sqrt(x)', '1/x'].map(sym => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => insertSymbol(sym)}
                      className="px-1.5 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 hover:text-white transition-colors"
                      title={`Thêm ${sym}`}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                value={fInput}
                onChange={e => setFInput(e.target.value)}
                placeholder="ví dụ: x^3 - 3*x + 1"
                className="w-full bg-transparent border-none text-white font-mono text-sm focus:outline-none placeholder:text-zinc-600"
              />
            </div>

            {/* Hàm số g(x) */}
            <div className="md:col-span-4 bg-[#111] p-2.5 rounded-lg border border-zinc-800 space-y-1.5 focus-within:border-emerald-500 transition-colors">
              <div className="flex justify-between items-center text-xs">
                <span className="text-emerald-400 font-mono text-xs font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                  g(x) =
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">(Đường so sánh/biên dưới)</span>
              </div>
              <input
                type="text"
                value={gInput}
                onChange={e => setGInput(e.target.value)}
                placeholder="ví dụ: 0 hoặc x + 1"
                className="w-full bg-transparent border-none text-white font-mono text-sm focus:outline-none placeholder:text-zinc-600"
              />
            </div>

            {/* Cận a & Cận b */}
            <div className="md:col-span-3 flex gap-2">
              <div className="bg-[#111] p-2 rounded-lg border border-zinc-800 flex-1 focus-within:border-zinc-700">
                <span className="text-zinc-400 text-[10px] font-mono block font-bold">CẬN A</span>
                <input
                  type="number"
                  step="0.1"
                  value={aInput}
                  onChange={e => setAInput(Number(e.target.value))}
                  className="bg-transparent border-none text-white font-mono text-sm w-full outline-none font-bold"
                />
              </div>

              <div className="bg-[#111] p-2 rounded-lg border border-zinc-800 flex-1 focus-within:border-zinc-700">
                <span className="text-zinc-400 text-[10px] font-mono block font-bold">CẬN B</span>
                <input
                  type="number"
                  step="0.1"
                  value={bInput}
                  onChange={e => setBInput(Number(e.target.value))}
                  className="bg-transparent border-none text-white font-mono text-sm w-full outline-none font-bold"
                />
              </div>
            </div>
          </div>

          {/* Optional Extra Parameters: Tiếp tuyến x0 khi người dùng cần */}
          {selectedFeature === 'tiep_tuyen' && (
            <div className="bg-[#111] p-2.5 rounded-lg border border-amber-900/50 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <Crosshair className="w-4 h-4" />
                <span>Hoành độ tiếp điểm x₀:</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="0.1"
                  value={tangentXInput}
                  onChange={e => setTangentXInput(Number(e.target.value))}
                  className="w-36 accent-amber-500 cursor-pointer"
                />
                <input
                  type="number"
                  step="0.1"
                  value={tangentXInput}
                  onChange={e => setTangentXInput(Number(e.target.value))}
                  className="w-16 bg-zinc-900 border border-zinc-700 text-amber-300 px-2 py-0.5 rounded text-center font-bold"
                />
              </div>
            </div>
          )}

          {/* 2. HỘP LỰA CHỌN CHỨC NĂNG & NÚT TIẾN HÀNH */}
          <div className="pt-2 border-t border-[#222]">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
              {/* Hộp Lựa Chọn Chức Năng (Selection Combobox) */}
              <div className="lg:col-span-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-[#111] p-2 rounded-lg border border-zinc-800">
                <div className="flex items-center gap-2 px-1 text-xs font-mono text-zinc-300 font-bold shrink-0">
                  <Sliders className="w-4 h-4 text-blue-400" />
                  <span className="uppercase tracking-wider">HỘP LỰA CHỌN CHỨC NĂNG:</span>
                </div>
                <div className="relative flex-1">
                  <select
                    value={selectedFeature}
                    onChange={e => setSelectedFeature(e.target.value as FunctionFeatureKey)}
                    className="w-full bg-[#0a0a0a] border border-zinc-700 text-white font-mono text-xs font-bold rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    {FEATURE_OPTIONS.map((opt, idx) => (
                      <option key={opt.id} value={opt.id} className="bg-[#111] text-white py-1">
                        {idx + 1}. {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Nút TIẾN HÀNH (Execute Button) */}
              <div className="lg:col-span-4">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-mono font-bold text-xs uppercase tracking-widest rounded-lg shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2 transition-all active:scale-[0.99] border border-blue-400/30 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current text-white animate-pulse" />
                  <span>TIẾN HÀNH</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick-select chips of all 9 functions */}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pt-2 border-t border-zinc-900">
              <span className="text-[10px] font-mono text-zinc-500 uppercase mr-1">Kích nhanh:</span>
              {FEATURE_OPTIONS.map(opt => {
                const isSelected = selectedFeature === opt.id;
                const isApplied = appliedFeature === opt.id;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedFeature(opt.id)}
                    className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1 transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-900/50 scale-[1.02]'
                        : 'bg-[#111] text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{opt.label}</span>
                    {isApplied && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5 inline-block" title="Đang hiển thị"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </form>
      </div>

      {/* Status Bar of Active Applied Feature */}
      <div className="flex items-center justify-between bg-[#0a0a0a] px-4 py-2 rounded-lg border border-[#222] text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 uppercase">Chức năng đang mở:</span>
          <span className="font-bold text-blue-400 flex items-center gap-1.5">
            {React.createElement(currentOption.icon, { className: 'w-3.5 h-3.5' })}
            {currentOption.label}
          </span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded border ${currentOption.badgeColor}`}>
            {currentOption.badge}
          </span>
        </div>
        <div className="text-[11px] text-zinc-400 hidden sm:flex items-center gap-2">
          <span>Khảo sát:</span>
          <KatexMath math={`f(x) = ${toLatexSafe(currentF)}`} className="text-blue-300 font-semibold" />
          <span className="text-zinc-600">|</span>
          <KatexMath math={`g(x) = ${toLatexSafe(currentG)}`} className="text-emerald-300 font-semibold" />
          <span className="text-zinc-600">|</span>
          <KatexMath math={`[${currentA};\\, ${currentB}]`} className="text-purple-300 font-semibold" />
        </div>
      </div>

      {/* 3. KHU VỰC HIỂN THỊ KẾT QUẢ THEO ĐÚNG CHỨC NĂNG ĐƯỢC CHỌN VÀ TIẾN HÀNH */}
      <div className="min-h-[460px]">
        {/* 1. Khảo sát: Đồ thị 2D (nằm bên trái) và Bảng biến thiên và Đơn điệu (nằm bên phải) */}
        {appliedFeature === 'khao_sat' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
              {/* BÊN TRÁI: ĐỒ THỊ 2D */}
              <div className="xl:col-span-6 space-y-2 flex flex-col">
                <div className="flex items-center justify-between px-3 py-1.5 bg-[#111] rounded-lg border border-zinc-800 text-xs font-mono">
                  <span className="font-bold text-white flex items-center gap-2 uppercase tracking-wide">
                    <Compass className="w-4 h-4 text-blue-400" />
                    ĐỒ THỊ 2D (NẰM BÊN TRÁI)
                  </span>
                  <span className="text-[10px] text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/60 font-semibold font-mono">
                    Hệ tọa độ Oxy
                  </span>
                </div>
                <div className="h-[520px]">
                  <Canvas2D
                    analysis={analysis}
                    fFn={fFn}
                    gFn={gFn}
                    fDerivFn={fDerivFn}
                    tangentX={appliedTangentX}
                    setTangentX={setAppliedTangentX}
                    showG={showG}
                    setShowG={setShowG}
                  />
                </div>
              </div>

              {/* BÊN PHẢI: BẢNG BIẾN THIÊN VÀ ĐƠN ĐIỆU */}
              <div className="xl:col-span-6 space-y-2 flex flex-col">
                <div className="flex items-center justify-between px-3 py-1.5 bg-[#111] rounded-lg border border-zinc-800 text-xs font-mono">
                  <span className="font-bold text-white flex items-center gap-2 uppercase tracking-wide">
                    <Sliders className="w-4 h-4 text-emerald-400" />
                    BẢNG BIẾN THIÊN VÀ ĐƠN ĐIỆU (NẰM BÊN PHẢI)
                  </span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60 font-semibold font-mono">
                    Chuẩn SGK 12
                  </span>
                </div>
                <VariationTable fExpr={currentF} analysis={analysis} />
              </div>
            </div>
          </div>
        )}

        {/* 2. Mô phỏng Khối tròn xoay 3D */}
        {appliedFeature === 'mo_phong_3d' && (
          <Revolution3DView
            fFn={fFn}
            fExpr={currentF}
            a={currentA}
            b={currentB}
            area={areaValue}
            volume={revVolumeValue}
          />
        )}

        {/* 4. Nguyên hàm hàm số f(x) */}
        {appliedFeature === 'nguyen_ham_f' && (
          <AntiderivativeView
            funcName="f(x)"
            funcExpr={currentF}
            antiderivExpr={analysis.fAntiderivative}
            derivExpr={analysis.fDerivative}
            a={currentA}
            b={currentB}
            definiteIntegralVal={integralFValue}
          />
        )}

        {/* 5. Nguyên hàm hàm số g(x) */}
        {appliedFeature === 'nguyen_ham_g' && (
          <AntiderivativeView
            funcName="g(x)"
            funcExpr={currentG}
            antiderivExpr={analysis.gAntiderivative}
            derivExpr={analysis.gDerivative}
            a={currentA}
            b={currentB}
            definiteIntegralVal={integralGValue}
          />
        )}

        {/* 6. Tích phân */}
        {appliedFeature === 'tich_phan' && (
          <DefiniteIntegralView
            fExpr={currentF}
            gExpr={currentG}
            a={currentA}
            b={currentB}
            integralF={integralFValue}
            integralG={integralGValue}
            analysis={analysis}
            fFn={fFn}
            gFn={gFn}
            fDerivFn={fDerivFn}
            tangentX={appliedTangentX}
            setTangentX={setAppliedTangentX}
            showG={showG}
            setShowG={setShowG}
          />
        )}

        {/* 7. Diện tích hình phẳng */}
        {appliedFeature === 'dien_tich' && (
          <PlaneAreaView
            fExpr={currentF}
            gExpr={currentG}
            a={currentA}
            b={currentB}
            areaValue={areaValue}
            analysis={analysis}
            fFn={fFn}
            gFn={gFn}
            fDerivFn={fDerivFn}
            tangentX={appliedTangentX}
            setTangentX={setAppliedTangentX}
            showG={showG}
            setShowG={setShowG}
          />
        )}

        {/* 8. Thể tích Khối tròn xoay */}
        {appliedFeature === 'the_tich' && (
          <RevolutionVolumeDetailView
            fExpr={currentF}
            a={currentA}
            b={currentB}
            volumeOx={revVolumeValue}
            volumeOy={analysis.revolutionVolumeOy}
            fFn={fFn}
          />
        )}

        {/* 9. Tiếp tuyến */}
        {appliedFeature === 'tiep_tuyen' && (
          <TangentLineView
            fExpr={currentF}
            analysis={analysis}
            fFn={fFn}
            gFn={gFn}
            fDerivFn={fDerivFn}
            tangentX={appliedTangentX}
            setTangentX={setAppliedTangentX}
            showG={showG}
            setShowG={setShowG}
          />
        )}
      </div>
    </div>
  );
};
