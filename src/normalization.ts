import {
  normalizedWorkshopRequestSchema,
  type InterpretationStatus,
  type NormalizedWorkshopRequest,
  type SemanticWorkshopNormalization,
  type WorkshopRequest,
  type WorkshopRequestInterpretation,
} from "./contracts.js";
import { buildDeterministicWorkshopInterpretation } from "./interpretation/deterministicInterpretationService.js";
import { buildDeterministicSemanticNormalization } from "./semanticNormalization/deterministicSemanticNormalizationService.js";

export function normalizeWorkshopRequest(
  request: WorkshopRequest,
  interpretation: WorkshopRequestInterpretation = buildDeterministicWorkshopInterpretation(request),
  semanticNormalization: SemanticWorkshopNormalization = buildDeterministicSemanticNormalization(
    request,
    interpretation,
  ),
): NormalizedWorkshopRequest {
  return normalizedWorkshopRequestSchema.parse({
    requestId: request.requestId,
    title: semanticNormalization.normalizedTitle,
    summary: semanticNormalization.normalizedSummary,
    fullDescription: request.fullDescription.trim(),
    scheduleLabel: formatScheduleLabel(request.preferredDate, request.fallbackDate),
    durationLabel: `${request.durationMinutes} minutes`,
    locationLabel: `${request.venueName.trim()} (${request.neighborhood.trim()})`,
    audienceLabel: semanticNormalization.audienceLabel,
    logisticsSummary: semanticNormalization.logisticsSummary,
    organizerSummary: `${request.organizerName.trim()} <${request.organizerEmail.trim()}>`,
    facilitatorBio: request.facilitatorBio.trim(),
    publicationGoal: semanticNormalization.publicationGoal,
    materialSummary: semanticNormalization.materialSummary,
    accessibilityStatus: {
      note: interpretation.accessibility.note,
      isTentative: isUnresolved(interpretation.accessibility.status),
    },
    ageGuidanceStatus: {
      note: interpretation.ageGuidance.note,
      isMissing: isUnresolved(interpretation.ageGuidance.status),
    },
    weatherStatus: {
      note: interpretation.weatherFallback.note,
      requiresFallback: isUnresolved(interpretation.weatherFallback.status),
    },
    policyAcknowledged: request.policyAcknowledgement,
    interpretationConcerns: interpretation.riskSignals,
    semanticConstraints: semanticNormalization.derivedConstraints,
    missingFacts: semanticNormalization.missingFacts,
    contradictions: semanticNormalization.contradictions,
    humanQuestions: semanticNormalization.humanQuestions,
    riskSignals: interpretation.riskSignals.map((signal) => signal.concern),
  });
}

function formatScheduleLabel(preferredDate: string, fallbackDate?: string): string {
  if (fallbackDate && fallbackDate.trim()) {
    return `Preferred: ${preferredDate}; backup: ${fallbackDate.trim()}`;
  }

  return preferredDate;
}

function isUnresolved(status: InterpretationStatus): boolean {
  return (
    status === "missing" ||
    status === "needs_confirmation" ||
    status === "contradictory"
  );
}
