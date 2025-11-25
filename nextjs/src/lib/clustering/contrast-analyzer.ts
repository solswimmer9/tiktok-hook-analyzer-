/**
 * Contrast Analyzer - Statistical comparison between high and low performing hooks
 *
 * Identifies what differentiates successful hooks from unsuccessful ones
 * using statistical significance testing and effect size calculations
 */

import { ClusterStats } from "@/server/services/clustering";

export interface FeatureContrast {
    feature: string;
    highPerformerMean: number;
    lowPerformerMean: number;
    difference: number;
    percentChange: number;
    tStatistic: number;
    pValue: number;
    isSignificant: boolean; // p < 0.05
    effectSize: number; // Cohen's d
    interpretation: 'negligible' | 'small' | 'medium' | 'large';
}

export interface ContrastAnalysisResult {
    significantDifferences: FeatureContrast[];
    antiPatterns: {
        feature: string;
        description: string;
        avoidanceRecommendation: string;
    }[];
    keyInsights: {
        insight: string;
        evidence: string;
        actionable: string;
    }[];
    performanceMultiplier: number; // How much better top performers are
    statisticalConfidence: 'high' | 'moderate' | 'low';
}

/**
 * Contrast Analyzer class for comparing high vs low performers
 */
export class ContrastAnalyzer {
    /**
     * Perform t-test to check if two means are significantly different
     */
    private static tTest(
        group1Values: number[],
        group2Values: number[],
        mean1: number,
        mean2: number
    ): { tStatistic: number; pValue: number; isSignificant: boolean } {
        const n1 = group1Values.length;
        const n2 = group2Values.length;

        if (n1 < 2 || n2 < 2) {
            return { tStatistic: 0, pValue: 1, isSignificant: false };
        }

        // Calculate variances
        const variance1 = group1Values.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0) / (n1 - 1);
        const variance2 = group2Values.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0) / (n2 - 1);

        // Pooled standard deviation
        const pooledStdDev = Math.sqrt(((n1 - 1) * variance1 + (n2 - 1) * variance2) / (n1 + n2 - 2));

        // t-statistic
        const tStatistic = (mean1 - mean2) / (pooledStdDev * Math.sqrt(1 / n1 + 1 / n2));

        // Degrees of freedom
        const df = n1 + n2 - 2;

        // Approximate p-value using t-distribution (simplified)
        // For a more accurate p-value, you'd use a proper t-distribution library
        const pValue = this.approximatePValue(Math.abs(tStatistic), df);

        return {
            tStatistic,
            pValue,
            isSignificant: pValue < 0.05
        };
    }

    /**
     * Approximate p-value for t-test (two-tailed)
     * This is a simplified approximation - for production, use a stats library
     */
    private static approximatePValue(t: number, df: number): number {
        // Very rough approximation using normal distribution for large df
        if (df > 30) {
            // Use standard normal approximation
            const z = t;
            // Approximate p-value for two-tailed test
            if (z > 6) return 0.00001;
            if (z > 4) return 0.0001;
            if (z > 3) return 0.003;
            if (z > 2.576) return 0.01;
            if (z > 1.96) return 0.05;
            if (z > 1.645) return 0.1;
            return 0.2;
        }

        // For smaller samples, be more conservative
        if (t > 4) return 0.001;
        if (t > 3) return 0.01;
        if (t > 2) return 0.05;
        if (t > 1.5) return 0.1;
        return 0.3;
    }

    /**
     * Calculate Cohen's d effect size
     */
    private static calculateEffectSize(
        mean1: number,
        mean2: number,
        group1Values: number[],
        group2Values: number[]
    ): number {
        const n1 = group1Values.length;
        const n2 = group2Values.length;

        if (n1 < 2 || n2 < 2) return 0;

        // Calculate standard deviations
        const variance1 = group1Values.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0) / (n1 - 1);
        const variance2 = group2Values.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0) / (n2 - 1);

        const pooledStdDev = Math.sqrt(((n1 - 1) * variance1 + (n2 - 1) * variance2) / (n1 + n2 - 2));

        if (pooledStdDev === 0) return 0;

        return (mean1 - mean2) / pooledStdDev;
    }

    /**
     * Interpret Cohen's d effect size
     */
    private static interpretEffectSize(d: number): 'negligible' | 'small' | 'medium' | 'large' {
        const absd = Math.abs(d);
        if (absd < 0.2) return 'negligible';
        if (absd < 0.5) return 'small';
        if (absd < 0.8) return 'medium';
        return 'large';
    }

    /**
     * Analyze contrasts between high and low performing clusters
     */
    static analyzeContrasts(
        topPerformers: ClusterStats[],
        lowPerformers: ClusterStats[]
    ): ContrastAnalysisResult {
        if (topPerformers.length === 0 || lowPerformers.length === 0) {
            return {
                significantDifferences: [],
                antiPatterns: [],
                keyInsights: [],
                performanceMultiplier: 1,
                statisticalConfidence: 'low'
            };
        }

        // Aggregate stats from all top and low performers
        const topAvgViews = topPerformers.reduce((sum, c) => sum + c.avgViewCount, 0) / topPerformers.length;
        const lowAvgViews = lowPerformers.reduce((sum, c) => sum + c.avgViewCount, 0) / lowPerformers.length;
        const performanceMultiplier = lowAvgViews > 0 ? topAvgViews / lowAvgViews : 1;

        // Feature-level comparison
        const featureContrasts: FeatureContrast[] = [];

        // Compare centroids (dominant features)
        const allFeatureNames = new Set<string>();
        topPerformers.forEach(c => c.dominantFeatures.forEach(f => allFeatureNames.add(f.feature)));
        lowPerformers.forEach(c => c.dominantFeatures.forEach(f => allFeatureNames.add(f.feature)));

        Array.from(allFeatureNames).forEach(featureName => {
            // Get feature values from centroids
            const topValues: number[] = [];
            const lowValues: number[] = [];

            topPerformers.forEach(cluster => {
                const feat = cluster.dominantFeatures.find(f => f.feature === featureName);
                if (feat) topValues.push(feat.value);
            });

            lowPerformers.forEach(cluster => {
                const feat = cluster.dominantFeatures.find(f => f.feature === featureName);
                if (feat) lowValues.push(feat.value);
            });

            if (topValues.length === 0 || lowValues.length === 0) return;

            const topMean = topValues.reduce((sum, v) => sum + v, 0) / topValues.length;
            const lowMean = lowValues.reduce((sum, v) => sum + v, 0) / lowValues.length;
            const difference = topMean - lowMean;
            const percentChange = lowMean !== 0 ? ((topMean - lowMean) / Math.abs(lowMean)) * 100 : 0;

            const { tStatistic, pValue, isSignificant } = this.tTest(topValues, lowValues, topMean, lowMean);
            const effectSize = this.calculateEffectSize(topMean, lowMean, topValues, lowValues);
            const interpretation = this.interpretEffectSize(effectSize);

            featureContrasts.push({
                feature: featureName,
                highPerformerMean: topMean,
                lowPerformerMean: lowMean,
                difference,
                percentChange,
                tStatistic,
                pValue,
                isSignificant,
                effectSize,
                interpretation
            });
        });

        // Sort by statistical significance and effect size
        const significantDifferences = featureContrasts
            .filter(fc => fc.isSignificant && fc.interpretation !== 'negligible')
            .sort((a, b) => {
                // Prioritize larger effect sizes
                const effectSizeScore = Math.abs(b.effectSize) - Math.abs(a.effectSize);
                if (Math.abs(effectSizeScore) > 0.1) return effectSizeScore > 0 ? 1 : -1;
                // Then by p-value
                return a.pValue - b.pValue;
            });

        // Identify anti-patterns (features negatively correlated with performance)
        const antiPatterns = significantDifferences
            .filter(fc => fc.difference < 0 && Math.abs(fc.effectSize) > 0.3)
            .map(fc => ({
                feature: fc.feature,
                description: `Low performers have ${Math.abs(fc.percentChange).toFixed(1)}% more ${fc.feature}`,
                avoidanceRecommendation: this.generateAvoidanceRecommendation(fc)
            }));

        // Generate key insights
        const keyInsights = this.generateKeyInsights(
            significantDifferences,
            topPerformers,
            lowPerformers,
            performanceMultiplier
        );

        // Determine statistical confidence
        const totalSampleSize = topPerformers.reduce((sum, c) => sum + c.sampleSize, 0) +
            lowPerformers.reduce((sum, c) => sum + c.sampleSize, 0);
        const avgEffectSize = significantDifferences.length > 0
            ? significantDifferences.reduce((sum, fc) => sum + Math.abs(fc.effectSize), 0) / significantDifferences.length
            : 0;

        let statisticalConfidence: 'high' | 'moderate' | 'low' = 'low';
        if (totalSampleSize > 50 && avgEffectSize > 0.5) {
            statisticalConfidence = 'high';
        } else if (totalSampleSize > 20 && avgEffectSize > 0.3) {
            statisticalConfidence = 'moderate';
        }

        return {
            significantDifferences,
            antiPatterns,
            keyInsights,
            performanceMultiplier,
            statisticalConfidence
        };
    }

    /**
     * Generate avoidance recommendation for anti-patterns
     */
    private static generateAvoidanceRecommendation(contrast: FeatureContrast): string {
        const featureName = contrast.feature;

        if (featureName.includes('emotion')) {
            return `Reduce reliance on ${featureName.replace('emotion', '')} emotion in your hooks`;
        } else if (featureName.includes('hookType')) {
            return `Avoid using ${featureName.replace('hookType', '')} type hooks as primary strategy`;
        } else if (featureName.includes('Count')) {
            return `Reduce the number of ${featureName.replace('Count', '')} elements`;
        } else {
            return `Minimize ${featureName} in your hooks`;
        }
    }

    /**
     * Generate actionable insights from contrast analysis
     */
    private static generateKeyInsights(
        significantDifferences: FeatureContrast[],
        topPerformers: ClusterStats[],
        lowPerformers: ClusterStats[],
        performanceMultiplier: number
    ): Array<{ insight: string; evidence: string; actionable: string }> {
        const insights: Array<{ insight: string; evidence: string; actionable: string }> = [];

        // Insight 1: Overall performance difference
        insights.push({
            insight: `Top performers get ${performanceMultiplier.toFixed(1)}x more views than low performers`,
            evidence: `Average views: ${topPerformers[0]?.avgViewCount.toFixed(0) || 0} vs ${lowPerformers[0]?.avgViewCount.toFixed(0) || 0}`,
            actionable: 'Focus on replicating patterns from top-performing clusters'
        });

        // Insight 2: Most impactful positive features
        const topPositiveFeatures = significantDifferences
            .filter(fc => fc.difference > 0)
            .slice(0, 3);

        if (topPositiveFeatures.length > 0) {
            const feat = topPositiveFeatures[0]!;
            insights.push({
                insight: `${feat.feature} is a key success factor`,
                evidence: `${Math.abs(feat.percentChange).toFixed(1)}% higher in top performers (p=${feat.pValue.toFixed(3)}, d=${feat.effectSize.toFixed(2)})`,
                actionable: `Increase ${feat.feature} in your hooks to match top performers`
            });
        }

        // Insight 3: Hook type differences
        const topHookTypes = topPerformers[0]?.topHookTypes || [];
        const lowHookTypes = lowPerformers[0]?.topHookTypes || [];

        if (topHookTypes.length > 0 && lowHookTypes.length > 0) {
            insights.push({
                insight: `Hook type matters: "${topHookTypes[0]!.type}" outperforms "${lowHookTypes[0]!.type}"`,
                evidence: `${topHookTypes[0]!.percentage.toFixed(0)}% of top performers use ${topHookTypes[0]!.type} hooks`,
                actionable: `Shift from ${lowHookTypes[0]!.type} to ${topHookTypes[0]!.type} hook strategies`
            });
        }

        // Insight 4: Engagement rate differences
        const topEngagement = topPerformers[0]?.avgEngagementRate || 0;
        const lowEngagement = lowPerformers[0]?.avgEngagementRate || 0;
        const engagementDiff = ((topEngagement - lowEngagement) / lowEngagement) * 100;

        if (Math.abs(engagementDiff) > 20) {
            insights.push({
                insight: `Engagement rate is ${Math.abs(engagementDiff).toFixed(0)}% ${engagementDiff > 0 ? 'higher' : 'lower'} in top performers`,
                evidence: `${topEngagement.toFixed(2)}% vs ${lowEngagement.toFixed(2)}% engagement rate`,
                actionable: 'Focus on hooks that drive not just views, but active engagement (likes, comments, shares)'
            });
        }

        // Insight 5: Technique complexity
        const topTechniques = topPerformers[0]?.commonTechniques || [];
        const lowTechniques = lowPerformers[0]?.commonTechniques || [];

        if (topTechniques.length > 0 && lowTechniques.length > 0) {
            insights.push({
                insight: `Top performers favor "${topTechniques[0]!.technique}" technique`,
                evidence: `Used in ${topTechniques[0]!.percentage.toFixed(0)}% of top-performing hooks`,
                actionable: `Incorporate ${topTechniques[0]!.technique} into your hook creation strategy`
            });
        }

        return insights;
    }
}
