import {
  policyAnalysisSchema,
  type DraftOutput,
  type NormalizedWorkshopRequest,
  type PolicyAnalysis,
  type PolicyFinding,
} from "../contracts.js";

import type { PolicyAnalysisService } from "./types.js";

export function createDeterministicPolicyAnalysisService(): PolicyAnalysisService {
  return {
    descriptor: {
      provider: "deterministic",
    },
    async analyze(request, draft) {
      return buildDeterministicPolicyAnalysis(request, draft);
    },
  };
}

export function buildDeterministicPolicyAnalysis(
  request: NormalizedWorkshopRequest,
  draft: DraftOutput,
): PolicyAnalysis {
  const findings: PolicyFinding[] = [];
  const seenRuleIds = new Set<PolicyFinding["ruleId"]>();

  for (const constraint of request.semanticConstraints) {
    if (constraint.severity !== "review_required") {
      continue;
    }
    const ruleId = classifyRuleId(constraint.constraint);
    findings.push({
      ruleId,
      finding: constraint.constraint,
      evidence: constraint.evidence,
      severity: constraint.severity,
      recommendedQuestion: constraint.recommendedQuestion,
      confidence: constraint.confidence,
    });
    seenRuleIds.add(ruleId);
  }

  for (const concern of draft.policyConcerns) {
    const ruleId = classifyRuleId(concern);
    if (seenRuleIds.has(ruleId)) {
      continue;
    }
    findings.push({
      ruleId,
      finding: concern,
      evidence: null,
      severity: "review_required",
      recommendedQuestion: questionForConcern(concern),
      confidence: "medium",
    });
    seenRuleIds.add(ruleId);
  }

  return policyAnalysisSchema.parse({
    summary: findings.length
      ? "Policy analysis found review-required issues that the deterministic gate must adjudicate."
      : "Policy analysis found no additional review-required issues.",
    findings,
  });
}

function classifyRuleId(value: string): PolicyFinding["ruleId"] {
  const normalized = value.toLowerCase();
  if (normalized.includes("accessibility") || normalized.includes("elevator")) {
    return "accessibility";
  }
  if (normalized.includes("age")) {
    return "age-guidance";
  }
  if (normalized.includes("weather") || normalized.includes("fallback")) {
    return "weather-fallback";
  }
  if (normalized.includes("policy")) {
    return "policy-acknowledgement";
  }
  if (normalized.includes("registration") || normalized.includes("capacity")) {
    return "registration";
  }
  if (normalized.includes("safety")) {
    return "safety";
  }
  if (normalized.includes("copy") || normalized.includes("newsletter")) {
    return "copy-risk";
  }
  return "other";
}

function questionForConcern(concern: string): string {
  const normalized = concern.toLowerCase();
  if (normalized.includes("registration") || normalized.includes("capacity")) {
    return "How should participants register or be capped for this session?";
  }
  if (normalized.includes("copy") || normalized.includes("newsletter")) {
    return "What copy adjustment should the coordinator make before publication?";
  }
  return "What should the coordinator verify before publication?";
}
