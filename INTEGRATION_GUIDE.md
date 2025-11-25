# Integration Guide: Adding Performance Analysis to Your Pages

## Quick Start

### Option 1: Add to Existing Dashboard Page

If you want to add the new performance analysis to an existing page (e.g., the main TikTok dashboard), simply import and use the component:

```tsx
// Example: nextjs/src/pages/dashboard/tiktok/index.tsx
import { HookPerformanceAnalysis } from "@/components/tiktok/HookPerformanceAnalysis";
import { HookClusters } from "@/components/tiktok/HookClusters";

export default function TikTokDashboard() {
  const [selectedSearchTerm, setSelectedSearchTerm] = useState<string>();

  return (
    <div className="space-y-6">
      {/* Your existing content */}

      {/* NEW: Performance Analysis Section */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Performance Analysis</h2>
        <HookPerformanceAnalysis searchTermId={selectedSearchTerm} />
      </section>

      {/* Original Clustering (now with warnings) */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Hook Patterns</h2>
        <HookClusters searchTermId={selectedSearchTerm} />
      </section>
    </div>
  );
}
```

### Option 2: Create a New Dedicated Page

Create a new page specifically for performance analysis:

```tsx
// Example: nextjs/src/pages/dashboard/tiktok/performance.tsx
import { useState } from "react";
import { HookPerformanceAnalysis } from "@/components/tiktok/HookPerformanceAnalysis";
import { Card } from "@/components/ui/card";
import { trpc } from "@/utils/trpc";

export default function PerformanceAnalysisPage() {
  const [selectedSearchTerm, setSelectedSearchTerm] = useState<string>();
  const { data: searchTerms } = trpc.tiktok.getSearchTerms.useQuery();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Hook Performance Analysis</h1>
        <p className="text-muted-foreground mt-2">
          Compare your best and worst performing hooks to identify winning patterns and avoid pitfalls
        </p>
      </div>

      {/* Search Term Filter */}
      {searchTerms && searchTerms.length > 0 && (
        <Card className="p-4">
          <label className="text-sm font-medium mb-2 block">
            Filter by Search Term (optional)
          </label>
          <select
            className="w-full p-2 border rounded"
            onChange={(e) => setSelectedSearchTerm(e.target.value || undefined)}
            value={selectedSearchTerm || ""}
          >
            <option value="">All Search Terms</option>
            {searchTerms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.term}
              </option>
            ))}
          </select>
        </Card>
      )}

      {/* Performance Analysis */}
      <HookPerformanceAnalysis searchTermId={selectedSearchTerm} />
    </div>
  );
}
```

### Option 3: Add to Navigation

Update your navigation to include a link to the new analysis:

```tsx
// Example: nextjs/src/components/layout/DashboardLayout.tsx (or wherever your nav is)
const navItems = [
  { name: "Overview", path: "/dashboard/tiktok" },
  { name: "Videos", path: "/dashboard/tiktok/videos" },
  { name: "Analysis", path: "/dashboard/tiktok/analysis" },
  { name: "Performance", path: "/dashboard/tiktok/performance" }, // NEW!
  { name: "Trends", path: "/dashboard/tiktok/trends" },
];
```

## Component Props

### HookPerformanceAnalysis

```typescript
interface HookPerformanceAnalysisProps {
  searchTermId?: string; // Optional: filter by specific search term
}
```

**Usage**:
```tsx
// All search terms
<HookPerformanceAnalysis />

// Specific search term
<HookPerformanceAnalysis searchTermId="abc-123" />
```

### HookClusters (Enhanced)

```typescript
interface HookClustersProps {
  searchTermId?: string; // Optional: filter by specific search term
}
```

**What Changed**: The component now automatically shows warning sections for low-performing patterns. No prop changes needed.

## API Endpoints

### New: getSegmentedClusters

```typescript
// TRPC query
const { data, isLoading, error } = trpc.tiktok.getSegmentedClusters.useQuery({
  searchTermId: "optional-id",
  topPercentile: 75,    // default: 75 (top 25% of performers)
  lowPercentile: 25     // default: 25 (bottom 25% of performers)
});

// Response type
type SegmentedClusteringResult = {
  topTier: ClusteringResult;      // Top 25% performers
  middleTier: ClusteringResult;   // Middle 50%
  lowTier: ClusteringResult;      // Bottom 25%
  thresholds: {
    topPercentile: number;
    lowPercentile: number;
    topViewCount: number;
    lowViewCount: number;
  };
  overallStats: {
    totalAnalyzed: number;
    topCount: number;
    middleCount: number;
    lowCount: number;
    avgTopViews: number;
    avgMiddleViews: number;
    avgLowViews: number;
  };
};
```

### Existing: getHookClusters

```typescript
// Still works exactly the same!
const { data } = trpc.tiktok.getHookClusters.useQuery({
  searchTermId: "optional-id",
  k: 5 // optional: number of clusters
});
```

## Styling & Theming

Both components use your existing UI component library:
- `@/components/ui/card`
- `@/components/ui/badge`
- Lucide icons
- Tailwind CSS classes

