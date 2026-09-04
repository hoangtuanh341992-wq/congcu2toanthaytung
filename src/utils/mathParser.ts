import * as math from 'mathjs';
import {
  FunctionAnalysis,
  VariationPoint,
  VariationInterval,
  VariationSegment,
  TextbookVariationData,
} from '../types/math';

// Normalize math expression from standard Vietnamese/school conventions to mathjs syntax
export function normalizeExpr(expr: string): string {
  if (!expr || !expr.trim()) return '0';
  let s = expr.trim();
  // Handle ln(x) -> log(x)
  s = s.replace(/\bln\(/g, 'log(');
  // Handle e^ -> exp(...)
  s = s.replace(/\be\^\(([^)]+)\)/g, 'exp($1)');
  s = s.replace(/\be\^([a-zA-Z0-9.]+)/g, 'exp($1)');
  return s;
}

export function createEvaluator(expr: string): (x: number) => number {
  try {
    const normalized = normalizeExpr(expr);
    const compiled = math.compile(normalized);
    return (x: number) => {
      try {
        const val = compiled.evaluate({ x, e: Math.E, pi: Math.PI });
        if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
          return val;
        }
        return NaN;
      } catch {
        return NaN;
      }
    };
  } catch {
    return () => NaN;
  }
}

// Convert mathematical expression to clean KaTeX LaTeX syntax
export function toLatexSafe(expr: string): string {
  if (!expr || !expr.trim()) return '';
  try {
    const norm = normalizeExpr(expr);
    const node = math.parse(norm);
    let tex = node.toTex({ parenthesis: 'auto' });
    // Clean up \cdot x into clean polynomial forms like 3x
    tex = tex.replace(/(\d+)\\cdot\s*([a-zA-Z])/g, '$1$2');
    tex = tex.replace(/\\cdot/g, ' \\cdot ');
    return tex;
  } catch {
    return expr
      .replace(/\*/g, '')
      .replace(/\^(\d+)/g, '^{$1}')
      .replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}')
      .replace(/sin\(([^)]+)\)/g, '\\sin($1)')
      .replace(/cos\(([^)]+)\)/g, '\\cos($1)');
  }
}

// Compute symbolic derivative with mathjs, fallback to numerical
export function computeDerivativeExpr(expr: string): { exprStr: string; fn: (x: number) => number } {
  try {
    const norm = normalizeExpr(expr);
    const node = math.parse(norm);
    const derivNode = math.derivative(node, 'x');
    let tex = derivNode.toTex({ parenthesis: 'auto' });
    tex = tex.replace(/(\d+)\\cdot\s*([a-zA-Z])/g, '$1$2');
    tex = tex.replace(/\\cdot/g, ' \\cdot ');
    const compiled = derivNode.compile();
    const fn = (x: number) => {
      try {
        const res = compiled.evaluate({ x, e: Math.E, pi: Math.PI });
        return typeof res === 'number' && isFinite(res) ? res : NaN;
      } catch {
        return NaN;
      }
    };
    return { exprStr: tex, fn };
  } catch {
    // Fallback numerical derivative
    const f = createEvaluator(expr);
    const h = 1e-5;
    const numFn = (x: number) => {
      const f1 = f(x + h);
      const f2 = f(x - h);
      if (isNaN(f1) || isNaN(f2)) return NaN;
      return (f1 - f2) / (2 * h);
    };
    return { exprStr: "f'(x)", fn: numFn };
  }
}

// Numerical integration using Simpson's 1/3 rule with n subintervals
export function numericalIntegrate(fn: (x: number) => number, a: number, b: number, n: number = 400): number | null {
  if (a === b) return 0;
  const isReversed = a > b;
  const lower = isReversed ? b : a;
  const upper = isReversed ? a : b;

  const steps = n % 2 === 0 ? n : n + 1;
  const h = (upper - lower) / steps;
  let sum = 0;

  const f0 = fn(lower);
  const fnVal = fn(upper);
  if (isNaN(f0) || isNaN(fnVal)) return null;

  sum += f0 + fnVal;

  for (let i = 1; i < steps; i++) {
    const x = lower + i * h;
    const y = fn(x);
    if (isNaN(y) || !isFinite(y)) {
      // Try slightly offset point if near pole
      const yOffset = fn(x + 1e-6);
      if (isNaN(yOffset)) return null;
      sum += (i % 2 === 1 ? 4 : 2) * yOffset;
    } else {
      sum += (i % 2 === 1 ? 4 : 2) * y;
    }
  }

  const result = (h / 3) * sum;
  return isReversed ? -result : result;
}

