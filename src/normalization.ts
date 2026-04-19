import {
  normalizedWorkshopRequestSchema,
  type InterpretationStatus,
  type NormalizedWorkshopRequest,
  type WorkshopRequest,
  type WorkshopRequestInterpretation,
} from "./contracts.js";
import { buildDeterministicWorkshopInterpretation } from "./interpretation/deterministicInterpretationService.js";

export function normalizeWorkshopRequest(
  request: WorkshopRequest,
  interpretation: WorkshopRequestInterpretation = buildDeterministicWorkshopInterpretation(request),
): NormalizedWorkshopRequest {
  const materialSummary = request.materialNeeds.length
    ? request.materialNeeds.join(", ")
    : "No materials listed.";

  return normalizedWorkshopRequestSchema.parse({
    requestId: request.requestId,
    title: request.workshopTitle.trim(),
    summary: request.shortDescription.trim(),
    fullDescription: request.fullDescription.trim(),
    scheduleLabel: formatScheduleLabel(request.preferredDate, request.fallbackDate),
    durationLabel: `${request.durationMinutes} minutes`,
    locationLabel: `${request.venueName.trim()} (${request.neighborhood.trim()})`,
    audienceLabel: request.targetAudience.trim(),
    logisticsSummary: interpretation.logisticsSummary,
    organizerSummary: `${request.organizerName.trim()} <${request.organizerEmail.trim()}>`,
    facilitatorBio: request.facilitatorBio.trim(),
    publicationGoal: request.publicationGoal.trim(),
    materialSummary,
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
