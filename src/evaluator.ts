import { evalReportSchema, type EvalReport } from "./contracts.js";
import { loadEvalCases, scoreRunAgainstCase } from "./evals/scoring.js";
import { runWorkshopPublicationWorkflow } from "./workflow/graph.js";

import type { DraftingService } from "./drafting/types.js";
import type { InterpretationService } from "./interpretation/types.js";
import type { PolicyAnalysisService } from "./policyAnalysis/types.js";
import type { SemanticNormalizationService } from "./semanticNormalization/types.js";

export async function evaluateDraftingDataset(input: {
  datasetPath: string;
  interpreter: InterpretationService;
  semanticNormalizer: SemanticNormalizationService;
  drafter: DraftingService;
  policyAnalyzer: PolicyAnalysisService;
}): Promise<EvalReport> {
  const cases = await loadEvalCases(input.datasetPath);

  const results = [];

  for (const testCase of cases) {
    const run = await runWorkshopPublicationWorkflow({
      request: testCase.request,
      sourceSummary: {
        mode: "eval",
        label: `Eval case ${testCase.caseId}`,
      },
      interpreter: input.interpreter,
      semanticNormalizer: input.semanticNormalizer,
      drafter: input.drafter,
      policyAnalyzer: input.policyAnalyzer,
    });

    results.push(scoreRunAgainstCase(run, testCase));
  }

  return evalReportSchema.parse({
    generatedAt: new Date().toISOString(),
    provider: input.drafter.descriptor.provider,
    model: input.drafter.descriptor.model,
    interpreter: input.interpreter.descriptor,
    semanticNormalizer: input.semanticNormalizer.descriptor,
    policyAnalyzer: input.policyAnalyzer.descriptor,
    datasetPath: input.datasetPath,
    totalCases: results.length,
    passedCases: results.filter((result) => result.passed).length,
    results,
  });
}
