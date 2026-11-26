import { redis } from '@devvit/web/server';
import {
  chartForDay,
  dayNumber,
  fromFraction,
  hiddenValues,
  scoreGuess,
  toFraction,
} from '../../shared/game';
import type { Reveal, Streak } from '../../shared/types';

const keys = {
  postDay: (postId: string) => `post:${postId}:day`,
  playedFlag: (day: number, userId: string) => `day:${day}:played:${userId}`,
  guess: (day: number, userId: string) => `day:${day}:guess:${userId}`,
  sums: (day: number) => `day:${day}:sums`,
  count: (day: number) => `day:${day}:count`,
  scores: (day: number) => `day:${day}:scores`,
  user: (userId: string) => `user:${userId}`,
};

export async function setPostDay(postId: string, day: number): Promise<void> {
  await redis.set(keys.postDay(postId), String(day));
}

/** The day a post belongs to. Posts made before this was stored fall back to today. */
export async function getPostDay(postId: string): Promise<number> {
  const stored = await redis.get(keys.postDay(postId));
  return stored === undefined || stored === null ? dayNumber() : Number(stored);
}

export async function playerCount(day: number): Promise<number> {
  return Number((await redis.get(keys.count(day))) ?? 0);
}

export async function getStreak(userId: string | undefined): Promise<Streak> {
  if (!userId) return { current: 0, best: 0, played: 0 };
  const u = await redis.hGetAll(keys.user(userId));
  return {
    current: Number(u.current ?? 0),
    best: Number(u.best ?? 0),
    played: Number(u.played ?? 0),
  };
}

async function updateStreak(userId: string, day: number): Promise<Streak> {
  const u = await redis.hGetAll(keys.user(userId));
  const last = u.last === undefined ? null : Number(u.last);
  let current = Number(u.current ?? 0);
  // Streaks follow the calendar, so playing an older post does not break or extend one.
  if (day === dayNumber()) {
    current = last === day - 1 ? current + 1 : last === day ? current : 1;
  }
  const best = Math.max(Number(u.best ?? 0), current);
  const played = Number(u.played ?? 0) + 1;
  await redis.hSet(keys.user(userId), {
    last: String(day === dayNumber() ? day : (last ?? day)),
    current: String(current),
    best: String(best),
    played: String(played),
  });
  return { current, best, played };
}

/** Saves a guess once per player per day. Returns false if they already played. */
export async function saveGuess(
  day: number,
  userId: string,
  username: string,
  guess: number[]
): Promise<{ ok: true; streak: Streak } | { ok: false }> {
  // incrBy is atomic, so two quick taps can't both count.
  const first = (await redis.incrBy(keys.playedFlag(day, userId), 1)) === 1;
  if (!first) return { ok: false };

  const chart = chartForDay(day);
  const score = scoreGuess(chart, guess);
  await redis.set(keys.guess(day, userId), JSON.stringify({ guess, score }));
  for (let i = 0; i < guess.length; i++) {
    await redis.hIncrBy(keys.sums(day), String(i), toFraction(chart, guess[i]!));
  }
  await redis.incrBy(keys.count(day), 1);
  await redis.zAdd(keys.scores(day), { member: username, score });
  const streak = await updateStreak(userId, day);
  return { ok: true, streak };
}

export async function buildReveal(day: number, userId: string): Promise<Reveal | null> {
  const raw = await redis.get(keys.guess(day, userId));
  if (!raw) return null;
  const { guess, score } = JSON.parse(raw) as { guess: number[]; score: number };
  const chart = chartForDay(day);
  const actual = hiddenValues(chart);

  const players = await playerCount(day);
  let crowd: number[] | null = null;
  let crowdScore: number | null = null;
  // With one player the "crowd" is just you, so wait for a second player.
  if (players >= 2) {
    const sums = await redis.hGetAll(keys.sums(day));
    crowd = actual.map((_, i) =>
      fromFraction(chart, Number(sums[String(i)] ?? 0) / players)
    );
    crowdScore = scoreGuess(chart, crowd);
  }

  // Players with a lower score than yours.
  const beaten =
    score > 0
      ? (await redis.zRange(keys.scores(day), 0, score - 1, { by: 'score' })).length
      : 0;
  const others = Math.max(players - 1, 0);
  const beatPercent = others === 0 ? 100 : Math.round((beaten / others) * 100);

  const topRaw = await redis.zRange(keys.scores(day), 0, 4, { by: 'rank', reverse: true });
  const top = topRaw.map((t) => ({ username: t.member, score: t.score }));

  return {
    actual,
    crowd,
    players,
    score,
    crowdScore,
    beatPercent,
    guess,
    fact: chart.fact,
    top,
  };
}