**Color Coding**:
- 🟢 Green = Top performers, success, "do this"
- 🟠 Orange = Low performers, warnings, "avoid this"
- 🔵 Blue = Insights, information
- 🟣 Purple = Statistical/analytical info

## Performance Considerations

### Data Requirements

- **Minimum for segmented clustering**: 10 hooks
- **Recommended for reliable insights**: 30+ hooks
- **Each tier needs**: ≥5 hooks for clustering

### Loading States

Both components handle loading states automatically:

```tsx
<HookPerformanceAnalysis searchTermId={id} />
// Shows:
// 1. Loading spinner while fetching
// 2. Error message if insufficient data
// 3. Full analysis when data is ready
```

### Error Handling

The components gracefully handle:
- Insufficient data (shows friendly message)
- Network errors (shows error state)
- Empty tiers (skips comparison for that tier)

## Customization

### Adjust Percentile Thresholds

```tsx
// More exclusive top tier (top 10%)
const { data } = trpc.tiktok.getSegmentedClusters.useQuery({
  topPercentile: 90,
  lowPercentile: 25
});

// More exclusive bottom tier (bottom 10%)
const { data } = trpc.tiktok.getSegmentedClusters.useQuery({
  topPercentile: 75,
  lowPercentile: 10
});
```

### Use ContrastAnalyzer Directly

```typescript
import { ContrastAnalyzer } from "@/lib/clustering/contrast-analyzer";

// Get segmented data
const { data } = trpc.tiktok.getSegmentedClusters.useQuery({});

// Run custom analysis
const analysis = ContrastAnalyzer.analyzeContrasts(
  data.topTier.clusters,
  data.lowTier.clusters
);

// Use the results
console.log(analysis.performanceMultiplier);
console.log(analysis.antiPatterns);
console.log(analysis.keyInsights);
```

## Examples by Use Case

### Use Case 1: Niche-Specific Analysis

```tsx
function NichePerformance({ niche }: { niche: string }) {
  // Get search term ID for this niche
  const { data: searchTerms } = trpc.tiktok.getSearchTerms.useQuery();
  const searchTerm = searchTerms?.find(t => t.term === niche);

  if (!searchTerm) return <div>Niche not found</div>;

  return (
    <div>
      <h2>{niche} Performance Analysis</h2>
      <HookPerformanceAnalysis searchTermId={searchTerm.id} />
    </div>
  );
}
```

### Use Case 2: Comparison View

```tsx
function CompareNiches() {
  const { data: searchTerms } = trpc.tiktok.getSearchTerms.useQuery();

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {searchTerms?.map(term => (
        <div key={term.id}>
          <h3 className="text-xl font-bold mb-4">{term.term}</h3>
          <HookPerformanceAnalysis searchTermId={term.id} />
        </div>
      ))}
    </div>
  );
}
```

### Use Case 3: Dashboard Widget

```tsx
function DashboardOverview() {
  return (
    <div className="space-y-6">
      {/* Quick stats */}
      <QuickStatsCards />

      {/* Performance analysis summary */}
      <HookPerformanceAnalysis />

      {/* Other widgets */}
      <RecentVideos />
      <TrendAnalysis />
    </div>
  );
}
```

## Testing

### Manual Testing Checklist

- [ ] Load page with sufficient data (10+ hooks)
- [ ] Verify top/middle/low tiers populate
- [ ] Check performance multiplier displays correctly
- [ ] Confirm insights are relevant and actionable
- [ ] Test with single search term filter
- [ ] Test with "All search terms" (no filter)
- [ ] Verify responsive layout on mobile
- [ ] Check loading states
- [ ] Verify error states with insufficient data

### Testing with Different Data Sizes

```tsx
// Create a test helper
function TestPerformanceAnalysis() {
  const [minHooks, setMinHooks] = useState(10);

  return (
    <div>
      <input
        type="number"
        value={minHooks}
        onChange={(e) => setMinHooks(Number(e.target.value))}
      />
      <p>Testing with minimum {minHooks} hooks</p>
      {/* Component will show different behavior based on data */}
      <HookPerformanceAnalysis />
    </div>
  );
}
```

## Troubleshooting

### "Not enough data for segmented clustering"

**Cause**: Less than 10 hooks analyzed
**Solution**: Analyze more videos or adjust the error message threshold

### "Not enough data in all performance tiers"

**Cause**: One or more tiers has < 5 hooks
**Solution**:
- Add more hooks
- Adjust percentile thresholds to create larger tiers

### Component shows loading forever

**Cause**: TRPC query might be failing
**Solution**: Check browser console for errors, verify API endpoint is working

### Statistical values look wrong

**Cause**: Edge cases in calculation (e.g., division by zero)
**Solution**: Check the contrast analyzer calculations, add more defensive null checks

## Next Steps

After integrating the basic components, consider:

1. **Add navigation**: Make it easy to find the new analysis
2. **User onboarding**: Add tooltips explaining statistical terms
3. **Export functionality**: Let users download insights as PDF
4. **Alerts**: Notify users when they use anti-patterns
5. **Historical tracking**: Compare performance over time

## Support

For questions or issues:
- Check `IMPLEMENTATION_SUMMARY.md` for technical details
- Review component source code for inline documentation
- Test with sample data to verify behavior
