import {
  normalizedWorkshopRequestSchema,
  type NormalizedWorkshopRequest,
  type WorkshopRequest,
} from "./contracts.js";

export function normalizeWorkshopRequest(
  request: WorkshopRequest,
): NormalizedWorkshopRequest {
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

  return normalizedWorkshopRequestSchema.parse({
    requestId: request.requestId,
    title: request.workshopTitle.trim(),
    summary: request.shortDescription.trim(),
    fullDescription: request.fullDescription.trim(),
    scheduleLabel: formatScheduleLabel(request.preferredDate, request.fallbackDate),
    durationLabel: `${request.durationMinutes} minutes`,
    locationLabel: `${request.venueName.trim()} (${request.neighborhood.trim()})`,
    audienceLabel: request.targetAudience.trim(),
    logisticsSummary: `Capacity ${request.capacity}; materials: ${materialSummary}; accessibility: ${accessibilityNote}`,
    organizerSummary: `${request.organizerName.trim()} <${request.organizerEmail.trim()}>`,
    facilitatorBio: request.facilitatorBio.trim(),
    publicationGoal: request.publicationGoal.trim(),
    materialSummary,
    accessibilityStatus: {
      note: accessibilityNote,
      isTentative: looksTentative(accessibilityNote),
    },
    ageGuidanceStatus: {
      note: ageGuidanceNote,
      isMissing: ageGuidanceNote === "Not provided.",
    },
    weatherStatus: {
      note: weatherNote,
      requiresFallback:
        request.venueType !== "indoor" && weatherNote === "No fallback plan recorded.",
    },
    policyAcknowledged: request.policyAcknowledgement,
    riskSignals,
  });
}

function formatScheduleLabel(preferredDate: string, fallbackDate?: string): string {
  if (fallbackDate && fallbackDate.trim()) {
    return `Preferred: ${preferredDate}; backup: ${fallbackDate.trim()}`;
  }

  return preferredDate;
}

function buildRiskSignals(
  request: WorkshopRequest,
  details: {
    accessibilityNote: string;
    ageGuidanceNote: string;
    weatherNote: string;
  },
): string[] {
  const risks: string[] = [];

  if (looksTentative(details.accessibilityNote) || details.accessibilityNote === "Not provided.") {
    risks.push("Accessibility details still need confirmation before publication.");
  }

  if (details.ageGuidanceNote === "Not provided.") {
    risks.push("Age guidance is missing from the request.");
  }

  if (request.venueType !== "indoor" && details.weatherNote === "No fallback plan recorded.") {
    risks.push("Outdoor or hybrid session is missing a weather fallback.");
  }

  if (!request.policyAcknowledgement) {
    risks.push("Organizer policy acknowledgement is still missing.");
  }

  return risks;
}

function looksTentative(value: string): boolean {
  return /tbd|pending|confirm|need to confirm|unknown/i.test(value);
}
