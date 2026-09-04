import React from 'react';
import { Layers, Sparkles, Box, Compass, Info } from 'lucide-react';
import { KatexMath } from '../common/KatexMath';
import { Revolution3DView } from './Revolution3DView';

interface RevolutionVolumeDetailViewProps {
  fExpr: string;
  a: number;
  b: number;
  volumeOx: number;
  volumeOy: number | null;
  fFn: (x: number) => number;
}

export const RevolutionVolumeDetailView: React.FC<RevolutionVolumeDetailViewProps> = ({
  fExpr,
  a,
  b,
  volumeOx,
  volumeOy,
  fFn,
}) => {
  return (
    <div className="space-y-4">
      {/* Mathematical Breakdown Header */}
      <div className="bg-[#0a0a0a] rounded-xl border border-[#222] p-5 shadow-lg shadow-black/40 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222] pb-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-purple-400 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-900/50">
              ỨNG DỤNG HÌNH HỌC KHÔNG GIAN
            </span>
            <h3 className="font-mono font-bold text-white text-base uppercase tracking-wider mt-1">
              Thể Tích Khối Tròn Xoay
            </h3>
          </div>
          <div className="text-xs font-mono text-zinc-400 bg-[#111] px-3 py-1 rounded border border-zinc-800">
            Trục quay: <strong className="text-blue-400">Trục hoành Ox</strong> | Khoảng [{a}; {b}]
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Volume around Ox */}
          <div className="p-4 bg-[#111] rounded-xl border border-zinc-800 space-y-3">
            <span className="text-xs font-mono uppercase tracking-wider text-blue-400 font-bold flex items-center gap-1.5">
              <Box className="w-4 h-4" />
              1. Thể tích khi quay quanh trục hoành Ox:
            </span>
            <div className="p-3 bg-[#0a0a0a] rounded-lg border border-zinc-800 text-center text-sm font-mono">
              <KatexMath math={`V_{Ox} = \\pi \\int_{${a}}^{${b}} \\left[ f(x) \\right]^2 \\, dx`} block />
            </div>
            <div className="p-3 bg-blue-950/20 border border-blue-900/30 rounded-lg flex items-center justify-between">
              <span className="text-xs font-mono text-blue-200">Thể tích V(Ox) =</span>
              <span className="text-xl font-mono font-bold text-blue-400">
                {volumeOx.toFixed(4)}{' '}
                <span className="text-xs font-normal text-blue-500">(đvtt)</span>
              </span>
            </div>
          </div>

          {/* Volume around Oy */}
          <div className="p-4 bg-[#111] rounded-xl border border-zinc-800 space-y-3">
            <span className="text-xs font-mono uppercase tracking-wider text-purple-400 font-bold flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              2. Thể tích khi quay quanh trục tung Oy (Phương pháp vỏ trụ):
            </span>
            <div className="p-3 bg-[#0a0a0a] rounded-lg border border-zinc-800 text-center text-sm font-mono">
              <KatexMath math={`V_{Oy} = 2\\pi \\int_{${a}}^{${b}} x \\cdot \\left| f(x) \\right| \\, dx`} block />
            </div>
            <div className="p-3 bg-purple-950/20 border border-purple-900/30 rounded-lg flex items-center justify-between">
              <span className="text-xs font-mono text-purple-200">Thể tích V(Oy) =</span>
              <span className="text-xl font-mono font-bold text-purple-400">
                {volumeOy !== null ? volumeOy.toFixed(4) : 'NaN'}{' '}
                <span className="text-xs font-normal text-purple-500">(đvtt)</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3D Simulation View */}
      <Revolution3DView
        fFn={fFn}
        fExpr={fExpr}
        a={a}
        b={b}
        volume={volumeOx}
      />
    </div>
  );
};
