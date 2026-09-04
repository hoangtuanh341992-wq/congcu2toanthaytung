import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Crosshair, Eye, EyeOff, Palette } from 'lucide-react';
import { FunctionAnalysis } from '../../types/math';

interface Canvas2DProps {
  analysis: FunctionAnalysis;
  fFn: (x: number) => number;
  gFn: (x: number) => number;
  fDerivFn?: (x: number) => number;
  tangentX: number;
  setTangentX: (x: number) => void;
  showG: boolean;
  setShowG: (show: boolean) => void;
  areaColor?: string;
  setAreaColor?: (color: string) => void;
}

const hexToRgba = (hex: string, alpha: number): string => {
  if (!hex || typeof hex !== 'string') return `rgba(59, 130, 246, ${alpha})`;
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
  }
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return `rgba(59, 130, 246, ${alpha})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const AREA_COLOR_PRESETS = [
  { hex: '#3b82f6', label: 'Xanh lam' },
  { hex: '#10b981', label: 'Xanh lá' },
  { hex: '#f59e0b', label: 'Vàng hổ phách' },
  { hex: '#ef4444', label: 'Đỏ' },
  { hex: '#8b5cf6', label: 'Tím' },
  { hex: '#ec4899', label: 'Hồng' },
];

export const Canvas2D: React.FC<Canvas2DProps> = ({
  analysis,
  fFn,
  gFn,
  fDerivFn,
  tangentX,
  setTangentX,
  showG,
  setShowG,
  areaColor: propAreaColor,
  setAreaColor: propSetAreaColor,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Viewport state: center in math coordinates and pixelsPerUnit
  const [center, setCenter] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [scale, setScale] = useState<number>(45); // pixels per unit
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoverCoords, setHoverCoords] = useState<{ mathX: number; mathY: number; fVal: number; gVal: number } | null>(null);

  // Shaded region color state
  const [internalAreaColor, setInternalAreaColor] = useState<string>('#3b82f6');
  const areaColor = propAreaColor ?? internalAreaColor;
  const handleAreaColorChange = (newColor: string) => {
    setInternalAreaColor(newColor);
    propSetAreaColor?.(newColor);
  };

  // Layer visibility toggles
  const [showAxes, setShowAxes] = useState<boolean>(true);
  const [showArea, setShowArea] = useState<boolean>(true);
  const [showTangent, setShowTangent] = useState<boolean>(true);
  const [showExtrema, setShowExtrema] = useState<boolean>(true);
  const [showAsymptotes, setShowAsymptotes] = useState<boolean>(true);

  // Auto center view if interval [a, b] is set
  const resetView = useCallback(() => {
    const midX = (analysis.a + analysis.b) / 2;
    const yA = fFn(analysis.a);
    const yB = fFn(analysis.b);
    const midY = (!isNaN(yA) && !isNaN(yB)) ? (yA + yB) / 2 : 0;
    setCenter({ x: isNaN(midX) ? 0 : midX, y: isNaN(midY) ? 0 : Math.max(-10, Math.min(10, midY)) });
    setScale(45);
  }, [analysis.a, analysis.b, fFn]);

  // Coordinate transforms
  const toScreenX = useCallback((mathX: number, width: number) => {
    return width / 2 + (mathX - center.x) * scale;
  }, [center.x, scale]);

  const toScreenY = useCallback((mathY: number, height: number) => {
    return height / 2 - (mathY - center.y) * scale;
  }, [center.y, scale]);

  const toMathX = useCallback((screenX: number, width: number) => {
    return center.x + (screenX - width / 2) / scale;
  }, [center.x, scale]);

  const toMathY = useCallback((screenY: number, height: number) => {
    return center.y - (screenY - height / 2) / scale;
  }, [center.y, scale]);

  // Redraw canvas with Sophisticated Dark palette
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // White canvas background (Màu nền trắng)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Uniform line width for axes and graph curves (vừa phải, không đậm, màu đen)
    const UNIFORM_LINE_WIDTH = 1.4;

    // Calculate step spacing for axis marks
    let gridStep = 1;
    if (scale > 100) gridStep = 0.5;
    if (scale > 250) gridStep = 0.2;
    if (scale < 30) gridStep = 2;
    if (scale < 15) gridStep = 5;
    if (scale < 5) gridStep = 10;

    const minMathX = toMathX(0, width);
    const maxMathX = toMathX(width, width);
    const minMathY = toMathY(height, height);
    const maxMathY = toMathY(0, height);

    const startX = Math.floor(minMathX / gridStep) * gridStep;
    const endX = Math.ceil(maxMathX / gridStep) * gridStep;
    const startY = Math.floor(minMathY / gridStep) * gridStep;
    const endY = Math.ceil(maxMathY / gridStep) * gridStep;

    // (Loại bỏ tọa độ lưới khỏi toàn bộ cửa sổ 2D - không vẽ các đường lưới nền)

    // 2. Axes Ox and Oy (Màu sắc: màu đen, độ dày vừa phải bằng đồ thị)
    const originX = toScreenX(0, width);
    const originY = toScreenY(0, height);

    if (showAxes) {
      ctx.lineWidth = UNIFORM_LINE_WIDTH;
      ctx.strokeStyle = '#000000';

      // Trục hoành Ox
      if (originY >= -20 && originY <= height + 20) {
        ctx.beginPath();
        ctx.moveTo(0, originY);
        ctx.lineTo(width, originY);
        ctx.stroke();

        // Mũi tên trục Ox
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.moveTo(width - 8, originY - 4);
        ctx.lineTo(width, originY);
        ctx.lineTo(width - 8, originY + 4);
        ctx.fill();

        // Nhãn x
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = '#000000';
        ctx.fillText('x', width - 14, originY - 8);
      }

      // Trục tung Oy
      if (originX >= -20 && originX <= width + 20) {
        ctx.beginPath();
        ctx.moveTo(originX, height);
        ctx.lineTo(originX, 0);
        ctx.stroke();

        // Mũi tên trục Oy
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.moveTo(originX - 4, 8);
        ctx.lineTo(originX, 0);
        ctx.lineTo(originX + 4, 8);
        ctx.fill();

        // Nhãn y
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = '#000000';
        ctx.fillText('y', originX + 8, 15);
      }

      // Vạch chia và số tọa độ trên trục (màu đen)
      ctx.font = '10px monospace';
      ctx.fillStyle = '#000000';

      for (let x = startX; x <= endX; x += gridStep) {
        if (Math.abs(x) < 1e-6) continue;
        const sx = toScreenX(x, width);
        // Vạch chia nhỏ trên trục Ox
        if (originY >= 0 && originY <= height) {
          ctx.beginPath();
          ctx.moveTo(sx, originY - 3);
          ctx.lineTo(sx, originY + 3);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = UNIFORM_LINE_WIDTH;
          ctx.stroke();
        }
        const labelY = Math.max(15, Math.min(height - 5, originY + 14));
        ctx.fillText(Number(x.toFixed(2)).toString(), sx - 6, labelY);
      }

      for (let y = startY; y <= endY; y += gridStep) {
        if (Math.abs(y) < 1e-6) continue;
        const sy = toScreenY(y, height);
        // Vạch chia nhỏ trên trục Oy
        if (originX >= 0 && originX <= width) {
          ctx.beginPath();
          ctx.moveTo(originX - 3, sy);
          ctx.lineTo(originX + 3, sy);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = UNIFORM_LINE_WIDTH;
          ctx.stroke();
        }
        const labelX = Math.max(5, Math.min(width - 25, originX + 6));
        ctx.fillText(Number(y.toFixed(2)).toString(), labelX, sy + 4);
      }

      // Gốc tọa độ O (màu đen)
      if (originX >= 0 && originX <= width && originY >= 0 && originY <= height) {
        ctx.fillText('O', originX - 12, originY + 12);
      }
    }

    // 3. Shaded Area between f(x) and g(x) on [a, b]
    if (showArea && analysis.a !== analysis.b) {
      const lower = Math.min(analysis.a, analysis.b);
      const upper = Math.max(analysis.a, analysis.b);
      const stepPx = 2;
      const startPx = Math.max(0, toScreenX(lower, width));
      const endPx = Math.min(width, toScreenX(upper, width));

      if (startPx < endPx) {
        ctx.fillStyle = hexToRgba(areaColor, 0.25);
        ctx.beginPath();

        // Top curve (f)
        let first = true;
        for (let sx = startPx; sx <= endPx; sx += stepPx) {
          const mx = toMathX(sx, width);
          const my = fFn(mx);
          if (!isNaN(my) && isFinite(my)) {
            const sy = toScreenY(my, height);
            if (first) {
              ctx.moveTo(sx, sy);
              first = false;
            } else {
              ctx.lineTo(sx, sy);
            }
          }
        }

        // Bottom curve (g if showG, else axis y=0)
        for (let sx = endPx; sx >= startPx; sx -= stepPx) {
          const mx = toMathX(sx, width);
          const my = showG ? gFn(mx) : 0;
          if (!isNaN(my) && isFinite(my)) {
            const sy = toScreenY(my, height);
            ctx.lineTo(sx, sy);
          }
        }
        ctx.closePath();
        ctx.fill();

        // Diagonal hatch stripes in matching hue for rich mathematical look
        ctx.save();
        ctx.clip();
        ctx.strokeStyle = hexToRgba(areaColor, 0.35);
        ctx.lineWidth = 1;
        const stripeSpacing = 10;
        for (let x = startPx - height; x < endPx + height; x += stripeSpacing) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x + height, height);
          ctx.stroke();
        }
        ctx.restore();

        // Dashed bounding lines at x = a and x = b
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.0;
        ctx.strokeStyle = '#000000';
        [lower, upper].forEach(bx => {
          const sx = toScreenX(bx, width);
          ctx.beginPath();
          ctx.moveTo(sx, 0);
          ctx.lineTo(sx, height);
          ctx.stroke();
        });
        ctx.setLineDash([]);
      }
    }

    // 4. Draw Asymptotes
    if (showAsymptotes) {
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = '#e11d48';

      // Vertical
      analysis.asymptotes.vertical.forEach(vx => {
        const sx = toScreenX(vx, width);
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, height);
        ctx.stroke();
      });

      // Horizontal
      analysis.asymptotes.horizontal.forEach(hy => {
        const sy = toScreenY(hy, height);
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(width, sy);
        ctx.stroke();
      });
      ctx.setLineDash([]);
    }

    // Helper to draw a function curve (Độ dày vừa phải, đồng nhất với trục tọa độ, màu đen)
    const drawCurve = (fn: (x: number) => number, color: string = '#000000', lineWidth: number = UNIFORM_LINE_WIDTH) => {
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = color;
      ctx.beginPath();

      let inPath = false;
      const stepPx = 1.5;

      for (let sx = 0; sx <= width; sx += stepPx) {
        const mx = toMathX(sx, width);
        const my = fn(mx);

        if (isNaN(my) || !isFinite(my) || Math.abs(my) > 1e4) {
          inPath = false;
          continue;
        }

        const sy = toScreenY(my, height);
        if (sy < -height * 2 || sy > height * 3) {
          inPath = false;
          continue;
        }

        if (!inPath) {
          ctx.moveTo(sx, sy);
          inPath = true;
        } else {
          ctx.lineTo(sx, sy);
        }
      }
      ctx.stroke();
    };

    // 5. Draw Curve g(x) if enabled (Màu đen, nét đứt mảnh để phân biệt, độ dày bằng trục)
    if (showG) {
      ctx.setLineDash([6, 4]);
      drawCurve(gFn, '#000000', UNIFORM_LINE_WIDTH);
      ctx.setLineDash([]);
    }

    // 6. Draw Curve f(x) (Màu đen, độ dày vừa phải, bằng độ dày trục tọa độ)
    drawCurve(fFn, '#000000', UNIFORM_LINE_WIDTH);

    // 7. Tangent Line at x_0
    if (showTangent && fDerivFn) {
      const y0 = fFn(tangentX);
      const slope = fDerivFn(tangentX);

      if (!isNaN(y0) && isFinite(y0) && !isNaN(slope) && isFinite(slope)) {
        const tanFn = (x: number) => slope * (x - tangentX) + y0;
        ctx.setLineDash([5, 3]);
        drawCurve(tanFn, '#2563eb', UNIFORM_LINE_WIDTH);
        ctx.setLineDash([]);

        // Contact point
        const ptX = toScreenX(tangentX, width);
        const ptY = toScreenY(y0, height);
        ctx.fillStyle = '#2563eb';
        ctx.beginPath();
        ctx.arc(ptX, ptY, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // 8. Draw Extrema points
    if (showExtrema) {
      analysis.criticalPoints.forEach(pt => {
        const px = toScreenX(pt.x, width);
        const py = toScreenY(pt.y, height);

        if (px >= 0 && px <= width && py >= 0 && py <= height) {
          ctx.fillStyle = pt.type === 'cực đại' ? '#dc2626' : pt.type === 'cực tiểu' ? '#059669' : '#7c3aed';
          ctx.beginPath();
          ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Light label pill
          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          const text = `${pt.type} (${pt.x}; ${pt.y})`;
          ctx.font = '10px monospace';
          const textWidth = ctx.measureText(text).width;
          ctx.fillRect(px + 4, py - 16, textWidth + 8, 14);
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 4, py - 16, textWidth + 8, 14);

          ctx.fillStyle = pt.type === 'cực đại' ? '#b91c1c' : pt.type === 'cực tiểu' ? '#047857' : '#6d28d9';
          ctx.fillText(text, px + 8, py - 6);
        }
      });
    }

    // 9. Hover Crosshairs
    if (hoverCoords) {
      const hx = toScreenX(hoverCoords.mathX, width);
      const hy = toScreenY(hoverCoords.mathY, height);

      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#9ca3af';

      ctx.beginPath();
      ctx.moveTo(hx, 0);
      ctx.lineTo(hx, height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, hy);
      ctx.lineTo(width, hy);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [
    center,
    scale,
    analysis,
    fFn,
    gFn,
    fDerivFn,
    tangentX,
    showG,
    showAxes,
    showArea,
    areaColor,
    showTangent,
    showExtrema,
    showAsymptotes,
    hoverCoords,
    toMathX,
    toMathY,
    toScreenX,
    toScreenY,
  ]);

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (isDragging) {
      const dx = (e.clientX - dragStart.x) / scale;
      const dy = (e.clientY - dragStart.y) / scale;
      setCenter(prev => ({ x: prev.x - dx, y: prev.y + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }

    // Update hover math coordinates
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const mx = toMathX(sx, rect.width);
    const my = toMathY(sy, rect.height);
    const fv = fFn(mx);
    const gv = gFn(mx);
    setHoverCoords({
      mathX: Number(mx.toFixed(2)),
      mathY: Number(my.toFixed(2)),
      fVal: Number(fv.toFixed(2)),
      gVal: Number(gv.toFixed(2)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setScale(prev => Math.max(5, Math.min(600, prev * zoomFactor)));
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const mx = toMathX(sx, rect.width);
    setTangentX(Number(mx.toFixed(2)));
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] rounded-xl border border-[#222] overflow-hidden shadow-lg shadow-black/40">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-[#111] border-b border-[#222] gap-2 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs uppercase tracking-wider text-zinc-300 flex items-center gap-1.5 font-bold">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block shadow-sm shadow-blue-500"></span>
            2D PLOTTER_REALTIME
          </span>
          <div className="flex items-center gap-2">
            <span className="text-blue-400 font-mono text-xs font-semibold">y = f(x)</span>
            <button
              onClick={() => setShowG(!showG)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors font-mono text-[11px] ${
                showG
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
                  : 'bg-[#18181b] text-zinc-500 border-zinc-800'
              }`}
            >
              {showG ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <span>g(x)</span>
            </button>
          </div>
        </div>

        {/* Layer checkboxes */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer text-zinc-400 hover:text-zinc-200">
            <input
              type="checkbox"
              checked={showAxes}
              onChange={e => setShowAxes(e.target.checked)}
              className="rounded bg-zinc-900 border-zinc-700 text-blue-600 focus:ring-0"
            />
            <span>Trục Oxy</span>
          </label>
          {/* Miền [a; b] với Tùy biến màu sắc */}
          <div className="flex items-center gap-1.5 bg-[#18181b] px-2 py-1 rounded-md border border-zinc-800">
            <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300 hover:text-white">
              <input
                type="checkbox"
                checked={showArea}
                onChange={e => setShowArea(e.target.checked)}
                className="rounded bg-zinc-900 border-zinc-700 text-blue-600 focus:ring-0"
              />
              <span className="font-medium">Miền [a; b]</span>
            </label>
            {showArea && (
              <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-700">
                {/* Palette presets */}
                <div className="flex items-center gap-1">
                  {AREA_COLOR_PRESETS.map(preset => {
                    const isSelected = areaColor.toLowerCase() === preset.hex.toLowerCase();
                    return (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() => handleAreaColorChange(preset.hex)}
                        title={`Chọn màu ${preset.label}`}
                        className={`w-3.5 h-3.5 rounded-full transition-all ${
                          isSelected
                            ? 'ring-2 ring-white scale-110 shadow-sm'
                            : 'opacity-70 hover:opacity-100 hover:scale-105'
                        }`}
                        style={{ backgroundColor: preset.hex }}
                      />
                    );
                  })}
                </div>
                {/* Custom Color Input */}
                <label className="relative flex items-center cursor-pointer ml-0.5" title="Chọn màu tùy ý cho Miền [a;b]">
                  <Palette className="w-3.5 h-3.5 text-zinc-400 hover:text-white mr-1 transition-colors" />
                  <input
                    type="color"
                    value={areaColor}
                    onChange={e => handleAreaColorChange(e.target.value)}
                    className="w-4 h-4 p-0 rounded cursor-pointer border-0 bg-transparent"
                  />
                </label>
              </div>
            )}
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer text-zinc-400 hover:text-zinc-200">
            <input
              type="checkbox"
              checked={showTangent}
              onChange={e => setShowTangent(e.target.checked)}
              className="rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-0"
            />
            <span>Tiếp tuyến (x₀ = {tangentX})</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-zinc-400 hover:text-zinc-200">
            <input
              type="checkbox"
              checked={showExtrema}
              onChange={e => setShowExtrema(e.target.checked)}
              className="rounded bg-zinc-900 border-zinc-700 text-red-500 focus:ring-0"
            />
            <span>Cực trị</span>
          </label>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setScale(s => Math.min(600, s * 1.2))}
            title="Phóng to"
            className="p-1.5 rounded bg-[#18181b] hover:bg-zinc-800 border border-zinc-800 text-zinc-300"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setScale(s => Math.max(5, s * 0.8))}
            title="Thu nhỏ"
            className="p-1.5 rounded bg-[#18181b] hover:bg-zinc-800 border border-zinc-800 text-zinc-300"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetView}
            title="Đưa về trung tâm [a, b]"
            className="p-1.5 rounded bg-[#18181b] hover:bg-zinc-800 border border-zinc-800 text-zinc-300"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas Area */}
      <div ref={containerRef} className="relative flex-1 min-h-[380px] cursor-crosshair bg-white">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            setIsDragging(false);
            setHoverCoords(null);
          }}
          onWheel={handleWheel}
          onClick={handleCanvasClick}
          className="w-full h-full block"
        />

        {/* Real-time Hover Readout Floating Badge */}
        {hoverCoords && (
          <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur border border-zinc-300 text-zinc-800 text-[11px] px-3 py-1.5 rounded-lg pointer-events-none shadow-md flex items-center gap-3 font-mono">
            <span className="flex items-center gap-1 text-zinc-600">
              <Crosshair className="w-3 h-3 text-zinc-700" />
              ({hoverCoords.mathX}; {hoverCoords.mathY})
            </span>
            <span className="text-black font-semibold">
              f({hoverCoords.mathX}) = {isNaN(hoverCoords.fVal) ? 'không XĐ' : hoverCoords.fVal}
            </span>
            {showG && (
              <span className="text-zinc-700 font-semibold border-l border-zinc-300 pl-2">
                g({hoverCoords.mathX}) = {isNaN(hoverCoords.gVal) ? 'không XĐ' : hoverCoords.gVal}
              </span>
            )}
          </div>
        )}

        {/* Quick Hint */}
        <div className="absolute top-2 right-2 text-[10px] text-zinc-600 pointer-events-none bg-white/90 px-2.5 py-1 rounded border border-zinc-300 font-mono shadow-sm">
          Cuộn: Zoom • Kéo: Pan • Click: Đặt x₀
        </div>
      </div>
    </div>
  );
};
