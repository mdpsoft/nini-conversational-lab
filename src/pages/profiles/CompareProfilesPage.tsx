import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CompareProfilesView } from "./CompareProfilesView";
import { UserAIProfile } from "@/store/profiles";
import { useProfilesRepo } from "@/hooks/useProfilesRepo";
import { GitCompare, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export default function CompareProfilesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const { profiles, loading } = useProfilesRepo();

  // Initialize selected profiles from URL params
  useEffect(() => {
    const profileIds = searchParams.get('profiles')?.split(',').filter(Boolean) || [];
    setSelectedProfileIds(profileIds);
    if (profileIds.length >= 2) {
      setShowComparison(true);
    }
  }, [searchParams]);

  // Update URL when selection changes
  useEffect(() => {
    if (selectedProfileIds.length > 0) {
      setSearchParams({ profiles: selectedProfileIds.join(',') });
    } else {
      setSearchParams({});
    }
  }, [selectedProfileIds, setSearchParams]);

  const handleProfileToggle = (profileId: string, checked: boolean) => {
    if (checked) {
      setSelectedProfileIds(prev => [...prev, profileId]);
    } else {
      setSelectedProfileIds(prev => prev.filter(id => id !== profileId));
    }
  };

  const handleCompare = () => {
    if (selectedProfileIds.length >= 2) {
      setShowComparison(true);
    }
  };

  const selectedProfiles = profiles.filter(p => selectedProfileIds.includes(p.id));

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p>Loading profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <header className="mb-6">
        <Button asChild variant="ghost" className="mb-4">
          <Link to="/profiles">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profiles
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Compare Profiles</h1>
            <p className="text-muted-foreground">
              Select 2 or more profiles to compare their configurations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {selectedProfileIds.length} selected
            </Badge>
            <Button
              onClick={handleCompare}
              disabled={selectedProfileIds.length < 2}
            >
              <GitCompare className="h-4 w-4 mr-2" />
              Compare Profiles
            </Button>
          </div>
        </div>
      </header>

      {profiles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-semibold mb-2">No profiles available</h3>
            <p className="text-muted-foreground mb-4">
              Create some profiles first to use the comparison feature.
            </p>
            <Button asChild>
              <Link to="/profiles">
                Go to Profiles
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <Card 
              key={profile.id} 
              className={`cursor-pointer transition-all ${
                selectedProfileIds.includes(profile.id) 
                  ? 'ring-2 ring-primary shadow-md' 
                  : 'hover:shadow-md'
              }`}
              onClick={() => handleProfileToggle(
                profile.id, 
                !selectedProfileIds.includes(profile.id)
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{profile.name}</CardTitle>
                  <Checkbox
                    checked={selectedProfileIds.includes(profile.id)}
                    onChange={() => {}} // Handled by card click
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {profile.description || "No description"}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {profile.traits?.slice(0, 3).map((trait, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {trait}
                      </Badge>
                    )) || null}
                    {(profile.traits?.length || 0) > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{(profile.traits?.length || 0) - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CompareProfilesView
        isOpen={showComparison}
        onClose={() => setShowComparison(false)}
        profiles={selectedProfiles}
      />
    </div>
  );
}