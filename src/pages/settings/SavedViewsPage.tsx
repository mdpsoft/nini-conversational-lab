import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useViewsStore } from "@/store/viewsStore";
import { Trash2, ExternalLink, Eye, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

export default function SavedViewsPage() {
  const { savedViews, removeView, applyView } = useViewsStore();
  const [loadingViewId, setLoadingViewId] = useState<string | null>(null);

  const handleOpenView = async (viewId: string) => {
    setLoadingViewId(viewId);
    try {
      const view = applyView(viewId);
      if (view) {
        // Navigate to appropriate page based on view context
        // For now, default to repository page
        window.location.href = '/repository';
      }
    } finally {
      setLoadingViewId(null);
    }
  };

  const handleDeleteView = (viewId: string) => {
    if (confirm('Are you sure you want to delete this saved view?')) {
      removeView(viewId);
    }
  };

  const getViewScope = (view: any) => {
    // Determine scope based on view properties
    if (view.filters?.tags?.includes('LLM')) return 'logs';
    if (view.filters?.approvalRateMin !== undefined) return 'batch_report';
    return 'repository';
  };

  const getScopeColor = (scope: string) => {
    switch (scope) {
      case 'logs': return 'default';
      case 'batch_report': return 'secondary';
      default: return 'outline';
    }
  };

  const getScopeLink = (scope: string) => {
    switch (scope) {
      case 'logs': return '/llm-logs';
      case 'batch_report': return '/batch-report';
      default: return '/repository';
    }
  };

  return (
    <div className="container mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Saved Views</h1>
        <p className="text-muted-foreground">
          Manage your saved filter configurations for different pages
        </p>
      </header>

      {savedViews.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Eye className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No saved views</h3>
            <p className="text-muted-foreground mb-4">
              Create custom filter views from the LLM Logs, Repository, or Batch Report pages.
            </p>
            <div className="flex gap-2 justify-center">
              <Button asChild variant="outline">
                <Link to="/llm-logs">LLM Logs</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/repository">Repository</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/batch-report">Batch Report</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {savedViews.map((view) => {
            const scope = getViewScope(view);
            const isLoading = loadingViewId === view.id;
            
            return (
              <Card key={view.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{view.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={getScopeColor(scope)}>
                        {scope.replace('_', ' ')}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(view.createdAt))} ago
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Filter Summary */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Filters:</h4>
                      <div className="flex flex-wrap gap-2">
                        {view.filters.query && (
                          <Badge variant="outline">
                            Query: "{view.filters.query}"
                          </Badge>
                        )}
                        {view.filters.status && view.filters.status !== 'all' && (
                          <Badge variant="outline">
                            Status: {view.filters.status}
                          </Badge>
                        )}
                        {view.filters.hideArchived && (
                          <Badge variant="outline">Hide Archived</Badge>
                        )}
                        {view.filters.approvalRateMin && (
                          <Badge variant="outline">
                            Min Approval: {view.filters.approvalRateMin}%
                          </Badge>
                        )}
                        {view.filters.tags?.map((tag, idx) => (
                          <Badge key={idx} variant="outline">
                            Tag: {tag}
                          </Badge>
                        ))}
                        {view.filters.dateRange && (
                          <Badge variant="outline">
                            Date Range: {view.filters.dateRange.start} - {view.filters.dateRange.end}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Sort Info */}
                    {view.sort && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Sort:</h4>
                        <Badge variant="outline">
                          {view.sort.key} ({view.sort.dir})
                        </Badge>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        onClick={() => handleOpenView(view.id)}
                        disabled={isLoading}
                        size="sm"
                      >
                        {isLoading ? (
                          "Loading..."
                        ) : (
                          <>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open View
                          </>
                        )}
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link to={getScopeLink(scope)}>
                          <Settings className="h-4 w-4 mr-2" />
                          Go to {scope.replace('_', ' ')}
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteView(view.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}