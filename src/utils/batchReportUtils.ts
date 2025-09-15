// Utilities for batch run report aggregation and export

import { RunRow } from '../types/core';
import { getTopItems } from '../core/metrics/turnMetrics';

export interface BatchReportFilters {
  scenarioIds: string[];
  profileIds: string[];
  dateRange: { start: string; end: string };
  minTurns: number;
}

export interface ProfileAggregateData {
  profileId: string;
  profileName: string;
  profileVersion: number;
  scenarioNames: string[];
  runCount: number;
  avgChars: number;
  avgQuestions: number;
  topEmotions: Array<{ item: string; count: number }>;
  topNeeds: Array<{ item: string; count: number }>;
  topBoundaries: Array<{ item: string; count: number }>;
  safetyEscalations: number;
  safetyEscalationsPct: number;
  totalTurns: number;
}

export interface BatchReportData {
  profiles: ProfileAggregateData[];
  totalRuns: number;
  totalTurns: number;
  appliedFilters: BatchReportFilters;
}

/**
 * Filters runs based on the provided criteria
 */
export function filterRuns(runs: RunRow[], filters: BatchReportFilters): RunRow[] {
  return runs.filter(run => {
    // Date range filter
    const runDate = new Date(run.createdAt);
    const startDate = new Date(filters.dateRange.start);
    const endDate = new Date(filters.dateRange.end);
    if (runDate < startDate || runDate > endDate) {
      return false;
    }

    // Profile filter
    if (filters.profileIds.length > 0) {
      const hasProfileMatch = run.resultsJson?.some((result: any) =>
        result.conversations?.some((conv: any) => 
          filters.profileIds.includes(conv.userAI?.profileId)
        )
      );
      if (!hasProfileMatch) return false;
    }

    // Scenario filter
    if (filters.scenarioIds.length > 0) {
      const hasScenarioMatch = run.resultsJson?.some((result: any) =>
        filters.scenarioIds.includes(result.scenarioId)
      );
      if (!hasScenarioMatch) return false;
    }

    // Min turns filter
    const hasMinTurns = run.resultsJson?.some((result: any) =>
      result.conversations?.some((conv: any) => 
        conv.turns?.length >= filters.minTurns
      )
    );
    if (!hasMinTurns) return false;

    return true;
  });
}

/**
 * Aggregates run data by profile
 */
export function aggregateByProfile(
  runs: RunRow[], 
  normalizeByTurns: boolean = true
): ProfileAggregateData[] {
  const profileMap = new Map<string, {
    runs: any[];
    conversations: any[];
    scenarioNames: Set<string>;
  }>();

  // Group conversations by profile
  runs.forEach(run => {
    run.resultsJson?.forEach((result: any) => {
      result.conversations?.forEach((conv: any) => {
        const profileId = conv.userAI?.profileId;
        if (!profileId) return;

        if (!profileMap.has(profileId)) {
          profileMap.set(profileId, {
            runs: [],
            conversations: [],
            scenarioNames: new Set()
          });
        }

        const profileData = profileMap.get(profileId)!;
        profileData.runs.push(run);
        profileData.conversations.push(conv);
        profileData.scenarioNames.add(getScenarioName(result.scenarioId));
      });
    });
  });

  // Aggregate metrics per profile
  const aggregates: ProfileAggregateData[] = [];

  profileMap.forEach((data, profileId) => {
    const firstConv = data.conversations[0];
    const profile = firstConv?.userAI?.profile;

    if (!profile) return;

    // Calculate aggregated metrics
    let totalChars = 0;
    let totalQuestions = 0;
    let totalTurns = 0;
    let safetyEscalations = 0;
    
    const emotionFreq: Record<string, number> = {};
    const needFreq: Record<string, number> = {};
    const boundaryFreq: Record<string, number> = {};

    data.conversations.forEach(conv => {
      const convTurns = conv.turns?.length || 0;
      totalTurns += convTurns;

      // Use run metrics if available, otherwise compute from turns
      if (conv.runMetrics) {
        const weight = normalizeByTurns ? convTurns : 1;
        totalChars += conv.runMetrics.avgChars * weight;
        totalQuestions += conv.runMetrics.avgQuestions * weight;

        // Aggregate frequency data
        Object.entries(conv.runMetrics.emotionFreq || {}).forEach(([emotion, count]) => {
          emotionFreq[emotion] = (emotionFreq[emotion] || 0) + (count as number);
        });
        Object.entries(conv.runMetrics.needFreq || {}).forEach(([need, count]) => {
          needFreq[need] = (needFreq[need] || 0) + (count as number);
        });
        Object.entries(conv.runMetrics.boundaryFreq || {}).forEach(([boundary, count]) => {
          boundaryFreq[boundary] = (boundaryFreq[boundary] || 0) + (count as number);
        });
      }

      // Count safety escalations
      conv.turns?.forEach((turn: any) => {
        if (turn.meta?.safety?.escalated) {
          safetyEscalations++;
        }
      });
    });

    const convCount = data.conversations.length;
    const avgChars = normalizeByTurns ? totalChars / totalTurns : totalChars / convCount;
    const avgQuestions = normalizeByTurns ? totalQuestions / totalTurns : totalQuestions / convCount;

    aggregates.push({
      profileId,
      profileName: profile.name,
      profileVersion: profile.version,
      scenarioNames: Array.from(data.scenarioNames),
      runCount: new Set(data.runs.map(r => r.runId)).size,
      avgChars: Math.round(avgChars),
      avgQuestions: Math.round(avgQuestions * 10) / 10,
      topEmotions: getTopItems(emotionFreq, 3),
      topNeeds: getTopItems(needFreq, 3),
      topBoundaries: getTopItems(boundaryFreq, 3),
      safetyEscalations,
      safetyEscalationsPct: totalTurns > 0 ? Math.round((safetyEscalations / totalTurns) * 1000) / 10 : 0,
      totalTurns
    });
  });

  return aggregates.sort((a, b) => a.profileName.localeCompare(b.profileName));
}

