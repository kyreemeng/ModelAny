import type { LogEntry, Settings } from "./types";

export interface DiagnosticExportInput {
  version: string;
  exportedAt: string;
  browser: string;
  settings: Settings;
  logs: LogEntry[];
}

export const createDiagnosticExport = (input: DiagnosticExportInput): DiagnosticExportInput => ({
  version: input.version,
  exportedAt: input.exportedAt,
  browser: input.browser,
  settings: { ...input.settings },
  logs: input.logs.map(({ id, taskId, modelId, startedAt, durationMs, result, errorCode, errorMessage }) => ({
    id, taskId, modelId, startedAt, durationMs, result, errorCode,
    errorMessage: errorMessage?.replace(/https?:\/\/\S+/g, "[URL]").slice(0, 240)
  }))
});
