import {
  semanticWorkshopNormalizationSchema,
  type InterpretationStatus,
  type SemanticConstraint,
  type WorkshopRequest,
  type WorkshopRequestInterpretation,
} from "../contracts.js";

import type { SemanticNormalizationService } from "./types.js";

export function createDeterministicSemanticNormalizationService(): SemanticNormalizationService {
  return {
    descriptor: {
      provider: "deterministic",
    },
    async normalize(request, interpretation) {
      return buildDeterministicSemanticNormalization(request, interpretation);
    },
  };
}

export function buildDeterministicSemanticNormalization(
  request: WorkshopRequest,
  interpretation: WorkshopRequestInterpretation,
) {
  const materialSummary = request.materialNeeds.length
    ? request.materialNeeds.join(", ")
    : "No materials listed.";
  const derivedConstraints = interpretation.riskSignals.map(
    (signal): SemanticConstraint => ({
      constraint: signal.concern,
      evidence: signal.evidence,
      severity: signal.severity,
      confidence: "high",
      recommendedQuestion: questionForConcern(signal.concern),
    }),
  );

  return semanticWorkshopNormalizationSchema.parse({
    normalizedTitle: request.workshopTitle.trim(),
    normalizedSummary: request.shortDescription.trim(),
    audienceLabel: request.targetAudience.trim(),
    logisticsSummary: interpretation.logisticsSummary,
    publicationGoal: request.publicationGoal.trim(),
    materialSummary,
    derivedConstraints,
    missingFacts: [
      ...missingFact("Accessibility details", interpretation.accessibility.status),
      ...missingFact("Age guidance", interpretation.ageGuidance.status),
      ...missingFact("Weather fallback", interpretation.weatherFallback.status),
      ...missingFact(
        "Publication policy acknowledgement",
        interpretation.policyAcknowledgement.status,
      ),
    ],
    contradictions: [
      ...contradiction("Accessibility details", interpretation.accessibility.status),
      ...contradiction("Age guidance", interpretation.ageGuidance.status),
      ...contradiction("Weather fallback", interpretation.weatherFallback.status),
      ...contradiction(
        "Publication policy acknowledgement",
        interpretation.policyAcknowledgement.status,
      ),
    ],
    humanQuestions: derivedConstraints
      .map((constraint) => constraint.recommendedQuestion)
      .filter((question): question is string => Boolean(question)),
  });
}

function missingFact(label: string, status: InterpretationStatus): string[] {
  return status === "missing" || status === "needs_confirmation"
    ? [label]
    : [];
}

function contradiction(label: string, status: InterpretationStatus): string[] {
  return status === "contradictory" ? [label] : [];
}

function questionForConcern(concern: string): string {
  const normalized = concern.toLowerCase();
  if (normalized.includes("accessibility") || normalized.includes("elevator")) {
    return "Can the venue confirm the exact accessibility note that should be published?";
  }
  if (normalized.includes("age")) {
    return "What age guidance should appear in the public listing?";
  }
  if (normalized.includes("weather") || normalized.includes("fallback")) {
    return "What fallback or cancellation rule should be published for bad weather?";
  }
  if (normalized.includes("policy")) {
    return "Has the organizer acknowledged the publication policy?";
  }
  return "What should the coordinator confirm before publication?";
}