// Antiderivative symbolizer heuristic with polynomial support
export function formatAntiderivative(expr: string): string {
  if (!expr || !expr.trim()) return 'C';
  const norm = normalizeExpr(expr).replace(/\s+/g, '');
  try {
    if (norm === '0') return 'C';
    if (/^-?\d+(\.\d+)?$/.test(norm)) {
      const c = Number(norm);
      return `${c}x + C`;
    }

    // Normalize multiplication signs and parse algebraic polynomial terms
    const cleanExpr = norm.replace(/\*/g, '');
    const termRegex = /([+-]?[^+-]+)/g;
    const rawTerms = cleanExpr.match(termRegex);
    if (rawTerms && rawTerms.length > 0) {
      let isPoly = true;
      const integratedParts: string[] = [];
      for (let t of rawTerms) {
        t = t.trim();
        if (!t) continue;
        let sign = '';
        if (t.startsWith('+')) {
          sign = '+ ';
          t = t.slice(1);
        } else if (t.startsWith('-')) {
          sign = '- ';
          t = t.slice(1);
        }

        const matchPower = t.match(/^(\d+(\.\d+)?)?x\^(\d+)$/);
        const matchX = t.match(/^(\d+(\.\d+)?)?x$/);
        const matchConst = t.match(/^(\d+(\.\d+)?)$/);
        const matchSin = t === 'sin(x)';
        const matchCos = t === 'cos(x)';
        const matchExp = t === 'exp(x)';

        if (matchPower) {
          const coeff = matchPower[1] ? Number(matchPower[1]) : 1;
          const power = Number(matchPower[3]);
          const newPower = power + 1;
          const frac = coeff === 1 ? `\\frac{1}{${newPower}}` : (coeff % newPower === 0 ? `${coeff / newPower}` : `\\frac{${coeff}}{${newPower}}`);
          integratedParts.push(`${sign}${frac}x^{${newPower}}`);
        } else if (matchX) {
          const coeff = matchX[1] ? Number(matchX[1]) : 1;
          const frac = coeff === 1 ? `\\frac{1}{2}` : (coeff % 2 === 0 ? `${coeff / 2}` : `\\frac{${coeff}}{2}`);
          integratedParts.push(`${sign}${frac}x^2`);
        } else if (matchConst) {
          const c = Number(matchConst[1]);
          integratedParts.push(`${sign}${c === 1 ? '' : c}x`);
        } else if (matchSin) {
          integratedParts.push(`${sign === '- ' ? '+ ' : '- '}\\cos(x)`);
        } else if (matchCos) {
          integratedParts.push(`${sign}\\sin(x)`);
        } else if (matchExp) {
          integratedParts.push(`${sign}e^x`);
        } else {
          isPoly = false;
          break;
        }
      }
      if (isPoly && integratedParts.length > 0) {
        let result = integratedParts.join(' ');
        if (result.startsWith('+ ')) result = result.slice(2);
        return `${result} + C`;
      }
    }

    if (norm === 'sin(x)') return '-\\cos(x) + C';
    if (norm === 'cos(x)') return '\\sin(x) + C';
    if (norm === 'exp(x)') return 'e^x + C';
    if (norm === '1/x') return '\\ln|x| + C';
    return `\\int (${expr}) \\, dx + C`;
  } catch {
    return `\\int (${expr}) \\, dx + C`;
  }
}

