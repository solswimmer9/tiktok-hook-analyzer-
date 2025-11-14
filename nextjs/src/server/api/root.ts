import { adminRouter } from "./routers/admin";
import { tiktokRouter } from "./routers/tiktok";
import { createTRPCRouter } from "./trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here
 */
export const appRouter = createTRPCRouter({
  admin: adminRouter,
  tiktok: tiktokRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
