import { reddit } from '@devvit/web/server';
import { chartForDay, dayNumber } from '../../shared/game';
import { setPostDay } from './store';

/** Creates the Trendline post for a given day (today by default). */
export const createPost = async (day: number = dayNumber()) => {
  const chart = chartForDay(day);
  const post = await reddit.submitCustomPost({
    title: `Trendline #${day + 1}: ${chart.title}. Where does the line go next?`,
  });
  await setPostDay(post.id, day);
  return post;
};