// Find roots of fn(x) = 0 in [minX, maxX]
export function findRoots(fn: (x: number) => number, minX: number = -10, maxX: number = 10, stepCount: number = 200): number[] {
  const roots: number[] = [];
  const dx = (maxX - minX) / stepCount;

  for (let i = 0; i < stepCount; i++) {
    const x1 = minX + i * dx;
    const x2 = x1 + dx;
    const y1 = fn(x1);
    const y2 = fn(x2);

    if (isNaN(y1) || isNaN(y2) || !isFinite(y1) || !isFinite(y2)) continue;

    // Direct hit
    if (Math.abs(y1) < 1e-5) {
      if (!roots.some(r => Math.abs(r - x1) < 0.05)) {
        roots.push(Number(x1.toFixed(3)));
      }
      continue;
    }

    // Sign change => root exists
    if (y1 * y2 < 0) {
      // Bisection
      let left = x1;
      let right = x2;
      for (let iter = 0; iter < 25; iter++) {
        const mid = (left + right) / 2;
        const yMid = fn(mid);
        if (Math.abs(yMid) < 1e-7 || Math.abs(right - left) < 1e-6) {
          left = mid;
          break;
        }
        if (y1 * yMid <= 0) {
          right = mid;
        } else {
          left = mid;
        }
      }
      const root = Number(left.toFixed(3));
      if (!roots.some(r => Math.abs(r - root) < 0.05)) {
        roots.push(root);
      }
    }
  }

  return roots.sort((a, b) => a - b);
}