/**
 * Checks if profiles have identical values for comparison filtering
 */
export function findIdenticalColumns(profiles: ProfileAggregateData[]): Set<string> {
  if (profiles.length <= 1) return new Set();

  const identicalColumns = new Set<string>();
  const first = profiles[0];

  // Check each comparable field
  const fields = [
    'avgChars', 'avgQuestions', 'safetyEscalations', 'safetyEscalationsPct'
  ];

  fields.forEach(field => {
    const allSame = profiles.every(p => 
      (p as any)[field] === (first as any)[field]
    );
    if (allSame) {
      identicalColumns.add(field);
    }
  });

  // Check array fields (top emotions, needs, boundaries)
  const arrayFields = ['topEmotions', 'topNeeds', 'topBoundaries'];
  arrayFields.forEach(field => {
    const firstItems = (first as any)[field].map((item: any) => item.item).sort();
    const allSame = profiles.every(p => {
      const items = (p as any)[field].map((item: any) => item.item).sort();
      return JSON.stringify(items) === JSON.stringify(firstItems);
    });
    if (allSame) {
      identicalColumns.add(field);
    }
  });

  return identicalColumns;
}

/**
 * Exports batch report data as CSV
 */
export function exportAsCSV(data: BatchReportData): string {
  const headers = [
    'Profile', 'Version', 'Scenarios', 'Runs', 'AvgChars', 'AvgQuestions',
    'TopEmotions', 'TopNeeds', 'TopBoundaries', 'SafetyEscalations', 'SafetyEscalationsPct'
  ];

  let csv = headers.join(',') + '\n';

  data.profiles.forEach(profile => {
    const row = [
      `"${profile.profileName}"`,
      profile.profileVersion,
      `"${profile.scenarioNames.join(', ')}"`,
      profile.runCount,
      profile.avgChars,
      profile.avgQuestions,
      `"${profile.topEmotions.map(e => `${e.item} (${e.count})`).join(', ')}"`,
      `"${profile.topNeeds.map(n => `${n.item} (${n.count})`).join(', ')}"`,
      `"${profile.topBoundaries.map(b => `${b.item} (${b.count})`).join(', ')}"`,
      profile.safetyEscalations,
      `${profile.safetyEscalationsPct}%`
    ];
    csv += row.join(',') + '\n';
  });

  return csv;
}

/**
 * Exports batch report data as Markdown
 */
export function exportAsMarkdown(data: BatchReportData): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  
  let md = `# Batch Run Report\n\n`;
  md += `**Generated:** ${now.toLocaleString()}\n\n`;
  md += `**Filters Applied:**\n`;
  md += `- Date Range: ${data.appliedFilters.dateRange.start} to ${data.appliedFilters.dateRange.end}\n`;
  md += `- Profiles: ${data.appliedFilters.profileIds.length} selected\n`;
  md += `- Scenarios: ${data.appliedFilters.scenarioIds.length} selected\n`;
  md += `- Min Turns: ${data.appliedFilters.minTurns}\n\n`;

  md += `**Summary:**\n`;
  md += `- Total Profiles: ${data.profiles.length}\n`;
  md += `- Total Runs: ${data.totalRuns}\n`;
  md += `- Total Turns: ${data.totalTurns}\n\n`;

  // Table
  md += `## Profile Comparison\n\n`;
  md += `| Profile | Ver | Scenarios | Runs | Avg Chars | Avg Questions | Top Emotions | Top Needs | Top Boundaries | Safety Escalations |\n`;
  md += `|---------|-----|-----------|------|-----------|---------------|--------------|-----------|----------------|--------------------|\n`;

  data.profiles.forEach(profile => {
    md += `| ${profile.profileName} | v${profile.profileVersion} | ${profile.scenarioNames.join(', ')} | ${profile.runCount} | ${profile.avgChars} | ${profile.avgQuestions} | ${profile.topEmotions.map(e => e.item).join(', ')} | ${profile.topNeeds.map(n => n.item).join(', ')} | ${profile.topBoundaries.map(b => b.item).join(', ')} | ${profile.safetyEscalations} (${profile.safetyEscalationsPct}%) |\n`;
  });

  return md;
}

/**
 * Generates filename for exports
 */
export function generateExportFilename(prefix: string, extension: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  return `${prefix}-${year}${month}${day}-${hours}${minutes}.${extension}`;
}

/**
 * Helper to get scenario name by ID (fallback to ID if name not found)
 */
function getScenarioName(scenarioId: string): string {
  // This should ideally get the actual scenario name from the scenarios store
  // For now, return a formatted version of the ID
  return scenarioId.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Downloads content as a file
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}