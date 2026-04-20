import { readFile } from "node:fs/promises";

import { evalCaseSchema, type EvalCase, type RunPacket } from "../contracts.js";

export interface EvalCaseScore {
  caseId: string;
  description: string;
  passed: boolean;
  actualReviewStatus: RunPacket["reviewOutcome"]["status"];
  expectedReviewStatus: EvalCase["expectedReviewStatus"];
  missingTerms: string[];
  missingFlags: string[];
  reviewFlags: string[];
}

export async function loadEvalCases(datasetPath: string): Promise<EvalCase[]> {
  const rawDataset = await readFile(datasetPath, "utf8");
  const parsedDataset = JSON.parse(rawDataset) as unknown[];

  return parsedDataset.map((entry) => evalCaseSchema.parse(entry));
}

export function scoreRunAgainstCase(
  run: RunPacket,
  testCase: EvalCase,
): EvalCaseScore {
  const reviewFlags = run.policyDecision.reviewFlags.map((flag) =>
    flag.toLowerCase(),
  );
  const combinedText = [
    run.publicationPacket.websiteCard.summary,
    run.publicationPacket.newsletterSnippet,
    run.publicationPacket.bulletinBlurb,
    run.organizerDigest,
  ]
    .join(" ")
    .toLowerCase();

  const missingTerms = testCase.requiredTerms.filter(
    (term) => !combinedText.includes(term.toLowerCase()),
  );
  const missingFlags = testCase.expectedFlags.filter(
    (flag) => !reviewFlags.some((candidate) => candidate.includes(flag.toLowerCase())),
  );
  const actualReviewStatus = run.reviewOutcome.status;
  const passed =
    missingTerms.length === 0 &&
    missingFlags.length === 0 &&
    actualReviewStatus === testCase.expectedReviewStatus;

  return {
    caseId: testCase.caseId,
    description: testCase.description,
    passed,
    actualReviewStatus,
    expectedReviewStatus: testCase.expectedReviewStatus,
    missingTerms,
    missingFlags,
    reviewFlags: run.policyDecision.reviewFlags,
  };
}
