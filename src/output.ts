import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  evalReportSchema,
  publicationPacketSchema,
  reviewOutcomeSchema,
  runPacketSchema,
  type DraftOutput,
  type EvalReport,
  type NormalizedWorkshopRequest,
  type PolicyDecision,
  type PublicationPacket,
  type ReviewOutcome,
  type RunPacket,
} from "./contracts.js";

const PUBLICATION_PACKET_READER_NOTE =
  "Reader note: This packet is a review draft, not approval to publish. Use it to inspect the proposed public copy, the deterministic hold decision, and the unresolved items a coordinator must clear before anything goes to public channels.";

const ORGANIZER_DIGEST_READER_NOTE =
  "Reader note: This digest is the human follow-up view. It keeps the request summary, review flags, checklist, and next action in one place so a coordinator can resolve the hold before publication.";

const EVAL_SUMMARY_READER_NOTE =
  "Reader note: This is technical evidence for the AI-assisted interpretation and drafting boundary. It shows whether outputs preserved required facts and review flags on a small checked-in dataset; it is not a claim that every future workshop request will pass without human review.";

export function buildReviewOutcome(policyDecision: PolicyDecision): ReviewOutcome {
  return reviewOutcomeSchema.parse({
    status: policyDecision.status,
    summary:
      policyDecision.status === "ready_to_publish"
        ? "Packet is ready for publication review."
        : "Packet is on hold until a coordinator clears the flagged details.",
    nextAction:
      policyDecision.status === "ready_to_publish"
        ? "Share the packet with the publishing coordinator for final scheduling."
        : "Resolve the reviewer checklist before the packet is posted to public channels.",
  });
}

export function buildPublicationPacket(
  request: NormalizedWorkshopRequest,
  draft: DraftOutput,
  reviewOutcome: ReviewOutcome,
): PublicationPacket {
  return publicationPacketSchema.parse({
    status: reviewOutcome.status,
    websiteCard: {
      title: request.title,
      summary: draft.publicSummary,
      schedule: request.scheduleLabel,
      logistics: request.logisticsSummary,
      callToAction: `Contact ${request.organizerSummary} to confirm registration handling.`,
    },
    newsletterSnippet: draft.newsletterSnippet,
    bulletinBlurb: draft.bulletinBlurb,
    organizerNotes: draft.reviewNotes,
    nextAction: reviewOutcome.nextAction,
  });
}

export function buildOrganizerDigest(
  request: NormalizedWorkshopRequest,
  policyDecision: PolicyDecision,
  reviewOutcome: ReviewOutcome,
): string {
  const flags = policyDecision.reviewFlags.length
    ? policyDecision.reviewFlags.map((flag) => `- ${flag}`).join("\n")
    : "- No review flags remain.";
  const checklist = policyDecision.reviewerChecklist.length
    ? policyDecision.reviewerChecklist.map((item) => `- ${item}`).join("\n")
    : "- No follow-up items required.";

  return `# Organizer Digest

${ORGANIZER_DIGEST_READER_NOTE}

## Request

- Title: ${request.title}
- Schedule: ${request.scheduleLabel}
- Audience: ${request.audienceLabel}
- Organizer: ${request.organizerSummary}

## Decision

- Status: ${reviewOutcome.status}
- Summary: ${reviewOutcome.summary}

## Review Flags

${flags}

## Reviewer Checklist

${checklist}

## Next Action

${reviewOutcome.nextAction}
`;
}

export async function writeRunPacket(
  outputDir: string,
  packet: RunPacket,
): Promise<void> {
  const validated = runPacketSchema.parse(packet);

  await mkdir(outputDir, { recursive: true });

  await Promise.all([
    writeJson(join(outputDir, "request_evidence.json"), validated.requestEvidence),
    writeJson(
      join(outputDir, "request_interpretation.json"),
      validated.requestInterpretation,
    ),
    writeJson(
      join(outputDir, "normalized_request.json"),
      validated.normalizedRequest,
    ),
    writeJson(join(outputDir, "draft_output.json"), validated.draftOutput),
    writeJson(join(outputDir, "policy_decision.json"), validated.policyDecision),
    writeJson(
      join(outputDir, "publication_packet.json"),
      validated.publicationPacket,
    ),
    writeJson(join(outputDir, "trace.json"), validated.trace),
    writeJson(
      join(outputDir, "run_summary.json"),
      {
        runId: validated.runId,
        generatedAt: validated.generatedAt,
        sourceSummary: validated.sourceSummary,
        interpreter: validated.interpreter,
        drafter: validated.drafter,
        reviewOutcome: validated.reviewOutcome,
      },
    ),
    writeFile(
      join(outputDir, "publication_packet.md"),
      renderPublicationPacketMarkdown(validated),
      "utf8",
    ),
    writeFile(
      join(outputDir, "organizer_digest.md"),
      validated.organizerDigest,
      "utf8",
    ),
  ]);
}

export async function writeEvalReport(
  outputDir: string,
  report: EvalReport,
): Promise<void> {
  const validated = evalReportSchema.parse(report);

  await mkdir(outputDir, { recursive: true });

  await Promise.all([
    writeJson(join(outputDir, "eval_report.json"), validated),
    writeFile(
      join(outputDir, "eval_summary.md"),
      renderEvalSummaryMarkdown(validated),
      "utf8",
    ),
  ]);
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function renderPublicationPacketMarkdown(packet: RunPacket): string {
  return `# Publication Packet

${PUBLICATION_PACKET_READER_NOTE}

## Status

- Review status: ${packet.reviewOutcome.status}
- Decision summary: ${packet.reviewOutcome.summary}
- Next action: ${packet.reviewOutcome.nextAction}

## Website Card

- Title: ${packet.publicationPacket.websiteCard.title}
- Schedule: ${packet.publicationPacket.websiteCard.schedule}
- Logistics: ${packet.publicationPacket.websiteCard.logistics}

${packet.publicationPacket.websiteCard.summary}

## Newsletter Snippet

${packet.publicationPacket.newsletterSnippet}

## Bulletin Blurb

${packet.publicationPacket.bulletinBlurb}

## Organizer Notes

${packet.publicationPacket.organizerNotes.map((note) => `- ${note}`).join("\n")}
`;
}

function renderEvalSummaryMarkdown(report: EvalReport): string {
  const lines = report.results
    .map((result) => {
      const status = result.passed ? "PASS" : "FAIL";
      return `- ${status} ${result.caseId}: expected ${result.expectedReviewStatus}, got ${result.actualReviewStatus}`;
    })
    .join("\n");

  return `# Interpretation And Drafting Eval Summary

${EVAL_SUMMARY_READER_NOTE}

- Provider: ${report.provider}
- Model: ${report.model ?? "n/a"}
- Interpreter: ${report.interpreter.provider}${report.interpreter.model ? ` (${report.interpreter.model})` : ""}
- Passed: ${report.passedCases}/${report.totalCases}
- Dataset: ${report.datasetPath}

## Case Results

${lines}
`;
}
