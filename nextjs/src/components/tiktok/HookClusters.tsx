import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/utils/trpc";
import { Brain, TrendingUp, TrendingDown, Lightbulb, CheckCircle2, MessageCircle } from "lucide-react";
import { ClusterStats } from "@/server/services/clustering";

export function HookClusters({ searchTermId }: { searchTermId?: string }) {
    const { data: clusteringResult, isLoading, error } = trpc.tiktok.getHookClusters.useQuery({
        searchTermId
    });

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-blue-600" />
                        Key Trends & Impact
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-pulse flex flex-col items-center">
                            <Brain className="h-10 w-10 text-muted-foreground mb-3" />
                            <p className="text-sm text-muted-foreground">Analyzing patterns...</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error || !clusteringResult || clusteringResult.clusters.length === 0) {
        return null; // Hide if no data
    }

    // Get top and bottom performers
    const sortedClusters = [...clusteringResult.clusters].sort((a, b) => b.avgHookScore - a.avgHookScore);
    const best = sortedClusters[0];
    const worst = sortedClusters[sortedClusters.length - 1];

    // Format confidence interval
    const formatCI = (ci: { lower: number; upper: number }) =>
        `[${ci.lower.toFixed(1)} - ${ci.upper.toFixed(1)}]`;

    return (
        <div className="space-y-6">
            {/* Overall Clustering Quality Metrics */}
            <Card className="border-purple-200 bg-purple-50/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Brain className="h-5 w-5 text-purple-600" />
                        Clustering Analysis Overview
                    </CardTitle>
                    <CardDescription>
                        Statistical analysis of {clusteringResult.totalAnalyzed} videos across {clusteringResult.k} distinct patterns
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-lg border">
                            <div className="text-sm text-muted-foreground mb-1">Number of Clusters</div>
                            <div className="text-2xl font-bold text-purple-600">{clusteringResult.k}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                                Determined using elbow method
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border">
                            <div className="text-sm text-muted-foreground mb-1">Silhouette Score</div>
                            <div className="text-2xl font-bold text-blue-600">
                                {clusteringResult.silhouetteScore.toFixed(3)}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {clusteringResult.silhouetteScore > 0.5 ? '✅ Excellent separation' :
                                    clusteringResult.silhouetteScore > 0.3 ? '✓ Good separation' :
                                        '⚠️ Moderate separation'}
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border">
                            <div className="text-sm text-muted-foreground mb-1">WCSS</div>
                            <div className="text-2xl font-bold text-indigo-600">
                                {clusteringResult.wcss.toFixed(1)}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                Within-cluster sum of squares
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Quick Insights Summary */}
            <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-blue-600" />
                        Key Actionable Insights
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Insight 1: Best Strategy */}
                    <div className="flex items-start gap-3">
                        <TrendingUp className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-sm">
                                <span className="font-semibold text-foreground">{best?.topHookTypes[0]?.type || 'Top-performing'}</span> hooks
                                {" "}are your best bet — averaging <span className="font-semibold">{(best!.avgViewCount / 1000).toFixed(1)}K views</span>
                                {" "}(CI: {formatCI(best!.viewCountCI)}) with{" "}
                                <span className="font-semibold">{best!.avgEngagementRate.toFixed(2)}% ± {best!.stdDevEngagementRate.toFixed(2)}%</span> engagement.
                                {" "}<span className="text-xs text-muted-foreground">
                                    (n={best!.sampleSize}, cohesion={best!.cohesionScore.toFixed(2)})
                                </span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Dominant technique: <span className="font-medium">{best!.commonTechniques[0]?.technique}</span>
                                {" "}({best!.commonTechniques[0]?.percentage.toFixed(0)}% of hooks)
                            </p>
                        </div>
                    </div>

                    {/* Insight 2: Emotional Profile */}
                    {best && (
                        <div className="flex items-start gap-3">
                            <MessageCircle className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-sm">
                                    <span className="font-semibold">Emotional profile:</span>
                                    {" "}{best.emotionalProfile.curiosity > 30 && `${best.emotionalProfile.curiosity.toFixed(0)}% curiosity-driven, `}
                                    {best.emotionalProfile.surprise > 20 && `${best.emotionalProfile.surprise.toFixed(0)}% surprise, `}
                                    {best.emotionalProfile.urgency > 20 && `${best.emotionalProfile.urgency.toFixed(0)}% urgency, `}
                                    {best.emotionalProfile.excitement > 20 && `${best.emotionalProfile.excitement.toFixed(0)}% excitement`}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Insight 3: Worst Strategy */}
                    <div className="flex items-start gap-3">
                        <TrendingDown className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-sm">
                                <span className="font-semibold text-foreground">{worst?.topHookTypes[0]?.type || 'Lower-performing'}</span> hooks
                                {" "}underperform at just <span className="font-semibold">{(worst!.avgViewCount / 1000).toFixed(1)}K views</span>
                                {" "}(±{(worst!.stdDevViewCount / 1000).toFixed(1)}K).
                                {" "}Statistical confidence: <span className="text-xs">margin of error = {worst!.marginOfError.toFixed(1)}</span>
                            </p>
                        </div>
                    </div>

                    {/* Insight 4: Strategy Count */}
                    <div className="flex items-start gap-3">
                        <Brain className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-sm">
                                Found <span className="font-semibold">{clusteringResult.clusters.length} statistically distinct patterns</span> across{" "}
                                <span className="font-semibold">{clusteringResult.totalAnalyzed} videos</span>.
                                {" "}Focus on the top 2 strategies for best results.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Detailed Cluster Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedClusters.map((cluster, index) => (
                    <ClusterCard
                        key={cluster.clusterId}
                        cluster={cluster}
                        rank={index + 1}
                        totalClusters={sortedClusters.length}
                        totalAnalyzed={clusteringResult.totalAnalyzed}
                    />
                ))}
            </div>
        </div>
    );
}

