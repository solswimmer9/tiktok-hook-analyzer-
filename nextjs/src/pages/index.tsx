import Head from "next/head";
import Link from "next/link";
import { ArrowRight, Brain, Search, Sparkles, TrendingUp, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <>
      <Head>
        <title>TikTok Hook Analyzer | Unlock Viral Growth</title>
        <meta name="description" content="Use AI to analyze TikTok hooks, spot trends, and skyrocket your engagement." />
      </Head>

      <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
        {/* Navigation */}
        <nav className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
          <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="h-5 w-5" />
              </div>
              <span>HookAnalyzer</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/sign-in"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="hidden rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-transform hover:scale-105 active:scale-95 md:inline-flex"
              >
                Get Started
              </Link>
            </div>
          </div>
        </nav>

        <main className="pt-24 pb-16 md:pt-32">
          {/* Hero Section */}
          <section className="container mx-auto px-4 text-center md:px-6">
            <div className="mx-auto max-w-3xl space-y-6">
              <div className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-sm text-secondary-foreground backdrop-blur-sm">
                <span className="mr-2 flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                Now powered by Gemini 1.5 Pro
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent pb-2">
                Decode the Science of <br className="hidden md:block" />
                <span className="text-primary">Viral Content</span>
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl">
                Stop guessing what works. Our AI analyzes thousands of TikTok hooks to give you data-driven insights that skyrocket your engagement.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
                <Link
                  href="/sign-up"
                  className="group inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-base font-medium text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:shadow-xl active:scale-95"
                >
                  Start Analyzing Free
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="#how-it-works"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-input bg-background px-8 text-base font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  See How It Works
                </Link>
              </div>
            </div>

            {/* Dashboard Preview Mockup */}
            <div className="relative mx-auto mt-16 max-w-5xl overflow-hidden rounded-xl border border-border bg-card/50 shadow-2xl backdrop-blur-sm lg:rounded-2xl">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-transparent opacity-50" />
              <div className="p-2 md:p-4">
                <div className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
                  <div className="relative h-[400px] md:h-[500px] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                    {/* Floating Card UI */}
                    <div className="absolute top-8 left-8 w-72 rounded-lg border border-border bg-background/95 p-4 shadow-xl backdrop-blur animate-in fade-in slide-in-from-bottom-4 duration-1000 hidden md:block">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 dark:bg-blue-900/30">
                          <Brain className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold">Hook Strength</div>
                          <div className="text-xs text-muted-foreground">AI Analysis</div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                          <div className="h-full w-[92%] bg-primary rounded-full" />
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="font-medium">Excellent</span>
                          <span className="text-muted-foreground">92/100</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats Card */}
                    <div className="absolute bottom-8 right-8 w-64 rounded-lg border border-border bg-background/95 p-4 shadow-xl backdrop-blur animate-in fade-in slide-in-from-top-4 duration-1000 delay-300 hidden md:block">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-2xl font-bold text-primary">1.2M</div>
                          <div className="text-xs text-muted-foreground">Videos Analyzed</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-green-600">94%</div>
                          <div className="text-xs text-muted-foreground">Accuracy</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Features Grid (Bento Box) */}
          <section className="container mx-auto mt-24 px-4 md:px-6">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Everything you need to go viral</h2>
              <p className="mt-4 text-muted-foreground md:text-lg">Powerful tools packaged in a beautiful interface.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3 md:grid-rows-2 lg:gap-6">
              {/* Large Feature */}
              <div className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 md:col-span-2 md:row-span-2 md:p-8">
                <div className="absolute top-0 right-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-primary/10 blur-3xl transition-all group-hover:bg-primary/20" />
                <div className="relative z-10 flex h-full flex-col justify-between">
                  <div className="space-y-4">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Brain className="h-6 w-6" />
                    </div>
                    <h3 className="text-2xl font-bold">AI-Powered Analysis</h3>
                    <p className="max-w-md text-muted-foreground">
                      Our advanced Gemini integration breaks down every second of top-performing videos. Understand the exact psychological triggers, visual patterns, and audio cues that stop the scroll.
                    </p>
                  </div>
                  <div className="mt-8 rounded-xl border border-border bg-muted/50 p-4 backdrop-blur-sm">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <p className="text-sm font-medium">&quot;Wait for the end...&quot; (Curiosity Gap)</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        <p className="text-sm font-medium">Fast-paced visual cuts (0.5s avg)</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-purple-500" />
                        <p className="text-sm font-medium">High-contrast text overlay</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Small Feature 1 */}
              <div className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 transition-colors hover:border-primary/50">
                <div className="space-y-2">
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30">
                    <Search className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold">Deep Search</h3>
                  <p className="text-sm text-muted-foreground">
                    Find the top 1% of videos in any niche. Filter by engagement rate, not just views.
                  </p>
                </div>
              </div>

              {/* Small Feature 2 */}
              <div className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 transition-colors hover:border-primary/50">
                <div className="space-y-2">
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-900/30">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold">Trend Spotting</h3>
                  <p className="text-sm text-muted-foreground">
                    Identify rising trends before they peak. Get daily reports on what&apos;s working now.
                  </p>
                </div>
              </div>

              {/* Small Feature 3 */}
              <div className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 md:col-span-3 transition-colors hover:border-primary/50">
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 dark:bg-purple-900/30 shrink-0">
                    <Zap className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">Automated Clustering</h3>
                    <p className="text-sm text-muted-foreground">
                      Machine learning groups similar hooks automatically. Discover what makes each cluster successful and replicate winning patterns.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 shrink-0">
                    <div className="h-16 w-16 rounded-lg bg-blue-100/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"></div>
                    <div className="h-16 w-16 rounded-lg bg-green-100/50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"></div>
                    <div className="h-16 w-16 rounded-lg bg-purple-100/50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800"></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section id="how-it-works" className="container mx-auto mt-24 px-4 py-16 md:px-6">
            <div className="grid gap-12 md:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-2xl font-bold">1</div>
                <h3 className="mb-2 text-xl font-bold">Search Your Niche</h3>
                <p className="text-muted-foreground">Input any keyword or hashtag. We scrape and filter for the highest-performing content.</p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-2xl font-bold text-primary">2</div>
                <h3 className="mb-2 text-xl font-bold">AI Analysis</h3>
                <p className="text-muted-foreground">Our AI watches the videos for you, extracting transcripts, hook types, and engagement tactics.</p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-2xl font-bold">3</div>
                <h3 className="mb-2 text-xl font-bold">Replicate & Win</h3>
                <p className="text-muted-foreground">Use the insights to script your own videos. Stop guessing and start growing.</p>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="container mx-auto mt-12 px-4 pb-24 md:px-6">
            <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center text-primary-foreground shadow-2xl md:px-12">
              <div className="absolute top-0 left-0 -mt-12 -ml-12 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute bottom-0 right-0 -mb-12 -mr-12 h-64 w-64 rounded-full bg-black/10 blur-3xl" />

              <div className="relative z-10 mx-auto max-w-2xl space-y-6">
                <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Ready to dominate your niche?</h2>
                <p className="text-lg text-primary-foreground/90">
                  Join hundreds of creators using data to build their audience.
                </p>
                <Link
                  href="/sign-up"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-background px-8 text-base font-bold text-primary shadow-lg transition-transform hover:scale-105 active:scale-95"
                >
                  Get Started for Free
                </Link>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-border bg-muted/30 py-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
              <div className="flex items-center gap-2 font-bold">
                <Sparkles className="h-5 w-5 text-primary" />
                <span>HookAnalyzer</span>
              </div>
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} HookAnalyzer. All rights reserved.
              </p>
              <div className="flex gap-6 text-sm text-muted-foreground">
                <Link href="/privacy.mdx" className="hover:text-foreground">Privacy</Link>
                <Link href="/terms.mdx" className="hover:text-foreground">Terms</Link>
                <Link href="/support" className="hover:text-foreground">Support</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
