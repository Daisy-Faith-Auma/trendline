import { Hono } from 'hono';
import { context, reddit } from '@devvit/web/server';
import { chartForDay, hiddenValues, publicChart } from '../../shared/game';
import type {
  ErrorResponse,
  GuessRequest,
  GuessResponse,
  InitResponse,
} from '../../shared/types';
import { buildReveal, getPostDay, getStreak, playerCount, saveGuess } from '../core/store';

export const api = new Hono();

api.get('/init', async (c) => {
  try {
    const { postId, userId } = context;
    if (!postId) {
      return c.json<ErrorResponse>({ status: 'error', message: 'No post in context' }, 400);
    }
    const day = await getPostDay(postId);
    const username = (await reddit.getCurrentUsername()) ?? null;
    const reveal = userId ? await buildReveal(day, userId) : null;
    return c.json<InitResponse>({
      day,
      chart: publicChart(chartForDay(day)),
      players: await playerCount(day),
      username,
      loggedIn: Boolean(userId),
      reveal,
      streak: await getStreak(userId),
    });
  } catch (error) {
    console.error('init failed', error);
    return c.json<ErrorResponse>({ status: 'error', message: 'Could not load the game' }, 400);
  }
});

api.post('/guess', async (c) => {
  try {
    const { postId, userId } = context;
    if (!postId || !userId) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Log in to play' }, 401);
    }
    const body = await c.req.json<GuessRequest>();
    const day = await getPostDay(postId);
    const chart = chartForDay(day);
    const expected = hiddenValues(chart).length;
    const guess = body.guess;
    if (
      body.day !== day ||
      !Array.isArray(guess) ||
      guess.length !== expected ||
      guess.some((v) => typeof v !== 'number' || !Number.isFinite(v))
    ) {
      return c.json<ErrorResponse>({ status: 'error', message: 'That guess looks incomplete' }, 400);
    }
    const clamped = guess.map((v) => Math.min(chart.yMax, Math.max(chart.yMin, v)));
    const username = (await reddit.getCurrentUsername()) ?? 'anonymous';
    const saved = await saveGuess(day, userId, username, clamped);
    if (!saved.ok) {
      return c.json<ErrorResponse>({ status: 'error', message: "You've already played this one" }, 409);
    }
    const reveal = await buildReveal(day, userId);
    return c.json<GuessResponse>({ reveal: reveal!, streak: saved.streak });
  } catch (error) {
    console.error('guess failed', error);
    return c.json<ErrorResponse>({ status: 'error', message: 'Could not save your guess' }, 400);
  }
});
