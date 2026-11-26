import { CHARTS } from './charts';
import type { Chart, PublicChart } from './types';

/** Day 0 of the game, in UTC. Every day after this gets the next chart. */
export const EPOCH_UTC = Date.UTC(2026, 10, 25); // 25 November 2026 is Trendline #1
const DAY_MS = 24 * 60 * 60 * 1000;

export function dayNumber(now: number = Date.now()): number {
  return Math.floor((now - EPOCH_UTC) / DAY_MS);
}

export function chartForDay(day: number): Chart {
  const n = CHARTS.length;
  return CHARTS[((day % n) + n) % n]!;
}

export function publicChart(chart: Chart): PublicChart {
  const { values, fact: _fact, ...rest } = chart;
  return { ...rest, shown: values.slice(0, chart.visible), total: values.length };
}

export function hiddenValues(chart: Chart): number[] {
  return chart.values.slice(chart.visible);
}

/**
 * Score from 0 to 100. Error is measured as a share of the chart's height,
 * so a chart in millions and a chart in percent are equally hard.
 * Missing the line by 25% of the chart height on average scores 0.
 */
export function scoreGuess(chart: Chart, guess: number[]): number {
  const actual = hiddenValues(chart);
  const range = chart.yMax - chart.yMin;
  let total = 0;
  for (let i = 0; i < actual.length; i++) {
    total += Math.abs((guess[i] ?? chart.yMin) - actual[i]!) / range;
  }
  const meanError = total / actual.length;
  return Math.max(0, Math.round(100 * (1 - meanError * 4)));
}

/** Guesses are stored as 0..1 positions on the chart, scaled to whole numbers. */
export const FRACTION_SCALE = 10000;

export function toFraction(chart: Chart, value: number): number {
  const f = (value - chart.yMin) / (chart.yMax - chart.yMin);
  return Math.round(Math.min(1, Math.max(0, f)) * FRACTION_SCALE);
}

export function fromFraction(chart: Chart, scaled: number): number {
  return chart.yMin + (scaled / FRACTION_SCALE) * (chart.yMax - chart.yMin);
}
