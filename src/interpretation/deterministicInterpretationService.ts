import {
  workshopRequestInterpretationSchema,
  type InterpretationConcern,
  type InterpretationStatus,
  type WorkshopRequest,
  type WorkshopRequestInterpretation,
} from "../contracts.js";

import type { InterpretationService } from "./types.js";

export function createDeterministicInterpretationService(): InterpretationService {
  return {
    descriptor: {
      provider: "deterministic",
    },
    async interpret(request: WorkshopRequest) {
      return buildDeterministicWorkshopInterpretation(request);
    },
  };
}

export function buildDeterministicWorkshopInterpretation(
  request: WorkshopRequest,
): WorkshopRequestInterpretation {
  const accessibilityNote = request.accessibilityNotes?.trim() || "Not provided.";
  const ageGuidanceNote = request.ageGuidance?.trim() || "Not provided.";
  const weatherNote = request.weatherPlan?.trim() || "No fallback plan recorded.";
  const materialSummary = request.materialNeeds.length
    ? request.materialNeeds.join(", ")
    : "No materials listed.";
  const riskSignals = buildRiskSignals(request, {
    accessibilityNote,
    ageGuidanceNote,
    weatherNote,
  });

  return workshopRequestInterpretationSchema.parse({
    accessibility: {
      status: classifyOptionalNote(accessibilityNote),
      note: accessibilityNote,
      evidence: request.accessibilityNotes?.trim() || null,
      confidence: "high",
    },
    ageGuidance: {
      status: ageGuidanceNote === "Not provided." ? "missing" : "confirmed",
      note: ageGuidanceNote,
      evidence: request.ageGuidance?.trim() || null,
      confidence: "high",
    },
    weatherFallback: {
      status: classifyWeatherStatus(request, weatherNote),
      note: request.venueType === "indoor" ? "Indoor venue; fallback not required." : weatherNote,
      evidence: request.weatherPlan?.trim() || null,
      confidence: "high",
    },
    policyAcknowledgement: {
      status: request.policyAcknowledgement ? "confirmed" : "missing",
      note: request.policyAcknowledgement
        ? "Organizer acknowledged the publication policy."
        : "Organizer policy acknowledgement is missing.",
      evidence: String(request.policyAcknowledgement),
      confidence: "high",
    },
    logisticsSummary: `Capacity ${request.capacity}; materials: ${materialSummary}; accessibility: ${accessibilityNote}`,
    riskSignals,
  });
}

function buildRiskSignals(
  request: WorkshopRequest,
  details: {
    accessibilityNote: string;
    ageGuidanceNote: string;
    weatherNote: string;
  },
): InterpretationConcern[] {
  const risks: InterpretationConcern[] = [];

  if (
    looksTentative(details.accessibilityNote) ||
    details.accessibilityNote === "Not provided."
  ) {
    risks.push({
      concern: "Accessibility details still need confirmation before publication.",
      evidence:
        request.accessibilityNotes?.trim() ||
        "No accessibility details were supplied.",
      severity: "review_required",
    });
  }

  if (details.ageGuidanceNote === "Not provided.") {
    risks.push({
      concern: "Age guidance is missing from the request.",
      evidence: "The age guidance field is empty.",
      severity: "review_required",
    });
  }

  if (
    request.venueType !== "indoor" &&
    details.weatherNote === "No fallback plan recorded."
  ) {
    risks.push({
      concern: "Outdoor or hybrid session is missing a weather fallback.",
      evidence: "The weather fallback field is empty.",
      severity: "review_required",
    });
  }

  if (!request.policyAcknowledgement) {
    risks.push({
      concern: "Organizer policy acknowledgement is still missing.",
      evidence: "policyAcknowledgement is false.",
      severity: "review_required",
    });
  }

  return risks;
}

function classifyOptionalNote(value: string): InterpretationStatus {
  if (value === "Not provided.") {
    return "missing";
  }

  if (looksTentative(value)) {
    return "needs_confirmation";
  }

  return "confirmed";
}

function classifyWeatherStatus(
  request: WorkshopRequest,
  weatherNote: string,
): InterpretationStatus {
  if (request.venueType === "indoor") {
    return "not_applicable";
  }

  if (weatherNote === "No fallback plan recorded.") {
    return "missing";
  }

  if (looksTentative(weatherNote)) {
    return "needs_confirmation";
  }

  return "confirmed";
}

function looksTentative(value: string): boolean {
  return /tbd|pending|confirm|need to confirm|unknown/i.test(value);
}
