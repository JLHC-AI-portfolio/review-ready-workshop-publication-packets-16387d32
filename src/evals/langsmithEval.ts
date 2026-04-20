import "dotenv/config";

import type { RunnableConfig } from "@langchain/core/runnables";
import { Client } from "langsmith";
import { evaluate, type EvaluationResult } from "langsmith/evaluation";
import type { Example, ExampleCreate } from "langsmith/schemas";

import { createDraftingService } from "../drafting/createDraftingService.js";
import { createInterpretationService } from "../interpretation/createInterpretationService.js";
import { createPolicyAnalysisService } from "../policyAnalysis/createPolicyAnalysisService.js";
import { createSemanticNormalizationService } from "../semanticNormalization/createSemanticNormalizationService.js";
import { runWorkshopPublicationWorkflow } from "../workflow/graph.js";

import { loadEvalCases, scoreRunAgainstCase, type EvalCaseScore } from "./scoring.js";

import type { EvalCase, RunPacket } from "../contracts.js";
import type { DraftProvider } from "../drafting/types.js";

interface LangSmithEvalInputs {
  caseId: string;
  request: EvalCase["request"];
}

interface LangSmithReferenceOutputs {
  description: string;
  expectedReviewStatus: EvalCase["expectedReviewStatus"];
  requiredTerms: string[];
  expectedFlags: string[];
}

type LangSmithEvalOutput = EvalCaseScore & {
  provider: DraftProvider;
  model?: string;
  runId: RunPacket["runId"];
};

interface EvaluatorArgs {
  outputs: Record<string, unknown>;
  referenceOutputs?: Record<string, unknown>;
}

async function main(): Promise<void> {
  if (!process.env.LANGSMITH_API_KEY) {
    throw new Error(
      "LANGSMITH_API_KEY is required for the optional LangSmith eval path.",
    );
  }
  process.env.LANGSMITH_TRACING ??= "true";

  const args = process.argv.slice(2);
  const provider = readFlag(args, "--provider", "deterministic") as DraftProvider;
  const datasetPath = readFlag(args, "--dataset", "evals/draft_eval_cases.json");
  const langsmithDatasetName = readFlag(
    args,
    "--langsmith-dataset",
    "workshop-publication-packet-regression",
  );
  const maxConcurrency = Number(readFlag(args, "--max-concurrency", "1"));

  if (!Number.isInteger(maxConcurrency) || maxConcurrency < 1) {
    throw new Error("--max-concurrency must be a positive integer.");
  }

  const cases = await loadEvalCases(datasetPath);
  const casesById = new Map(cases.map((testCase) => [testCase.caseId, testCase]));
  const client = new Client();
  const datasetName = await ensureLangSmithDataset({
    client,
    datasetName: langsmithDatasetName,
    cases,
  });

  const interpreter = await createInterpretationService(provider);
  const semanticNormalizer = await createSemanticNormalizationService(provider);
  const drafter = await createDraftingService(provider);
  const policyAnalyzer = await createPolicyAnalysisService(provider);

  const results = await evaluate(
    async (
      inputs: LangSmithEvalInputs,
      config?: RunnableConfig,
    ): Promise<LangSmithEvalOutput> => {
      const testCase = casesById.get(inputs.caseId);

      if (!testCase) {
        throw new Error(`Unknown eval case: ${inputs.caseId}`);
      }

      const run = await runWorkshopPublicationWorkflow({
        request: inputs.request,
        sourceSummary: {
          mode: "eval",
          label: `LangSmith eval case ${testCase.caseId}`,
        },
        interpreter,
        semanticNormalizer,
        drafter,
        policyAnalyzer,
        config,
      });
      const score = scoreRunAgainstCase(run, testCase);

      return {
        ...score,
        provider,
        model: drafter.descriptor.model,
        runId: run.runId,
      };
    },
    {
      data: datasetName,
      evaluators: [
        reviewStatusEvaluator,
        requiredTermsEvaluator,
        expectedFlagsEvaluator,
        overallPassEvaluator,
      ],
      experimentPrefix: `workshop-publication-${provider}`,
      maxConcurrency,
      metadata: {
        provider,
        model: drafter.descriptor.model,
        datasetPath,
        workflow: "workshop-publication-packet",
      },
    },
  );

  let processedCount = 0;
  for await (const _row of results) {
    processedCount += 1;
  }

  process.stdout.write(
    `LangSmith experiment ${results.experimentName} completed with ${processedCount} cases from dataset ${datasetName}.\n`,
  );
}

