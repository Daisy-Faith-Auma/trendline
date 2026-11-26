# Trendline

A daily Reddit game. Players see the first part of a real chart, draw where they think the line goes, then see what actually happened next to the crowd's average guess.

Built with Devvit Web: React client, Hono server, Redis for guesses, scores and streaks, and a daily scheduled post.

## Set up

You need Node 22 or later and a Reddit account. These steps use Reddit's official React template so that `package.json`, `vite.config.ts` and `tsconfig.json` match the current Devvit version.

1. Create the app from the template. When it asks for a name, pick something like `trendline-game` (3 to 16 characters, lowercase).

   ```bash
   npm create devvit@latest -- --template react
   cd <your-app-folder>
   npm install
   ```

   If that command doesn't offer the React template, clone it instead:

   ```bash
   git clone https://github.com/reddit/devvit-template-react trendline
   cd trendline && npm install
   ```

2. Replace the template's code with Trendline's:

   - Delete the template's `src` folder.
   - Copy in this project's `src` and `tools` folders.
   - Replace the template's `devvit.json` with this one, then put your app name in the `"name"` field (keep whatever name the template set up).

3. Log in and test in your own subreddit:

   ```bash
   npx devvit login
   npm run dev
   ```

   `npm run dev` runs `devvit playtest`. It installs the app on a test subreddit and prints a link. Open it, use the subreddit menu item **Post today's Trendline**, and play.

4. When it works, upload it:

   ```bash
   npm run deploy
   ```

## Before you submit to the hackathon

- Make a public subreddit for the demo (for example r/TrendlineGame), install the app there and create today's post. The Devpost submission needs that post's link.
- Play it yourself and ask a few friends to play, so the crowd line and leaderboard aren't empty when judges arrive.

## How it works

| File | What it does |
| --- | --- |
| `src/shared/charts.ts` | The chart for each day. Generated, so don't edit it by hand. |
| `tools/raw_data.py` | The real data behind each chart, with sources. |
| `tools/build_charts.py` | Turns the raw data into `charts.ts`. Run `python3 tools/build_charts.py` after editing. |
| `src/shared/game.ts` | Day numbering, scoring, and which chart runs on which day. |
| `src/server/core/store.ts` | Redis: one guess per player per day, crowd average, scores, streaks. |
| `src/server/routes/` | API (`/api/init`, `/api/guess`), mod menu, install trigger, daily scheduler. |
| `src/client/splash.tsx` | The small preview shown in the feed. |
| `src/client/game.tsx` | The full game: drawing, submitting, results. |
| `src/client/chart.tsx` | The SVG chart used by both views. |

**Days.** Trendline #1 is 25 November 2026 (UTC). Each day gets the next chart in `charts.ts`, and the 16 charts repeat after day 16. To change the start date, edit `EPOCH_UTC` in `src/shared/game.ts`.

**Daily post.** The scheduler in `devvit.json` posts the day's chart at 00:05 UTC (03:05 in Nairobi). Moderators can also post it by hand from the subreddit menu.

**Scoring.** Your score is based on how far your line is from the real one on average, measured as a share of the chart's height. A perfect line scores 100. Missing by a quarter of the chart's height on average scores 0.

**One guess per player.** Guesses are stored once per account per day. The crowd average is built from everyone's guess at each point.

## Adding charts

Add a series to `tools/raw_data.py` with its source, add an `add(...)` line in `tools/build_charts.py`, and run the script. Keep 25 to 60 points per chart and show roughly the first half to two thirds. The best charts have a twist: a peak, a crash, or a trend that suddenly bends.
