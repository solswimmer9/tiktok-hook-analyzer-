# TikTok Hook Analyzer

A Next.js application that searches, downloads, and analyzes TikTok videos to identify effective hooks and engagement tactics using AI-powered analysis.

## Features

- **TikTok Video Search**: Search and retrieve TikTok videos based on custom search terms
- **Automated Video Processing**: Download and process videos with automatic compression and optimization
- **AI-Powered Hook Analysis**: Analyze video hooks using Google's Gemini AI to identify:
  - Hook types and effectiveness
  - Engagement tactics
  - Visual themes
  - Opening strategies
- **Trend Analysis**: Generate daily trend reports identifying common phrases, visual themes, and engagement patterns
- **Cloud Storage**: Store processed videos using Cloudflare R2 and Supabase Storage
- **Background Job Processing**: Asynchronous video processing with Inngest

## Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible UI components
- **TanStack Query** - Data fetching and caching
- **tRPC** - End-to-end typesafe APIs

### Backend
- **Supabase** - Database and authentication
- **Inngest** - Background job orchestration
- **Google Gemini AI** - Video analysis
- **Cloudflare R2** - Object storage
- **TikTok API** - Video search and download

### Development
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript** - Type checking

## Project Structure

```
tiktok-hook-analyser-main/
├── nextjs/                  # Next.js application
│   ├── src/
│   │   ├── app/            # Next.js app directory
│   │   ├── components/     # React components
│   │   ├── inngest/        # Inngest job definitions
│   │   ├── lib/            # Utility libraries and clients
│   │   ├── pages/          # Next.js pages
│   │   ├── server/         # Server-side code
│   │   └── utils/          # Utility functions
│   └── package.json
├── shared-types/           # Shared TypeScript types
│   └── database.types.ts   # Supabase database types
└── supabase/              # Supabase configuration
    ├── migrations/         # Database migrations
    └── config.toml        # Supabase config
```

## Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Google Cloud account (for Gemini API)
- Cloudflare R2 account
- Inngest account
- TikTok API access

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd tiktok-hook-analyser-main
```

2. Install dependencies:
```bash
cd nextjs
npm install
```

3. Set up environment variables:

Create a `.env.local` file in the `nextjs` directory with the following variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google Gemini
GEMINI_API_KEY=your_gemini_api_key

# Cloudflare R2
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your_r2_bucket_name

# Inngest
INNGEST_EVENT_KEY=your_inngest_event_key
INNGEST_SIGNING_KEY=your_inngest_signing_key

# TikTok API
TIKTOK_API_KEY=your_tiktok_api_key
```

4. Set up the database:

Run Supabase migrations:
```bash
cd supabase
npx supabase db push
```

## Usage

### Development

Start the development server:
```bash
cd nextjs
npm run dev
```

The application will be available at `http://localhost:3000`

### Build

Build for production:
```bash
npm run build
```

### Start Production Server

```bash
npm start
```

## How It Works

1. **Video Search**: Users input search terms, triggering the `searchTikTokVideos` Inngest function
2. **Video Download**: Videos are downloaded and processed via the `downloadTikTokVideo` function
3. **Video Processing**: Videos are compressed and optimized, then uploaded to Cloudflare R2
4. **Hook Analysis**: The `analyzeVideoHook` function uses Gemini AI to analyze the first few seconds of each video
5. **Trend Generation**: Daily cron job (`generateTrendAnalysis`) aggregates insights across all analyzed videos

## Key Features

### Video Search & Download
- Searches TikTok with pagination support
- Filters top-performing videos based on engagement metrics
- Downloads videos with automatic fallback mechanisms

### AI Analysis
- Analyzes video hooks for engagement tactics
- Identifies hook types (question, statement, action, etc.)
- Scores overall hook effectiveness
- Extracts visual themes and opening strategies

### Trend Analysis
- Daily automated trend reports
- Common phrase identification
- Visual theme clustering
- Engagement pattern analysis

## Development Notes

- Videos are automatically compressed to stay under Gemini's 20MB limit
- Concurrent processing is limited to 3 videos to avoid API rate limits
- Failed jobs automatically retry up to 3 times
- Database uses conflict resolution to handle duplicate videos

## License

[Add your license here]

## Contributing

[Add contribution guidelines here]
