import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { PublicChart } from '../shared/types';

export const W = 360;
export const H = 230;
const PAD = { left: 44, right: 12, top: 14, bottom: 26 };

type Props = {
  chart: PublicChart;
  /** Player's line for the hidden part. null = not drawn yet. */
  guess?: (number | null)[];
  onDraw?: (index: number, value: number) => void;
  onDrawEnd?: () => void;
  actual?: number[] | null;
  crowd?: number[] | null;
  interactive?: boolean;
};

export function formatValue(v: number, decimals: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (abs >= 10000) return `${(v / 1000).toFixed(0)}k`;
  return v.toFixed(Math.min(decimals, 2));
}

export function Chart({ chart, guess, onDraw, onDrawEnd, actual, crowd, interactive }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drawing = useRef(false);

  const n = chart.total;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (i / (n - 1)) * plotW;
  const y = (v: number) =>
    PAD.top + (1 - (v - chart.yMin) / (chart.yMax - chart.yMin)) * plotH;

  const last = chart.visible - 1;
  const anchor = chart.shown[last]!;

  const path = (points: [number, number][]) =>
    points.map(([px, py], k) => `${k ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');

  const shownPath = path(chart.shown.map((v, i) => [x(i), y(v)]));
  const hiddenPath = (values: number[]) =>
    path([[x(last), y(anchor)], ...values.map((v, k): [number, number] => [x(last + 1 + k), y(v)])]);

  const guessPoints: [number, number][] = [[x(last), y(anchor)]];
  for (let k = 0; k < (guess?.length ?? 0); k++) {
    const g = guess![k];
    if (g === null || g === undefined) break;
    guessPoints.push([x(last + 1 + k), y(g)]);
  }

  function handle(e: ReactPointerEvent<SVGSVGElement>) {
    if (!interactive || !onDraw || !svgRef.current) return;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    const i = Math.round(((pt.x - PAD.left) / plotW) * (n - 1));
    if (i <= last || i >= n) return;
    const frac = 1 - (pt.y - PAD.top) / plotH;
    const v = chart.yMin + Math.min(1, Math.max(0, frac)) * (chart.yMax - chart.yMin);
    onDraw(i - last - 1, v);
  }

  const ticks = [chart.yMin, (chart.yMin + chart.yMax) / 2, chart.yMax].map((t) => ({
    t,
    label: formatValue(t, chart.decimals),
  }));

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className={`chart ${interactive ? 'chart--draw' : ''}`}
      role="img"
      aria-label={`${chart.title} in ${chart.unit}`}
      onPointerDown={(e) => {
        if (!interactive) return;
        drawing.current = true;
        (e.target as Element).setPointerCapture?.(e.pointerId);
        handle(e);
      }}
      onPointerMove={(e) => drawing.current && handle(e)}
      onPointerUp={() => {
        drawing.current = false;
        onDrawEnd?.();
      }}
      onPointerCancel={() => (drawing.current = false)}
    >
      {ticks.map(({ t, label }) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="grid" />
          <text x={PAD.left - 6} y={y(t) + 4} className="tick" textAnchor="end">
            {label}
          </text>
        </g>
      ))}

      <rect
        x={x(last)}
        y={PAD.top}
        width={W - PAD.right - x(last)}
        height={plotH}
        className={actual ? 'zone zone--done' : 'zone'}
      />
      {interactive && guessPoints.length === 1 && (
        <text x={(x(last) + W - PAD.right) / 2} y={PAD.top + plotH / 2} className="hint" textAnchor="middle">
          Draw here
        </text>
      )}

      <path d={shownPath} className="line line--shown" />
      {crowd && <path d={hiddenPath(crowd)} className="line line--crowd" pathLength={1} />}
      {guessPoints.length > 1 && <path d={path(guessPoints)} className="line line--guess" />}
      {actual && <path d={hiddenPath(actual)} className="line line--actual" pathLength={1} />}
      <circle cx={x(last)} cy={y(anchor)} r={3.5} className="anchor" />

      <text x={PAD.left} y={H - 8} className="tick">{chart.labels[0]}</text>
      <text x={x(last)} y={H - 8} className="tick" textAnchor="middle">{chart.labels[last]}</text>
      <text x={W - PAD.right} y={H - 8} className="tick" textAnchor="end">{chart.labels[n - 1]}</text>
    </svg>
  );
}
