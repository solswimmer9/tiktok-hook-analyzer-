/**
 * Application Configuration
 * 
 * Centralized configuration for the Social Media Monitoring application.
 * Modify these values to customize the application for your needs.
 */

export const appConfig = {
  // Basic app information
  name: "Hook Analyzer",
  description: "Analyze TikTok video hooks and engagement tactics",
  supportEmail: "support@yourdomain.com",

  // Branding
  brand: {
    name: "Hook Analyzer",
    shortName: "HA",
    tagline: "Analyze viral TikTok hooks",
  },

  // Authentication settings
  auth: {
    enableSignUp: true,
    enablePasswordReset: true,
    adminEmails: [
      "solomonallen554@gmail.com",
    ] as readonly string[],
  },

  // Dashboard configuration
  dashboard: {
    defaultRoute: "/admin/tiktok",
    showSettings: true,
    navigation: [
      {
        title: "TikTok Analysis",
        subItems: [
          { title: "Search Terms", url: "/admin/tiktok" },
          { title: "Videos", url: "/admin/tiktok/videos" },
          { title: "Hook Analysis", url: "/admin/tiktok/analysis" },
          { title: "Trends", url: "/admin/tiktok/trends" },
        ],
      },
      {
        title: "Settings",
        url: "/admin/settings",
      },
    ],
  },
} as const;

export type AppConfig = typeof appConfig;