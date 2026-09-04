import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Crosshair } from 'lucide-react';

interface Revolution2DCanvasProps {
  fFn: (x: number) => number;
  fExpr: string;
  a: number;
  b: number;
  area?: number;
  solidColor: string;
  revolutionAngle: number;
  isAnimating: boolean;
  showAxes?: boolean;
}

const hexToRgba = (hex: string, alpha: number): string => {
  if (!hex || typeof hex !== 'string') return `rgba(2, 132, 199, ${alpha})`;
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
  }
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return `rgba(2, 132, 199, ${alpha})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const Revolution2DCanvas: React.FC<Revolution2DCanvasProps> = ({
  fFn,
  a,
  b,
  area,
  solidColor,
  revolutionAngle,
  showAxes = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Viewport state
  const minX = Math.min(a, b);
  const maxX = Math.max(a, b);
  const defaultCenterX = (minX + maxX) / 2;
  const [center, setCenter] = useState<{ x: number; y: number }>({
    x: isNaN(defaultCenterX) ? 0 : defaultCenterX,
    y: 0,
  });
  const [scale, setScale] = useState<number>(42); // pixels per unit
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoverCoords, setHoverCoords] = useState<{ mathX: number; mathY: number; fVal: number } | null>(null);

  // Reset viewport to nicely frame [a, b]
  const resetView = useCallback(() => {
    const cX = (minX + maxX) / 2;
    const yA = fFn(minX);
    const yB = fFn(maxX);
    const midY = (!isNaN(yA) && !isNaN(yB)) ? (yA + yB) / 4 : 0;
    setCenter({ x: isNaN(cX) ? 0 : cX, y: isNaN(midY) ? 0 : midY });
    setScale(45);
  }, [minX, maxX, fFn]);

  // Coordinate transformations
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

  // Redraw 2D Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear background to pure white (Nền màu trắng)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Uniform line width for coordinate axes and graph curves (vừa phải, không đậm, màu đen)
    const UNIFORM_LINE_WIDTH = 1.4;

    // Step spacing for axis marks
    let step = 1;
    if (scale < 20) step = 5;
    else if (scale < 35) step = 2;
    else if (scale > 90) step = 0.5;

    const xMinMath = toMathX(0, width);
    const xMaxMath = toMathX(width, width);
    const yMinMath = toMathY(height, height);
    const yMaxMath = toMathY(0, height);

    const firstX = Math.floor(xMinMath / step) * step;
    const firstY = Math.floor(yMinMath / step) * step;

    // (Loại bỏ hoàn toàn tọa độ lưới khỏi toàn bộ cửa sổ 2D - không vẽ các đường lưới nền)

    // Origin
    const originX = toScreenX(0, width);
    const originY = toScreenY(0, height);

    if (showAxes) {
      // Oy Axis (Màu đen, độ dày vừa phải đồng nhất = UNIFORM_LINE_WIDTH)
      ctx.lineWidth = UNIFORM_LINE_WIDTH;
      ctx.strokeStyle = '#000000';
      ctx.beginPath();
      ctx.moveTo(originX, 0);
      ctx.lineTo(originX, height);
      ctx.stroke();

      // Mũi tên trục Oy
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.moveTo(originX - 4, 8);
      ctx.lineTo(originX, 0);
      ctx.lineTo(originX + 4, 8);
      ctx.fill();

      // Nhãn trục Oy
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('y', originX + 7, 16);
    }

    // ================= SHADED BOUNDED REGION (Miền phẳng quay H) =================
    if (minX < maxX) {
      const lowerX = minX;
      const upperX = maxX;
      const samples = 150;

      // Fill area between f(x) and Ox
      ctx.beginPath();
      const startSx = toScreenX(lowerX, width);
      const axisSy = toScreenY(0, height);

      ctx.moveTo(startSx, axisSy);

      for (let i = 0; i <= samples; i++) {
        const xVal = lowerX + (i / samples) * (upperX - lowerX);
        const yVal = fFn(xVal);
        if (!isNaN(yVal) && isFinite(yVal)) {
          const sx = toScreenX(xVal, width);
          const sy = toScreenY(yVal, height);
          ctx.lineTo(sx, sy);
        }
      }

      const endSx = toScreenX(upperX, width);
      ctx.lineTo(endSx, axisSy);
      ctx.closePath();

      // Semi-transparent solid color fill
      ctx.fillStyle = hexToRgba(solidColor, 0.22);
      ctx.fill();

      // Add diagonal subtle pattern for mathematical clarity
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = hexToRgba(solidColor, 0.32);
      ctx.lineWidth = 1;
      const stripeSpacing = 10;
      for (let x = startSx - height; x < endSx + height; x += stripeSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + height, height);
        ctx.stroke();
      }
      ctx.restore();

      // Vertical Boundary Line x = a (Màu đen, nét đứt)
      ctx.lineWidth = 1.0;
      ctx.strokeStyle = '#000000';
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      const yAtMin = fFn(lowerX);
      const syAtMin = (!isNaN(yAtMin) && isFinite(yAtMin)) ? toScreenY(yAtMin, height) : axisSy;
      ctx.moveTo(startSx, axisSy);
      ctx.lineTo(startSx, syAtMin);
      ctx.stroke();

      // Vertical Boundary Line x = b
      ctx.beginPath();
      const yAtMax = fFn(upperX);
      const syAtMax = (!isNaN(yAtMax) && isFinite(yAtMax)) ? toScreenY(yAtMax, height) : axisSy;
      ctx.moveTo(endSx, axisSy);
      ctx.lineTo(endSx, syAtMax);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Bound Marker Labels 'a' and 'b' on Ox (Màu đen)
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`x = a (${lowerX})`, startSx, axisSy + (syAtMin > axisSy ? -10 : 16));
      ctx.fillText(`x = b (${upperX})`, endSx, axisSy + (syAtMax > axisSy ? -10 : 16));
      ctx.textAlign = 'left';

      // Label Region "H" (Màu đen)
      const midRegionX = toScreenX((lowerX + upperX) / 2, width);
      const yMid = fFn((lowerX + upperX) / 2);
      const midRegionY = (!isNaN(yMid) && isFinite(yMid)) ? (axisSy + toScreenY(yMid, height)) / 2 : axisSy - 20;
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 13px serif';
      ctx.fillText('(H)', midRegionX - 8, midRegionY);
    }

    // ================= 3D PROJECTION ILLUSION (WHEN REVOLVING) =================
    if (revolutionAngle > 0 && minX < maxX) {
      const lowerX = minX;
      const upperX = maxX;
      const samples = 100;
      const angleFraction = Math.min(1, revolutionAngle / 360);

      // Draw symmetric reflection curve y = -f(x) (dashed)
      ctx.save();
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = hexToRgba(solidColor, 0.55);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      let startedRefl = false;
      for (let i = 0; i <= samples; i++) {
        const xVal = lowerX + (i / samples) * (upperX - lowerX);
        const yVal = -fFn(xVal); // reflected across Ox
        if (!isNaN(yVal) && isFinite(yVal)) {
          const sx = toScreenX(xVal, width);
          const sy = toScreenY(yVal, height);
          if (!startedRefl) {
            ctx.moveTo(sx, sy);
            startedRefl = true;
          } else {
            ctx.lineTo(sx, sy);
          }
        }
      }
      ctx.stroke();
      ctx.restore();

      // Draw revolving cross-section ellipses at key slices (a, midpoint, b)
      const slices = [lowerX, (lowerX + upperX) / 2, upperX];
      slices.forEach(xVal => {
        const rVal = Math.abs(fFn(xVal));
        if (!isNaN(rVal) && isFinite(rVal) && rVal > 0.05) {
          const sx = toScreenX(xVal, width);
          const axisSy = toScreenY(0, height);
          const ryPixels = rVal * scale;
          // Flatten rx to create 3D elliptical disc view revolving around vertical axis
          const rxPixels = revolutionAngle >= 360
            ? ryPixels * 0.28
            : Math.max(3, ryPixels * 0.28 * Math.sin(angleFraction * Math.PI));

          ctx.save();
          ctx.strokeStyle = '#71717a';
          ctx.lineWidth = 1.0;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.ellipse(sx, axisSy, rxPixels, ryPixels, 0, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.restore();
        }
      });
    }

    // ================= CURVE y = f(x) =================
    // Độ dày vừa phải, đồng nhất với trục tọa độ, màu đen
    ctx.lineWidth = UNIFORM_LINE_WIDTH;
    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    let started = false;

    const screenSteps = width;
    for (let px = 0; px <= screenSteps; px += 2) {
      const xVal = toMathX(px, width);
      const yVal = fFn(xVal);

      if (isNaN(yVal) || !isFinite(yVal) || Math.abs(yVal) > 500) {
        started = false;
        continue;
      }

      const sy = toScreenY(yVal, height);
      if (sy < -50 || sy > height + 50) {
        started = false;
        continue;
      }

      if (!started) {
        ctx.moveTo(px, sy);
        started = true;
      } else {
        ctx.lineTo(px, sy);
      }
    }
    ctx.stroke();

    if (showAxes) {
      // ================= Ox AXIS (TRỤC XOAY) - ĐỒNG NHẤT MÀU ĐEN =================
      ctx.lineWidth = UNIFORM_LINE_WIDTH;
      ctx.strokeStyle = '#000000';
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

      // Ox Axis Label & Rotation Indicator
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('x (Trục quay Ox)', width - 145, originY - 8);

      // Draw circular arrow symbol ↻ on Ox indicating rotation axis
      const rotSymbolX = Math.max(40, Math.min(width - 160, toScreenX((minX + maxX) / 2, width)));
      ctx.save();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = UNIFORM_LINE_WIDTH;
      ctx.beginPath();
      ctx.arc(rotSymbolX, originY, 11, 0.2 * Math.PI, 1.8 * Math.PI);
      ctx.stroke();

      // Arrow tip
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.moveTo(rotSymbolX + 11, originY - 3);
      ctx.lineTo(rotSymbolX + 15, originY + 5);
      ctx.lineTo(rotSymbolX + 7, originY + 3);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('quay', rotSymbolX - 11, originY + 3);
      ctx.restore();

      // Vạch chia và số tọa độ trên trục Ox, Oy (màu đen)
      ctx.fillStyle = '#000000';
      ctx.font = '10px monospace';
      for (let x = firstX; x <= xMaxMath; x += step) {
        if (Math.abs(x) < 0.001) continue;
        const sx = toScreenX(x, width);
        // Vạch chia Ox
        ctx.beginPath();
        ctx.moveTo(sx, originY - 3);
        ctx.lineTo(sx, originY + 3);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = UNIFORM_LINE_WIDTH;
        ctx.stroke();
        ctx.fillText(Number(x.toFixed(2)).toString(), sx - 6, originY + 14);
      }
      for (let y = firstY; y <= yMaxMath; y += step) {
        if (Math.abs(y) < 0.001) continue;
        const sy = toScreenY(y, height);
        // Vạch chia Oy
        ctx.beginPath();
        ctx.moveTo(originX - 3, sy);
        ctx.lineTo(originX + 3, sy);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = UNIFORM_LINE_WIDTH;
        ctx.stroke();
        ctx.fillText(Number(y.toFixed(2)).toString(), originX + 5, sy + 3);
      }

      // Gốc O
      if (originX >= 0 && originX <= width && originY >= 0 && originY <= height) {
        ctx.fillText('O', originX - 12, originY + 12);
      }
    }

  }, [center, scale, fFn, a, b, minX, maxX, solidColor, revolutionAngle, showAxes, toMathX, toMathY, toScreenX, toScreenY]);

  // Mouse interaction for pan & inspect
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const mX = toMathX(mouseX, rect.width);
    const mY = toMathY(mouseY, rect.height);
    const fVal = fFn(mX);

    setHoverCoords({
      mathX: Number(mX.toFixed(3)),
      mathY: Number(mY.toFixed(3)),
      fVal: isNaN(fVal) ? NaN : Number(fVal.toFixed(3)),
    });

    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setCenter(prev => ({
        x: prev.x - dx / scale,
        y: prev.y + dy / scale,
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.88;
    setScale(prev => Math.max(12, Math.min(220, prev * zoomFactor)));
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[360px] rounded-lg overflow-hidden border border-zinc-300 bg-white select-none"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair block"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Floating Toolbar */}
      <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/95 backdrop-blur border border-zinc-300 p-1 rounded-md shadow-sm text-xs">
        <button
          onClick={() => setScale(prev => Math.min(220, prev * 1.2))}
          className="p-1 text-zinc-600 hover:text-black hover:bg-zinc-100 rounded transition-colors"
          title="Phóng to"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setScale(prev => Math.max(12, prev / 1.2))}
          className="p-1 text-zinc-600 hover:text-black hover:bg-zinc-100 rounded transition-colors"
          title="Thu nhỏ"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={resetView}
          className="p-1 text-zinc-600 hover:text-black hover:bg-zinc-100 rounded transition-colors"
          title="Vừa vặn vùng [a, b]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Region Status Badge */}
      <div className="absolute top-2 left-2 bg-white/95 border border-zinc-300 px-2.5 py-1 rounded text-[11px] font-mono text-zinc-800 pointer-events-none flex items-center gap-2 shadow-sm">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: solidColor }}></div>
        <span>Miền phẳng (H): <span className="text-black font-semibold">y = f(x)</span>, trục <span className="text-black font-semibold">Ox</span></span>
        {area !== undefined && (
          <span className="text-emerald-700 font-semibold border-l border-zinc-300 pl-2">
            S = {area.toFixed(4)} đvdt
          </span>
        )}
      </div>

      {/* Coordinates Hover Badge */}
      {hoverCoords && (
        <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur border border-zinc-300 px-2.5 py-1 rounded text-[10px] font-mono text-zinc-700 pointer-events-none flex items-center gap-2 shadow-sm">
          <Crosshair className="w-3 h-3 text-zinc-600" />
          <span>x: <span className="text-black font-semibold">{hoverCoords.mathX}</span></span>
          <span>f(x): <span className="text-black font-semibold">{isNaN(hoverCoords.fVal) ? 'Không XĐ' : hoverCoords.fVal}</span></span>
        </div>
      )}
    </div>
  );
};
