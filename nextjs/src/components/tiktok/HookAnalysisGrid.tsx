import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/utils/trpc";
import { useState } from "react";
import { 
  Brain, 
  VideoIcon, 
  Eye, 
  Heart, 
  Share, 
  MessageCircle,
  TrendingUp,
  Zap,
  Target
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Database } from "@shared-types/database.types";

type HookAnalysis = Database['public']['Tables']['hook_analysis']['Row'] & {
  tiktok_videos: Database['public']['Tables']['tiktok_videos']['Row'] & {
    search_terms: Database['public']['Tables']['search_terms']['Row'];
  };
};

interface HookAnalysisGridProps {
  searchTermId?: string;
  searchQuery?: string;
}

export function HookAnalysisGrid({ searchTermId, searchQuery }: HookAnalysisGridProps) {
  const [page, setPage] = useState(0);
  const pageSize = 12;

  // Fetch hook analyses with pagination
  const { data: analyses, isLoading } = trpc.tiktok.getHookAnalysis.useQuery({
    searchTermId,
    limit: pageSize,
  });

  const allAnalyses = (analyses || []) as HookAnalysis[];
  const hasNextPage = false; // Simplified for now
  const fetchNextPage = () => {};
  
  // Filter analyses by search query
  const filteredAnalyses = searchQuery
    ? allAnalyses.filter(analysis => 
        analysis.tiktok_videos.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        analysis.tiktok_videos.creator?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        analysis.analysis_result?.engagementTactics?.hook_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        analysis.analysis_result?.openingLines?.transcript?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allAnalyses;

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreVariant = (score: number) => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hook Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading hook analysis...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (filteredAnalyses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hook Analysis</CardTitle>
          <CardDescription>
            {searchQuery || searchTermId 
              ? "No analysis match your current filters"
              : "No hook analysis found. Videos are still being processed or no videos have been analyzed yet."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Brain className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">
              {searchQuery || searchTermId ? "No matching analysis" : "No analysis yet"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || searchTermId 
                ? "Try adjusting your filters or search terms"
                : "Videos are being processed. Hook analysis will appear here once complete."
              }
            </p>
            {!searchQuery && !searchTermId && (
              <Link href="/admin/tiktok/videos">
                <Button>View Videos</Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Hook Analysis ({filteredAnalyses.length})</CardTitle>
          <CardDescription>
            AI-powered analysis of video hooks and engagement tactics
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Analysis Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredAnalyses.map((analysis: HookAnalysis) => {
          const video = analysis.tiktok_videos;
          const result = analysis.analysis_result as any; // TODO: Define proper type for analysis_result JSON
          const overallScore = result?.overallScore || 0;
          const hookType = result?.engagementTactics?.hook_type || "Unknown";
          const effectiveness = result?.openingLines?.effectiveness || 0;
          const openingText = result?.openingLines?.transcript || "No transcript available";

          return (
            <Card key={analysis.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-video bg-muted relative">
                {video.thumbnail_url ? (
                  <img
                    src={video.thumbnail_url}
                    alt={video.title || "TikTok video"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <VideoIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                
                {/* Overall Score Badge */}
                <Badge 
                  className={`absolute top-2 right-2 ${getScoreColor(overallScore)}`}
                  variant={getScoreVariant(overallScore)}
                >
                  {overallScore}/100
                </Badge>

                {/* Hook Type Badge */}
                <Badge className="absolute top-2 left-2 bg-blue-500">
                  {hookType}
                </Badge>
              </div>

              <CardContent className="p-4">
                <div className="space-y-4">
                  {/* Title and Creator */}
                  <div>
                    <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                      {video.title || "Untitled"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      by {video.creator || video.creator_username || "Unknown"}
                    </p>
                  </div>

                  {/* Opening Lines */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium">Opening Hook</span>
                      <Badge variant="outline" className="text-xs">
                        {effectiveness}/10
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3 bg-muted p-2 rounded">
                      "{openingText}"
                    </p>
                  </div>

                  {/* Engagement Metrics */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {formatNumber(video.view_count || 0)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {formatNumber(video.like_count || 0)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Share className="h-3 w-3" />
                      {formatNumber(video.share_count || 0)}
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      {formatNumber(video.comment_count || 0)}
                    </div>
                  </div>

                  {/* Progress Bars */}
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Overall Score</span>
                        <span className={getScoreColor(overallScore)}>{overallScore}%</span>
                      </div>
                      <Progress value={overallScore} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Hook Effectiveness</span>
                        <span>{effectiveness * 10}%</span>
                      </div>
                      <Progress value={effectiveness * 10} className="h-2" />
                    </div>
                  </div>

                  {/* Key Techniques */}
                  {result?.openingLines?.techniques && result.openingLines.techniques.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">Techniques</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {result.openingLines.techniques.slice(0, 3).map((technique: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {technique}
                          </Badge>
                        ))}
                        {result.openingLines.techniques.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{result.openingLines.techniques.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Search Term */}
                  <div className="pt-2 border-t">
                    <Badge variant="outline" className="text-xs">
                      {video.search_terms.term}
                    </Badge>
                  </div>

                  {/* View Details Button */}
                  <Link href={`/admin/tiktok/analysis?video=${video.id}`}>
                    <Button className="w-full" size="sm">
                      <Brain className="mr-2 h-4 w-4" />
                      View Full Analysis
                    </Button>
                  </Link>

                  {/* Analysis Date */}
                  <div className="text-xs text-muted-foreground text-center">
                    Analyzed {formatDistanceToNow(new Date(analysis.processed_at), { addSuffix: true })}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Load More */}
      {hasNextPage && (
        <div className="flex justify-center pt-6">
          <Button onClick={() => fetchNextPage()} disabled={isLoading}>
            Load More Analysis
          </Button>
        </div>
      )}
    </div>
  );
}