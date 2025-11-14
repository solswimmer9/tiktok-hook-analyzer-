import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { trpc } from "@/utils/trpc";
import { useState, useEffect } from "react";
import { toast } from "@/lib/utils";
import { 
  VideoIcon, 
  MoreHorizontal, 
  ExternalLink, 
  Eye, 
  Heart, 
  Share, 
  MessageCircle,
  Clock,
  User,
  RotateCcw,
  Brain
} from "lucide-react";
import { formatDistanceToNow, formatDuration } from "date-fns";
import Link from "next/link";
import { Database } from "@shared-types/database.types";

type TikTokVideo = Database['public']['Tables']['tiktok_videos']['Row'] & {
  search_terms: Database['public']['Tables']['search_terms']['Row'];
  hook_analysis: Database['public']['Tables']['hook_analysis']['Row'][];
};

interface VideoGalleryProps {
  searchTermId?: string;
  searchQuery?: string;
}

export function VideoGallery({ searchTermId, searchQuery }: VideoGalleryProps) {
  const [offset, setOffset] = useState(0);
  const pageSize = 12;

  const utils = trpc.useUtils();

  // Fetch videos with pagination
  const { data: videos, isLoading, isFetching } = trpc.tiktok.getVideos.useQuery({
    searchTermId,
    limit: pageSize,
    offset: offset,
  });

  const hasNextPage = videos && videos.length === pageSize;
  const fetchNextPage = () => {
    if (!isFetching && hasNextPage) {
      setOffset(prev => prev + pageSize);
    }
  };

  const retryAnalysis = trpc.tiktok.retryVideoAnalysis.useMutation({
    onSuccess: () => {
      toast.success("Hook analysis restarted!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to restart analysis");
    },
  });

  const allVideos = (videos || []) as TikTokVideo[];
  
  // Filter videos by search query
  const filteredVideos = searchQuery
    ? allVideos.filter(video => 
        video.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.creator?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.creator_username?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allVideos;

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const handleRetryAnalysis = (videoId: string) => {
    retryAnalysis.mutate({ videoId });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Videos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading videos...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (filteredVideos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Videos</CardTitle>
          <CardDescription>
            {searchQuery || searchTermId 
              ? "No videos match your current filters"
              : "No videos found. Create a search term to start downloading videos."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <VideoIcon className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">
              {searchQuery || searchTermId ? "No matching videos" : "No videos yet"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || searchTermId 
                ? "Try adjusting your filters or search terms"
                : "Add a search term to start downloading and analyzing TikTok videos"
              }
            </p>
            {!searchQuery && !searchTermId && (
              <Link href="/admin/tiktok">
                <Button>Add Search Term</Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Videos ({filteredVideos.length})</CardTitle>
          <CardDescription>
            Downloaded TikTok videos from your search terms
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Video Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredVideos.map((video: TikTokVideo) => (
          <Card key={video.id} className="overflow-hidden">
            <div className="aspect-video bg-muted relative">
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
              
              {/* Video duration */}
              {video.duration && (
                <Badge className="absolute bottom-2 right-2 bg-black/70 text-white">
                  <Clock className="mr-1 h-3 w-3" />
                  {Math.round(video.duration)}s
                </Badge>
              )}

              {/* Analysis status */}
              <div className="absolute top-2 left-2">
                {video.hook_analysis && video.hook_analysis.length > 0 ? (
                  <Badge className="bg-green-500">
                    <Brain className="mr-1 h-3 w-3" />
                    Analyzed
                  </Badge>
                ) : video.r2_url ? (
                  <Badge variant="secondary">
                    Processing...
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    Downloading...
                  </Badge>
                )}
              </div>
            </div>

            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Title */}
                <h3 className="font-semibold text-sm line-clamp-2">
                  {video.title || "Untitled"}
                </h3>

                {/* Creator */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="truncate">
                    {video.creator || video.creator_username || "Unknown creator"}
                  </span>
                </div>

                {/* Search term */}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {video.search_terms.term}
                  </Badge>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {formatNumber(video.view_count || 0)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    {formatNumber(video.like_count || 0)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Share className="h-3 w-3" />
                    {formatNumber(video.share_count || 0)}
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    {formatNumber(video.comment_count || 0)}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex gap-2">
                    {video.hook_analysis && video.hook_analysis.length > 0 && (
                      <Link href={`/admin/tiktok/analysis?video=${video.id}`}>
                        <Button size="sm" variant="outline">
                          <Brain className="mr-1 h-3 w-3" />
                          View Analysis
                        </Button>
                      </Link>
                    )}
                    
                    {video.video_url && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={video.video_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-1 h-3 w-3" />
                          Original
                        </a>
                      </Button>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {video.r2_url && !video.hook_analysis?.length && (
                        <DropdownMenuItem
                          onClick={() => handleRetryAnalysis(video.id)}
                          disabled={retryAnalysis.isLoading}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Retry Analysis
                        </DropdownMenuItem>
                      )}
                      {video.r2_url && (
                        <DropdownMenuItem asChild>
                          <a href={video.r2_url} target="_blank" rel="noopener noreferrer">
                            <VideoIcon className="mr-2 h-4 w-4" />
                            Watch Video
                          </a>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Created time */}
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  Added {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Load More */}
      {hasNextPage && (
        <div className="flex justify-center pt-6">
          <Button onClick={() => fetchNextPage()} disabled={isLoading}>
            Load More Videos
          </Button>
        </div>
      )}
    </div>
  );
}