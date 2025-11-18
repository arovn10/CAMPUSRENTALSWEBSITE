// Shared migration job storage
// In production, use Redis or database instead of in-memory Map

export interface MigrationJob {
  id: string;
  status: 'starting' | 'running' | 'completed' | 'failed';
  progress: number;
  message: string;
  startedAt: string;
  completedAt: string | null;
  results: any | null;
  error: string | null;
}

export const migrationJobs = new Map<string, MigrationJob>();

