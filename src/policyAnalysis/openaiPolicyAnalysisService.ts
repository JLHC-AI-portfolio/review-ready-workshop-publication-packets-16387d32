import { createWorkshopPolicyAnalysisChain } from "../chains/policyAnalysisChain.js";
import { createOpenAILangChainModelRuntime } from "../runtime/modelRuntime.js";

import type { PolicyAnalysisService } from "./types.js";

export async function createOpenAIPolicyAnalysisService(
  env: NodeJS.ProcessEnv = process.env,
): Promise<PolicyAnalysisService> {
  const runtime = await createOpenAILangChainModelRuntime(env);
  const chain = createWorkshopPolicyAnalysisChain(
    runtime.createChatModel("policy_analysis"),
  );

  return {
    descriptor: runtime.descriptor,
    async analyze(request, draft, config) {
      return chain.invoke({ request, draft }, config);
    },
  };
}
