export type Chart = {
  id: string;
  title: string;
  unit: string;
  source: string;
  labels: string[];
  values: number[];
  /** How many points the player sees before drawing. */
  visible: number;
  decimals: number;
  yMin: number;
  yMax: number;
  /** One-line explanation shown after the reveal. */
  fact: string;
};

/** The chart as the player first sees it: hidden values are left out. */
export type PublicChart = Omit<Chart, 'values' | 'fact'> & {
  shown: number[];
  total: number;
};

export type Reveal = {
  actual: number[];
  /** Crowd average guess for each hidden point, or null before anyone plays. */
  crowd: number[] | null;
  players: number;
  score: number;
  crowdScore: number | null;
  /** Share of players you beat, 0 to 100. */
  beatPercent: number;
  guess: number[];
  fact: string;
  top: { username: string; score: number }[];
};

export type Streak = { current: number; best: number; played: number };

export type InitResponse = {
  day: number;
  chart: PublicChart;
  players: number;
  username: string | null;
  loggedIn: boolean;
  reveal: Reveal | null;
  streak: Streak;
};

export type GuessRequest = { day: number; guess: number[] };
export type GuessResponse = { reveal: Reveal; streak: Streak };
export type ErrorResponse = { status: 'error'; message: string };
