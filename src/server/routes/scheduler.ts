import { Hono } from 'hono';
import { createPost } from '../core/post';

export const scheduler = new Hono();

/** Runs once a day (see devvit.json) and posts the new chart. */
scheduler.post('/daily-post', async (c) => {
  try {
    const post = await createPost();
    console.log(`Daily Trendline post created: ${post.id}`);
    return c.json({ status: 'success' }, 200);
  } catch (error) {
    console.error(`Daily post failed: ${error}`);
    return c.json({ status: 'error' }, 400);
  }
});
