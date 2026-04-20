import { createDeterministicPolicyAnalysisService } from "./deterministicPolicyAnalysisService.js";
import { createOpenAIPolicyAnalysisService } from "./openaiPolicyAnalysisService.js";
import type {
  PolicyAnalysisProvider,
  PolicyAnalysisService,
} from "./types.js";

export async function createPolicyAnalysisService(
  provider: PolicyAnalysisProvider,
  env: NodeJS.ProcessEnv = process.env,
): Promise<PolicyAnalysisService> {
  if (provider === "openai") {
    return createOpenAIPolicyAnalysisService(env);
  }

  return createDeterministicPolicyAnalysisService();
}
