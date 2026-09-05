/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Compass, Box, BookOpen, Activity } from 'lucide-react';
import { Tool2DView } from './components/2d/Tool2DView';
import { Tool3DView } from './components/3d/Tool3DView';
import { FormulaGuideModal } from './components/common/FormulaGuideModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'2d' | '3d'>('2d');
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-[#050505] text-[#e0e0e0] flex flex-col font-sans selection:bg-blue-900 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="bg-[#0a0a0a] border-b border-[#222] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#111] border border-zinc-800 flex items-center justify-center text-blue-400 font-mono font-bold text-sm shadow-inner">
                ∑π
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-sm md:text-base tracking-tight text-white font-mono">
                    CONG CU TOAN <span className="text-blue-500">HVT2</span>
                  </h1>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                    v4.0
                  </span>
                </div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 hidden sm:block">
                  Công cụ Giải tích 2D & Hình học Không gian Oxyz
                </p>
              </div>
            </div>

            {/* Status & Tab Navigation */}
            <div className="flex items-center gap-3">
              {/* GPU Engine Active badge */}
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/30 text-emerald-400 text-[10px] font-mono rounded border border-emerald-800/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>HEURISTIC ENGINE ACTIVE</span>
              </div>

              {/* Main Tabs */}
              <div className="flex items-center bg-[#111] p-1 rounded-lg border border-zinc-800">
                <button
                  id="tab-btn-2d"
                  onClick={() => setActiveTab('2d')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                    activeTab === '2d'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-950/50'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Công cụ 2D</span>
                </button>

                <button
                  id="tab-btn-3d"
                  onClick={() => setActiveTab('3d')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                    activeTab === '3d'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-950/50'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>Công cụ 3D</span>
                </button>
              </div>

              {/* Formula Guide */}
              <button
                id="btn-formula-guide"
                onClick={() => setIsFormulaModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-800 bg-[#111] hover:bg-zinc-800 text-zinc-300 transition-colors"
                title="Bảng tra cứu công thức"
              >
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden md:inline">Công Thức</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === '2d' ? <Tool2DView /> : <Tool3DView />}
      </main>

      {/* Footer */}
      <footer className="bg-[#0a0a0a] border-t border-[#222] py-4 px-6 text-center text-xs text-zinc-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
          <span>CONG CU TOAN HVT2 • ADVANCED ANALYTICAL SUITE</span>
          <span>KHẢO SÁT HÀM SỐ 2D & KHÔNG GIAN OXYZ 3D • 60 FPS COMPUTATION</span>
        </div>
      </footer>

      {/* Formula Guide Modal */}
      <FormulaGuideModal
        isOpen={isFormulaModalOpen}
        onClose={() => setIsFormulaModalOpen(false)}
      />
    </div>
  );
}
