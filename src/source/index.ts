import { loadWorkshopRequestFixture } from "./fixtureSource.js";

import type { SourceSummary, WorkshopRequest } from "../contracts.js";

export type SourceMode = "fixture" | "google-sheets";

export interface SourceLoadResult {
  request: WorkshopRequest;
  sourceSummary: SourceSummary;
}

export interface SourceOptions {
  source: SourceMode;
  fixturePath: string;
}

export async function loadWorkshopRequestFromSource(
  options: SourceOptions,
): Promise<SourceLoadResult> {
  if (options.source === "fixture") {
    return {
      request: await loadWorkshopRequestFixture(options.fixturePath),
      sourceSummary: {
        mode: "fixture",
        label: options.fixturePath,
      },
    };
  }

  const { loadWorkshopRequestFromGoogleSheets } = await import(
    "./googleSheetsSource.js"
  );

  return {
    request: await loadWorkshopRequestFromGoogleSheets(),
    sourceSummary: {
      mode: "google-sheets",
      label: "Google Sheets live source",
    },
  };
}
