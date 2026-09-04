import React from 'react';
import { Layers, Compass, CheckCircle2, Split, Sparkles, Info } from 'lucide-react';
import { KatexMath } from '../common/KatexMath';
import { Canvas2D } from './Canvas2D';
import { FunctionAnalysis } from '../../types/math';

interface PlaneAreaViewProps {
  fExpr: string;
  gExpr: string;
  a: number;
  b: number;
  areaValue: number;
  analysis: FunctionAnalysis;
  fFn: (x: number) => number;
  gFn: (x: number) => number;
  fDerivFn: (x: number) => number;
  tangentX: number;
  setTangentX: (x: number) => void;
  showG: boolean;
  setShowG: (show: boolean) => void;
}

export const PlaneAreaView: React.FC<PlaneAreaViewProps> = ({
  fExpr,
  gExpr,
  a,
  b,
  areaValue,
  analysis,
  fFn,
  gFn,
  fDerivFn,
  tangentX,
  setTangentX,
  showG,
  setShowG,
}) => {
  // Find intersection roots within [a, b]
  const internalIntersections = analysis.intersectionPoints
    .filter(p => p.x > Math.min(a, b) + 1e-4 && p.x < Math.max(a, b) - 1e-4)
    .map(p => p.x);

  return (
    <div className="space-y-4">
      {/* Header analysis */}
      <div className="bg-[#0a0a0a] rounded-xl border border-[#222] p-5 shadow-lg shadow-black/40 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222] pb-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/50">
              ỨNG DỤNG HÌNH HỌC CỦA TÍCH PHÂN
            </span>
            <h3 className="font-mono font-bold text-white text-base uppercase tracking-wider mt-1">
              Tính Diện Tích Hình Phẳng Giới Hạn Bởi Hai Đường Cong
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-400 bg-[#111] px-3 py-1 rounded border border-zinc-800">
              Đoạn: <strong className="text-white">[{a}; {b}]</strong>
            </span>
          </div>
        </div>

        {/* 2-Column Math Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Formula & Result */}
          <div className="p-4 bg-[#111] rounded-xl border border-zinc-800 space-y-3">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Công thức diện tích tổng quát (Chuẩn SGK Giải tích 12):
            </span>
            <div className="p-3.5 bg-[#0a0a0a] rounded-lg border border-zinc-800 text-center text-sm font-mono">
              <KatexMath math={`S = \\int_{${a}}^{${b}} \\left| f(x) - g(x) \\right| \\, dx`} block />
            </div>
            <div className="p-3 bg-amber-950/20 border border-amber-900/30 rounded-lg flex items-center justify-between">
              <span className="text-xs font-mono text-amber-200">Diện tích phẳng S =</span>
              <span className="text-xl font-mono font-bold text-amber-400">
                {areaValue.toFixed(4)}{' '}
                <span className="text-xs font-normal text-amber-500">(đvdt)</span>
              </span>
            </div>
          </div>

          {/* Root splitting */}
          <div className="p-4 bg-[#111] rounded-xl border border-zinc-800 space-y-3">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
              <Split className="w-4 h-4 text-blue-400" />
              Phương trình hoành độ giao điểm f(x) = g(x):
            </span>
            <div className="p-2.5 bg-[#0a0a0a] rounded-lg border border-zinc-800 text-xs font-mono text-zinc-300">
              <KatexMath math={`(${fExpr}) - (${gExpr}) = 0`} />
            </div>
            <div className="text-xs font-mono space-y-1.5 text-zinc-400">
              {internalIntersections.length === 0 ? (
                <p className="text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Hai đường không cắt nhau trong ({a}; {b}). Hiệu f(x) - g(x) không đổi dấu trên đoạn.
                </p>
              ) : (
                <div>
                  <span className="text-amber-400 font-bold">
                    Có {internalIntersections.length} nghiệm cắt trong khoảng ({a}; {b}):
                  </span>
                  <div className="mt-1 text-white font-bold">
                    x = {internalIntersections.map(x => x.toFixed(3)).join('; ')}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Tách tích phân thành {internalIntersections.length + 1} đoạn nhỏ để phá dấu giá trị tuyệt đối.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2D Canvas Visualizer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400 px-1">
          <span className="flex items-center gap-1.5 text-zinc-300 font-bold">
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            MINH HỌA MIỀN DIỆN TÍCH PHẲNG GIỚI HẠN TRÊN HỆ TRỤC OXY
          </span>
          <span className="text-[11px] text-zinc-500">Miền được tô màu sọc giữa f(x) và g(x)</span>
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
