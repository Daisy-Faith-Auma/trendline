import type { ErrorResponse, GuessResponse, InitResponse } from '../shared/types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = (await res.json()) as T | ErrorResponse;
  if (!res.ok) throw new Error((body as ErrorResponse).message ?? 'Something went wrong');
  return body as T;
}

export const loadGame = () => request<InitResponse>('/api/init');

export const sendGuess = (day: number, guess: number[]) =>
  request<GuessResponse>('/api/guess', {
    method: 'POST',
    body: JSON.stringify({ day, guess }),
  });
