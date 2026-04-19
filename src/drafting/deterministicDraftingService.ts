import { draftOutputSchema, type NormalizedWorkshopRequest } from "../contracts.js";

import type { DraftingService } from "./types.js";

export function createDeterministicDraftingService(): DraftingService {
  return {
    descriptor: {
      provider: "deterministic",
    },
    async draft(request: NormalizedWorkshopRequest) {
      const concerns = [...request.riskSignals];

      const reviewNotes =
        concerns.length > 0
          ? concerns
          : ["No unresolved review flags were detected by the fallback path."];

      return draftOutputSchema.parse({
        bulletinBlurb: `${request.title} is a ${request.durationLabel.toLowerCase()} workshop at ${request.locationLabel}. ${request.summary}`,
        newsletterSnippet: `${request.title}: ${request.summary} ${request.scheduleLabel}.`,
        publicSummary: `${request.summary} The session is aimed at ${request.audienceLabel.toLowerCase()}.`,
        reviewNotes,
        policyConcerns: concerns,
        confidenceNote:
          concerns.length > 0
            ? "Deterministic fallback preserved the facts but left the unresolved fields visible for manual review."
            : "Deterministic fallback produced stable factual copy from the normalized request with no extra interpretation.",
      });
    },
  };
}
