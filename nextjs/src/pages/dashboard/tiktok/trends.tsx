import DashboardLayout from "@/components/layout/DashboardLayout";
import { TrendAnalysisDashboard } from "@/components/tiktok/TrendAnalysisDashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/utils/trpc";
import { useState } from "react";
import { toast } from "@/lib/utils";
import { TrendingUp, Calendar, Play } from "lucide-react";

export default function TikTokTrends() {
  const [customDate, setCustomDate] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const utils = trpc.useUtils();

  const triggerTrendAnalysis = trpc.tiktok.triggerTrendAnalysis.useMutation({
    onSuccess: (data) => {
      utils.tiktok.getTrendAnalysis.invalidate();
      setIsDialogOpen(false);
      setCustomDate("");
      toast.success(`Trend analysis started for ${data.date}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to trigger trend analysis");
    },
  });

  const handleTriggerAnalysis = () => {
    const date = customDate || new Date().toISOString().split('T')[0];
    triggerTrendAnalysis.mutate({ date });
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto space-y-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Trend Analysis</h1>
            <p className="text-muted-foreground">
              Discover patterns and trends across TikTok hook analysis
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Play className="mr-2 h-4 w-4" />
                Generate Analysis
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Trend Analysis</DialogTitle>
                <DialogDescription>
                  Generate a new trend analysis report for a specific date. 
                  Leave empty to analyze today's data.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="date">Date (optional)</Label>
                  <Input
                    id="date"
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Analyzes all hook data from the selected date
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleTriggerAnalysis}
                  disabled={triggerTrendAnalysis.isLoading}
                >
                  {triggerTrendAnalysis.isLoading ? "Generating..." : "Generate Analysis"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              About Trend Analysis
            </CardTitle>
            <CardDescription>
              Our AI analyzes hook patterns across all processed videos to identify trends and insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Common Phrases</h4>
                <p className="text-muted-foreground">
                  Most frequently used opening lines and their effectiveness scores
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Visual Themes</h4>
                <p className="text-muted-foreground">
                  Popular visual techniques and their correlation with engagement
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Engagement Patterns</h4>
                <p className="text-muted-foreground">
                  Hook types and tactics that drive the highest performance
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trend Analysis Dashboard */}
        <TrendAnalysisDashboard />
      </div>
    </DashboardLayout>
  );
}