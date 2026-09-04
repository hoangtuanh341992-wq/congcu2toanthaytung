import React from 'react';
import { X, BookOpen } from 'lucide-react';
import { KatexMath } from './KatexMath';

interface FormulaGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FormulaGuideModal: React.FC<FormulaGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0a0a0a] rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-zinc-800 text-zinc-300">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 sticky top-0 bg-[#0a0a0a]/95 backdrop-blur z-10">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <h2 className="font-mono font-bold text-white text-sm uppercase tracking-wider">
              Bảng Tra Cứu Công Thức Giải Tích 2D & Oxyz
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 text-xs">
          {/* Section 1: Giải tích 2D */}
          <div>
            <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-blue-400 mb-2 border-b border-zinc-800 pb-1">
              1. Giải Tích 2D & Hình Phẳng
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-[#111] rounded-xl border border-zinc-800 space-y-1">
                <span className="font-semibold text-white block">Diện tích hình phẳng:</span>
                <KatexMath math="S = \int_a^b |f(x) - g(x)| \, dx" block />
                <p className="text-zinc-500 text-[11px]">
                  Miền giới hạn bởi y = f(x), y = g(x) và x = a, x = b.
                </p>
              </div>

              <div className="p-3 bg-[#111] rounded-xl border border-zinc-800 space-y-1">
                <span className="font-semibold text-white block">Thể tích khối tròn xoay quanh Ox:</span>
                <KatexMath math="V = \pi \int_a^b [f(x)]^2 \, dx" block />
                <p className="text-zinc-500 text-[11px]">
                  Quay hình thang cong quanh Ox trên đoạn [a, b].
                </p>
              </div>

              <div className="p-3 bg-[#111] rounded-xl border border-zinc-800 space-y-1">
                <span className="font-semibold text-white block">Phương trình tiếp tuyến:</span>
                <KatexMath math="y = f'(x_0)(x - x_0) + f(x_0)" block />
                <p className="text-zinc-500 text-[11px]">
                  Hệ số góc của tiếp tuyến tại điểm M(x₀; y₀) là k = f'(x₀).
                </p>
              </div>

              <div className="p-3 bg-[#111] rounded-xl border border-zinc-800 space-y-1">
                <span className="font-semibold text-white block">Cực trị hàm số:</span>
                <p className="text-zinc-400 mt-1">
                  Nếu f'(x₀) = 0 và f'(x) đổi dấu từ (+) sang (-) khi qua x₀ thì x₀ là điểm cực đại. Ngược lại là cực tiểu.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Hình học Oxyz */}
          <div>
            <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-emerald-400 mb-2 border-b border-zinc-800 pb-1">
              2. Hình Học Không Gian Oxyz
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-[#111] rounded-xl border border-zinc-800 space-y-1">
                <span className="font-semibold text-white block">Tích có hướng & VTPT:</span>
                <KatexMath math="[\vec{u}, \vec{v}] = (u_y v_z - u_z v_y; \, u_z v_x - u_x v_z; \, u_x v_y - u_y v_x)" block />
              </div>

              <div className="p-3 bg-[#111] rounded-xl border border-zinc-800 space-y-1">
                <span className="font-semibold text-white block">Thể tích Tứ diện ABCD:</span>
                <KatexMath math="V = \frac{1}{6} |[\vec{AB}, \vec{AC}] \cdot \vec{AD}|" block />
              </div>

              <div className="p-3 bg-[#111] rounded-xl border border-zinc-800 space-y-1">
                <span className="font-semibold text-white block">Khoảng cách từ điểm đến mặt phẳng:</span>
                <KatexMath math="d(M, (P)) = \frac{|A x_M + B y_M + C z_M + D|}{\sqrt{A^2 + B^2 + C^2}}" block />
              </div>

              <div className="p-3 bg-[#111] rounded-xl border border-zinc-800 space-y-1">
                <span className="font-semibold text-white block">Góc giữa 2 đường thẳng:</span>
                <KatexMath math="\cos(\Delta_1, \Delta_2) = \frac{|\vec{u}_1 \cdot \vec{u}_2|}{|\vec{u}_1| |\vec{u}_2|}" block />
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-zinc-800 bg-[#111] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-xs font-mono font-medium transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
