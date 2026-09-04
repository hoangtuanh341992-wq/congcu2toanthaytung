import React from 'react';
import { Compass, Sparkles, Sliders, ArrowRight, CornerDownRight } from 'lucide-react';
import { KatexMath } from '../common/KatexMath';
import { Canvas2D } from './Canvas2D';
import { FunctionAnalysis } from '../../types/math';

interface TangentLineViewProps {
  fExpr: string;
  analysis: FunctionAnalysis;
  fFn: (x: number) => number;
  gFn: (x: number) => number;
  fDerivFn: (x: number) => number;
  tangentX: number;
  setTangentX: (x: number) => void;
  showG: boolean;
  setShowG: (show: boolean) => void;
}

export const TangentLineView: React.FC<TangentLineViewProps> = ({
  fExpr,
  analysis,
  fFn,
  gFn,
  fDerivFn,
  tangentX,
  setTangentX,
  showG,
  setShowG,
}) => {
  const y0 = fFn(tangentX);
  const k = fDerivFn(tangentX);
  const bVal = y0 - k * tangentX;
  const sign = bVal >= 0 ? '+' : '-';
  const tangentEq = `y = ${k.toFixed(3)}x ${sign} ${Math.abs(bVal).toFixed(3)}`;

  // Normal line perpendicular
  const kNormal = Math.abs(k) > 1e-4 ? -1 / k : null;
  const bNormal = kNormal !== null ? y0 - kNormal * tangentX : null;
  const normalEq =
    kNormal !== null
      ? `y = ${kNormal.toFixed(3)}x ${bNormal! >= 0 ? '+' : '-'} ${Math.abs(bNormal!).toFixed(3)}`
      : 'x = ' + tangentX.toFixed(2);

  return (
    <div className="space-y-4">
      {/* Tangent Computation Header */}
      <div className="bg-[#0a0a0a] rounded-xl border border-[#222] p-5 shadow-lg shadow-black/40 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222] pb-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/50">
              HÌNH HỌC VI PHÂN & TIẾP TUYẾN
            </span>
            <h3 className="font-mono font-bold text-white text-base uppercase tracking-wider mt-1">
              Phương Trình Tiếp Tuyến Của Đồ Thị Hàm Số
            </h3>
          </div>

          {/* Interactive slider for x0 */}
          <div className="flex items-center gap-3 bg-[#111] px-3 py-1.5 rounded-lg border border-zinc-800">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-mono text-zinc-400">Hoành độ x₀:</span>
            <input
              type="range"
              min="-5"
              max="5"
              step="0.1"
              value={tangentX}
              onChange={e => setTangentX(Number(e.target.value))}
              className="w-28 accent-amber-500 cursor-pointer"
            />
            <input
              type="number"
              step="0.1"
              value={tangentX}
              onChange={e => setTangentX(Number(e.target.value))}
              className="w-16 bg-zinc-900 border border-zinc-700 text-amber-400 font-mono text-xs px-1.5 py-0.5 rounded text-center"
            />
          </div>
        </div>

        {/* Tangent Calculation Breakdown Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tangency point */}
          <div className="p-3.5 bg-[#111] rounded-xl border border-zinc-800 space-y-2 font-mono">
            <span className="text-[11px] uppercase text-zinc-400 font-bold block">
              1. Tọa độ tiếp điểm M₀(x₀; y₀)
            </span>
            <div className="p-2.5 bg-[#0a0a0a] rounded border border-zinc-800 text-xs">
              <div>x₀ = <span className="text-amber-400 font-bold">{tangentX.toFixed(2)}</span></div>
              <div className="mt-1">
                y₀ = f({tangentX.toFixed(2)}) ={' '}
                <span className="text-white font-bold">{y0.toFixed(3)}</span>
              </div>
            </div>
            <p className="text-[10px] text-zinc-500">M₀ nằm trên đồ thị hàm số y = {fExpr}</p>
          </div>

          {/* Tangent slope k */}
          <div className="p-3.5 bg-[#111] rounded-xl border border-zinc-800 space-y-2 font-mono">
            <span className="text-[11px] uppercase text-zinc-400 font-bold block">
              2. Hệ số góc tiếp tuyến k = f'(x₀)
            </span>
            <div className="p-2.5 bg-[#0a0a0a] rounded border border-zinc-800 text-xs">
              <div className="text-zinc-300">
                f'(x) = <span className="text-blue-400">{analysis.fDerivative}</span>
              </div>
              <div className="mt-1">
                k = f'({tangentX.toFixed(2)}) ={' '}
                <span className="text-amber-400 font-bold text-sm">{k.toFixed(4)}</span>
              </div>
            </div>
            <p className="text-[10px] text-zinc-500">Góc nghiêng α: tan(α) = {k.toFixed(3)}</p>
          </div>

          {/* Equation */}
          <div className="p-3.5 bg-[#111] rounded-xl border border-zinc-800 space-y-2 font-mono">
            <span className="text-[11px] uppercase text-amber-400 font-bold block">
              3. Phương trình tiếp tuyến (d)
            </span>
            <div className="p-2.5 bg-[#0a0a0a] rounded border border-zinc-800 text-xs">
              <div className="text-[11px] text-zinc-400">y = f'(x₀)(x - x₀) + y₀</div>
              <div className="mt-1 text-amber-400 font-bold text-sm">{tangentEq}</div>
            </div>
            <div className="text-[10px] text-zinc-400">
              Đường pháp tuyến vuông góc: <span className="text-zinc-300">{normalEq}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive 2D Graph preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400 px-1">
          <span className="flex items-center gap-1.5 text-zinc-300 font-bold">
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            ĐỒ THỊ 2D MINH HỌA TIẾP ĐIỂM VÀ ĐƯỜNG TIẾP TUYẾN
          </span>
          <span className="text-[11px] text-amber-400">Đường màu vàng cam tiếp xúc với đồ thị tại điểm M₀</span>
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
