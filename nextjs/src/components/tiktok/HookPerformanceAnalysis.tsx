import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/utils/trpc";
import {
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    CheckCircle2,
    ArrowRight,
    BarChart3,
    Lightbulb,
    XCircle
} from "lucide-react";
import { ClusterStats } from "@/server/services/clustering";
import { ContrastAnalyzer } from "@/lib/clustering/contrast-analyzer";

export function HookPerformanceAnalysis({ searchTermId }: { searchTermId?: string }) {
    const { data: segmentedData, isLoading, error } = trpc.tiktok.getSegmentedClusters.useQuery({
        searchTermId
    });

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-purple-600" />
                        Performance Analysis: Best vs Worst
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-pulse flex flex-col items-center">
                            <BarChart3 className="h-10 w-10 text-muted-foreground mb-3" />
                            <p className="text-sm text-muted-foreground">Analyzing performance patterns...</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error || !segmentedData) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-purple-600" />
                        Performance Analysis
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                        <p className="text-sm">
                            {error?.message || "Not enough data for performance analysis (minimum 10 hooks required)"}
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const { topTier, lowTier, middleTier, overallStats, thresholds } = segmentedData;

    // If we don't have both tiers, show message
    if (topTier.totalAnalyzed === 0 || lowTier.totalAnalyzed === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-purple-600" />
                        Performance Analysis
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        <p className="text-sm">Not enough data in all performance tiers for meaningful comparison</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Perform contrast analysis
    const contrastAnalysis = ContrastAnalyzer.analyzeContrasts(
        topTier.clusters,
        lowTier.clusters
    );

    return (
        <div className="space-y-6">
            {/* Overall Statistics */}
            <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-indigo-600" />
                        Performance Segmentation Overview
                    </CardTitle>
                    <CardDescription>
                        Comparing {overallStats.topCount} top performers vs {overallStats.lowCount} low performers
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="h-4 w-4 text-green-600" />
                                <span className="text-xs font-semibold text-green-700 uppercase">Top Performers</span>
                            </div>
                            <div className="text-2xl font-bold text-green-600">
                                {(overallStats.avgTopViews / 1000).toFixed(1)}K
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                Average views (n={overallStats.topCount})
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 mb-2">
                                <ArrowRight className="h-4 w-4 text-blue-600" />
                                <span className="text-xs font-semibold text-blue-700 uppercase">Middle Tier</span>
                            </div>
                            <div className="text-2xl font-bold text-blue-600">
                                {(overallStats.avgMiddleViews / 1000).toFixed(1)}K
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                Average views (n={overallStats.middleCount})
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-lg border border-orange-200">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingDown className="h-4 w-4 text-orange-600" />
                                <span className="text-xs font-semibold text-orange-700 uppercase">Low Performers</span>
                            </div>
                            <div className="text-2xl font-bold text-orange-600">
                                {(overallStats.avgLowViews / 1000).toFixed(1)}K
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                Average views (n={overallStats.lowCount})
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-lg border border-purple-200">
                            <div className="flex items-center gap-2 mb-2">
                                <BarChart3 className="h-4 w-4 text-purple-600" />
                                <span className="text-xs font-semibold text-purple-700 uppercase">Performance Gap</span>
                            </div>
                            <div className="text-2xl font-bold text-purple-600">
                                {contrastAnalysis.performanceMultiplier.toFixed(1)}x
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                Top vs low performers
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Key Insights */}
            <Card className="border-blue-200 bg-blue-50/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-blue-600" />
                        Key Insights from Contrast Analysis
                    </CardTitle>
                    <CardDescription>
                        Statistical confidence: <Badge variant="outline" className="ml-2">
                            {contrastAnalysis.statisticalConfidence}
                        </Badge>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {contrastAnalysis.keyInsights.map((insight, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-lg border">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="font-semibold text-foreground mb-1">{insight.insight}</p>
                                    <p className="text-sm text-muted-foreground mb-2">{insight.evidence}</p>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs bg-blue-50">
                                            <ArrowRight className="h-3 w-3 mr-1" />
                                            {insight.actionable}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Anti-Patterns - What to Avoid */}
            {contrastAnalysis.antiPatterns.length > 0 && (
                <Card className="border-orange-200 bg-orange-50/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <XCircle className="h-5 w-5 text-orange-600" />
                            Anti-Patterns: What to Avoid
                        </CardTitle>
                        <CardDescription>
                            Features statistically associated with poor performance
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {contrastAnalysis.antiPatterns.map((antiPattern, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-lg border border-orange-200">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                        <p className="font-semibold text-foreground mb-1">{antiPattern.feature}</p>
                                        <p className="text-sm text-muted-foreground mb-2">{antiPattern.description}</p>
                                        <Badge variant="outline" className="text-xs bg-orange-50">
                                            {antiPattern.avoidanceRecommendation}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Side-by-Side Comparison */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Top Performers */}
                <Card className="border-green-200 bg-green-50/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-700">
                            <TrendingUp className="h-5 w-5" />
                            Top {thresholds.topPercentile}% Performers
                        </CardTitle>
                        <CardDescription>
                            {topTier.k} patterns identified • {topTier.totalAnalyzed} hooks analyzed
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {topTier.clusters.slice(0, 3).map((cluster, idx) => (
                            <ClusterComparisonCard
                                key={cluster.clusterId}
                                cluster={cluster}
                                rank={idx + 1}
                                tier="top"
                            />
                        ))}
                    </CardContent>
                </Card>

                {/* Low Performers */}
                <Card className="border-orange-200 bg-orange-50/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-orange-700">
                            <TrendingDown className="h-5 w-5" />
                            Bottom {thresholds.lowPercentile}% Performers
                        </CardTitle>
                        <CardDescription>
                            {lowTier.k} patterns identified • {lowTier.totalAnalyzed} hooks analyzed
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {lowTier.clusters.slice(0, 3).map((cluster, idx) => (
                            <ClusterComparisonCard
                                key={cluster.clusterId}
                                cluster={cluster}
                                rank={idx + 1}
                                tier="low"
                            />
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* Statistical Differences */}
            {contrastAnalysis.significantDifferences.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-purple-600" />
                            Statistically Significant Differences
                        </CardTitle>
                        <CardDescription>
                            Features with p &lt; 0.05 and medium-to-large effect sizes
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {contrastAnalysis.significantDifferences.slice(0, 10).map((diff, idx) => (
                                <div
                                    key={idx}
                                    className={`p-3 rounded-lg border ${
                                        diff.difference > 0
                                            ? 'bg-green-50 border-green-200'
                                            : 'bg-orange-50 border-orange-200'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <span className="font-medium text-sm">{diff.feature}</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className="text-xs">
                                                    {diff.interpretation} effect
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    d = {diff.effectSize.toFixed(2)}, p = {diff.pValue.toFixed(3)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-lg font-bold ${
                                                diff.difference > 0 ? 'text-green-600' : 'text-orange-600'
                                            }`}>
                                                {diff.difference > 0 ? '+' : ''}{diff.percentChange.toFixed(0)}%
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {diff.highPerformerMean.toFixed(2)} vs {diff.lowPerformerMean.toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function ClusterComparisonCard({
    cluster,
    rank,
    tier
}: {
    cluster: ClusterStats;
    rank: number;
    tier: 'top' | 'low'
}) {
    const primaryType = cluster.topHookTypes[0]?.type || "Mixed";
    const tierColor = tier === 'top' ? 'green' : 'orange';

    return (
        <div className={`bg-white p-4 rounded-lg border border-${tierColor}-200`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                        #{rank}
                    </Badge>
                    <span className="font-semibold text-sm">{primaryType}</span>
                </div>
                <span className="text-xs text-muted-foreground">n={cluster.sampleSize}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div>
                    <div className="text-xs text-muted-foreground">Avg Views</div>
                    <div className="font-bold">{(cluster.avgViewCount / 1000).toFixed(1)}K</div>
                </div>
                <div>
                    <div className="text-xs text-muted-foreground">Engagement</div>
                    <div className="font-bold">{cluster.avgEngagementRate.toFixed(2)}%</div>
                </div>
                <div>
                    <div className="text-xs text-muted-foreground">Hook Score</div>
                    <div className="font-bold">{cluster.avgHookScore.toFixed(1)}</div>
                </div>
                <div>
                    <div className="text-xs text-muted-foreground">Cohesion</div>
                    <div className="font-bold">{(cluster.cohesionScore * 100).toFixed(0)}%</div>
                </div>
            </div>

            {cluster.commonTechniques.length > 0 && (
                <div>
                    <div className="text-xs text-muted-foreground mb-1">Top Technique</div>
                    <Badge variant="outline" className="text-xs">
                        {cluster.commonTechniques[0]!.technique}
                    </Badge>
                </div>
            )}
        </div>
    );
}
