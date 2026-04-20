import { createDeterministicSemanticNormalizationService } from "./deterministicSemanticNormalizationService.js";
import { createOpenAISemanticNormalizationService } from "./openaiSemanticNormalizationService.js";
import type {
  SemanticNormalizationProvider,
  SemanticNormalizationService,
} from "./types.js";

export async function createSemanticNormalizationService(
  provider: SemanticNormalizationProvider,
  env: NodeJS.ProcessEnv = process.env,
): Promise<SemanticNormalizationService> {
  if (provider === "openai") {
    return createOpenAISemanticNormalizationService(env);
  }

  return createDeterministicSemanticNormalizationService();
}