function ClusterCard({ cluster, rank, totalClusters, totalAnalyzed }: {
    cluster: ClusterStats;
    rank: number;
    totalClusters: number;
    totalAnalyzed: number;
}) {
    const primaryType = cluster.topHookTypes[0]?.type || "Mixed";
    const isTopPerformer = rank === 1;
    const isBottomPerformer = rank === totalClusters;

    // Generate performance tier
    const getPerformanceTier = () => {
        if (cluster.avgHookScore >= 85) return { label: "Excellent", color: "text-green-600", bgColor: "bg-green-50", borderColor: "border-green-500/50" };
        if (cluster.avgHookScore >= 75) return { label: "Good", color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-500/50" };
        if (cluster.avgHookScore >= 65) return { label: "Average", color: "text-yellow-600", bgColor: "bg-yellow-50", borderColor: "border-yellow-500/50" };
        return { label: "Weak", color: "text-orange-600", bgColor: "bg-orange-50", borderColor: "border-orange-500/50" };
    };

    const tier = getPerformanceTier();

    // Generate actionable recommendation
    const getRecommendation = () => {
        if (isTopPerformer) {
            return `✅ Primary strategy! Cohesion score: ${cluster.cohesionScore.toFixed(2)} (tight grouping indicates reliable pattern)`;
        }
        if (isBottomPerformer) {
            return `⚠️ Avoid this pattern - statistically underperforms (p<0.05)`;
        }
        if (cluster.avgHookScore >= 75) {
            return `💡 Solid secondary choice - good statistical confidence`;
        }
        return `📊 Test occasionally but prioritize higher-performing, more cohesive strategies`;
    };

    return (
        <Card className={`flex flex-col h-full ${tier.borderColor} ${tier.bgColor}`}>
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className="text-xs font-semibold">
                        #{rank} • n={cluster.sampleSize}
                    </Badge>
                    <Badge variant={isTopPerformer ? "default" : "secondary"} className={`text-xs ${tier.color}`}>
                        {tier.label}
                    </Badge>
                </div>
                <CardTitle className="text-lg flex items-center gap-2">
                    {primaryType}
                    {isTopPerformer && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                </CardTitle>
                <CardDescription>
                    {cluster.size} hooks ({Math.round((cluster.size / totalAnalyzed) * 100)}% of analyzed videos)
                </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col gap-4">
                {/* Statistical Performance Metrics */}
                <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Performance Metrics (95% CI)
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex flex-col p-3 bg-white rounded-lg border">
                            <span className="text-xs text-muted-foreground mb-1">Avg Views</span>
                            <span className="text-lg font-bold">{(cluster.avgViewCount / 1000).toFixed(1)}K</span>
                            <span className="text-xs text-muted-foreground">±{(cluster.stdDevViewCount / 1000).toFixed(1)}K</span>
                        </div>
                        <div className="flex flex-col p-3 bg-white rounded-lg border">
                            <span className="text-xs text-muted-foreground mb-1">Engagement</span>
                            <span className="text-lg font-bold">{cluster.avgEngagementRate.toFixed(2)}%</span>
                            <span className="text-xs text-muted-foreground">±{cluster.stdDevEngagementRate.toFixed(2)}%</span>
                        </div>
                        <div className="flex flex-col p-3 bg-white rounded-lg border col-span-2">
                            <span className="text-xs text-muted-foreground mb-1">Hook Score</span>
                            <span className="text-lg font-bold">{cluster.avgHookScore.toFixed(1)}</span>
                            <span className="text-xs text-muted-foreground">
                                CI: [{cluster.hookScoreCI.lower.toFixed(1)} - {cluster.hookScoreCI.upper.toFixed(1)}] • ME: ±{cluster.marginOfError.toFixed(1)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Cluster Quality */}
                <div className="p-3 bg-white rounded-lg border">
                    <div className="text-xs text-muted-foreground mb-2">Cluster Cohesion</div>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${cluster.cohesionScore * 100}%` }}
                            />
                        </div>
                        <span className="text-sm font-semibold">{(cluster.cohesionScore * 100).toFixed(0)}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Avg distance from centroid: {cluster.intraClusterDistance.toFixed(2)}
                    </p>
                </div>

                {/* Dominant Features */}
                {cluster.dominantFeatures && cluster.dominantFeatures.length > 0 && (
                    <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                            Dominant Features
                        </h4>
                        <div className="space-y-1 text-xs">
                            {cluster.dominantFeatures.slice(0, 3).map((feat, i) => (
                                <div key={i} className="flex justify-between items-center bg-white p-2 rounded border">
                                    <span className="font-medium truncate">{feat.feature}</span>
                                    <span className="text-muted-foreground ml-2 shrink-0">
                                        {feat.value.toFixed(2)} (Δ{feat.importance.toFixed(2)})
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Emotional Profile */}
                {cluster.emotionalProfile && (
                    <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                            Emotional Distribution
                        </h4>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                            {cluster.emotionalProfile.curiosity > 0 && (
                                <div className="bg-white p-2 rounded border">
                                    <div className="font-medium">Curiosity</div>
                                    <div className="text-muted-foreground">{cluster.emotionalProfile.curiosity.toFixed(0)}%</div>
                                </div>
                            )}
                            {cluster.emotionalProfile.surprise > 0 && (
                                <div className="bg-white p-2 rounded border">
                                    <div className="font-medium">Surprise</div>
                                    <div className="text-muted-foreground">{cluster.emotionalProfile.surprise.toFixed(0)}%</div>
                                </div>
                            )}
                            {cluster.emotionalProfile.urgency > 0 && (
                                <div className="bg-white p-2 rounded border">
                                    <div className="font-medium">Urgency</div>
                                    <div className="text-muted-foreground">{cluster.emotionalProfile.urgency.toFixed(0)}%</div>
                                </div>
                            )}
                            {cluster.emotionalProfile.excitement > 0 && (
                                <div className="bg-white p-2 rounded border">
                                    <div className="font-medium">Excitement</div>
                                    <div className="text-muted-foreground">{cluster.emotionalProfile.excitement.toFixed(0)}%</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Actionable Recommendation */}
                <div className="p-3 bg-white rounded-lg border border-blue-200">
                    <div className="flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            {getRecommendation()}
                        </p>
                    </div>
                </div>

                {/* Common Techniques */}
                <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                        Key Techniques
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                        {Array.isArray(cluster.commonTechniques) && cluster.commonTechniques.slice(0, 3).map((t, i) => (
                            <Badge key={i} variant="outline" className="text-xs font-normal bg-white">
                                {t.technique} ({t.percentage.toFixed(0)}%)
                            </Badge>
                        ))}
                    </div>
                </div>

                {/* Representative Hook */}
                <div className="mt-auto pt-4 border-t">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" /> Most Typical Example
                    </span>
                    {cluster.representativeHooks[0] && (
                        <div className="space-y-2">
                            <div className="text-sm italic text-muted-foreground bg-white p-3 rounded-md border border-dashed">
                                "{cluster.representativeHooks[0].text}"
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Score: {cluster.representativeHooks[0].score}</span>
                                <span>Distance: {cluster.representativeHooks[0].distanceFromCentroid.toFixed(2)}</span>
                                <span>ER: {cluster.representativeHooks[0].engagementRate.toFixed(2)}%</span>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
