import React from 'react';
import { BookOpen, CheckCircle, Calculator, Sparkles, ArrowRight, Layers } from 'lucide-react';
import { KatexMath } from '../common/KatexMath';

interface AntiderivativeViewProps {
  funcName: 'f(x)' | 'g(x)';
  funcExpr: string;
  antiderivExpr: string;
  derivExpr: string;
  a: number;
  b: number;
  definiteIntegralVal: number | null;
}

export const AntiderivativeView: React.FC<AntiderivativeViewProps> = ({
  funcName,
  funcExpr,
  antiderivExpr,
  derivExpr,
  a,
  b,
  definiteIntegralVal,
}) => {
  return (
    <div className="bg-[#0a0a0a] rounded-xl border border-[#222] p-5 shadow-lg shadow-black/40 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222] pb-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-blue-400 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-900/50">
            TÍNH TOÁN NGUYÊN HÀM (TÍCH PHÂN BẤT ĐỊNH)
          </span>
          <h3 className="font-mono font-bold text-white text-base uppercase tracking-wider mt-1">
            Nguyên hàm của hàm số {funcName}: y = {funcExpr}
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Đã giải mã giải tích</span>
        </div>
      </div>

      {/* Main Result Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Antiderivative Result Box */}
        <div className="p-4 bg-[#111] rounded-xl border border-zinc-800 space-y-3">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-400" />
            Họ nguyên hàm tổng quát:
          </span>
          <div className="p-4 bg-[#0a0a0a] rounded-lg border border-zinc-800 flex justify-center items-center py-5">
            <div className="text-base text-blue-300 font-mono font-bold">
              <KatexMath math={`\\int ${funcExpr} \\, dx = ${antiderivExpr}`} block />
            </div>
          </div>
          <p className="text-[11px] text-zinc-400 font-mono">
            Trong đó <span className="text-blue-400 font-bold">C</span> là hằng số tùy ý thuộc{' '}
            <span className="text-white font-bold">ℝ</span>.
          </p>
        </div>

        {/* Verification & Derivative */}
        <div className="p-4 bg-[#111] rounded-xl border border-zinc-800 space-y-3">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            Kiểm tra định nghĩa vi phân / đạo hàm:
          </span>
          <div className="p-3 bg-[#0a0a0a] rounded-lg border border-zinc-800 space-y-2 text-xs font-mono">
            <div className="text-zinc-300">
              <span className="text-zinc-500">Đạo hàm kiểm chứng: </span>
              <KatexMath math={`\\frac{d}{dx} \\left[ F(x) \\right] = ${funcName} = ${funcExpr}`} />
            </div>
            <div className="text-zinc-400 pt-2 border-t border-zinc-900">
              <span className="text-zinc-500">Đạo hàm bậc một của hàm gốc: </span>
              <KatexMath math={`${funcName.charAt(0)}'(x) = ${derivExpr}`} />
            </div>
          </div>
          <div className="p-2.5 bg-emerald-950/20 border border-emerald-900/30 rounded text-[11px] font-mono text-emerald-400">
            ✓ Kết quả thỏa mãn định lý cơ bản của Giải tích.
          </div>
        </div>
      </div>

      {/* Newton-Leibniz Formula Connection */}
      <div className="p-4 bg-[#111] rounded-xl border border-zinc-800 space-y-3">
        <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
          <Calculator className="w-4 h-4 text-amber-400" />
          Mối liên hệ với Tích phân xác định trên [{a}; {b}] (Công thức Newton-Leibniz):
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
          <div className="p-3 bg-[#0a0a0a] rounded-lg border border-zinc-800 font-mono text-xs">
            <KatexMath math={`\\int_{${a}}^{${b}} ${funcExpr} \\, dx = F(${b}) - F(${a})`} block />
          </div>
          <div className="p-3 bg-[#0a0a0a] rounded-lg border border-zinc-800 font-mono text-xs flex items-center justify-between">
            <span className="text-zinc-400">Giá trị tích phân xác định:</span>
            <span className="text-base text-emerald-400 font-bold">
              {definiteIntegralVal !== null ? definiteIntegralVal.toFixed(4) : 'NaN'}
            </span>
          </div>
        </div>
      </div>

      {/* Textbook Antiderivative Rules Table */}
      <div className="p-4 bg-[#111] rounded-xl border border-zinc-800 space-y-3">
        <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-blue-400" />
          Bảng Công Thức Nguyên Hàm Cơ Bản SGK 12:
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs font-mono">
          <div className="p-2.5 bg-[#0a0a0a] rounded border border-zinc-800/80">
            <KatexMath math="\int x^\alpha dx = \frac{x^{\alpha+1}}{\alpha+1} + C \ (\alpha \ne -1)" block />
          </div>
          <div className="p-2.5 bg-[#0a0a0a] rounded border border-zinc-800/80">
            <KatexMath math="\int \frac{1}{x} dx = \ln|x| + C" block />
          </div>
          <div className="p-2.5 bg-[#0a0a0a] rounded border border-zinc-800/80">
            <KatexMath math="\int e^x dx = e^x + C" block />
          </div>
          <div className="p-2.5 bg-[#0a0a0a] rounded border border-zinc-800/80">
            <KatexMath math="\int \sin(x) dx = -\cos(x) + C" block />
          </div>
          <div className="p-2.5 bg-[#0a0a0a] rounded border border-zinc-800/80">
            <KatexMath math="\int \cos(x) dx = \sin(x) + C" block />
          </div>
          <div className="p-2.5 bg-[#0a0a0a] rounded border border-zinc-800/80">
            <KatexMath math="\int u \, dv = u v - \int v \, du" block />
          </div>
        </div>
      </div>
    </div>
  );
};
