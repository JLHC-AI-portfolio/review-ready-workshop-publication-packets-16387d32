import { createSemanticNormalizationChain } from "../chains/semanticNormalizationChain.js";
import { createOpenAILangChainModelRuntime } from "../runtime/modelRuntime.js";

import type { SemanticNormalizationService } from "./types.js";

export async function createOpenAISemanticNormalizationService(
  env: NodeJS.ProcessEnv = process.env,
): Promise<SemanticNormalizationService> {
  const runtime = await createOpenAILangChainModelRuntime(env);
  const chain = createSemanticNormalizationChain(
    runtime.createChatModel("semantic_normalization"),
  );

  return {
    descriptor: runtime.descriptor,
    async normalize(request, interpretation, config) {
      return chain.invoke({ request, interpretation }, config);
    },
  };
}
