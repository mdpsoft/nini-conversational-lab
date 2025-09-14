import { Scenario, RunSummary } from '../types/core';

// Export utilities for JSON data

export function downloadJson<T>(data: T, filename: string): void {
  try {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export JSON:', error);
    throw new Error('Failed to export data');
  }
}

export function exportScenarios(scenarios: Scenario[]): void {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `nini-scenarios-${timestamp}.json`;
  downloadJson(scenarios, filename);
}

export function exportRun(runSummary: RunSummary): void {
  const timestamp = runSummary.createdAt.split('T')[0];
  const filename = `nini-run-${runSummary.runId}-${timestamp}.json`;
  downloadJson(runSummary, filename);
}

export async function importJsonFile<T>(file: File): Promise<T> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        if (!event.target?.result) {
          throw new Error('No file content');
        }
        
        const json = JSON.parse(event.target.result as string);
        resolve(json);
      } catch (error) {
        reject(new Error('Invalid JSON format'));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function validateFileSize(file: File, maxSizeMB: number = 10): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

export function validateFileType(file: File): boolean {
  return file.type === 'application/json' || file.name.endsWith('.json');
}

// Estimate size of data in MB
export function estimateDataSize(data: any): number {
  try {
    const json = JSON.stringify(data);
    const bytes = new Blob([json]).size;
    return bytes / (1024 * 1024);
  } catch {
    return 0;
  }
}

// Format file size for display
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Create shareable URL for data (temporary, client-side only)
export function createDataUrl<T>(data: T): string {
  try {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Failed to create data URL:', error);
    throw new Error('Failed to create shareable link');
  }
}