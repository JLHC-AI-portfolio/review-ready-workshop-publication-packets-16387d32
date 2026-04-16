import { z } from "zod";

export const reviewStatusSchema = z.enum([
  "ready_to_publish",
  "hold_for_manual_review",
]);

export const workshopRequestSchema = z.object({
  requestId: z.string().min(1),
  submittedAt: z.string().min(1),
  organizerName: z.string().min(1),
  organizerEmail: z.string().email(),
  workshopTitle: z.string().min(1),
  shortDescription: z.string().min(1),
  fullDescription: z.string().min(1),
  preferredDate: z.string().min(1),
  fallbackDate: z.string().optional(),
  durationMinutes: z.number().int().positive(),
  venueName: z.string().min(1),
  venueType: z.enum(["indoor", "outdoor", "hybrid"]),
  neighborhood: z.string().min(1),
  targetAudience: z.string().min(1),
  capacity: z.number().int().positive(),
  accessibilityNotes: z.string().optional(),
  ageGuidance: z.string().optional(),
  materialNeeds: z.array(z.string()).default([]),
  facilitatorBio: z.string().min(1),
  publicationGoal: z.string().min(1),
  weatherPlan: z.string().optional(),
  internalNotes: z.string().optional(),
  policyAcknowledgement: z.boolean().default(false),
});

export const normalizedWorkshopRequestSchema = z.object({
  requestId: z.string(),
  title: z.string(),
  summary: z.string(),
  fullDescription: z.string(),
  scheduleLabel: z.string(),
  durationLabel: z.string(),
  locationLabel: z.string(),
  audienceLabel: z.string(),
  logisticsSummary: z.string(),
  organizerSummary: z.string(),
  facilitatorBio: z.string(),
  publicationGoal: z.string(),
  materialSummary: z.string(),
  accessibilityStatus: z.object({
    note: z.string(),
    isTentative: z.boolean(),
  }),
  ageGuidanceStatus: z.object({
    note: z.string(),
    isMissing: z.boolean(),
  }),
  weatherStatus: z.object({
    note: z.string(),
    requiresFallback: z.boolean(),
  }),
  policyAcknowledged: z.boolean(),
  riskSignals: z.array(z.string()),
});

export const draftOutputSchema = z.object({
  bulletinBlurb: z.string().min(1),
  newsletterSnippet: z.string().min(1),
  publicSummary: z.string().min(1),
  reviewNotes: z.array(z.string()).default([]),
  policyConcerns: z.array(z.string()).default([]),
  confidenceNote: z.string().min(1),
});

export const policyDecisionSchema = z.object({
  status: reviewStatusSchema,
  reviewFlags: z.array(z.string()).default([]),
  reviewerChecklist: z.array(z.string()).default([]),
  decisionRationale: z.string().min(1),
});

export const reviewOutcomeSchema = z.object({
  status: reviewStatusSchema,
  summary: z.string().min(1),
  nextAction: z.string().min(1),
});

export const publicationPacketSchema = z.object({
  status: reviewStatusSchema,
  websiteCard: z.object({
    title: z.string(),
    summary: z.string(),
    schedule: z.string(),
    logistics: z.string(),
    callToAction: z.string(),
  }),
  newsletterSnippet: z.string(),
  bulletinBlurb: z.string(),
  organizerNotes: z.array(z.string()),
  nextAction: z.string(),
});

export const traceEventSchema = z.object({
  step: z.string(),
  status: z.enum(["completed", "flagged"]),
  at: z.string(),
  detail: z.string(),
});

export const runPacketSchema = z.object({
  runId: z.string(),
  generatedAt: z.string(),
  sourceSummary: z.object({
    mode: z.enum(["fixture", "google-sheets", "eval"]),
    label: z.string(),
  }),
  drafter: z.object({
    provider: z.enum(["deterministic", "openai"]),
    model: z.string().optional(),
  }),
  requestEvidence: workshopRequestSchema,
  normalizedRequest: normalizedWorkshopRequestSchema,
  draftOutput: draftOutputSchema,
  policyDecision: policyDecisionSchema,
  reviewOutcome: reviewOutcomeSchema,
  publicationPacket: publicationPacketSchema,
  organizerDigest: z.string(),
  trace: z.array(traceEventSchema),
});

export const evalCaseSchema = z.object({
  caseId: z.string(),
  description: z.string(),
  requiredTerms: z.array(z.string()).default([]),
  expectedReviewStatus: reviewStatusSchema,
  expectedFlags: z.array(z.string()).default([]),
  request: workshopRequestSchema,
});

export const evalReportSchema = z.object({
  generatedAt: z.string(),
  provider: z.enum(["deterministic", "openai"]),
  model: z.string().optional(),
  datasetPath: z.string(),
  totalCases: z.number().int().nonnegative(),
  passedCases: z.number().int().nonnegative(),
  results: z.array(
    z.object({
      caseId: z.string(),
      description: z.string(),
      passed: z.boolean(),
      actualReviewStatus: reviewStatusSchema,
      expectedReviewStatus: reviewStatusSchema,
      missingTerms: z.array(z.string()),
      missingFlags: z.array(z.string()),
      reviewFlags: z.array(z.string()),
    }),
  ),
});

export type WorkshopRequest = z.infer<typeof workshopRequestSchema>;
export type NormalizedWorkshopRequest = z.infer<
  typeof normalizedWorkshopRequestSchema
>;
export type DraftOutput = z.infer<typeof draftOutputSchema>;
export type PolicyDecision = z.infer<typeof policyDecisionSchema>;
export type ReviewOutcome = z.infer<typeof reviewOutcomeSchema>;
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;
export type PublicationPacket = z.infer<typeof publicationPacketSchema>;
export type TraceEvent = z.infer<typeof traceEventSchema>;
export type RunPacket = z.infer<typeof runPacketSchema>;
export type EvalCase = z.infer<typeof evalCaseSchema>;
export type EvalReport = z.infer<typeof evalReportSchema>;

export interface SourceSummary {
  mode: "fixture" | "google-sheets" | "eval";
  label: string;
}
