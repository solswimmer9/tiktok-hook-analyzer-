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
    defaultRoute: "/dashboard/tiktok",
    showSettings: true,
    navigation: [
      {
        title: "TikTok Analysis",
        subItems: [
          { title: "Search", url: "/dashboard/tiktok", icon: "Search" },
          { title: "Videos", url: "/dashboard/tiktok/videos", icon: "Video" },
          { title: "Hook Analysis", url: "/dashboard/tiktok/analysis", icon: "Brain" },
          { title: "Trends", url: "/dashboard/tiktok/trends", icon: "TrendingUp" },
        ],
      },
      {
        title: "Settings",
        url: "/dashboard/settings",
        icon: "Settings",
      },
    ],
  },
} as const;

export type AppConfig = typeof appConfig;