// Find critical points and extrema of f(x)
export function analyzeFunction(
  fExpr: string,
  gExpr: string,
  a: number,
  b: number
): FunctionAnalysis {
  const f = createEvaluator(fExpr);
  const g = createEvaluator(gExpr);
  const { exprStr: fDerivStr, fn: fDerivFn } = computeDerivativeExpr(fExpr);
  const { exprStr: gDerivStr } = computeDerivativeExpr(gExpr);

  // Definite Integrals
  const integralF = numericalIntegrate(f, a, b);
  const integralG = numericalIntegrate(g, a, b);

  // Area between f(x) and g(x) on [a, b]: S = \int_a^b |f(x) - g(x)| dx
  const diffFn = (x: number) => {
    const yf = f(x);
    const yg = g(x);
    if (isNaN(yf) || isNaN(yg)) return NaN;
    return Math.abs(yf - yg);
  };
  const areaBetween = numericalIntegrate(diffFn, a, b);

  // Solid of Revolution Volume around Ox: V = \pi \int_a^b f(x)^2 dx
  const revFnOx = (x: number) => {
    const y = f(x);
    return isNaN(y) ? NaN : y * y;
  };
  const intRevOx = numericalIntegrate(revFnOx, a, b);
  const revolutionVolumeOx = intRevOx !== null ? Math.PI * intRevOx : null;

  // Revolution volume around Oy: V = 2\pi \int_a^b x |f(x)| dx (Cylindrical shell method)
  const revFnOy = (x: number) => {
    const y = f(x);
    return isNaN(y) ? NaN : Math.abs(x * y);
  };
  const intRevOy = numericalIntegrate(revFnOy, Math.min(a, b), Math.max(a, b));
  const revolutionVolumeOy = intRevOy !== null ? 2 * Math.PI * intRevOy : null;

  // Roots of f and g in range [-10, 10]
  const rootsF = findRoots(f, -10, 10);
  const rootsG = findRoots(g, -10, 10);

  // Intersections of f and g: f(x) - g(x) = 0
  const intersectFn = (x: number) => f(x) - g(x);
  const intersectRoots = findRoots(intersectFn, -10, 10);
  const intersectionPoints = intersectRoots
    .map(x => ({ x, y: Number(f(x).toFixed(3)) }))
    .filter(p => !isNaN(p.y) && isFinite(p.y));

  // Critical points of f (where f'(x) = 0)
  const critRoots = findRoots(fDerivFn, -10, 10);
  const criticalPoints: { x: number; y: number; type: 'cực đại' | 'cực tiểu' | 'điểm uốn' | 'dừng' }[] = [];

  const h = 0.01;
  for (const cx of critRoots) {
    const cy = f(cx);
    if (isNaN(cy) || !isFinite(cy)) continue;

    // Check derivative sign before and after
    const dLeft = fDerivFn(cx - h);
    const dRight = fDerivFn(cx + h);

    let type: 'cực đại' | 'cực tiểu' | 'điểm uốn' | 'dừng' = 'dừng';
    if (!isNaN(dLeft) && !isNaN(dRight)) {
      if (dLeft > 0 && dRight < 0) {
        type = 'cực đại';
      } else if (dLeft < 0 && dRight > 0) {
        type = 'cực tiểu';
      } else {
        type = 'điểm uốn';
      }
    }
    criticalPoints.push({
      x: cx,
      y: Number(cy.toFixed(3)),
      type,
    });
  }

  // Monotonic Intervals
  const sortedX = [-Infinity, ...critRoots, Infinity];
  const monotonicIntervals: { interval: string; type: 'đồng biến' | 'nghịch biến' }[] = [];

  for (let i = 0; i < sortedX.length - 1; i++) {
    const left = sortedX[i];
    const right = sortedX[i + 1];
    let testX: number;
    if (!isFinite(left)) {
      testX = right - 1;
    } else if (!isFinite(right)) {
      testX = left + 1;
    } else {
      testX = (left + right) / 2;
    }

    const dVal = fDerivFn(testX);
    if (!isNaN(dVal)) {
      const type = dVal >= 0 ? 'đồng biến' : 'nghịch biến';
      const leftStr = isFinite(left) ? `${left}` : '-\\infty';
      const rightStr = isFinite(right) ? `${right}` : '+\\infty';
      monotonicIntervals.push({
        interval: `(${leftStr}; ${rightStr})`,
        type,
      });
    }
  }

  // Asymptotes
  // Vertical asymptotes: check for singularities / poles
  const verticalAsymptotes: number[] = [];
  for (let x = -10; x <= 10; x += 0.25) {
    const val = f(x);
    if (isNaN(val) || !isFinite(val) || Math.abs(val) > 1e4) {
      // Refine pole
      const pole = Number(x.toFixed(2));
      if (!verticalAsymptotes.some(p => Math.abs(p - pole) < 0.3)) {
        verticalAsymptotes.push(pole);
      }
    }
  }

  // Horizontal asymptotes: lim_{x -> +/- 1000}
  const horizontalAsymptotes: number[] = [];
  const limPos = f(1000);
  const limNeg = f(-1000);
  if (!isNaN(limPos) && isFinite(limPos) && Math.abs(limPos) < 1000) {
    const yPos = Number(limPos.toFixed(2));
    horizontalAsymptotes.push(yPos);
  }
  if (!isNaN(limNeg) && isFinite(limNeg) && Math.abs(limNeg) < 1000) {
    const yNeg = Number(limNeg.toFixed(2));
    if (!horizontalAsymptotes.includes(yNeg)) {
      horizontalAsymptotes.push(yNeg);
    }
  }

  return {
    fExpr,
    gExpr,
    a,
    b,
    fDerivative: fDerivStr,
    gDerivative: gDerivStr,
    fAntiderivative: formatAntiderivative(fExpr),
    gAntiderivative: formatAntiderivative(gExpr),
    integralF,
    integralG,
    areaBetween,
    revolutionVolumeOx,
    revolutionVolumeOy,
    criticalPoints,
    rootsF,
    rootsG,
    intersectionPoints,
    monotonicIntervals,
    asymptotes: {
      vertical: verticalAsymptotes,
      horizontal: horizontalAsymptotes,
    },
  };
}

