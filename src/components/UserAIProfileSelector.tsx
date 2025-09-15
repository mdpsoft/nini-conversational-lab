import { useState, useEffect } from "react";
import { Search, X, User, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { UserAIProfile } from "@/store/profiles";
import { useNavigate } from "react-router-dom";
import { useProfilesRepo } from "@/hooks/useProfilesRepo";

export type RunMode = "single" | "batch";

interface UserAIProfileSelectorProps {
  selectedProfileIds: string[];
  onSelectionChange: (profileIds: string[]) => void;
  runMode: RunMode;
  onRunModeChange: (mode: RunMode) => void;
  disabled?: boolean;
}

export function UserAIProfileSelector({
  selectedProfileIds,
  onSelectionChange,
  runMode,
  onRunModeChange,
  disabled = false
}: UserAIProfileSelectorProps) {
  const { profiles, dataSource, loading } = useProfilesRepo();
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const filteredProfiles = profiles.filter(profile =>
    profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedProfiles = profiles.filter(p => selectedProfileIds.includes(p.id));
  const hasMultipleSelected = selectedProfileIds.length > 1;
  const showSingleModeWarning = runMode === "single" && hasMultipleSelected;

  const handleProfileToggle = (profileId: string) => {
    if (disabled) return;
    
    const isSelected = selectedProfileIds.includes(profileId);
    let newSelection: string[];
    
    if (isSelected) {
      newSelection = selectedProfileIds.filter(id => id !== profileId);
    } else {
      newSelection = [...selectedProfileIds, profileId];
    }
    
    onSelectionChange(newSelection);
  };

  const handleRemoveProfile = (profileId: string) => {
    if (disabled) return;
    onSelectionChange(selectedProfileIds.filter(id => id !== profileId));
  };

  const handleCreateProfile = () => {
    navigate("/profiles");
  };

  if (loading) {
    return (
      <Card className="p-6 text-center border-dashed">
        <CardContent className="space-y-4">
          <div className="text-muted-foreground">
            <User className="w-8 h-8 mx-auto mb-2 opacity-50 animate-pulse" />
            <p className="text-sm">Loading profiles...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (profiles.length === 0) {
    return (
      <Card className="p-6 text-center border-dashed">
        <CardContent className="space-y-4">
          <div className="text-muted-foreground">
            <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No USERAI profiles found</p>
            <p className="text-xs">Create your first profile to enable user simulation</p>
          </div>
          <Button onClick={handleCreateProfile} variant="outline" size="sm">
            Create Profile
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          USERAI Profile(s) 
          <Badge variant="outline" className="ml-2 text-xs">
            {dataSource}
          </Badge>
        </Label>
        <div className="flex items-center gap-2">
          <Label htmlFor="run-mode" className="text-xs text-muted-foreground">Run mode:</Label>
          <Select
            value={runMode}
            onValueChange={(value: RunMode) => onRunModeChange(value)}
            disabled={disabled}
          >
            <SelectTrigger className="w-24 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Single</SelectItem>
              <SelectItem value="batch">Batch</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {showSingleModeWarning && (
        <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
          ⚠️ Single mode: Only the first profile will be used ({selectedProfiles[0]?.name})
        </div>
      )}

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between h-auto p-3"
            disabled={disabled}
          >
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="text-sm">
                {selectedProfileIds.length === 0 
                  ? "Select profiles..." 
                  : `${selectedProfileIds.length} profile(s) selected`}
              </span>
            </div>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-2">
          <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search profiles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 h-8 text-sm"
              />
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {filteredProfiles.map((profile) => {
                const isSelected = selectedProfileIds.includes(profile.id);
                return (
                  <div
                    key={profile.id}
                    className={`p-2 rounded cursor-pointer transition-colors ${
                      isSelected 
                        ? "bg-primary/10 border border-primary/20" 
                        : "bg-background hover:bg-accent"
                    }`}
                    onClick={() => handleProfileToggle(profile.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{profile.name}</span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            v{profile.version}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {profile.description}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {profile.lang.toUpperCase()} • {profile.attachment_style}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center shrink-0 ml-2">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredProfiles.length === 0 && (
                <div className="text-center py-4 text-xs text-muted-foreground">
                  No profiles match your search
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-xs text-muted-foreground">
                {profiles.length} profile(s) available
              </span>
              <Button 
                onClick={handleCreateProfile} 
                variant="ghost" 
                size="sm"
                className="text-xs h-6"
              >
                + New Profile
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {selectedProfileIds.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Selected profiles:</Label>
          <div className="flex flex-wrap gap-2">
            {selectedProfiles.map((profile, index) => (
              <Badge 
                key={profile.id} 
                variant={showSingleModeWarning && index > 0 ? "secondary" : "default"}
                className="flex items-center gap-1 pr-1"
              >
                <span className="text-xs">
                  {profile.name} v{profile.version}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0.5 hover:bg-transparent"
                  onClick={() => handleRemoveProfile(profile.id)}
                  disabled={disabled}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}