import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/utils/trpc";
import { Brain, TrendingUp, TrendingDown, Lightbulb } from "lucide-react";

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

    return (
        <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-blue-600" />
                    Key Trends & Impact
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Insight 1: Best Strategy */}
                <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-sm">
                            <span className="font-semibold text-foreground">{best?.topHookTypes[0]?.type || 'Top-performing'}</span> hooks
                            {" "}are your best bet — averaging <span className="font-semibold">{(best!.avgViewCount / 1000).toFixed(1)}K views</span> with{" "}
                            <span className="font-semibold">{best!.avgEngagementRate.toFixed(1)}% engagement</span>.
                            {best!.commonTechniques[0] && (
                                <> Key technique: <span className="font-semibold">{best!.commonTechniques[0].technique}</span>.</>
                            )}
                        </p>
                    </div>
                </div>

                {/* Insight 2: Worst Strategy */}
                <div className="flex items-start gap-3">
                    <TrendingDown className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-sm">
                            <span className="font-semibold text-foreground">{worst?.topHookTypes[0]?.type || 'Lower-performing'}</span> hooks
                            {" "}underperform at just <span className="font-semibold">{(worst!.avgViewCount / 1000).toFixed(1)}K views</span> average.
                            {" "}Avoid this style and double down on what works.
                        </p>
                    </div>
                </div>

                {/* Insight 3: Strategy Count */}
                <div className="flex items-start gap-3">
                    <Brain className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-sm">
                            Found <span className="font-semibold">{clusteringResult.clusters.length} distinct patterns</span> across{" "}
                            <span className="font-semibold">{clusteringResult.totalAnalyzed} videos</span>.
                            {" "}Focus on the top 2 strategies for best results.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
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
            return `✅ Use this strategy! It's your best performer with ${cluster.avgEngagementRate.toFixed(1)}% engagement.`;
        }
        if (isBottomPerformer) {
            return `⚠️ Avoid this pattern - it underperforms compared to other strategies.`;
        }
        if (cluster.avgHookScore >= 75) {
            return `💡 Solid choice - good fallback when your top strategy doesn't fit.`;
        }
        return `📊 Test occasionally but prioritize higher-performing strategies.`;
    };

    return (
        <Card className={`flex flex-col h-full ${tier.borderColor} ${tier.bgColor}`}>
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className="text-xs font-semibold">
                        #{rank} Performance Rank
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
                {/* Performance Metrics - More Prominent */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex flex-col p-3 bg-white rounded-lg border">
                        <span className="text-xs text-muted-foreground mb-1">Avg Views</span>
                        <span className="text-xl font-bold">{(cluster.avgViewCount / 1000).toFixed(1)}K</span>
                    </div>
                    <div className="flex flex-col p-3 bg-white rounded-lg border">
                        <span className="text-xs text-muted-foreground mb-1">Engagement</span>
                        <span className="text-xl font-bold">{cluster.avgEngagementRate.toFixed(2)}%</span>
                    </div>
                </div>

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
                        {cluster.commonTechniques.slice(0, 4).map((t, i) => (
                            <Badge key={i} variant="outline" className="text-xs font-normal bg-white">
                                {t.technique}
                            </Badge>
                        ))}
                    </div>
                </div>

                {/* Representative Hook */}
                <div className="mt-auto pt-4 border-t">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" /> Example Hook
                    </span>
                    {cluster.representativeHooks[0] && (
                        <div className="text-sm italic text-muted-foreground bg-white p-3 rounded-md border border-dashed">
                            "{cluster.representativeHooks[0].text}"
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
