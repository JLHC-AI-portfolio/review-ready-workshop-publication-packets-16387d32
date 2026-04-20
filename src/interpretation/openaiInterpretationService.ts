import { createWorkshopRequestInterpretationChain } from "../chains/interpretationChain.js";
import { createOpenAILangChainModelRuntime } from "../runtime/modelRuntime.js";

import type { InterpretationService } from "./types.js";

export async function createOpenAIInterpretationService(
  env: NodeJS.ProcessEnv = process.env,
): Promise<InterpretationService> {
  const runtime = await createOpenAILangChainModelRuntime(env);
  const chain = createWorkshopRequestInterpretationChain(
    runtime.createChatModel("interpret_request"),
  );

  return {
    descriptor: runtime.descriptor,
    async interpret(request, config) {
      return chain.invoke(request, config);
    },
  };
}
