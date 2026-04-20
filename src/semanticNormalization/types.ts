import type { RunnableConfig } from "@langchain/core/runnables";

import type {
  ProviderDescriptor,
  SemanticWorkshopNormalization,
  WorkshopRequest,
  WorkshopRequestInterpretation,
} from "../contracts.js";

export type SemanticNormalizationProvider = "deterministic" | "openai";

export interface SemanticNormalizationService {
  descriptor: ProviderDescriptor;
  normalize(
    request: WorkshopRequest,
    interpretation: WorkshopRequestInterpretation,
    config?: RunnableConfig,
  ): Promise<SemanticWorkshopNormalization>;
}
