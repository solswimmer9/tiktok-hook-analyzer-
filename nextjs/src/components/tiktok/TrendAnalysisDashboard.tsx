import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/utils/trpc";
import { useState } from "react";
import { 
  TrendingUp, 
  MessageSquare, 
  Palette, 
  Target,
  BarChart3,
  Calendar,
  Eye,
  Award,
  Lightbulb
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Database } from "@shared-types/database.types";

type TrendAnalysis = Database['public']['Tables']['trend_analysis']['Row'];

export function TrendAnalysisDashboard() {
  const [selectedTrendId, setSelectedTrendId] = useState<string | null>(null);

  // Fetch trend analyses
  const { data: trends, isLoading } = trpc.tiktok.getTrendAnalysis.useQuery({ limit: 10 });

  // Fetch specific trend details if selected
  const { data: selectedTrend } = trpc.tiktok.getTrendAnalysisById.useQuery(
    { id: selectedTrendId! },
    { enabled: !!selectedTrendId }
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Loading trend analysis...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!trends || trends.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <TrendingUp className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No Trend Analysis Available</h3>
            <p className="text-muted-foreground mb-4">
              Generate your first trend analysis to see patterns and insights across your hook data.
            </p>
            <p className="text-sm text-muted-foreground">
              Trend analysis runs automatically daily at 6 AM, or you can trigger it manually.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If a specific trend is selected, show its details
  if (selectedTrend) {
    const analysis = selectedTrend.analysis_results as any; // TODO: Define proper type for analysis_results JSON
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Trend Analysis - {selectedTrend.date}
                </CardTitle>
                <CardDescription>
                  Analysis of {selectedTrend.total_videos_analyzed} videos processed on this date
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => setSelectedTrendId(null)}>
                Back to Overview
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="phrases" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="phrases">Common Phrases</TabsTrigger>
            <TabsTrigger value="visual">Visual Themes</TabsTrigger>
            <TabsTrigger value="engagement">Engagement Patterns</TabsTrigger>
          </TabsList>

          <TabsContent value="phrases" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Most Common Opening Phrases
                </CardTitle>
                <CardDescription>
                  Popular phrases and their average effectiveness scores
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analysis?.commonPhrases && analysis.commonPhrases.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Phrase</TableHead>
                        <TableHead className="text-center">Usage Count</TableHead>
                        <TableHead className="text-center">Avg Effectiveness</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysis.commonPhrases.map((phrase: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium max-w-md">
                            "{phrase.phrase}"
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{phrase.count}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="space-y-1">
                              <Progress value={phrase.effectiveness * 10} className="w-16 mx-auto" />
                              <span className="text-sm text-muted-foreground">
                                {phrase.effectiveness}/10
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={phrase.effectiveness >= 7 ? "default" : phrase.effectiveness >= 5 ? "secondary" : "destructive"}>
                              {Math.round(phrase.effectiveness * 10)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No common phrases data available
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="visual" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Popular Visual Themes
                </CardTitle>
                <CardDescription>
                  Visual techniques and their performance correlation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analysis?.visualThemes && analysis.visualThemes.length > 0 ? (
                  <div className="grid gap-4">
                    {analysis.visualThemes.map((theme: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <h4 className="font-semibold">{theme.theme}</h4>
                          <p className="text-sm text-muted-foreground">
                            Used in {theme.count} videos
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="text-2xl font-bold">
                            {Math.round(theme.avgScore)}
                          </div>
                          <p className="text-xs text-muted-foreground">Avg Score</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No visual themes data available
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="engagement" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Engagement Pattern Analysis
                </CardTitle>
                <CardDescription>
                  Hook types and tactics with highest performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analysis?.engagementPatterns && analysis.engagementPatterns.length > 0 ? (
                  <div className="space-y-4">
                    {analysis.engagementPatterns.map((pattern: any, index: number) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold">{pattern.pattern}</h4>
                          <Badge variant="outline">{pattern.count} videos</Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Average Performance Score</span>
                            <span className="font-medium">{Math.round(pattern.avgScore)}%</span>
                          </div>
                          <Progress value={pattern.avgScore} />
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No engagement patterns data available
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Summary and Recommendations */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Key Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analysis?.summary ? (
                <p className="text-sm leading-relaxed">{analysis.summary}</p>
              ) : (
                <p className="text-muted-foreground">No insights available</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analysis?.recommendations && analysis.recommendations.length > 0 ? (
                <ul className="space-y-2">
                  {analysis.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <span className="text-yellow-500 mt-1">•</span>
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
      </div>
    );
  }

  // Show trend overview
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Recent Trend Analysis
          </CardTitle>
          <CardDescription>
            Click on any analysis to view detailed insights and patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {trends.map((trend: TrendAnalysis) => (
              <Card 
                key={trend.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedTrendId(trend.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span className="font-semibold">{trend.date}</span>
                        <Badge variant="outline">{trend.total_videos_analyzed} videos</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Generated {formatDistanceToNow(new Date(trend.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      {trend.common_phrases && (
                        <div className="text-center">
                          <div className="font-semibold">{trend.common_phrases.length}</div>
                          <div className="text-muted-foreground">Phrases</div>
                        </div>
                      )}
                      {trend.visual_themes && (
                        <div className="text-center">
                          <div className="font-semibold">{trend.visual_themes.length}</div>
                          <div className="text-muted-foreground">Themes</div>
                        </div>
                      )}
                      {trend.engagement_patterns && (
                        <div className="text-center">
                          <div className="font-semibold">{trend.engagement_patterns.length}</div>
                          <div className="text-muted-foreground">Patterns</div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}