import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/utils/trpc";
import {
  Brain,
  VideoIcon,
  Eye,
  Heart,
  Share,
  MessageCircle,
  TrendingUp,
  Zap,
  Target,
  Palette,
  Users,
  Clock,
  ExternalLink,
  User
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Database } from "@shared-types/database.types";
import { HookAnalysisResult } from "@/lib/clients/gemini";

type VideoWithAnalysis = Database['public']['Tables']['tiktok_videos']['Row'] & {
  search_terms: Database['public']['Tables']['search_terms']['Row'];
  hook_analysis: Database['public']['Tables']['hook_analysis']['Row'][];
};

interface HookAnalysisDetailProps {
  videoId: string;
}

export function HookAnalysisDetail({ videoId }: HookAnalysisDetailProps) {
  const { data: videoData, isLoading } = trpc.tiktok.getVideoById.useQuery({ id: videoId });
  const video = videoData as unknown as VideoWithAnalysis;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Loading analysis...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!video || !video.hook_analysis || video.hook_analysis.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <Brain className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No Analysis Available</h3>
            <p className="text-muted-foreground">
              This video has not been analyzed yet or the analysis is still processing.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const analysis = video.hook_analysis[0] as Database['public']['Tables']['hook_analysis']['Row'];
  const result = analysis?.analysis_result as unknown as HookAnalysisResult;
  const overallScore = result?.overallScore || 0;

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

  return (
    <div className="space-y-6">
      {/* Video Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Video Thumbnail */}
            <div className="lg:col-span-1">
              <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
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

                {/* Overall Score Overlay */}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className={`text-4xl font-bold ${getScoreColor(overallScore)}`}>
                      {overallScore}
                    </div>
                    <div className="text-sm">Overall Score</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Video Info */}
            <div className="lg:col-span-2 space-y-4">
              <div>
                <h2 className="text-2xl font-bold mb-2">{video.title || "Untitled"}</h2>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {video.creator || video.creator_username || "Unknown creator"}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {video.duration ? `${Math.round(video.duration)}s` : "Unknown duration"}
                  </div>
                </div>
              </div>

              {/* Engagement Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Eye className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Views</span>
                  </div>
                  <div className="text-2xl font-bold">{formatNumber(video.view_count || 0)}</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Heart className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium">Likes</span>
                  </div>
                  <div className="text-2xl font-bold">{formatNumber(video.like_count || 0)}</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Share className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Shares</span>
                  </div>
                  <div className="text-2xl font-bold">{formatNumber(video.share_count || 0)}</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <MessageCircle className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">Comments</span>
                  </div>
                  <div className="text-2xl font-bold">{formatNumber(video.comment_count || 0)}</div>
                </div>
              </div>

              {/* Search Term and Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Badge variant="outline">{video.search_terms.term}</Badge>
                <div className="flex gap-2">
                  {video.r2_url && (
                    <Button variant="outline" asChild>
                      <a href={video.r2_url} target="_blank" rel="noopener noreferrer">
                        <VideoIcon className="mr-2 h-4 w-4" />
                        Watch Video
                      </a>
                    </Button>
                  )}
                  {video.video_url && (
                    <Button variant="outline" asChild>
                      <a href={video.video_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Original TikTok
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Opening Lines Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Opening Lines
            </CardTitle>
            <CardDescription>Analysis of the hook's opening content</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {result?.openingLines && (
              <>
                <div>
                  <h4 className="font-semibold mb-2">Transcript</h4>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm">"{result.openingLines.transcript}"</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Effectiveness</span>
                    <Badge variant="outline">{result.openingLines.effectiveness}/10</Badge>
                  </div>
                  <Progress value={result.openingLines.effectiveness * 10} />
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Emotional Impact</h4>
                  <Badge variant="secondary">{result.openingLines.emotional_impact}</Badge>
                </div>

                {result.openingLines.techniques && result.openingLines.techniques.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Techniques Used</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.openingLines.techniques.map((technique: string, index: number) => (
                        <Badge key={index} variant="outline">
                          {technique}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Visual Elements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-purple-500" />
              Visual Elements
            </CardTitle>
            <CardDescription>Visual hooks and design elements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {result?.visualElements && (
              <>
                <div>
                  <h4 className="font-semibold mb-2">Opening Shot</h4>
                  <p className="text-sm text-muted-foreground">{result.visualElements.opening_shot}</p>
                </div>

                {result.visualElements.visual_hooks && result.visualElements.visual_hooks.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Visual Hooks</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.visualElements.visual_hooks.map((hook: string, index: number) => (
                        <Badge key={index} variant="outline">
                          {hook}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {result.visualElements.color_palette && result.visualElements.color_palette.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Color Palette</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.visualElements.color_palette.map((color: string, index: number) => (
                        <Badge key={index} variant="secondary">
                          {color}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {result.visualElements.text_overlays && result.visualElements.text_overlays.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Text Overlays</h4>
                    <div className="space-y-1">
                      {result.visualElements.text_overlays.map((text: string, index: number) => (
                        <div key={index} className="bg-muted p-2 rounded text-sm">
                          "{text}"
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.visualElements.transitions && result.visualElements.transitions.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Transitions</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.visualElements.transitions.map((transition: string, index: number) => (
                        <Badge key={index} variant="outline">
                          {transition}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Engagement Tactics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            Engagement Tactics
          </CardTitle>
          <CardDescription>Psychological triggers and engagement strategies</CardDescription>
        </CardHeader>
        <CardContent>
          {result?.engagementTactics && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Hook Type</h4>
                  <Badge variant="default" className="text-lg py-1 px-3">
                    {result.engagementTactics.hook_type}
                  </Badge>
                </div>

                {result.engagementTactics.call_to_action && (
                  <div>
                    <h4 className="font-semibold mb-2">Call to Action</h4>
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-sm">{result.engagementTactics.call_to_action}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {result.engagementTactics.curiosity_gaps && result.engagementTactics.curiosity_gaps.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Curiosity Gaps</h4>
                    <ul className="space-y-1">
                      {result.engagementTactics.curiosity_gaps.map((gap: string, index: number) => (
                        <li key={index} className="text-sm text-muted-foreground">
                          • {gap}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.engagementTactics.social_proof && result.engagementTactics.social_proof.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Social Proof</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.engagementTactics.social_proof.map((proof: string, index: number) => (
                        <Badge key={index} variant="secondary">
                          {proof}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {result.engagementTactics.urgency_indicators && result.engagementTactics.urgency_indicators.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Urgency Indicators</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.engagementTactics.urgency_indicators.map((indicator: string, index: number) => (
                        <Badge key={index} variant="destructive">
                          {indicator}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary & Recommendations */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result?.summary ? (
              <p className="text-sm leading-relaxed">{result.summary}</p>
            ) : (
              <p className="text-muted-foreground">No summary available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-500" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result?.recommendations && result.recommendations.length > 0 ? (
              <ul className="space-y-2">
                {result.recommendations.map((rec: string, index: number) => (
                  <li key={index} className="text-sm flex items-start gap-2">
                    <span className="text-orange-500 mt-1">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No recommendations available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analysis Meta */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Analysis completed {formatDistanceToNow(new Date(analysis.processed_at), { addSuffix: true })}
            </span>
            <Badge variant="outline">
              Analysis ID: {analysis.id.slice(0, 8)}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}