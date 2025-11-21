import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/utils/trpc";
import { useState, useEffect } from "react";
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
import { HookAnalysisResult } from "@/lib/clients/gemini";

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
  const [allLoadedAnalyses, setAllLoadedAnalyses] = useState<HookAnalysis[]>([]);
  const [offset, setOffset] = useState(0);
  const pageSize = 12;

  // Reset pagination when filters change
  useEffect(() => {
    setOffset(0);
    setAllLoadedAnalyses([]);
  }, [searchTermId]);

  // Fetch hook analyses with pagination
  const { data: analyses, isLoading, isFetching } = trpc.tiktok.getHookAnalysis.useQuery({
    searchTermId,
    limit: pageSize,
    offset: offset,
  });

  // Accumulate analyses when new data arrives
  useEffect(() => {
    if (analyses && analyses.length > 0) {
      setAllLoadedAnalyses(prev => {
        // If offset is 0, replace all analyses (fresh load)
        if (offset === 0) {
          return analyses as HookAnalysis[];
        }
        // Otherwise, append new analyses
        const analysisList = analyses as HookAnalysis[];
        const existingIds = new Set(prev.map(a => a.id));
        const newAnalyses = analysisList.filter(a => !existingIds.has(a.id));
        return [...prev, ...newAnalyses] as HookAnalysis[];
      });
    }
  }, [analyses, offset]);

  const hasNextPage = analyses && analyses.length === pageSize;
  const fetchNextPage = () => {
    if (!isFetching && hasNextPage) {
      setOffset(prev => prev + pageSize);
    }
  };

  const allAnalyses = allLoadedAnalyses;

  // Filter analyses by search query
  const filteredAnalyses = searchQuery
    ? allAnalyses.filter(analysis => {
      const result = analysis.analysis_result as unknown as HookAnalysisResult;
      return (
        analysis.tiktok_videos.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        analysis.tiktok_videos.creator?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        result?.engagementTactics?.hook_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        result?.openingLines?.transcript?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    })
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

  if (isLoading && allLoadedAnalyses.length === 0) {
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
              <Link href="/dashboard/tiktok/videos">
                <Button>View Videos</Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Hook Analysis ({filteredAnalyses.length})</CardTitle>
          <CardDescription>
            AI-powered analysis of video hooks and engagement tactics
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Analysis Grid - Improved spacing with gap-8 */}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {filteredAnalyses.map((analysis: HookAnalysis) => {
          const video = analysis.tiktok_videos;
          const result = analysis.analysis_result as unknown as HookAnalysisResult;
          const overallScore = result?.overallScore || 0;
          const hookType = result?.engagementTactics?.hook_type || "Unknown";
          const effectiveness = result?.openingLines?.effectiveness || 0;
          const openingText = result?.openingLines?.transcript || "No transcript available";

          return (
            <Card key={analysis.id} className="overflow-hidden hover:shadow-lg transition-all duration-200">
              {/* Thumbnail */}
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

                {/* Hook Type Badge - Top Left */}
                <Badge className="absolute top-3 left-3 bg-black/70 text-white border-0">
                  {hookType}
                </Badge>
              </div>

              <CardContent className="p-6 space-y-6">
                {/* MAIN FOCUS: Hook Score - Large and Prominent */}
                <div className="flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-500" />
                      <span className="text-sm font-medium text-muted-foreground">Opening Hook</span>
                    </div>
                    <div className={`text-5xl font-bold ${getScoreColor(effectiveness * 10)}`}>
                      {effectiveness}<span className="text-2xl text-muted-foreground">/10</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 max-w-xs mx-auto">
                      "{openingText}"
                    </p>
                  </div>
                </div>

                {/* Overall Score Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Overall Score</span>
                    <span className={`text-lg font-bold ${getScoreColor(overallScore)}`}>
                      {overallScore}%
                    </span>
                  </div>
                  <Progress value={overallScore} className="h-3" />
                </div>

                {/* Title and Creator - Cleaner */}
                <div className="space-y-1">
                  <h3 className="font-semibold text-sm line-clamp-2">
                    {video.title || "Untitled"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    by {video.creator || video.creator_username || "Unknown"}
                  </p>
                </div>

                {/* Engagement Metrics - Compact */}
                <div className="flex items-center justify-between text-xs text-muted-foreground border-y py-3">
                  <div className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    {formatNumber(video.view_count || 0)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5" />
                    {formatNumber(video.like_count || 0)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Share className="h-3.5 w-3.5" />
                    {formatNumber(video.share_count || 0)}
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {formatNumber(video.comment_count || 0)}
                  </div>
                </div>

                {/* Techniques - Improved Spacing and Style */}
                {result?.openingLines?.techniques && result.openingLines.techniques.length > 0 && (
                  <div className="space-y-3">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Techniques</span>
                    <div className="flex flex-wrap gap-2">
                      {result.openingLines.techniques.slice(0, 3).map((technique: string, index: number) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs px-3 py-1 font-normal"
                        >
                          {technique}
                        </Badge>
                      ))}
                      {result.openingLines.techniques.length > 3 && (
                        <Badge
                          variant="outline"
                          className="text-xs px-3 py-1 font-normal"
                        >
                          +{result.openingLines.techniques.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* View Details Button - More Prominent */}
                <Link href={`/dashboard/tiktok/analysis?video=${video.id}`}>
                  <Button className="w-full" size="default">
                    <Brain className="mr-2 h-4 w-4" />
                    View Full Analysis
                  </Button>
                </Link>

                {/* Analysis Date - Subtle */}
                <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                  Analyzed {formatDistanceToNow(new Date(analysis.processed_at), { addSuffix: true })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Load More */}
      {hasNextPage && !isFetching && (
        <div className="flex justify-center pt-8">
          <Button onClick={() => fetchNextPage()} disabled={isFetching} size="lg">
            {isFetching ? "Loading..." : "Load More Analysis"}
          </Button>
        </div>
      )}
    </div>
  );
}