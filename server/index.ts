import { app } from './app';
import { deliverNotifications, purge } from './maintenance';
import type { Env } from './types';
export default {
  fetch: app.fetch,
  scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      (async () => {
        await purge(env);
        await deliverNotifications(env);
      })(),
    );
  },
};
