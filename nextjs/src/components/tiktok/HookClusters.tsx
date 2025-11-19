import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/utils/trpc";
import { Brain, TrendingUp, Users, Zap, Target, MessageCircle } from "lucide-react";
import { useState } from "react";
import { ClusterStats } from "@/server/services/clustering";

export function HookClusters() {
    const [k, setK] = useState<number | undefined>(undefined);

    const { data: clusteringResult, isLoading, error } = trpc.tiktok.getHookClusters.useQuery({ k });

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Hook Clusters</CardTitle>
                    <CardDescription>Analyzing hook patterns...</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-pulse flex flex-col items-center">
                            <Brain className="h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">Grouping hooks by semantic similarity...</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Hook Clusters</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-red-500">
                        <p>Failed to load clusters: {error.message}</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Try analyzing more videos to generate enough data for clustering.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!clusteringResult || clusteringResult.clusters.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Hook Clusters</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        No clusters found. You need at least 5 analyzed videos to perform clustering.
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Hook Strategy Clusters</h2>
                    <p className="text-muted-foreground">
                        AI-identified groups of hook strategies based on {clusteringResult.totalAnalyzed} analyzed videos.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Clusters (K):</span>
                    <div className="flex gap-1">
                        {[3, 4, 5, 6].map((val) => (
                            <Button
                                key={val}
                                variant={k === val || (!k && val === clusteringResult.k) ? "default" : "outline"}
                                size="sm"
                                onClick={() => setK(val)}
                                className="w-8 h-8 p-0"
                            >
                                {val}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {clusteringResult.clusters.map((cluster) => (
                    <ClusterCard key={cluster.clusterId} cluster={cluster} />
                ))}
            </div>
        </div>
    );
}

function ClusterCard({ cluster }: { cluster: ClusterStats }) {
    // Determine cluster personality based on top hook types and score
    const primaryType = cluster.topHookTypes[0]?.type || "Mixed";
    const isHighPerforming = cluster.avgHookScore > 80;

    return (
        <Card className={`flex flex-col h-full ${isHighPerforming ? 'border-green-500/50 bg-green-50/10' : ''}`}>
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            {primaryType} Strategy
                            {isHighPerforming && <Zap className="h-4 w-4 text-green-500 fill-green-500" />}
                        </CardTitle>
                        <CardDescription>
                            {cluster.size} hooks ({Math.round(cluster.size)}%)
                        </CardDescription>
                    </div>
                    <Badge variant={isHighPerforming ? "default" : "secondary"} className="text-xs">
                        Score: {cluster.avgHookScore.toFixed(1)}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col gap-4">
                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex flex-col p-2 bg-muted/50 rounded-md">
                        <span className="text-xs text-muted-foreground">Avg Views</span>
                        <span className="font-semibold">{(cluster.avgViewCount / 1000).toFixed(1)}K</span>
                    </div>
                    <div className="flex flex-col p-2 bg-muted/50 rounded-md">
                        <span className="text-xs text-muted-foreground">Engagement</span>
                        <span className="font-semibold">{cluster.avgEngagementRate.toFixed(2)}%</span>
                    </div>
                </div>

                {/* Common Techniques */}
                <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                        Common Techniques
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                        {cluster.commonTechniques.slice(0, 3).map((t, i) => (
                            <Badge key={i} variant="outline" className="text-xs font-normal">
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
                        <div className="text-sm italic text-muted-foreground bg-muted/30 p-3 rounded-md border border-dashed">
                            "{cluster.representativeHooks[0].text}"
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
