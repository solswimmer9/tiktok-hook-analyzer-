import DashboardLayout from "@/components/layout/DashboardLayout";
import { SearchTermsTab } from "@/components/tiktok/SearchTermsTab";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/utils/trpc";
import { TrendingUp, VideoIcon, Search, BarChart3 } from "lucide-react";

// Helper function to format hook type names
function formatHookType(hookType: string): string {
  return hookType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function TikTokDashboard() {
  const { data: stats, isLoading: statsLoading } = trpc.tiktok.getStatistics.useQuery();

  return (
    <DashboardLayout>
      <div className="container mx-auto space-y-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">TikTok Hook Analyzer</h1>
            <p className="text-muted-foreground">
              Analyze viral TikTok hooks and discover engagement patterns
            </p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Search Terms</CardTitle>
              <Search className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : stats?.totalSearchTerms || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {statsLoading ? "..." : stats?.activeSearchTerms || 0} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Videos Analyzed</CardTitle>
              <VideoIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : stats?.totalVideos || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {statsLoading ? "..." : stats?.totalAnalyses || 0} with hook analysis
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Hook Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : Math.round(stats?.averageHookScore || 0)}
              </div>
              <p className="text-xs text-muted-foreground">out of 100</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Hook Type</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading
                  ? "..."
                  : formatHookType(Object.entries(stats?.topHookTypes || {})
                      .sort(([,a], [,b]) => b - a)[0]?.[0] || "None")
                }
              </div>
              <p className="text-xs text-muted-foreground">
                most common pattern
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="search-terms" className="space-y-4">
          <TabsList>
            <TabsTrigger value="search-terms">Search Terms</TabsTrigger>
          </TabsList>
          
          <TabsContent value="search-terms" className="space-y-4">
            <SearchTermsTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}