// Generate structured data for Vietnamese Bảng Biến Thiên
export function buildVariationTableData(
  fExpr: string,
  analysis: FunctionAnalysis
): TextbookVariationData {
  const f = createEvaluator(fExpr);
  const { fn: fDerivFn } = computeDerivativeExpr(fExpr);

  // Combine critical points and vertical asymptotes
  const xValues: { x: number; isAsymptote: boolean; type?: string }[] = [];

  analysis.criticalPoints.forEach(p => {
    xValues.push({ x: p.x, isAsymptote: false, type: p.type });
  });

  analysis.asymptotes.vertical.forEach(v => {
    if (!xValues.some(p => Math.abs(p.x - v) < 0.1)) {
      xValues.push({ x: v, isAsymptote: true, type: 'không xác định' });
    }
  });

  xValues.sort((a, b) => a.x - b.x);

  // Determine domain
  let domainText = '\\mathcal{D} = \\mathbb{R}';
  if (analysis.asymptotes.vertical.length > 0) {
    const vList = analysis.asymptotes.vertical.map(v => `${v}`).join('; ');
    domainText = `\\mathcal{D} = \\mathbb{R} \\setminus \\{ ${vList} \\}`;
  }

  // Helper for limits at infinity
  const getInfLimit = (xVal: number): { label: string; level: 'top' | 'middle' | 'bottom' } => {
    const yVal = f(xVal);
    // Check horizontal asymptotes
    for (const ha of analysis.asymptotes.horizontal) {
      if (!isNaN(yVal) && Math.abs(yVal - ha) < 0.2) {
        return { label: `${ha}`, level: 'middle' };
      }
    }
    if (isNaN(yVal) || !isFinite(yVal) || yVal > 10) {
      return { label: '+\\infty', level: 'top' };
    }
    if (yVal < -10) {
      return { label: '-\\infty', level: 'bottom' };
    }
    return { label: `${yVal.toFixed(1)}`, level: 'middle' };
  };

  // -Infinity
  const limNeg = getInfLimit(-1000);
  const points: VariationPoint[] = [
    {
      x: -Infinity,
      xLabel: '-\\infty',
      derivativeVal: null,
      fxVal: null,
      fxLabel: limNeg.label,
      type: 'vô cực',
    },
  ];

  const intervals: VariationInterval[] = [];

  // Intermediate points
  for (let i = 0; i < xValues.length; i++) {
    const item = xValues[i];
    const prevX = i === 0 ? -Infinity : xValues[i - 1].x;
    const nextX = item.x;

    // Check sign in interval (prevX, nextX)
    let testX: number;
    if (!isFinite(prevX)) {
      testX = nextX - 1;
    } else {
      testX = (prevX + nextX) / 2;
    }
    const dVal = fDerivFn(testX);
    intervals.push({
      sign: isNaN(dVal) ? '0' : dVal >= 0 ? '+' : '-',
    });

    if (item.isAsymptote) {
      // Calculate one-sided limits around asymptote x = item.x
      const yLeft = f(item.x - 0.001);
      const yRight = f(item.x + 0.001);
      const leftLim: { label: string; level: 'top' | 'middle' | 'bottom' } =
        yLeft > 0 ? { label: '+\\infty', level: 'top' } : { label: '-\\infty', level: 'bottom' };
      const rightLim: { label: string; level: 'top' | 'middle' | 'bottom' } =
        yRight > 0 ? { label: '+\\infty', level: 'top' } : { label: '-\\infty', level: 'bottom' };

      points.push({
        x: item.x,
        xLabel: `${item.x}`,
        derivativeVal: null,
        isAsymptote: true,
        fxVal: null,
        fxLabel: '||',
        leftLimit: leftLim,
        rightLimit: rightLim,
        type: 'không xác định',
      });
    } else {
      const yVal = f(item.x);
      points.push({
        x: item.x,
        xLabel: `${item.x}`,
        derivativeVal: 0,
        isAsymptote: false,
        fxVal: isNaN(yVal) || !isFinite(yVal) ? null : yVal,
        fxLabel: isNaN(yVal) || !isFinite(yVal) ? '||' : `${Number(yVal.toFixed(2))}`,
        type: item.type as any,
      });
    }
  }

  // Last interval to +Infinity
  const lastX = xValues.length > 0 ? xValues[xValues.length - 1].x : 0;
  const testLast = isFinite(lastX) ? lastX + 1 : 1;
  const lastD = fDerivFn(testLast);
  intervals.push({
    sign: isNaN(lastD) ? '+' : lastD >= 0 ? '+' : '-',
  });

  // +Infinity
  const limPos = getInfLimit(1000);
  points.push({
    x: Infinity,
    xLabel: '+\\infty',
    derivativeVal: null,
    fxVal: null,
    fxLabel: limPos.label,
    type: 'vô cực',
  });

  // Generate segments for the textbook arrow lines
  const segments: VariationSegment[] = [];

  for (let i = 0; i < intervals.length; i++) {
    const ptLeft = points[i];
    const ptRight = points[i + 1];
    const sign = intervals[i].sign;

    let startLabel = ptLeft.fxLabel;
    let startLevel: 'top' | 'middle' | 'bottom' = 'bottom';
    let endLabel = ptRight.fxLabel;
    let endLevel: 'top' | 'middle' | 'bottom' = 'top';

    // Start point level
    if (i === 0) {
      startLevel = limNeg.level;
      startLabel = limNeg.label;
    } else if (ptLeft.isAsymptote) {
      startLevel = ptLeft.rightLimit?.level || (sign === '+' ? 'bottom' : 'top');
      startLabel = ptLeft.rightLimit?.label || (sign === '+' ? '-\\infty' : '+\\infty');
    } else if (ptLeft.type === 'cực đại') {
      startLevel = 'top';
    } else if (ptLeft.type === 'cực tiểu') {
      startLevel = 'bottom';
    } else {
      startLevel = sign === '+' ? 'bottom' : 'top';
    }

    // End point level
    if (i === intervals.length - 1) {
      endLevel = limPos.level;
      endLabel = limPos.label;
    } else if (ptRight.isAsymptote) {
      endLevel = ptRight.leftLimit?.level || (sign === '+' ? 'top' : 'bottom');
      endLabel = ptRight.leftLimit?.label || (sign === '+' ? '+\\infty' : '-\\infty');
    } else if (ptRight.type === 'cực đại') {
      endLevel = 'top';
    } else if (ptRight.type === 'cực tiểu') {
      endLevel = 'bottom';
    } else {
      endLevel = sign === '+' ? 'top' : 'bottom';
    }

    // Direction
    const direction = sign === '+' ? 'up' : sign === '-' ? 'down' : 'flat';

    segments.push({
      startIndex: i,
      endIndex: i + 1,
      startLabel,
      endLabel,
      startLevel,
      endLevel,
      direction,
      sign,
      isRightOfAsymptote: ptLeft.isAsymptote,
      isLeftOfAsymptote: ptRight.isAsymptote,
    });
  }

  return { points, intervals, segments, domainText };
}

