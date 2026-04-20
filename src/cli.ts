import "dotenv/config";

import { createDraftingService } from "./drafting/createDraftingService.js";
import { evaluateDraftingDataset } from "./evaluator.js";
import { createInterpretationService } from "./interpretation/createInterpretationService.js";
import { writeEvalReport, writeRunPacket } from "./output.js";
import { createPolicyAnalysisService } from "./policyAnalysis/createPolicyAnalysisService.js";
import { createSemanticNormalizationService } from "./semanticNormalization/createSemanticNormalizationService.js";
import { loadWorkshopRequestFromSource, type SourceMode } from "./source/index.js";
import { runWorkshopPublicationWorkflow } from "./workflow/graph.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command =
    args[0] && !args[0].startsWith("--") ? args.shift() ?? "run" : "run";

  if (command === "run") {
    await runCommand(args);
    return;
  }

  if (command === "eval") {
    await evalCommand(args);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

async function runCommand(args: string[]): Promise<void> {
  const source = readFlag(args, "--source", "fixture") as SourceMode;
  const provider = readFlag(args, "--provider", "deterministic");
  const fixturePath = readFlag(
    args,
    "--fixture",
    "fixtures/requests/neighborhood_zine_workshop_request.json",
  );
  const output = readFlag(args, "--output", ".local/demo-run");

  const { request, sourceSummary } = await loadWorkshopRequestFromSource({
    source,
    fixturePath,
  });
  const interpreter = await createInterpretationService(
    provider as "deterministic" | "openai",
  );
  const semanticNormalizer = await createSemanticNormalizationService(
    provider as "deterministic" | "openai",
  );
  const drafter = await createDraftingService(provider as "deterministic" | "openai");
  const policyAnalyzer = await createPolicyAnalysisService(
    provider as "deterministic" | "openai",
  );
  const packet = await runWorkshopPublicationWorkflow({
    request,
    sourceSummary,
    interpreter,
    semanticNormalizer,
    drafter,
    policyAnalyzer,
  });

  await writeRunPacket(output, packet);

  process.stdout.write(
    `Wrote run packet to ${output} with status ${packet.reviewOutcome.status}.\n`,
  );
}

async function evalCommand(args: string[]): Promise<void> {
  const provider = readFlag(args, "--provider", "deterministic");
  const datasetPath = readFlag(args, "--dataset", "evals/draft_eval_cases.json");
  const output = readFlag(args, "--output", ".local/eval-run");
  const interpreter = await createInterpretationService(
    provider as "deterministic" | "openai",
  );
  const semanticNormalizer = await createSemanticNormalizationService(
    provider as "deterministic" | "openai",
  );
  const drafter = await createDraftingService(provider as "deterministic" | "openai");
  const policyAnalyzer = await createPolicyAnalysisService(
    provider as "deterministic" | "openai",
  );
  const report = await evaluateDraftingDataset({
    datasetPath,
    interpreter,
    semanticNormalizer,
    drafter,
    policyAnalyzer,
  });

  await writeEvalReport(output, report);

  process.stdout.write(
    `Wrote eval report to ${output} with ${report.passedCases}/${report.totalCases} passing cases.\n`,
  );
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
