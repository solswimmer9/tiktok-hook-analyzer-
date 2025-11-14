import { Inngest } from "inngest";

// Check if we have the required Inngest credentials
const hasInngestCredentials = process.env.INNGEST_EVENT_KEY && process.env.INNGEST_SIGNING_KEY;

// Shared Inngest client configured for the Next.js application.
// We keep the ID consistent across apps so functions can be served from
// multiple runtimes without duplication.
export const inngestClient = new Inngest({
  id: "social-monitor",
  ...(hasInngestCredentials && {
    eventKey: process.env.INNGEST_EVENT_KEY,
    signingKey: process.env.INNGEST_SIGNING_KEY,
  }),
});

// Helper function to check if Inngest is properly configured
export const isInngestConfigured = () => {
  return hasInngestCredentials;
}; 