import type { RunnableConfig } from "@langchain/core/runnables";

import type { ProviderDescriptor, SourceSummary, WorkshopRequest } from "../contracts.js";

export function createWorkflowRunnableConfig(input: {
  runId: string;
  request: WorkshopRequest;
  sourceSummary: SourceSummary;
  interpreter: ProviderDescriptor;
  semanticNormalizer: ProviderDescriptor;
  drafter: ProviderDescriptor;
  policyAnalyzer: ProviderDescriptor;
}, parentConfig?: RunnableConfig): RunnableConfig {
  const providerTags = unique([
    input.interpreter.provider,
    input.semanticNormalizer.provider,
    input.drafter.provider,
    input.policyAnalyzer.provider,
  ]).map((provider) => `provider:${provider}`);

  return {
    ...parentConfig,
    runName: "workshop_publication_workflow",
    tags: unique([
      ...(parentConfig?.tags ?? []),
      "workshop-publication",
      `source:${input.sourceSummary.mode}`,
      ...providerTags,
    ]),
    metadata: {
      ...(parentConfig?.metadata ?? {}),
      requestId: input.request.requestId,
      sourceMode: input.sourceSummary.mode,
      sourceLabel: input.sourceSummary.label,
      interpreterProvider: input.interpreter.provider,
      interpreterModel: input.interpreter.model,
      semanticNormalizerProvider: input.semanticNormalizer.provider,
      semanticNormalizerModel: input.semanticNormalizer.model,
      drafterProvider: input.drafter.provider,
      drafterModel: input.drafter.model,
      policyAnalyzerProvider: input.policyAnalyzer.provider,
      policyAnalyzerModel: input.policyAnalyzer.model,
    },
    configurable: {
      ...(parentConfig?.configurable ?? {}),
      thread_id: input.runId,
    },
  };
}

export function createStepRunnableConfig(
  parentConfig: RunnableConfig | undefined,
  stepName: string,
  metadata: Record<string, unknown> = {},
): RunnableConfig {
  return {
    ...parentConfig,
    runName: stepName,
    tags: unique([...(parentConfig?.tags ?? []), `step:${stepName}`]),
    metadata: {
      ...(parentConfig?.metadata ?? {}),
      workflowStep: stepName,
      ...metadata,
    },
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
