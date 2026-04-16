import { createDeterministicDraftingService } from "./deterministicDraftingService.js";
import { createOpenAIDraftingService } from "./openaiDraftingService.js";
import type { DraftProvider, DraftingService } from "./types.js";

export async function createDraftingService(
  provider: DraftProvider,
  env: NodeJS.ProcessEnv = process.env,
): Promise<DraftingService> {
  if (provider === "openai") {
    return createOpenAIDraftingService(env);
  }

  return createDeterministicDraftingService();
}
