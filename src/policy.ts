import {
  policyDecisionSchema,
  type DraftOutput,
  type InterpretationConcern,
  type NormalizedWorkshopRequest,
  type PolicyDecision,
} from "./contracts.js";

type CanonicalPolicyRule = {
  id: "accessibility" | "age-guidance" | "weather-fallback" | "policy-acknowledgement";
  reviewFlag: string;
  reviewerChecklist: string;
  applies: (request: NormalizedWorkshopRequest) => boolean;
  duplicateTokens: string[];
};

const canonicalPolicyRules: CanonicalPolicyRule[] = [
  {
    id: "accessibility",
    reviewFlag: "Accessibility details still need confirmation.",
    reviewerChecklist:
      "Confirm the published accessibility note with the venue before posting.",
    applies: (request) => request.accessibilityStatus.isTentative,
    duplicateTokens: ["accessibility", "elevator", "inclusive", "inclusivity"],
  },
  {
    id: "age-guidance",
    reviewFlag: "Age guidance is missing.",
    reviewerChecklist:
      "Ask the organizer for a clear age guidance line or family participation note.",
    applies: (request) => request.ageGuidanceStatus.isMissing,
    duplicateTokens: ["age guidance", "family participation"],
  },
  {
    id: "weather-fallback",
    reviewFlag: "Weather fallback is missing.",
    reviewerChecklist:
      "Capture an indoor backup location or a cancellation rule before publishing.",
    applies: (request) => request.weatherStatus.requiresFallback,
    duplicateTokens: [
      "weather fallback",
      "rain location",
      "backup location",
      "cancellation rule",
    ],
  },
  {
    id: "policy-acknowledgement",
    reviewFlag: "Organizer policy acknowledgement is missing.",
    reviewerChecklist:
      "Record organizer acknowledgement of the publication policy.",
    applies: (request) => !request.policyAcknowledged,
    duplicateTokens: ["policy acknowledgement", "publication policy"],
  },
];

export function evaluatePolicy(
  request: NormalizedWorkshopRequest,
  draft: DraftOutput,
): PolicyDecision {
  const reviewFlags = new Set<string>();
  const reviewerChecklist = new Set<string>();
  const activeRuleIds = new Set<CanonicalPolicyRule["id"]>();

  for (const rule of canonicalPolicyRules) {
    if (!rule.applies(request)) {
      continue;
    }

    activeRuleIds.add(rule.id);
    reviewFlags.add(rule.reviewFlag);
    reviewerChecklist.add(rule.reviewerChecklist);
  }

  for (const concern of request.interpretationConcerns) {
    addInterpretedConcern(concern, {
      activeRuleIds,
      reviewFlags,
      reviewerChecklist,
    });
  }

  for (const concern of draft.policyConcerns) {
    if (matchesActiveCanonicalRule(concern, activeRuleIds)) {
      continue;
    }

    reviewFlags.add(concern);
  }

  const status = reviewFlags.size
    ? "hold_for_manual_review"
    : "ready_to_publish";

  return policyDecisionSchema.parse({
    status,
    reviewFlags: Array.from(reviewFlags),
    reviewerChecklist: Array.from(reviewerChecklist),
    decisionRationale:
      status === "ready_to_publish"
        ? "All required publication details are present and no manual review flags remain."
        : "Manual review is required because the request still contains unresolved publication prerequisites.",
  });
}

function addInterpretedConcern(
  concern: InterpretationConcern,
  target: {
    activeRuleIds: Set<CanonicalPolicyRule["id"]>;
    reviewFlags: Set<string>;
    reviewerChecklist: Set<string>;
  },
): void {
  if (concern.severity !== "review_required") {
    return;
  }

  if (matchesActiveCanonicalRule(concern.concern, target.activeRuleIds)) {
    return;
  }

  target.reviewFlags.add(concern.concern);

  if (concern.evidence) {
    target.reviewerChecklist.add(`Review interpreted evidence: ${concern.evidence}`);
  }
}

function matchesActiveCanonicalRule(
  concern: string,
  activeRuleIds: Set<CanonicalPolicyRule["id"]>,
): boolean {
  const normalizedConcern = normalizeConcern(concern);

  return canonicalPolicyRules.some(
    (rule) =>
      activeRuleIds.has(rule.id) &&
      rule.duplicateTokens.some((token) => normalizedConcern.includes(token)),
  );
}

function normalizeConcern(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
