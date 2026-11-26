import './index.css';

import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { InitResponse, Reveal, Streak } from '../shared/types';
import { loadGame, sendGuess } from './api';
import { Chart, formatValue } from './chart';

function Game() {
  const [data, setData] = useState<InitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guess, setGuess] = useState<(number | null)[]>([]);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [sending, setSending] = useState(false);
  const lastTouched = useRef<number | null>(null);
  const guessRef = useRef<(number | null)[]>([]);

  useEffect(() => {
    loadGame()
      .then((d) => {
        setData(d);
        setReveal(d.reveal);
        setStreak(d.streak);
        const empty = Array(d.chart.total - d.chart.visible).fill(null);
        guessRef.current = empty;
        setGuess(empty);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <main className="game"><p className="error">{error}</p></main>;
  if (!data) return <main className="game"><p className="muted">Loading today's chart…</p></main>;

  const { chart } = data;
  const anchor = chart.shown[chart.visible - 1]!;
  const complete = guess.length > 0 && guess.every((g) => g !== null);

  function draw(k: number, v: number) {
    // Work from a ref, not a state updater: pointer events can fire several
    // times before React re-renders, and updaters must stay side-effect free.
    {
      const next = [...guessRef.current];
      // Fill any gap since the last point so a fast swipe still makes a full line.
      let from = lastTouched.current;
      let fromValue = from === null ? anchor : next[from];
      if (from === null || fromValue === null || fromValue === undefined) {
        const firstEmpty = next.findIndex((g) => g === null);
        if (firstEmpty !== -1 && firstEmpty < k) {
          from = firstEmpty - 1;
          fromValue = from < 0 ? anchor : next[from]!;
        } else {
          from = k;
          fromValue = v;
        }
      }
      const step = k > from ? 1 : -1;
      for (let i = from + step; step > 0 ? i < k : i > k; i += step) {
        next[i] = fromValue! + ((v - fromValue!) * (i - from)) / (k - from);
      }
      next[k] = v;
      lastTouched.current = k;
      guessRef.current = next;
      setGuess(next);
    }
  }

  async function submit() {
    if (!complete || sending) return;
    setSending(true);
    try {
      const res = await sendGuess(data!.day, guess as number[]);
      setReveal(res.reveal);
      setStreak(res.streak);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  function reset() {
    lastTouched.current = null;
    const empty = Array(chart.total - chart.visible).fill(null);
    guessRef.current = empty;
    setGuess(empty);
  }

  const lastActual = reveal?.actual[reveal.actual.length - 1];
  const lastGuess = reveal?.guess[reveal.guess.length - 1];

  return (
    <main className="game">
      <header>
        <p className="kicker">Trendline #{data.day + 1}</p>
        <h1>{chart.title}</h1>
        <p className="muted">{chart.unit}</p>
      </header>

      <Chart
        chart={chart}
        guess={reveal ? reveal.guess : guess}
        onDraw={draw}
        onDrawEnd={() => (lastTouched.current = null)}
        interactive={!reveal && data.loggedIn}
        actual={reveal?.actual ?? null}
        crowd={reveal?.crowd ?? null}
      />

      {!reveal && (
        <section className="controls">
          {!data.loggedIn ? (
            <p className="muted">Log in to Reddit to draw your guess.</p>
          ) : (
            <>
              <p className="muted">
                {complete
                  ? 'Happy with that line?'
                  : `Drag across the shaded area to draw ${chart.labels[chart.visible]} to ${chart.labels[chart.total - 1]}.`}
              </p>
              <div className="buttons">
                <button className="secondary" onClick={reset} disabled={guess.every((g) => g === null)}>
                  Clear
                </button>
                <button onClick={submit} disabled={!complete || sending}>
                  {sending ? 'Locking in…' : 'Lock it in'}
                </button>
              </div>
              <p className="muted small">{data.players} {data.players === 1 ? 'person has' : 'people have'} played today</p>
            </>
          )}
        </section>
      )}

      {reveal && (
        <section className="results">
          <div className="legend">
            <span><i className="key key--guess" />You</span>
            {reveal.crowd && <span><i className="key key--crowd" />Crowd average</span>}
            <span><i className="key key--actual" />What happened</span>
          </div>
          <div className="stats">
            <div><strong>{reveal.score}</strong><span>your score</span></div>
            <div><strong>{reveal.crowdScore ?? '–'}</strong><span>crowd's score</span></div>
            <div><strong>{reveal.players < 2 ? '–' : `${reveal.beatPercent}%`}</strong><span>players beaten</span></div>
          </div>
          <p className="verdict">
            {reveal.crowdScore === null || reveal.players < 2
              ? "You're one of the first. Check back later to see the crowd's line."
              : reveal.score > reveal.crowdScore
                ? `You beat the hive mind of ${reveal.players} players.`
                : `The crowd of ${reveal.players} players beat you this time.`}
          </p>
          {lastActual !== undefined && lastGuess !== undefined && (
            <p className="muted small">
              You ended at {formatValue(lastGuess, chart.decimals)}. It was really{' '}
              {formatValue(lastActual, chart.decimals)}.
            </p>
          )}
          <p className="fact">{reveal.fact}</p>
          {reveal.top.length > 0 && (
            <ol className="top">
              {reveal.top.map((t) => (
                <li key={t.username}>
                  <span>u/{t.username}</span>
                  <span>{t.score}</span>
                </li>
              ))}
            </ol>
          )}
          {streak && (
            <p className="muted small">
              Streak {streak.current} · Best {streak.best} · Played {streak.played}
            </p>
          )}
          <p className="muted small">Tell the comments what you thought would happen. A new chart drops tomorrow.</p>
        </section>
      )}

      <footer className="muted small">Source: {chart.source}</footer>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Game />
  </StrictMode>
);
