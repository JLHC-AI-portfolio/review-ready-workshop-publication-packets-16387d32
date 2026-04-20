import type { RunnableConfig } from "@langchain/core/runnables";

import type {
  DraftOutput,
  NormalizedWorkshopRequest,
  PolicyAnalysis,
  ProviderDescriptor,
} from "../contracts.js";

export type PolicyAnalysisProvider = "deterministic" | "openai";

export interface PolicyAnalysisService {
  descriptor: ProviderDescriptor;
  analyze(
    request: NormalizedWorkshopRequest,
    draft: DraftOutput,
    config?: RunnableConfig,
  ): Promise<PolicyAnalysis>;
}
