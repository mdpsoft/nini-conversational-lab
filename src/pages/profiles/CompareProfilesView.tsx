import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, Download, Eye, EyeOff } from 'lucide-react';
import { UserAIProfile } from '@/store/profiles';
import { useToast } from '@/hooks/use-toast';

interface CompareProfilesViewProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: UserAIProfile[];
}

interface ComparisonRow {
  category: string;
  attribute: string;
  values: (string | number | string[] | boolean | null)[];
  isEqual: boolean;
}

export function CompareProfilesView({ isOpen, onClose, profiles }: CompareProfilesViewProps) {
  const [showDifferencesOnly, setShowDifferencesOnly] = useState(false);
  const { toast } = useToast();

  const getComparisonData = (): ComparisonRow[] => {
    if (profiles.length === 0) return [];

    const rows: ComparisonRow[] = [
      // Overview
      {
        category: 'Overview',
        attribute: 'ID',
        values: profiles.map(p => p.id),
        isEqual: false // IDs should always be different
      },
      {
        category: 'Overview',
        attribute: 'Name',
        values: profiles.map(p => p.name),
        isEqual: new Set(profiles.map(p => p.name)).size === 1
      },
      {
        category: 'Overview',
        attribute: 'Version',
        values: profiles.map(p => p.version),
        isEqual: new Set(profiles.map(p => p.version)).size === 1
      },
      {
        category: 'Overview',
        attribute: 'Language',
        values: profiles.map(p => p.lang),
        isEqual: new Set(profiles.map(p => p.lang)).size === 1
      },
      {
        category: 'Overview',
        attribute: 'Description',
        values: profiles.map(p => p.description),
        isEqual: new Set(profiles.map(p => p.description)).size === 1
      },
      
      // Personality
      {
        category: 'Personality',
        attribute: 'Tone',
        values: profiles.map(p => p.tone),
        isEqual: new Set(profiles.map(p => p.tone)).size === 1
      },
      {
        category: 'Personality',
        attribute: 'Traits',
        values: profiles.map(p => p.traits),
        isEqual: profiles.every(p => 
          JSON.stringify(p.traits.sort()) === JSON.stringify(profiles[0].traits.sort())
        )
      },
      
      // Focus Areas
      {
        category: 'Focus',
        attribute: 'Emotions Focus',
        values: profiles.map(p => p.emotions_focus),
        isEqual: profiles.every(p => 
          JSON.stringify(p.emotions_focus.sort()) === JSON.stringify(profiles[0].emotions_focus.sort())
        )
      },
      {
        category: 'Focus',
        attribute: 'Needs Focus',
        values: profiles.map(p => p.needs_focus),
        isEqual: profiles.every(p => 
          JSON.stringify(p.needs_focus.sort()) === JSON.stringify(profiles[0].needs_focus.sort())
        )
      },
      {
        category: 'Focus',
        attribute: 'Boundaries Focus',
        values: profiles.map(p => p.boundaries_focus),
        isEqual: profiles.every(p => 
          JSON.stringify(p.boundaries_focus.sort()) === JSON.stringify(profiles[0].boundaries_focus.sort())
        )
      },
      
      // Behavior
      {
        category: 'Behavior',
        attribute: 'Question Rate (Min)',
        values: profiles.map(p => p.question_rate.min),
        isEqual: new Set(profiles.map(p => p.question_rate.min)).size === 1
      },
      {
        category: 'Behavior',
        attribute: 'Question Rate (Max)',
        values: profiles.map(p => p.question_rate.max),
        isEqual: new Set(profiles.map(p => p.question_rate.max)).size === 1
      },
      {
        category: 'Behavior',
        attribute: 'Verbosity (Paragraphs)',
        values: profiles.map(p => p.verbosity.paragraphs),
        isEqual: new Set(profiles.map(p => p.verbosity.paragraphs)).size === 1
      },
      {
        category: 'Behavior',
        attribute: 'Soft Char Limit',
        values: profiles.map(p => p.verbosity.soft_char_limit ?? 'None'),
        isEqual: new Set(profiles.map(p => p.verbosity.soft_char_limit)).size === 1
      },
      {
        category: 'Behavior',
        attribute: 'Hard Char Limit',
        values: profiles.map(p => p.verbosity.hard_char_limit ?? 'None'),
        isEqual: new Set(profiles.map(p => p.verbosity.hard_char_limit)).size === 1
      },
      
      // Styles
      {
        category: 'Styles',
        attribute: 'Attachment Style',
        values: profiles.map(p => p.attachment_style),
        isEqual: new Set(profiles.map(p => p.attachment_style)).size === 1
      },
      {
        category: 'Styles',
        attribute: 'Conflict Style',
        values: profiles.map(p => p.conflict_style),
        isEqual: new Set(profiles.map(p => p.conflict_style)).size === 1
      },
      
      // Safety
      {
        category: 'Safety',
        attribute: 'Ban Phrases',
        values: profiles.map(p => p.safety.ban_phrases),
        isEqual: profiles.every(p => 
          JSON.stringify(p.safety.ban_phrases.sort()) === JSON.stringify(profiles[0].safety.ban_phrases.sort())
        )
      },
      {
        category: 'Safety',
        attribute: 'Escalation',
        values: profiles.map(p => p.safety.escalation),
        isEqual: new Set(profiles.map(p => p.safety.escalation)).size === 1
      },
      
      // Examples
      {
        category: 'Examples',
        attribute: 'Example Lines',
        values: profiles.map(p => p.example_lines),
        isEqual: profiles.every(p => 
          JSON.stringify(p.example_lines.sort()) === JSON.stringify(profiles[0].example_lines.sort())
        )
      }
    ];

    return showDifferencesOnly ? rows.filter(row => !row.isEqual) : rows;
  };

  const renderValue = (value: any, isArray: boolean = false) => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground italic">None</span>;
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-muted-foreground italic">Empty</span>;
      }
      
      return (
        <div className="flex flex-wrap gap-1 max-w-48">
          {value.slice(0, 3).map((item, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {item}
            </Badge>
          ))}
          {value.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{value.length - 3}
            </Badge>
          )}
        </div>
      );
    }
    
    return <span className="text-sm">{String(value)}</span>;
  };

  const generateMarkdown = (): string => {
    const rows = getComparisonData();
    const headers = ['Attribute', ...profiles.map(p => p.name)];
    
    let markdown = `# Profile Comparison\n\n`;
    markdown += `| ${headers.join(' | ')} |\n`;
    markdown += `| ${headers.map(() => '---').join(' | ')} |\n`;
    
    let currentCategory = '';
    
    rows.forEach(row => {
      if (row.category !== currentCategory) {
        currentCategory = row.category;
        markdown += `| **${row.category}** | ${profiles.map(() => '').join(' | ')} |\n`;
      }
      
      const values = row.values.map(value => {
        if (Array.isArray(value)) {
          return value.join(', ');
        }
        return String(value);
      });
      
      markdown += `| ${row.attribute} | ${values.join(' | ')} |\n`;
    });
    
    return markdown;
  };

  const generateCSV = (): string => {
    const rows = getComparisonData();
    const headers = ['Category', 'Attribute', ...profiles.map(p => p.name)];
    
    let csv = headers.join(',') + '\n';
    
    rows.forEach(row => {
      const values = [
        row.category,
        row.attribute,
        ...row.values.map(value => {
          if (Array.isArray(value)) {
            return `"${value.join(', ')}"`;
          }
          return `"${String(value)}"`;
        })
      ];
      csv += values.join(',') + '\n';
    });
    
    return csv;
  };

  const copyToClipboard = (content: string, format: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: `Copied as ${format}`,
      description: `Comparison data copied to clipboard`,
    });
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "File downloaded",
      description: `Comparison saved as ${filename}`,
    });
  };

  const comparisonData = getComparisonData();
  const categories = [...new Set(comparisonData.map(row => row.category))];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Compare USERAI Profiles</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="differences-only"
                checked={showDifferencesOnly}
                onCheckedChange={setShowDifferencesOnly}
              />
              <Label htmlFor="differences-only">Show Differences Only</Label>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(generateMarkdown(), 'Markdown')}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy MD
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(generateCSV(), 'CSV')}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadFile(generateMarkdown(), 'profile-comparison.md')}
              >
                <Download className="w-4 h-4 mr-2" />
                Download MD
              </Button>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="overflow-auto max-h-[calc(90vh-200px)] border rounded">
            <table className="w-full">
              <thead className="sticky top-0 bg-background border-b">
                <tr>
                  <th className="text-left p-3 font-medium min-w-32">Attribute</th>
                  {profiles.map(profile => (
                    <th key={profile.id} className="text-left p-3 font-medium min-w-48 max-w-64">
                      <div className="space-y-1">
                        <div className="font-semibold">{profile.name}</div>
                        <Badge variant="outline" className="text-xs">
                          v{profile.version}
                        </Badge>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map(category => {
                  const categoryRows = comparisonData.filter(row => row.category === category);
                  if (categoryRows.length === 0) return null;
                  
                  return (
                    <React.Fragment key={category}>
                      <tr className="bg-muted/50">
                        <td colSpan={profiles.length + 1} className="p-2">
                          <span className="font-semibold text-sm">{category}</span>
                        </td>
                      </tr>
                      {categoryRows.map(row => (
                        <tr key={`${row.category}-${row.attribute}`} className="border-b hover:bg-muted/25">
                          <td className="p-3 font-medium text-sm">
                            <div className="flex items-center gap-2">
                              {row.attribute}
                              {!row.isEqual && (
                                <Badge variant="outline" className="text-xs">
                                  <EyeOff className="w-3 h-3 mr-1" />
                                  Diff
                                </Badge>
                              )}
                            </div>
                          </td>
                          {row.values.map((value, index) => (
                            <td key={index} className="p-3 max-w-64">
                              {renderValue(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// React import for Fragment
import React from 'react';