async function ensureLangSmithDataset(input: {
  client: Client;
  datasetName: string;
  cases: EvalCase[];
}): Promise<string> {
  const exists = await input.client.hasDataset({
    datasetName: input.datasetName,
  });
  const dataset = exists
    ? await input.client.readDataset({ datasetName: input.datasetName })
    : await input.client.createDataset(input.datasetName, {
        description:
          "Regression dataset for the workshop publication packet workflow.",
        dataType: "kv",
        metadata: {
          workflow: "workshop-publication-packet",
        },
      });
  const existingCaseIds = await readExistingCaseIds(input.client, dataset.id);
  const missingExamples: ExampleCreate[] = input.cases
    .filter((testCase) => !existingCaseIds.has(testCase.caseId))
    .map((testCase) => ({
      dataset_id: dataset.id,
      inputs: {
        caseId: testCase.caseId,
        request: testCase.request,
      } satisfies LangSmithEvalInputs,
      outputs: {
        description: testCase.description,
        expectedReviewStatus: testCase.expectedReviewStatus,
        requiredTerms: testCase.requiredTerms,
        expectedFlags: testCase.expectedFlags,
      } satisfies LangSmithReferenceOutputs,
      metadata: {
        caseId: testCase.caseId,
        description: testCase.description,
      },
    }));

  if (missingExamples.length > 0) {
    await input.client.createExamples(missingExamples);
  }

  return dataset.name;
}

async function readExistingCaseIds(
  client: Client,
  datasetId: string,
): Promise<Set<string>> {
  const caseIds = new Set<string>();

  for await (const example of client.listExamples({ datasetId })) {
    const caseId = readCaseId(example);

    if (caseId) {
      caseIds.add(caseId);
    }
  }

  return caseIds;
}

function readCaseId(example: Example): string | undefined {
  const inputCaseId = example.inputs.caseId;
  const metadataCaseId = example.metadata?.caseId;

  if (typeof inputCaseId === "string") {
    return inputCaseId;
  }

  return typeof metadataCaseId === "string" ? metadataCaseId : undefined;
}

function reviewStatusEvaluator(args: EvaluatorArgs): EvaluationResult {
  const actual = args.outputs.actualReviewStatus;
  const expected = args.referenceOutputs?.expectedReviewStatus;
  const matched = actual === expected;

  return {
    key: "review_status_match",
    score: matched,
    comment: matched
      ? "Review status matched the expected rubric."
      : `Expected ${String(expected)}, got ${String(actual)}.`,
  };
}

function requiredTermsEvaluator(args: EvaluatorArgs): EvaluationResult {
  const missingTerms = readStringArray(args.outputs.missingTerms);
  const matched = missingTerms.length === 0;

  return {
    key: "required_terms_present",
    score: matched,
    comment: matched
      ? "All required terms appeared in the packet surface."
      : `Missing required terms: ${missingTerms.join(", ")}.`,
  };
}

function expectedFlagsEvaluator(args: EvaluatorArgs): EvaluationResult {
  const missingFlags = readStringArray(args.outputs.missingFlags);
  const matched = missingFlags.length === 0;

  return {
    key: "expected_flags_present",
    score: matched,
    comment: matched
      ? "All expected review flags survived the workflow."
      : `Missing expected flags: ${missingFlags.join(", ")}.`,
  };
}

function overallPassEvaluator(args: EvaluatorArgs): EvaluationResult {
  const passed = args.outputs.passed === true;

  return {
    key: "workflow_regression_pass",
    score: passed,
    comment: passed
      ? "The case passed the local regression rubric."
      : "The case failed at least one local regression rubric check.",
  };
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function readFlag(args: string[], flag: string, defaultValue: string): string {
  const index = args.findIndex((value) => value === flag);

  if (index === -1) {
    return defaultValue;
  }

  const nextValue = args[index + 1];

  if (!nextValue || nextValue.startsWith("--")) {
    throw new Error(`Expected a value after ${flag}`);
  }

  return nextValue;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
