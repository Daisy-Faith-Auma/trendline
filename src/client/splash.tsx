import './index.css';

import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { requestExpandedMode } from '@devvit/web/client';
import type { InitResponse } from '../shared/types';
import { loadGame } from './api';
import { Chart } from './chart';

function Splash() {
  const [data, setData] = useState<InitResponse | null>(null);

  useEffect(() => {
    loadGame().then(setData).catch(() => setData(null));
  }, []);

  return (
    <main className="splash">
      <p className="kicker">Trendline{data ? ` #${data.day + 1}` : ''}</p>
      <h1>{data?.chart.title ?? 'Where does the line go next?'}</h1>
      {data && <Chart chart={data.chart} />}
      <button onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}>
        {data?.reveal ? `You scored ${data.reveal.score}. See the results` : 'Draw the rest'}
      </button>
      {data && (
        <p className="muted small">
          {data.players} {data.players === 1 ? 'player' : 'players'} so far
          {data.streak.current > 0 ? ` · Your streak: ${data.streak.current}` : ''}
        </p>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
