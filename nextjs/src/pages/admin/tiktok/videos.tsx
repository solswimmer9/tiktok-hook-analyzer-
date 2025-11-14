import DashboardLayout from "@/components/layout/DashboardLayout";
import { VideoGallery } from "@/components/tiktok/VideoGallery";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/utils/trpc";
import { useState } from "react";
import { VideoIcon, Search, Filter } from "lucide-react";

export default function TikTokVideos() {
  const [selectedSearchTerm, setSelectedSearchTerm] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch search terms for filter
  const { data: searchTerms } = trpc.tiktok.getSearchTerms.useQuery();

  return (
    <DashboardLayout>
      <div className="container mx-auto space-y-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">TikTok Videos</h1>
            <p className="text-muted-foreground">
              Browse and manage downloaded TikTok videos
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <CardDescription>
              Filter videos by search term or search for specific content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Select value={selectedSearchTerm} onValueChange={setSelectedSearchTerm}>
                  <SelectTrigger>
                    <SelectValue placeholder="All search terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All search terms</SelectItem>
                    {searchTerms?.map((term) => (
                      <SelectItem key={term.id} value={term.id}>
                        <div className="flex items-center gap-2">
                          <span>{term.term}</span>
                          <Badge variant={term.status === "active" ? "default" : "secondary"} className="text-xs">
                            {term.status}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Input
                  placeholder="Search videos by title or creator..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              {(selectedSearchTerm !== "all" || searchQuery) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedSearchTerm("all");
                    setSearchQuery("");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Video Gallery */}
        <VideoGallery
          searchTermId={selectedSearchTerm !== "all" ? selectedSearchTerm : undefined}
          searchQuery={searchQuery}
        />
      </div>
    </DashboardLayout>
  );
}