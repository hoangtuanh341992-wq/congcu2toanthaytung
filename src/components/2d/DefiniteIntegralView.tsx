import React from 'react';
import { Calculator, Compass, Layers, Sparkles, Check, Info } from 'lucide-react';
import { KatexMath } from '../common/KatexMath';
import { Canvas2D } from './Canvas2D';
import { FunctionAnalysis } from '../../types/math';

interface DefiniteIntegralViewProps {
  fExpr: string;
  gExpr: string;
  a: number;
  b: number;
  integralF: number;
  integralG: number;
  analysis: FunctionAnalysis;
  fFn: (x: number) => number;
  gFn: (x: number) => number;
  fDerivFn: (x: number) => number;
  tangentX: number;
  setTangentX: (x: number) => void;
  showG: boolean;
  setShowG: (show: boolean) => void;
}

export const DefiniteIntegralView: React.FC<DefiniteIntegralViewProps> = ({
  fExpr,
  gExpr,
  a,
  b,
  integralF,
  integralG,
  analysis,
  fFn,
  gFn,
  fDerivFn,
  tangentX,
  setTangentX,
  showG,
  setShowG,
}) => {
  const diffIntegral = integralF - integralG;

  return (
    <div className="space-y-4">
      {/* Detail Calculus Header */}
      <div className="bg-[#0a0a0a] rounded-xl border border-[#222] p-5 shadow-lg shadow-black/40 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222] pb-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/50">
              TÍNH TOÁN TÍCH PHÂN XÁC ĐỊNH
            </span>
            <h3 className="font-mono font-bold text-white text-base uppercase tracking-wider mt-1">
              Tích phân trên đoạn [{a}; {b}]
            </h3>
          </div>
          <div className="text-xs font-mono text-zinc-400 bg-[#111] px-3 py-1.5 rounded border border-zinc-800">
            Cận dưới: <span className="text-white font-bold">{a}</span> | Cận trên:{' '}
            <span className="text-white font-bold">{b}</span>
          </div>
        </div>

        {/* Results Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Integral of f(x) */}
          <div className="p-4 bg-[#111] rounded-xl border border-zinc-800 space-y-2">
            <span className="text-[11px] font-mono uppercase text-blue-400 font-bold block">
              1. Tích phân hàm f(x)
            </span>
            <div className="p-3 bg-[#0a0a0a] rounded border border-zinc-800 flex justify-center items-center">
              <KatexMath math={`\\int_{${a}}^{${b}} (${fExpr}) \\, dx`} />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-zinc-400 font-mono">Giá trị đại số:</span>
              <span className="text-lg font-bold font-mono text-blue-400">
                {integralF.toFixed(4)}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 font-mono">
              F({b}) - F({a}) theo công thức Newton-Leibniz.
            </p>
          </div>

          {/* Card 2: Integral of g(x) */}
          <div className="p-4 bg-[#111] rounded-xl border border-zinc-800 space-y-2">
            <span className="text-[11px] font-mono uppercase text-emerald-400 font-bold block">
              2. Tích phân hàm g(x)
            </span>
            <div className="p-3 bg-[#0a0a0a] rounded border border-zinc-800 flex justify-center items-center">
              <KatexMath math={`\\int_{${a}}^{${b}} (${gExpr}) \\, dx`} />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-zinc-400 font-mono">Giá trị đại số:</span>
              <span className="text-lg font-bold font-mono text-emerald-400">
                {integralG.toFixed(4)}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 font-mono">
              G({b}) - G({a}) theo công thức Newton-Leibniz.
            </p>
          </div>

          {/* Card 3: Difference Integral */}
          <div className="p-4 bg-[#111] rounded-xl border border-zinc-800 space-y-2">
            <span className="text-[11px] font-mono uppercase text-amber-400 font-bold block">
              3. Tích phân hiệu [f(x) - g(x)]
            </span>
            <div className="p-3 bg-[#0a0a0a] rounded border border-zinc-800 flex justify-center items-center">
              <KatexMath math={`\\int_{${a}}^{${b}} [f(x) - g(x)] \\, dx`} />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-zinc-400 font-mono">Hiệu giá trị:</span>
              <span className="text-lg font-bold font-mono text-amber-400">
                {diffIntegral.toFixed(4)}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 font-mono">
              {diffIntegral >= 0 ? 'f(x) chiếm ưu thế trên [a, b]' : 'g(x) chiếm ưu thế trên [a, b]'}
            </p>
          </div>
        </div>

        {/* Note on signed area vs absolute area */}
        <div className="p-3 bg-blue-950/20 border border-blue-900/30 rounded-lg text-xs font-mono text-blue-300 flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <span>
            <strong>Ý nghĩa hình học:</strong> Tích phân xác định là diện tích có dấu (miền nằm trên
            trục Ox mang dấu dương +, miền nằm dưới trục Ox mang dấu âm -). Để tính diện tích hình
            phẳng thuần túy (không âm), hãy chọn chức năng <strong>"Diện tích hình phẳng"</strong>.
          </span>
        </div>
      </div>

      {/* Interactive 2D Graph preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400 px-1">
          <span className="flex items-center gap-1.5 text-zinc-300 font-bold">
            <Compass className="w-3.5 h-3.5 text-blue-400" />
            ĐỒ THỊ MINH HỌA MIỀN TÍCH PHÂN TRÊN ĐOẠN [{a}; {b}]
          </span>
          <span>Vùng tô màu xám/xanh thể hiện diện tích tích phân</span>
        </div>
        <Canvas2D
          analysis={analysis}
          fFn={fFn}
          gFn={gFn}
          fDerivFn={fDerivFn}
          tangentX={tangentX}
          setTangentX={setTangentX}
          showG={showG}
          setShowG={setShowG}
        />
      </div>
    </div>
  );
};
