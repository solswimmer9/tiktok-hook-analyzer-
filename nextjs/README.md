# Social Media Monitor

A production-ready Next.js template for monitoring social media accounts and posts. Built with TypeScript, tRPC, Supabase, and Tailwind CSS.

## 🚀 Features

- **Twitter Monitoring**: Track multiple Twitter accounts and their posts
- **Real-time Dashboard**: View accounts and posts in a clean, responsive interface
- **Database Integration**: Powered by Supabase for reliable data storage
- **Background Jobs**: Uses Inngest for scheduled tasks and data processing
- **Authentication**: Built-in user authentication with Supabase Auth
- **Type Safety**: Full TypeScript support with tRPC for end-to-end type safety
- **Modern UI**: Beautiful, responsive interface built with Tailwind CSS and Radix UI

## 📋 Prerequisites

Before setting up the project, ensure you have:

- Node.js 18+ installed
- A Supabase account and project
- RapidAPI account with access to Twitter API
- (Optional) Inngest account for background jobs

## 🛠️ Quick Setup

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd social-media-monitor
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Basic Configuration
NODE_ENV=development
CLOUDFLARE_TUNNEL_URL=http://localhost:3000

# RapidAPI (Twitter monitoring)
RAPID_API_KEY=your_rapidapi_key_here

# Supabase
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Inngest (Background jobs - optional)
INNGEST_EVENT_KEY=your_inngest_event_key
INNGEST_SIGNING_KEY=your_inngest_signing_key
```

### 3. Database Setup

#### Create Supabase Tables

Run these SQL commands in your Supabase SQL editor:

```sql
-- Twitter accounts table
CREATE TABLE twitter_accounts (
  id BIGINT PRIMARY KEY,
  username TEXT NOT NULL,
  display_name TEXT,
  followers_count INTEGER,
  profile_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tweets table
CREATE TABLE tweets (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  account_id BIGINT REFERENCES twitter_accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  retweet_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  quote_count INTEGER DEFAULT 0
);

-- Indexes for better performance
CREATE INDEX idx_tweets_account_id ON tweets(account_id);
CREATE INDEX idx_tweets_created_at ON tweets(created_at DESC);
CREATE INDEX idx_twitter_accounts_username ON twitter_accounts(username);
```

#### Enable Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE twitter_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tweets ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your auth requirements)
CREATE POLICY "Allow authenticated users to read twitter_accounts" 
  ON twitter_accounts FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to manage twitter_accounts" 
  ON twitter_accounts FOR ALL 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to read tweets" 
  ON tweets FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to manage tweets" 
  ON tweets FOR ALL 
  TO authenticated 
  USING (true);
```

### 4. API Keys Setup

#### RapidAPI (Twitter)

1. Sign up at [RapidAPI](https://rapidapi.com/)
2. Subscribe to the [Twitter API v1.1](https://rapidapi.com/Glavier/api/twitter-api45)
3. Copy your API key to the `RAPID_API_KEY` environment variable

#### Supabase

1. Create a project at [Supabase](https://supabase.com/)
2. Go to Settings > API
3. Copy the URL and anon key to your environment variables
4. Copy the service role key (keep this secret!)

### 5. Run the Application

```bash
# Development
npm run dev

# Production build
npm run build
npm run start
```

Visit [http://localhost:3000](http://localhost:3000) and you'll be redirected to the Twitter monitoring dashboard.

## 🎯 Usage

### Adding Twitter Accounts

1. Navigate to the Twitter Monitoring dashboard
2. Click "Add Account" 
3. Enter a Twitter username (with or without @)
4. The system will fetch account information and add it to monitoring

### Viewing Posts

1. Go to the "Posts" tab in the Twitter dashboard
2. View all posts from monitored accounts
3. Filter by specific accounts if needed

### Configuration

The app includes a configuration file at `src/config/app.ts` where you can:

- Update branding and app name
- Configure enabled features
- Adjust API endpoints

## 🔧 Customization

### Adding New Social Platforms

1. Add platform configuration to `src/config/app.ts`
2. Create new database tables for the platform
3. Add API routes in `src/server/api/routers/admin/`
4. Create UI components in `src/components/[platform]/`
5. Update the dashboard sidebar navigation

### Styling

The app uses Tailwind CSS. Customize the theme by editing:
- `tailwind.config.ts` - Global theme configuration
- `src/styles/globals.css` - Base styles
- Component-level styling throughout the app

### Database Schema

Modify the database schema by:
1. Adding new tables in Supabase
2. Updating types if using TypeScript
3. Adding new tRPC procedures for data access

## 📚 Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **Backend**: tRPC, Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Background Jobs**: Inngest
- **Deployment**: Vercel-ready

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- Self-hosted with Docker

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

## 🆘 Support

If you encounter any issues:

1. Check the environment variables are correctly set
2. Verify database tables are created
3. Ensure API keys have proper permissions
4. Check the console for error messages

For additional help, please open an issue in the repository.