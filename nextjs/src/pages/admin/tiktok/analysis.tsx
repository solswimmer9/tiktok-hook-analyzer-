import DashboardLayout from "@/components/layout/DashboardLayout";
import { HookAnalysisGrid } from "@/components/tiktok/HookAnalysisGrid";
import { HookAnalysisDetail } from "@/components/tiktok/HookAnalysisDetail";
import { HookClusters } from "@/components/tiktok/HookClusters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/utils/trpc";
import { useState } from "react";
import { useRouter } from "next/router";
import { Brain, Filter, ArrowLeft } from "lucide-react";

export default function TikTokAnalysis() {
  const router = useRouter();
  const { video: videoId } = router.query;

  const [selectedSearchTerm, setSelectedSearchTerm] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch search terms for filter
  const { data: searchTerms } = trpc.tiktok.getSearchTerms.useQuery();

  // If viewing a specific video analysis
  if (videoId && typeof videoId === "string") {
    return (
      <DashboardLayout>
        <div className="container mx-auto space-y-6 py-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push("/admin/tiktok/analysis")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Analysis
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Hook Analysis Detail</h1>
              <p className="text-muted-foreground">
                Detailed analysis of video hook performance
              </p>
            </div>
          </div>

          <HookAnalysisDetail videoId={videoId} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto space-y-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Hook Analysis</h1>
            <p className="text-muted-foreground">
              AI-powered analysis of TikTok video hooks and engagement tactics
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <CardDescription>
              Filter analysis by search term or search for specific content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Select value={selectedSearchTerm} onValueChange={setSelectedSearchTerm}>
                  <SelectTrigger>
                    <SelectValue placeholder="All search terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All search terms</SelectItem>
                    {searchTerms?.map((term) => (
                      <SelectItem key={term.id} value={term.id}>
                        <div className="flex items-center gap-2">
                          <span>{term.term}</span>
                          <Badge variant={term.status === "active" ? "default" : "secondary"} className="text-xs">
                            {term.status}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Input
                  placeholder="Search by creator, hook type, or content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              {(selectedSearchTerm !== "all" || searchQuery) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedSearchTerm("all");
                    setSearchQuery("");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Hook Clusters */}
        <HookClusters />

        {/* Analysis Grid */}
        <HookAnalysisGrid
          searchTermId={selectedSearchTerm !== "all" ? selectedSearchTerm : undefined}
          searchQuery={searchQuery}
        />
      </div>
    </DashboardLayout>
  );
}