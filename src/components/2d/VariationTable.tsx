import React, { useState, useRef } from 'react';
import { FunctionAnalysis } from '../../types/math';
import { buildVariationTableData, toLatexSafe } from '../../utils/mathParser';
import { KatexMath } from '../common/KatexMath';
import {
  BookOpen,
  Copy,
  Check,
  Compass,
} from 'lucide-react';

interface VariationTableProps {
  fExpr: string;
  analysis: FunctionAnalysis;
}

export const VariationTable: React.FC<VariationTableProps> = ({ fExpr, analysis }) => {
  const tableData = buildVariationTableData(fExpr, analysis);
  const { points, intervals, segments, domainText } = tableData;

  // Theme mode: 'textbook' (giấy trắng mực đen) or 'dark' (sophisticated dark)
  const [themeMode, setThemeMode] = useState<'textbook' | 'dark'>('textbook');
  // Notation style: 'y' or 'fx'
  const [notation, setNotation] = useState<'y' | 'fx'>('y');
  // Copy state
  const [copied, setCopied] = useState<boolean>(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Compact SVG Dimensions - Designed to harmonize with 2D Canvas
  const headerWidth = 52;
  const colWidth = Math.max(68, Math.min(125, 340 / Math.max(1, intervals.length)));
  const totalWidth = Math.max(300, headerWidth + intervals.length * colWidth + 16);
  const rowXHeight = 28;
  const rowDerivHeight = 28;
  const rowFuncHeight = 78;
  const totalSvgHeight = rowXHeight + rowDerivHeight + rowFuncHeight; // 134px

  // Calculate X position for each point
  const getPointX = (index: number): number => {
    if (index === 0) return headerWidth + 24;
    if (index === points.length - 1) return totalWidth - 24;
    const availableWidth = totalWidth - headerWidth - 48;
    const step = availableWidth / (points.length - 1);
    return headerWidth + 24 + index * step;
  };

  // Compact Y positions for function row (top: 15, middle: 39, bottom: 63)
  const getLevelY = (level: 'top' | 'middle' | 'bottom'): number => {
    if (level === 'top') return 15;
    if (level === 'middle') return 39;
    return 63;
  };

  // Colors
  const isTextbook = themeMode === 'textbook';
  const colors = isTextbook
    ? {
        bg: '#ffffff',
        text: '#111827',
        border: '#374151',
        headerBg: '#f9fafb',
        arrow: '#1d4ed8', // Dark blue arrow
        asymptote: '#dc2626', // Red double line
        signPlus: '#1d4ed8',
        signMinus: '#dc2626',
        cardBg: '#ffffff',
        mutedText: '#4b5563',
      }
    : {
        bg: '#0a0a0a',
        text: '#f3f4f6',
        border: '#27272a',
        headerBg: '#111111',
        arrow: '#60a5fa',
        asymptote: '#f87171',
        signPlus: '#60a5fa',
        signMinus: '#f87171',
        cardBg: '#111111',
        mutedText: '#a1a1aa',
      };

  const handleCopyText = () => {
    const lines = [
      `BẢNG BIẾN THIÊN CỦA HÀM SỐ: y = ${fExpr}`,
      `1. Tập xác định: ${domainText.replace(/\\mathcal{D} = /, 'D = ').replace(/\\mathbb{R}/g, 'R')}`,
      `2. Đạo hàm: y' = ${analysis.fDerivative}`,
      `3. Các khoảng đơn điệu:`,
      ...analysis.monotonicIntervals.map(m => ` - ${m.type === 'đồng biến' ? 'Đồng biến' : 'Nghịch biến'} trên khoảng ${m.interval}`),
      `4. Điểm cực trị:`,
      ...analysis.criticalPoints.map(p => ` - ${p.type === 'cực đại' ? 'Cực đại' : 'Cực tiểu'} tại x = ${p.x}, y = ${p.y}`),
      analysis.asymptotes.vertical.length > 0 ? `5. Tiệm cận đứng: x = ${analysis.asymptotes.vertical.join(', ')}` : '',
      analysis.asymptotes.horizontal.length > 0 ? `6. Tiệm cận ngang: y = ${analysis.asymptotes.horizontal.join(', ')}` : '',
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(lines);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const latexExpr = toLatexSafe(fExpr);

  return (
    <div className="bg-[#0a0a0a] rounded-xl border border-[#222] p-3 shadow-lg shadow-black/40 space-y-2.5">
      {/* Action Header - Compact & Clean */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#222] pb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/50 flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            CHUẨN BGD&ĐT
          </span>
          <h3 className="font-mono font-bold text-white text-xs uppercase tracking-wider">
            Bảng Biến Thiên SGK Toán 12
          </h3>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5">
          {/* Notation toggle */}
          <div className="flex items-center bg-[#111] border border-zinc-800 rounded p-0.5 text-[10px] font-mono">
            <button
              onClick={() => setNotation('y')}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                notation === 'y' ? 'bg-zinc-700 text-white font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              y, y'
            </button>
            <button
              onClick={() => setNotation('fx')}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                notation === 'fx' ? 'bg-zinc-700 text-white font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              f, f'
            </button>
          </div>

          {/* Theme mode */}
          <div className="flex items-center bg-[#111] border border-zinc-800 rounded p-0.5 text-[10px] font-mono">
            <button
              onClick={() => setThemeMode('textbook')}
              className={`px-1.5 py-0.5 rounded transition-colors flex items-center gap-1 ${
                isTextbook
                  ? 'bg-amber-100 text-amber-900 font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Giao diện in ấn sách giáo khoa trang trắng"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 inline-block"></span>
              Trắng
            </button>
            <button
              onClick={() => setThemeMode('dark')}
              className={`px-1.5 py-0.5 rounded transition-colors flex items-center gap-1 ${
                !isTextbook
                  ? 'bg-zinc-800 text-zinc-100 font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
              Tối
            </button>
          </div>

          {/* Copy button */}
          <button
            onClick={handleCopyText}
            className="flex items-center gap-1 px-2 py-0.5 bg-[#111] hover:bg-zinc-800 border border-zinc-800 rounded text-[11px] text-zinc-300 font-mono transition-colors"
            title="Sao chép kết quả khảo sát"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Đã chép</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Chép</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div
        ref={tableContainerRef}
        className="rounded-lg border p-2.5 transition-colors overflow-x-auto shadow-inner"
        style={{
          backgroundColor: colors.bg,
          borderColor: isTextbook ? '#d1d5db' : '#27272a',
        }}
      >
        {/* Table Title with KaTeX Formula */}
        <div className="text-center mb-1.5 flex items-center justify-center gap-2">
          <span
            className="font-serif font-bold text-xs tracking-wider uppercase"
            style={{ color: colors.text }}
          >
            BẢNG BIẾN THIÊN
          </span>
          <span className="text-zinc-400 text-xs">|</span>
          <div className="text-xs font-serif flex items-center gap-1" style={{ color: colors.mutedText }}>
            <span>Hàm số:</span>
            <KatexMath
              math={`y = ${latexExpr}`}
              className={isTextbook ? 'text-blue-800 font-bold' : 'text-blue-400 font-bold'}
            />
          </div>
        </div>

        {/* SVG VARIATION TABLE - COMPACT SGK 12 STANDARD */}
        <div className="flex justify-center min-w-fit w-full overflow-x-auto">
          <svg
            width={totalWidth}
            height={totalSvgHeight}
            className="select-none font-serif"
            style={{ backgroundColor: colors.bg }}
          >
            <defs>
              {/* Sharp, clean arrow markers */}
              <marker
                id="arrow-head-compact"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 2 L 8 5 L 0 8 z" fill={colors.arrow} />
              </marker>
            </defs>

            {/* Bounding Box */}
            <rect
              x="1"
              y="1"
              width={totalWidth - 2}
              height={totalSvgHeight - 2}
              fill="none"
              stroke={colors.border}
              strokeWidth="1.4"
            />

            {/* Vertical Divider Line for Header Column */}
            <line
              x1={headerWidth}
              y1="0"
              x2={headerWidth}
              y2={totalSvgHeight}
              stroke={colors.border}
              strokeWidth="1.4"
            />

            {/* Horizontal Divider between x and y' */}
            <line
              x1="0"
              y1={rowXHeight}
              x2={totalWidth}
              y2={rowXHeight}
              stroke={colors.border}
              strokeWidth="1.1"
            />

            {/* Horizontal Divider between y' and y */}
            <line
              x1="0"
              y1={rowXHeight + rowDerivHeight}
              x2={totalWidth}
              y2={rowXHeight + rowDerivHeight}
              stroke={colors.border}
              strokeWidth="1.2"
            />

            {/* ================= HEADER LABELS ================= */}
            <text
              x={headerWidth / 2}
              y={rowXHeight / 2 + 4}
              textAnchor="middle"
              fontSize="12"
              fontWeight="bold"
              fontStyle="italic"
              fill={colors.text}
            >
              x
            </text>

            <text
              x={headerWidth / 2}
              y={rowXHeight + rowDerivHeight / 2 + 4}
              textAnchor="middle"
              fontSize="12"
              fontWeight="bold"
              fontStyle="italic"
              fill={colors.text}
            >
              {notation === 'y' ? "y'" : "f'(x)"}
            </text>

            <text
              x={headerWidth / 2}
              y={rowXHeight + rowDerivHeight + rowFuncHeight / 2 + 4}
              textAnchor="middle"
              fontSize="12"
              fontWeight="bold"
              fontStyle="italic"
              fill={colors.text}
            >
              {notation === 'y' ? 'y' : 'f(x)'}
            </text>

            {/* ================= ROW 1: X VALUES ================= */}
            {points.map((pt, i) => {
              const xPos = getPointX(i);
              let displayLabel = pt.xLabel;
              if (pt.xLabel === '-\\infty') displayLabel = '-∞';
              if (pt.xLabel === '+\\infty') displayLabel = '+∞';

              return (
                <text
                  key={`x-val-${i}`}
                  x={xPos}
                  y={rowXHeight / 2 + 4}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={pt.isAsymptote ? 'bold' : 'normal'}
                  fill={colors.text}
                >
                  {displayLabel}
                </text>
              );
            })}

            {/* ================= ROW 2: Y' VALUES & SIGNS ================= */}
            {/* Points (0 or Asymptote Double Line) */}
            {points.map((pt, i) => {
              const xPos = getPointX(i);

              if (pt.isAsymptote) {
                return (
                  <g key={`asymp-line-${i}`}>
                    <line
                      x1={xPos - 1.5}
                      y1={rowXHeight}
                      x2={xPos - 1.5}
                      y2={totalSvgHeight}
                      stroke={colors.asymptote}
                      strokeWidth="1.2"
                    />
                    <line
                      x1={xPos + 1.5}
                      y1={rowXHeight}
                      x2={xPos + 1.5}
                      y2={totalSvgHeight}
                      stroke={colors.asymptote}
                      strokeWidth="1.2"
                    />
                  </g>
                );
              }

              if (pt.derivativeVal === 0) {
                return (
                  <text
                    key={`deriv-zero-${i}`}
                    x={xPos}
                    y={rowXHeight + rowDerivHeight / 2 + 4}
                    textAnchor="middle"
                    fontSize="11"
                    fill={colors.text}
                  >
                    0
                  </text>
                );
              }

              return null;
            })}

            {/* Signs (+ or -) */}
            {intervals.map((inv, i) => {
              const xLeft = getPointX(i);
              const xRight = getPointX(i + 1);
              const xMid = (xLeft + xRight) / 2;
              const isPlus = inv.sign === '+';

              return (
                <text
                  key={`inv-sign-${i}`}
                  x={xMid}
                  y={rowXHeight + rowDerivHeight / 2 + 4}
                  textAnchor="middle"
                  fontSize="14"
                  fontWeight="bold"
                  fill={isPlus ? colors.signPlus : colors.signMinus}
                >
                  {inv.sign}
                </text>
              );
            })}

            {/* ================= ROW 3: VARIATION ARROWS & VALUES ================= */}
            {segments.map((seg, i) => {
              const xLeft = getPointX(seg.startIndex);
              const xRight = getPointX(seg.endIndex);

              const padLeft = seg.isRightOfAsymptote ? 12 : seg.startIndex === 0 ? 14 : 10;
              const padRight = seg.isLeftOfAsymptote ? 12 : seg.endIndex === points.length - 1 ? 14 : 10;

              const xStart = xLeft + padLeft;
              const xEnd = xRight - padRight;

              const yBase = rowXHeight + rowDerivHeight;
              const yStart = yBase + getLevelY(seg.startLevel);
              const yEnd = yBase + getLevelY(seg.endLevel);

              return (
                <line
                  key={`arrow-seg-${i}`}
                  x1={xStart}
                  y1={yStart}
                  x2={xEnd}
                  y2={yEnd}
                  stroke={colors.arrow}
                  strokeWidth="1.4"
                  markerEnd="url(#arrow-head-compact)"
                />
              );
            })}

            {/* Leftmost node at -infinity */}
            {(() => {
              const xPos = getPointX(0);
              const yBase = rowXHeight + rowDerivHeight;
              const firstSeg = segments[0];
              const yPos = yBase + getLevelY(firstSeg?.startLevel || 'bottom');
              let label = firstSeg?.startLabel || '-∞';
              if (label === '-\\infty') label = '-∞';
              if (label === '+\\infty') label = '+∞';

              return (
                <text
                  x={xPos + 4}
                  y={yPos + 3}
                  textAnchor="start"
                  fontSize="10.5"
                  fontWeight="bold"
                  fill={colors.text}
                >
                  {label}
                </text>
              );
            })()}

            {/* Intermediate points */}
            {points.map((pt, i) => {
              if (i === 0 || i === points.length - 1) return null;
              const xPos = getPointX(i);
              const yBase = rowXHeight + rowDerivHeight;

              if (pt.isAsymptote) {
                let leftLabel = pt.leftLimit?.label || '-∞';
                if (leftLabel === '-\\infty') leftLabel = '-∞';
                if (leftLabel === '+\\infty') leftLabel = '+∞';

                let rightLabel = pt.rightLimit?.label || '+∞';
                if (rightLabel === '-\\infty') rightLabel = '-∞';
                if (rightLabel === '+\\infty') rightLabel = '+∞';

                const yLeft = yBase + getLevelY(pt.leftLimit?.level || 'bottom');
                const yRight = yBase + getLevelY(pt.rightLimit?.level || 'top');

                return (
                  <g key={`asymp-labels-${i}`}>
                    <text
                      x={xPos - 5}
                      y={yLeft + 3}
                      textAnchor="end"
                      fontSize="10.5"
                      fontWeight="bold"
                      fill={colors.text}
                    >
                      {leftLabel}
                    </text>
                    <text
                      x={xPos + 5}
                      y={yRight + 3}
                      textAnchor="start"
                      fontSize="10.5"
                      fontWeight="bold"
                      fill={colors.text}
                    >
                      {rightLabel}
                    </text>
                  </g>
                );
              }

              // Critical point
              let yValLabel = pt.fxLabel;
              if (yValLabel === '-\\infty') yValLabel = '-∞';
              if (yValLabel === '+\\infty') yValLabel = '+∞';

              const level = pt.type === 'cực đại' ? 'top' : pt.type === 'cực tiểu' ? 'bottom' : 'middle';
              const yPos = yBase + getLevelY(level);

              return (
                <g key={`crit-node-${i}`}>
                  <text
                    x={xPos}
                    y={level === 'top' ? yPos - 5 : yPos + 11}
                    textAnchor="middle"
                    fontSize="10.5"
                    fontWeight="bold"
                    fill={colors.text}
                  >
                    {yValLabel}
                  </text>
                  <circle
                    cx={xPos}
                    cy={yPos}
                    r="2"
                    fill={colors.arrow}
                  />
                </g>
              );
            })}

            {/* Rightmost node at +infinity */}
            {(() => {
              const xPos = getPointX(points.length - 1);
              const yBase = rowXHeight + rowDerivHeight;
              const lastSeg = segments[segments.length - 1];
              const yPos = yBase + getLevelY(lastSeg?.endLevel || 'top');
              let label = lastSeg?.endLabel || '+∞';
              if (label === '-\\infty') label = '-∞';
              if (label === '+\\infty') label = '+∞';

              return (
                <text
                  x={xPos - 4}
                  y={yPos + 3}
                  textAnchor="end"
                  fontSize="10.5"
                  fontWeight="bold"
                  fill={colors.text}
                >
                  {label}
                </text>
              );
            })()}
          </svg>
        </div>
      </div>

      {/* SÁCH GIÁO KHOA STEP-BY-STEP ANALYSIS - TOÀN BỘ CÔNG THỨC HIỂN THỊ CHUẨN KATEX */}
      <div className="bg-[#111] rounded-lg border border-zinc-800 p-3 text-xs space-y-2">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
          <span className="font-bold text-zinc-200 text-[11px] uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <Compass className="w-3.5 h-3.5 text-blue-400" />
            KẾT LUẬN KHẢO SÁT (CHUẨN SGK TOÁN 12)
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">Giải tích 12</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-zinc-300">
          {/* 1. Tập xác định & Đạo hàm */}
          <div className="space-y-1.5 bg-[#0a0a0a] p-2.5 rounded border border-zinc-800/80">
            {/* 1. Tập xác định */}
            <div>
              <span className="text-[11px] font-bold text-blue-400 mr-1.5">1.</span>
              <span className="font-semibold text-white text-[11px]">Tập xác định:</span>
              <div className="mt-0.5 pl-3 text-zinc-200">
                <KatexMath math={domainText} />
              </div>
            </div>

            {/* 2. Đạo hàm */}
            <div className="pt-1 border-t border-zinc-900">
              <span className="text-[11px] font-bold text-blue-400 mr-1.5">2.</span>
              <span className="font-semibold text-white text-[11px]">Đạo hàm:</span>
              <div className="mt-0.5 pl-3 text-zinc-200">
                <KatexMath math={`y' = ${analysis.fDerivative}`} />
              </div>
              {analysis.criticalPoints.length > 0 && (
                <div className="mt-0.5 pl-3 text-[11px] text-zinc-400">
                  <KatexMath
                    math={`y' = 0 \\iff x \\in \\{ ${analysis.criticalPoints.map(p => p.x).join('; ')} \\}`}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 2. Chiều biến thiên */}
          <div className="space-y-1.5 bg-[#0a0a0a] p-2.5 rounded border border-zinc-800/80">
            <div>
              <span className="text-[11px] font-bold text-emerald-400 mr-1.5">3.</span>
              <span className="font-semibold text-white text-[11px]">Chiều biến thiên:</span>
              {analysis.monotonicIntervals.length === 0 ? (
                <p className="text-zinc-500 italic mt-0.5 pl-3 text-[11px]">Không có khoảng liên tục</p>
              ) : (
                <ul className="mt-0.5 pl-3 space-y-0.5 text-[11px]">
                  {analysis.monotonicIntervals.map((m, idx) => (
                    <li key={idx} className="flex items-center justify-between gap-1">
                      <span className="text-zinc-400">
                        {m.type === 'đồng biến' ? 'Đồng biến:' : 'Nghịch biến:'}
                      </span>
                      <span
                        className={`font-semibold ${
                          m.type === 'đồng biến' ? 'text-blue-400' : 'text-amber-400'
                        }`}
                      >
                        <KatexMath math={m.interval} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* 3. Cực trị */}
          <div className="space-y-1 bg-[#0a0a0a] p-2.5 rounded border border-zinc-800/80">
            <div>
              <span className="text-[11px] font-bold text-rose-400 mr-1.5">4.</span>
              <span className="font-semibold text-white text-[11px]">Cực trị của hàm số:</span>
              {analysis.criticalPoints.length === 0 ? (
                <p className="text-zinc-500 italic mt-0.5 pl-3 text-[11px]">Hàm số không có điểm cực trị.</p>
              ) : (
                <ul className="mt-0.5 pl-3 space-y-0.5 text-[11px]">
                  {analysis.criticalPoints.map((p, idx) => (
                    <li key={idx} className="flex items-center justify-between">
                      <span className="text-zinc-400">
                        {p.type === 'cực đại' ? 'Cực đại:' : 'Cực tiểu:'}
                      </span>
                      <span className="text-white font-bold">
                        <KatexMath math={`(${p.x}; ${p.y})`} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* 4. Tiệm cận */}
          <div className="space-y-1 bg-[#0a0a0a] p-2.5 rounded border border-zinc-800/80">
            <div>
              <span className="text-[11px] font-bold text-purple-400 mr-1.5">5.</span>
              <span className="font-semibold text-white text-[11px]">Tiệm cận của đồ thị:</span>
              <div className="mt-0.5 pl-3 text-[11px] space-y-0.5">
                {analysis.asymptotes.vertical.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Tiệm cận đứng:</span>
                    <span className="text-rose-400 font-bold">
                      <KatexMath
                        math={`x = ${analysis.asymptotes.vertical.join('; x = ')}`}
                      />
                    </span>
                  </div>
                )}
                {analysis.asymptotes.horizontal.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Tiệm cận ngang:</span>
                    <span className="text-blue-400 font-bold">
                      <KatexMath
                        math={`y = ${analysis.asymptotes.horizontal.join('; y = ')}`}
                      />
                    </span>
                  </div>
                )}
                {analysis.asymptotes.vertical.length === 0 &&
                  analysis.asymptotes.horizontal.length === 0 && (
                    <div className="text-zinc-500 italic">Đồ thị không có tiệm cận.</div>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
