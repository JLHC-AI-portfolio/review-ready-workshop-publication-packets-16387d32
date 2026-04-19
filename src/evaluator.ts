import { readFile } from "node:fs/promises";

import { evalCaseSchema, evalReportSchema, type EvalReport } from "./contracts.js";
import { runWorkshopPublicationWorkflow } from "./workflow/graph.js";

import type { DraftingService } from "./drafting/types.js";
import type { InterpretationService } from "./interpretation/types.js";

export async function evaluateDraftingDataset(input: {
  datasetPath: string;
  interpreter: InterpretationService;
  drafter: DraftingService;
}): Promise<EvalReport> {
  const rawDataset = await readFile(input.datasetPath, "utf8");
  const parsedDataset = JSON.parse(rawDataset) as unknown[];
  const cases = parsedDataset.map((entry) => evalCaseSchema.parse(entry));

  const results = [];

  for (const testCase of cases) {
    const run = await runWorkshopPublicationWorkflow({
      request: testCase.request,
      sourceSummary: {
        mode: "eval",
        label: `Eval case ${testCase.caseId}`,
      },
      interpreter: input.interpreter,
      drafter: input.drafter,
    });

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

    results.push({
      caseId: testCase.caseId,
      description: testCase.description,
      passed,
      actualReviewStatus,
      expectedReviewStatus: testCase.expectedReviewStatus,
      missingTerms,
      missingFlags,
      reviewFlags: run.policyDecision.reviewFlags,
    });
  }

  return evalReportSchema.parse({
    generatedAt: new Date().toISOString(),
    provider: input.drafter.descriptor.provider,
    model: input.drafter.descriptor.model,
    interpreter: input.interpreter.descriptor,
    datasetPath: input.datasetPath,
    totalCases: results.length,
    passedCases: results.filter((result) => result.passed).length,
    results,
  });
}
