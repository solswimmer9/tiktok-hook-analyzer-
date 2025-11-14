import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { trpc } from "@/utils/trpc";
import { useState } from "react";
import { toast } from "@/lib/utils";
import { Plus, MoreHorizontal, Search, Archive, ArchiveRestore, Trash2, RotateCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Database } from "@shared-types/database.types";

type SearchTerm = Database['public']['Tables']['search_terms']['Row'];

export function SearchTermsTab() {
  const [newTerm, setNewTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const utils = trpc.useUtils();
  
  // Queries
  const { data: searchTerms, isLoading } = trpc.tiktok.getSearchTerms.useQuery();

  // Mutations
  const createTerm = trpc.tiktok.createSearchTerm.useMutation({
    onSuccess: () => {
      utils.tiktok.getSearchTerms.invalidate();
      utils.tiktok.getStatistics.invalidate();
      setNewTerm("");
      setIsDialogOpen(false);
      toast.success("Search term created and video search started!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create search term");
    },
  });

  const deleteTerm = trpc.tiktok.deleteSearchTerm.useMutation({
    onSuccess: () => {
      utils.tiktok.getSearchTerms.invalidate();
      utils.tiktok.getStatistics.invalidate();
      toast.success("Search term deleted");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete search term");
    },
  });

  const archiveTerm = trpc.tiktok.archiveSearchTerm.useMutation({
    onSuccess: () => {
      utils.tiktok.getSearchTerms.invalidate();
      utils.tiktok.getStatistics.invalidate();
      toast.success("Search term archived");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to archive search term");
    },
  });

  const restoreTerm = trpc.tiktok.restoreSearchTerm.useMutation({
    onSuccess: () => {
      utils.tiktok.getSearchTerms.invalidate();
      utils.tiktok.getStatistics.invalidate();
      toast.success("Search term restored");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to restore search term");
    },
  });

  const retrySearch = trpc.tiktok.retryVideoSearch.useMutation({
    onSuccess: () => {
      toast.success("Video search restarted!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to restart video search");
    },
  });

  const handleCreateTerm = () => {
    if (!newTerm.trim()) return;
    createTerm.mutate({ term: newTerm.trim() });
  };

  const handleDeleteTerm = (id: string) => {
    if (confirm("Are you sure you want to delete this search term? This will also delete all associated videos and analysis.")) {
      deleteTerm.mutate({ id });
    }
  };

  const handleArchiveTerm = (id: string) => {
    archiveTerm.mutate({ id });
  };

  const handleRestoreTerm = (id: string) => {
    restoreTerm.mutate({ id });
  };

  const handleRetrySearch = (searchTermId: string) => {
    retrySearch.mutate({ searchTermId });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Search Terms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading search terms...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Search Terms</CardTitle>
            <CardDescription>
              Manage your TikTok search terms. Each term will automatically search for and analyze ~100 videos.
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Search Term
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Search Term</DialogTitle>
                <DialogDescription>
                  Enter a keyword or phrase to search TikTok videos. The system will find ~100 relevant videos and analyze their hooks.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="term">Search Term</Label>
                  <Input
                    id="term"
                    value={newTerm}
                    onChange={(e) => setNewTerm(e.target.value)}
                    placeholder="e.g., coding tips, workout routine, cooking hacks"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCreateTerm();
                      }
                    }}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreateTerm}
                  disabled={!newTerm.trim() || createTerm.isLoading}
                >
                  {createTerm.isLoading ? "Creating..." : "Create & Start Analysis"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {!searchTerms || searchTerms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Search className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No search terms yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first search term to start analyzing TikTok videos
            </p>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Search Term
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Term</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {searchTerms.map((term: SearchTerm) => (
                <TableRow key={term.id}>
                  <TableCell className="font-medium">{term.term}</TableCell>
                  <TableCell>
                    <Badge variant={term.status === "active" ? "default" : "secondary"}>
                      {term.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(term.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(term.updated_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleRetrySearch(term.id)}
                          disabled={retrySearch.isLoading}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Retry Search
                        </DropdownMenuItem>
                        {term.status === "active" ? (
                          <DropdownMenuItem
                            onClick={() => handleArchiveTerm(term.id)}
                            disabled={archiveTerm.isLoading}
                          >
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => handleRestoreTerm(term.id)}
                            disabled={restoreTerm.isLoading}
                          >
                            <ArchiveRestore className="mr-2 h-4 w-4" />
                            Restore
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDeleteTerm(term.id)}
                          disabled={deleteTerm.isLoading}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}