export const evaluateExpressionSafe = createEvaluator;

export function approximateDefiniteIntegral(fn: (x: number) => number, a: number, b: number): number {
  return numericalIntegrate(fn, a, b) ?? 0;
}

export function approximateAreaBetween(f: (x: number) => number, g: (x: number) => number, a: number, b: number): number {
  const diff = (x: number) => {
    const y1 = f(x);
    const y2 = g(x);
    if (isNaN(y1) || isNaN(y2)) return 0;
    return Math.abs(y1 - y2);
  };
  return numericalIntegrate(diff, a, b) ?? 0;
}

export function approximateRevolutionVolume(f: (x: number) => number, a: number, b: number): number {
  const integrand = (x: number) => {
    const y = f(x);
    if (isNaN(y)) return 0;
    return Math.PI * y * y;
  };
  return numericalIntegrate(integrand, a, b) ?? 0;
}

export const DEFAULT_MATH_INPUT_2D = {
  fExpr: 'x^3 - 3*x + 1',
  gExpr: '0',
  a: -2,
  b: 2,
};

export const MATH_PRESETS_2D = [
  {
    name: 'Đa thức bậc 3 (x³ - 3x + 1)',
    f: 'x^3 - 3*x + 1',
    g: '0',
    a: -2,
    b: 2,
  },
  {
    name: 'Đa thức trùng phương (x⁴ - 2x² - 1)',
    f: 'x^4 - 2*x^2 - 1',
    g: '0',
    a: -2,
    b: 2,
  },
  {
    name: 'Hàm phân thức bậc nhất ((2x - 1)/(x + 1))',
    f: '(2*x - 1)/(x + 1)',
    g: '0',
    a: 0,
    b: 3,
  },
  {
    name: 'Hàm lượng giác (sin(x))',
    f: 'sin(x)',
    g: '0',
    a: 0,
    b: 3.1416,
  },
  {
    name: 'Diện tích giữa Parabol & Đường thẳng',
    f: '4 - x^2',
    g: 'x + 2',
    a: -2,
    b: 1,
  },
  {
    name: 'Hàm mũ & logarit (exp(-0.2*x)*sin(x))',
    f: 'exp(-0.2*x)*sin(x)',
    g: '0',
    a: 0,
    b: 6.28,
  },
];
