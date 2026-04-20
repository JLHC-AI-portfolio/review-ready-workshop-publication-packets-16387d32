import { createWorkshopPublicationDraftingChain } from "../chains/draftingChain.js";
import { createOpenAILangChainModelRuntime } from "../runtime/modelRuntime.js";

import type { DraftingService } from "./types.js";

export async function createOpenAIDraftingService(
  env: NodeJS.ProcessEnv = process.env,
): Promise<DraftingService> {
  const runtime = await createOpenAILangChainModelRuntime(env);
  const chain = createWorkshopPublicationDraftingChain(
    runtime.createChatModel("draft_publication"),
  );

  return {
    descriptor: runtime.descriptor,
    async draft(request, config) {
      return chain.invoke(request, config);
    },
  };
}
